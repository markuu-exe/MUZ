/**
 * COURSE-5: one practice exercise = one or more targets played in order.
 *
 * Framework-agnostic and deterministic, like the WaitStateMachine it drives: every
 * input carries its own timestamp and there are no timers, so tests replay audio
 * through it directly. Each step gets a fresh WaitStateMachine (KAN-267) with a
 * PitchVerifier (notes; the chroma NoteVerifier only behind useChromaNoteVerifier)
 * or a ChordVerifier; hearts carry over from step to step.
 */
import { ChordMatcher } from '../audio/chords/ChordMatcher';
import { DEFAULT_PRACTICE_CONFIG } from '../audio/config';
import { parseChord } from '../audio/chords/vocabulary';
import { midiToNoteName, PITCH_CLASS_NAMES } from '../audio/dsp/pitch';
import { NoteMatcher } from '../audio/notes/NoteMatcher';
import { PitchVerifier } from '../audio/notes/PitchVerifier';
import { ChordVerifier, type AcousticFrame, type AcousticVerifier, type AttemptKind } from '../audio/practice/ChordVerifier';
import { NoteVerifier } from '../audio/practice/NoteVerifier';
import { WaitStateMachine, type HeartLossReason, type WaitState } from '../audio/practice/WaitStateMachine';
import { Emitter } from '../vision/core/Emitter';
import type { Exercise, SequenceStep } from '../types/lesson.types';

export type DrillTarget = SequenceStep;

/** Targets of a practice exercise, in playing order. Empty for exercises this drill does not handle. */
export function drillTargets(exercise: Exercise): DrillTarget[] {
  switch (exercise.type) {
    case 'play-note':
      return [{ kind: 'note', note: exercise.note }];
    case 'play-chord':
      return [{ kind: 'chord', chord: exercise.chord }];
    case 'play-sequence':
      return exercise.steps;
    default:
      return [];
  }
}

/** "C4", "F#3", "Am" — the label shown for a target. Notes carry their octave: it is checked (T-08). */
export function targetLabel(target: DrillTarget): string {
  return target.kind === 'note' ? midiToNoteName(target.note) : parseChord(target.chord).label;
}

export interface DrillStats {
  /** Correct attempts / (correct + wrong), 0–100. Knocks and coughs are not attempts. */
  pitchAccuracy: number;
  /** Share of evaluable posture frames inside the elbow and wrist bands, 0–100 (SDD posture_score). */
  postureScore: number;
  heartsLost: number;
  matches: number;
  misses: number;
}

export interface DrillSnapshot {
  state: WaitState;
  stepIndex: number;
  stepCount: number;
  hearts: number;
  heartsLost: number;
  remainingMs: number;
  timeoutMs: number;
  consecutiveMisses: number;
  lastAttempt: AttemptKind | null;
  /** What the last wrong attempt sounded like ("D", "C minor"), when known. */
  lastHeard: string | null;
  /** The right sound was heard but posture was not compliant inside the latch window. */
  postureBlocked: boolean;
  complete: boolean;
}

export type PracticeDrillEvents = {
  /** Anything in the snapshot changed (state, step, hearts, attempt). */
  change: { atMs: number };
  stepDone: { index: number; atMs: number };
  heartLost: { reason: HeartLossReason; hearts: number; atMs: number };
  complete: DrillStats;
  /** Hearts reached 0: practice is disabled (SRS 3.1.2.4). */
  locked: DrillStats;
};

/**
 * T-08: a single-note verifier. Either the chroma NoteVerifier (pitch class only:
 * `lastHeardPc`) or the pitchy PitchVerifier from T-07 (contract C2: f0 within ±35
 * cents, clarity ≥ 0.85, octave included: `lastHeardMidi`, −1 when nothing heard).
 */
export type SingleNoteVerifier = AcousticVerifier & ({ readonly lastHeardMidi: number } | { readonly lastHeardPc: number });

/** Builds the verifier for one note target (MIDI number, octave included). */
export type NoteVerifierFactory = (targetMidi: number) => SingleNoteVerifier;

