import { Emitter } from '../../vision/core/Emitter';
import { DEFAULT_WAIT_STATE_CONFIG, type WaitStateConfig } from '../config';
import type { AcousticFrame, AcousticVerifier, AttemptResult } from './ChordVerifier';

export type WaitState =
  /** Not started. */
  | 'idle'
  /** Waiting for the learner to play; drill timer running. */
  | 'armed'
  /** An onset was heard; the 200 ms verification window is open. */
  | 'verifying'
  /** Correct chord heard; waiting (≤ 400 ms) for compliant posture. */
  | 'latching'
  /** Paused (tab hidden / camera paused); timer frozen. */
  | 'paused'
  /** Both criteria met — lesson may advance. */
  | 'success'
  /** Hearts reached 0 — practice disabled (SRS 3.1.2.4). */
  | 'locked';

export type HeartLossReason = 'timeout' | 'misses';

export type WaitStateEvents = {
  state: { state: WaitState; previous: WaitState; atMs: number };
  attempt: AttemptResult;
  heartLost: { reason: HeartLossReason; hearts: number; atMs: number };
  /** Correct chord, but posture was not compliant within the latch window. */
  postureBlocked: { audioMs: number; atMs: number };
  success: { audioMs: number; postureMs: number; atMs: number };
};

interface PostureSample {
  tMs: number;
  compliant: boolean | null;
}

/**
 * KAN-267: deterministic practice wait-state machine (SRS 3.1.6.5, SDD C-06).
 *
 * Every input carries its own timestamp (performance.now() ms) and there are no
 * internal timers, so a recorded timeline replays to exactly the same result.
 * The caller drives time with `tick(nowMs)` (the React hook does this on every
 * audio frame and animation frame).
 *
 * Latch rule (decision Q2): success when a `match` attempt is decided at time
 * tA and some posture sample with `compliant === true` lies within
 * |tP − tA| ≤ 400 ms. `null` posture (not evaluable) counts as not compliant.
 */
export class WaitStateMachine extends Emitter<WaitStateEvents> {
  readonly config: Readonly<WaitStateConfig>;
  private readonly verifier: AcousticVerifier;

  private _state: WaitState = 'idle';
  private _hearts = 0;
  private misses = 0;
  private deadlineMs = 0;
  private latchUntilMs = 0;
  private latchAudioMs = 0;
  private pausedFrom: WaitState = 'armed';
  private pausedRemainingMs = 0;
  private posture: PostureSample[] = [];

  constructor(verifier: AcousticVerifier, config: Partial<WaitStateConfig> = {}) {
    super();
    this.config = Object.freeze({ ...DEFAULT_WAIT_STATE_CONFIG, ...config });
    this.verifier = verifier;
  }

  get state(): WaitState {
    return this._state;
  }

  get hearts(): number {
    return this._hearts;
  }

  get consecutiveMisses(): number {
    return this.misses;
  }

  /** Milliseconds left on the drill timer (0 when not running). */
  remainingMs(nowMs: number): number {
    if (this._state === 'paused') return this.pausedRemainingMs;
    if (!this.isActive()) return 0;
    return Math.max(0, this.deadlineMs - nowMs);
  }

  /** Arm a drill. `hearts` is the learner's current stamina from the profile. */
  start(nowMs: number, hearts: number): void {
    this._hearts = Math.max(0, Math.floor(hearts));
    this.misses = 0;
    this.posture = [];
    this.verifier.reset();
    if (this._hearts <= 0) {
      this.setState('locked', nowMs);
      return;
    }
    this.deadlineMs = nowMs + this.config.timeoutMs;
    this.setState('armed', nowMs);
  }

  /** Stop without penalty (lesson left, component unmounted). */
  stop(nowMs: number): void {
    this.verifier.reset();
    this.setState('idle', nowMs);
  }

  pause(nowMs: number): void {
    if (!this.isActive()) return;
    this.pausedFrom = this._state === 'latching' ? 'armed' : this._state;
    if (this.pausedFrom === 'verifying') this.pausedFrom = 'armed';
    this.pausedRemainingMs = Math.max(0, this.deadlineMs - nowMs);
    this.verifier.reset();
    this.setState('paused', nowMs);
  }

