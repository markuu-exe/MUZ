import { DEFAULT_VERIFIER_CONFIG, type VerifierConfig } from '../config';
import { pc as wrapPc } from '../dsp/pitch';
import type { NoteMatcher } from '../notes/NoteMatcher';
import type { AcousticFrame, AcousticVerifier, AttemptKind, AttemptResult } from './ChordVerifier';

/**
 * COURSE-5: single-note verifier for the wait-state machine.
 *
 * Same attempt rules as ChordVerifier (onset-gated, 45 ms attack skip, 200 ms
 * sustain window, ≥ 80 % of frames must pass, sliding grace for slow attacks),
 * with NoteMatcher instead of ChordMatcher. Implements AcousticVerifier, so the
 * existing WaitStateMachine (hearts, 15 s timeout, 3-miss rule, posture latch)
 * serves note drills unchanged.
 */
export class NoteVerifier implements AcousticVerifier {
  readonly config: Readonly<VerifierConfig>;
  /** Target pitch class 0–11. */
  readonly targetPc: number;
  private readonly matcher: NoteMatcher;

  private open = false;
  private clusterStartMs = 0;
  private windowStartMs = 0;
  private frames: Array<{ tMs: number; voiced: boolean; passed: boolean }> = [];
  private bestSimilarity = -1;
  private bestHeardPc = -1;
  private _lastHeardPc = -1;

  /** @param target MIDI note or pitch class; only the pitch class is used. */
  constructor(matcher: NoteMatcher, target: number, config: Partial<VerifierConfig> = {}) {
    this.config = Object.freeze({ ...DEFAULT_VERIFIER_CONFIG, ...config });
    this.matcher = matcher;
    this.targetPc = wrapPc(Math.round(target));
  }

  get isOpen(): boolean {
    return this.open;
  }

  /** Pitch class heard in the last decided attempt (−1 if none), for cue text such as "That was D". */
  get lastHeardPc(): number {
    return this._lastHeardPc;
  }

  reset(): void {
    this.open = false;
    this.frames = [];
    this.bestSimilarity = -1;
    this.bestHeardPc = -1;
  }

  push(frame: AcousticFrame): AttemptResult | null {
    const cfg = this.config;

    if (frame.onset) {
      // A new strike always restarts the window. Within onsetMergeMs it stays the same
      // attempt (a hesitant double strike); after that it supersedes the unfinished one.
      const sameCluster = this.open && frame.onsetMs - this.clusterStartMs <= cfg.onsetMergeMs;
      this.openAt(frame.onsetMs, !sameCluster);
    }
    if (!this.open) return null;

    const sinceOnset = frame.tMs - this.windowStartMs;
    if (sinceOnset < cfg.attackSkipMs) return null;

    let passed = false;
    if (frame.voiced) {
      const m = this.matcher.match(frame.chroma, this.targetPc, frame.ringing ?? false);
      passed = m.passes;
      if (m.similarity > this.bestSimilarity || this.bestHeardPc < 0) {
        this.bestSimilarity = m.similarity;
        this.bestHeardPc = m.heardPc;
      }
    }
    this.frames.push({ tMs: frame.tMs, voiced: frame.voiced, passed });

    if (sinceOnset < cfg.sustainWindowMs) return null;

    const span = cfg.sustainWindowMs - cfg.attackSkipMs;
    let total = 0;
    let voiced = 0;
    let pass = 0;
    for (let i = this.frames.length - 1; i >= 0 && frame.tMs - this.frames[i].tMs < span; i--) {
      total++;
      if (this.frames[i].voiced) voiced++;
      if (this.frames[i].passed) pass++;
    }
    const passRatio = total > 0 ? pass / total : 0;
    const voicedRatio = total > 0 ? voiced / total : 0;

    if (voicedRatio >= cfg.minVoicedRatio && passRatio >= cfg.minPassRatio) {
      return this.finish('match', frame.tMs, passRatio, voicedRatio);
    }
    if (sinceOnset < cfg.sustainWindowMs + cfg.rollGraceMs) return null;

    let allVoiced = 0;
    for (const f of this.frames) if (f.voiced) allVoiced++;
    const attemptVoiced = this.frames.length > 0 ? allVoiced / this.frames.length : 0;
    return this.finish(attemptVoiced < cfg.minVoicedRatio ? 'unvoiced' : 'miss', frame.tMs, passRatio, attemptVoiced);
  }

  private finish(kind: AttemptKind, decidedMs: number, passRatio: number, voicedRatio: number): AttemptResult {
    const result: AttemptResult = { kind, onsetMs: this.clusterStartMs, decidedMs, passRatio, voicedRatio, detail: null };
    this._lastHeardPc = kind === 'match' ? this.targetPc : this.bestHeardPc;
    this.reset();
    return result;
  }

  private openAt(onsetMs: number, newCluster: boolean): void {
    if (newCluster) this.clusterStartMs = onsetMs;
    this.open = true;
    this.windowStartMs = onsetMs;
    this.frames = [];
    this.bestSimilarity = -1;
    this.bestHeardPc = -1;
  }
}