export interface PracticeDrillOptions {
  hearts: number;
  /** settings.timeoutSec × 1000. */
  timeoutMs: number;
  /** Single-note verifier override (tests). Default: see `useChromaNoteVerifier`. */
  createNoteVerifier?: NoteVerifierFactory;
  /**
   * Use the chroma NoteVerifier instead of PitchVerifier (T-19 comparison only).
   * Default DEFAULT_PRACTICE_CONFIG.useChromaNoteVerifier (false: SRS 3.1.6.2, ruling D4).
   */
  useChromaNoteVerifier?: boolean;
}

/** One matcher of each kind is enough for the whole app. */
const chordMatcher = new ChordMatcher();
const noteMatcher = new NoteMatcher();

/** The chroma, pitch-class-only verifier (kept for comparison in T-19, ruling D4). */
export const chromaNoteVerifier: NoteVerifierFactory = (targetMidi) => new NoteVerifier(noteMatcher, targetMidi);

/** T-07/T-08: pitchy f0 within ±35 cents of the exact note, clarity ≥ 0.85 (SRS 3.1.6.2). */
export const pitchNoteVerifier: NoteVerifierFactory = (targetMidi) => new PitchVerifier(targetMidi);

export class PracticeDrill extends Emitter<PracticeDrillEvents> {
  readonly targets: readonly DrillTarget[];
  private readonly timeoutMs: number;
  private readonly heartsStart: number;

  private machine: WaitStateMachine | null = null;
  private readonly createNoteVerifier: NoteVerifierFactory;
  private noteVerifier: SingleNoteVerifier | null = null;
  private offs: Array<() => void> = [];
  private stepIndex = 0;
  private hearts: number;
  private matches = 0;
  private misses = 0;
  private postureSamples = 0;
  private postureInBand = 0;
  private lastAttempt: AttemptKind | null = null;
  private lastHeard: string | null = null;
  private postureBlocked = false;
  private complete = false;

  constructor(targets: readonly DrillTarget[], options: PracticeDrillOptions) {
    super();
    if (targets.length === 0) throw new Error('A practice drill needs at least one target.');
    this.targets = targets;
    this.timeoutMs = options.timeoutMs;
    const useChroma = options.useChromaNoteVerifier ?? DEFAULT_PRACTICE_CONFIG.useChromaNoteVerifier;
    this.createNoteVerifier = options.createNoteVerifier ?? (useChroma ? chromaNoteVerifier : pitchNoteVerifier);
    this.heartsStart = Math.max(0, Math.floor(options.hearts));
    this.hearts = this.heartsStart;
  }

  get currentTarget(): DrillTarget {
    return this.targets[Math.min(this.stepIndex, this.targets.length - 1)];
  }

  get stats(): DrillStats {
    const attempts = this.matches + this.misses;
    return {
      pitchAccuracy: attempts === 0 ? 0 : Math.round((this.matches / attempts) * 10000) / 100,
      postureScore: this.postureSamples === 0 ? 0 : Math.round((this.postureInBand / this.postureSamples) * 10000) / 100,
      heartsLost: this.heartsStart - this.hearts,
      matches: this.matches,
      misses: this.misses,
    };
  }

  snapshot(nowMs: number): DrillSnapshot {
    const m = this.machine;
    return {
      state: this.complete ? 'success' : (m?.state ?? 'idle'),
      stepIndex: this.stepIndex,
      stepCount: this.targets.length,
      hearts: this.hearts,
      heartsLost: this.heartsStart - this.hearts,
      remainingMs: m ? m.remainingMs(nowMs) : 0,
      timeoutMs: this.timeoutMs,
      consecutiveMisses: m?.consecutiveMisses ?? 0,
      lastAttempt: this.lastAttempt,
      lastHeard: this.lastHeard,
      postureBlocked: this.postureBlocked,
      complete: this.complete,
    };
  }

  /** Arm the first (or current) step. With 0 hearts the drill locks at once. */
  start(nowMs: number): void {
    if (this.complete) return;
    this.arm(nowMs);
  }