  resume(nowMs: number): void {
    if (this._state !== 'paused') return;
    this.deadlineMs = nowMs + this.pausedRemainingMs;
    this.posture = [];
    this.setState(this.pausedFrom, nowMs);
  }

  /** Feed a posture result (KAN-248 `PostureSnapshot.timestampMs` / `.compliant`). */
  pushPosture(tMs: number, compliant: boolean | null): void {
    this.posture.push({ tMs, compliant });
    this.prunePosture(tMs);
    if (this._state === 'latching' && compliant === true && Math.abs(tMs - this.latchAudioMs) <= this.config.latchWindowMs) {
      this.succeed(this.latchAudioMs, tMs, tMs);
    }
  }

  /** Feed one acoustic frame. */
  pushFrame(frame: AcousticFrame): void {
    if (!this.isActive()) return;
    this.tick(frame.tMs);
    if (!this.isActive()) return;

    const result = this.verifier.push(frame);
    if (this._state === 'armed' && this.verifier.isOpen) this.setState('verifying', frame.tMs);
    if (!result) return;

    this.emit('attempt', result);
    if (result.kind === 'match') this.onMatch(result.decidedMs);
    else if (result.kind === 'miss') this.onMiss(result.decidedMs);
    else if (this._state === 'verifying') this.setState('armed', result.decidedMs);
  }

  /** Advance time: drill timeout and latch expiry. */
  tick(nowMs: number): void {
    if (this._state === 'latching' && nowMs > this.latchUntilMs) {
      this.emit('postureBlocked', { audioMs: this.latchAudioMs, atMs: nowMs });
      this.setState('armed', nowMs);
    }
    if (this.isActive() && nowMs >= this.deadlineMs) {
      this.loseHeart('timeout', nowMs);
    }
  }

  private onMatch(audioMs: number): void {
    this.misses = 0;
    const w = this.config.latchWindowMs;
    let best: PostureSample | null = null;
    for (const p of this.posture) {
      if (p.compliant === true && Math.abs(p.tMs - audioMs) <= w) {
        if (!best || Math.abs(p.tMs - audioMs) < Math.abs(best.tMs - audioMs)) best = p;
      }
    }
    if (best) {
      this.succeed(audioMs, best.tMs, audioMs);
      return;
    }
    this.latchAudioMs = audioMs;
    this.latchUntilMs = audioMs + w;
    this.setState('latching', audioMs);
  }

  private onMiss(atMs: number): void {
    this.misses++;
    if (this.misses >= this.config.maxConsecutiveMisses) {
      this.loseHeart('misses', atMs);
    } else if (this._state === 'verifying') {
      this.setState('armed', atMs);
    }
  }

  private loseHeart(reason: HeartLossReason, atMs: number): void {
    if (this.config.heartCost === 0) {
      // Warm-up (ruling W1): start a fresh attempt and a fresh timer, nothing is lost.
      this.misses = 0;
      this.verifier.reset();
      this.deadlineMs = atMs + this.config.timeoutMs;
      this.setState('armed', atMs);
      return;
    }
    this._hearts = Math.max(0, this._hearts - 1);
    this.misses = 0;
    this.verifier.reset();
    this.emit('heartLost', { reason, hearts: this._hearts, atMs });
    if (this._hearts === 0) {
      this.setState('locked', atMs);
      return;
    }
    // SDD 6.3: "Drill Timeout (15s): Decrements heart, resets wait-state timer."
    this.deadlineMs = atMs + this.config.timeoutMs;
    this.setState('armed', atMs);
  }

  private succeed(audioMs: number, postureMs: number, atMs: number): void {
    this.verifier.reset();
    this.setState('success', atMs);
    this.emit('success', { audioMs, postureMs, atMs });
  }

  private isActive(): boolean {
    return this._state === 'armed' || this._state === 'verifying' || this._state === 'latching';
  }

  private prunePosture(nowMs: number): void {
    const horizon = nowMs - 2 * this.config.latchWindowMs;
    let i = 0;
    while (i < this.posture.length && this.posture[i].tMs < horizon) i++;
    if (i > 0) this.posture.splice(0, i);
  }

  private setState(next: WaitState, atMs: number): void {
    if (next === this._state) return;
    const previous = this._state;
    this._state = next;
    this.emit('state', { state: next, previous, atMs });
  }
}
