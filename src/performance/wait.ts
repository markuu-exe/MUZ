/**
 * "Wait for me" practice in Performance mode (owner-approved 2026-11-28): no click and no
 * tempo; the piece waits on each note or chord until the microphone hears it, then moves on.
 *
 * Each step is judged by the lesson verifiers themselves (the same checks the Skill Tree
 * drills use): PitchVerifier for a note (exact note and octave, target must dominate) and
 * ChordVerifier for a chord. Both need a new strike (onset) and decide over the 200 ms window
 * after it, so:
 * - only a decided `match` advances, and it advances by exactly one step;
 * - a wrong note or chord (`miss`) is reported but never advances;
 * - silence, knocks and coughs (`unvoiced`) do nothing;
 * - every step gets a fresh verifier, so the strike that finished one step (or a note still
 *   ringing from it) can never satisfy the next one: that needs a strike of its own.
 * Practice only, like the rest of Performance mode: nothing is saved.
 */
import { midiToNoteName } from '../audio/dsp/pitch';
import type { AcousticFrame, AcousticVerifier, AttemptResult } from '../audio/practice/ChordVerifier';
import { ChordVerifier } from '../audio/practice/ChordVerifier';
import { PitchVerifier } from '../audio/notes/PitchVerifier';
import { chordMatcher } from '../practice/PracticeDrill';
import type { SongTarget } from './songs';

export type WaitEvent =
  | { kind: 'advance'; index: number; firstTry: boolean }
  /** `heard`: what the wrong attempt sounded like ("E4", "D minor"), as the lessons say it; null when unclear. */
  /**
   * `heardTarget`: the clearest pitch was the target itself, but other notes sounded with it
   * (often the previous key still held), so the grader rejected it. Never say "That was F4. Try
   * F4 again" for that (owner report 2026-11-28).
   */
  | { kind: 'wrong'; index: number; heard: string | null; heardTarget: boolean };

export interface WaitSummary {
  total: number;
  /** Steps played right on the first attempt. */
  firstTry: number;
  /** Wrong attempts across the piece. */
  wrong: number;
  /** Wrong attempts per step. */
  perEvent: number[];
}

/** Same wording as the lesson drills (PracticeDrill.describeHeard): a note with its octave, or the closest chord. */
function describeAttempt(verifier: AcousticVerifier, attempt: AttemptResult): string | null {
  if ('lastHeardMidi' in verifier) {
    const midi = (verifier as PitchVerifier).lastHeardMidi;
    return midi >= 0 ? midiToNoteName(midi) : null;
  }
  const label = attempt.detail?.closest.label;
  return label ? label : null;
}

export function verifierForTarget(target: SongTarget): AcousticVerifier {
  return target.kind === 'note' ? new PitchVerifier(target.note) : new ChordVerifier(chordMatcher, target.chord);
}

export class WaitStepper {
  private _index = 0;
  private verifier: AcousticVerifier | null;
  private readonly wrongs: number[];

  constructor(
    private readonly targets: readonly SongTarget[],
    private readonly createVerifier: (target: SongTarget) => AcousticVerifier = verifierForTarget,
  ) {
    this.wrongs = targets.map(() => 0);
    this.verifier = targets.length ? createVerifier(targets[0]) : null;
  }

  /** The step being waited on (equals the number of steps when done). */
  get index(): number {
    return this._index;
  }

  get done(): boolean {
    return this._index >= this.targets.length;
  }

  /** Feed one analysis frame (in time order). Returns what happened, if anything. */
  push(frame: AcousticFrame): WaitEvent | null {
    if (this.done || !this.verifier) return null;
    const attempt = this.verifier.push(frame);
    if (!attempt || attempt.kind === 'unvoiced') return null;
    const index = this._index;
    if (attempt.kind === 'miss') {
      this.wrongs[index]++;
      const heard = describeAttempt(this.verifier, attempt);
      const target = this.targets[index];
      const heardTarget = heard !== null && target.kind === 'note' && heard === midiToNoteName(target.note);
      return { kind: 'wrong', index, heard: heardTarget ? null : heard, heardTarget };
    }
    this._index++;
    this.verifier = this.done ? null : this.createVerifier(this.targets[this._index]);
    return { kind: 'advance', index, firstTry: this.wrongs[index] === 0 };
  }

  summary(): WaitSummary {
    return {
      total: this.targets.length,
      firstTry: this.wrongs.filter((w, i) => i < this._index && w === 0).length,
      wrong: this.wrongs.reduce((a, b) => a + b, 0),
      perEvent: [...this.wrongs],
    };
  }
}