  /** Stop without penalty (exercise left, component unmounted). */
  stop(nowMs: number): void {
    this.machine?.stop(nowMs);
    this.detach();
  }

  pause(nowMs: number): void {
    this.machine?.pause(nowMs);
  }

  resume(nowMs: number): void {
    this.machine?.resume(nowMs);
  }

  pushFrame(frame: AcousticFrame): void {
    this.machine?.pushFrame(frame);
  }

  /**
   * @param compliant PostureSnapshot.compliant — gates the latch (null = not enough of the body visible).
   * @param inBandStrict PostureSnapshot.inBandStrict — counted for the posture score.
   */
  pushPosture(tMs: number, compliant: boolean | null, inBandStrict: boolean | null = compliant): void {
    const m = this.machine;
    if (!m) return;
    const active = m.state === 'armed' || m.state === 'verifying' || m.state === 'latching';
    if (active && inBandStrict !== null) {
      this.postureSamples++;
      if (inBandStrict) this.postureInBand++;
    }
    m.pushPosture(tMs, compliant);
  }

  /** Advance the drill timer when no audio frames are arriving. */
  tick(nowMs: number): void {
    this.machine?.tick(nowMs);
  }

  private arm(nowMs: number): void {
    this.detach();
    const target = this.targets[this.stepIndex];
    this.noteVerifier = target.kind === 'note' ? this.createNoteVerifier(target.note) : null;
    const verifier = this.noteVerifier ?? new ChordVerifier(chordMatcher, (target as { chord: string }).chord);
    const machine = new WaitStateMachine(verifier, { timeoutMs: this.timeoutMs });
    this.machine = machine;
    this.offs = [
      machine.on('state', (e) => {
        if (e.state === 'armed' || e.state === 'verifying') {
          // A new attempt is starting: the posture warning from the previous one no longer applies.
          if (e.state === 'verifying') this.postureBlocked = false;
        }
        if (e.state === 'locked') {
          this.hearts = 0;
          this.emit('change', { atMs: e.atMs });
          this.emit('locked', this.stats);
          return;
        }
        this.emit('change', { atMs: e.atMs });
      }),
      machine.on('attempt', (a) => {
        this.lastAttempt = a.kind;
        if (a.kind === 'match') {
          this.matches++;
          this.lastHeard = null;
        } else if (a.kind === 'miss') {
          this.misses++;
          this.lastHeard = this.describeHeard(a.detail?.closest.label ?? null);
        }
        this.emit('change', { atMs: a.decidedMs });
      }),
      machine.on('postureBlocked', (e) => {
        this.postureBlocked = true;
        this.emit('change', { atMs: e.atMs });
      }),
      machine.on('heartLost', (e) => {
        this.hearts = e.hearts;
        this.emit('heartLost', e);
      }),
      machine.on('success', (e) => this.onStepSuccess(e.atMs)),
    ];
    machine.start(nowMs, this.hearts);
  }

  private describeHeard(closestChord: string | null): string | null {
    const v = this.noteVerifier;
    if (v) {
      // A pitch verifier knows the octave ("A3"); the chroma one only the pitch class ("A").
      if ('lastHeardMidi' in v) return v.lastHeardMidi >= 0 ? midiToNoteName(v.lastHeardMidi) : null;
      return v.lastHeardPc >= 0 ? PITCH_CLASS_NAMES[v.lastHeardPc] : null;
    }
    return closestChord && closestChord.length > 0 ? closestChord : null;
  }

  private onStepSuccess(atMs: number): void {
    const index = this.stepIndex;
    this.postureBlocked = false;
    this.emit('stepDone', { index, atMs });
    if (index + 1 >= this.targets.length) {
      this.complete = true;
      this.detach();
      this.emit('change', { atMs });
      this.emit('complete', this.stats);
      return;
    }
    this.stepIndex = index + 1;
    this.lastAttempt = null;
    this.lastHeard = null;
    this.arm(atMs);
    this.emit('change', { atMs });
  }

  private detach(): void {
    for (const off of this.offs) off();
    this.offs = [];
    if (this.complete) this.machine = null;
  }
}
