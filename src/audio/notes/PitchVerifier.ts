import { DEFAULT_PITCH_CONFIG, DEFAULT_VERIFIER_CONFIG, type PitchConfig, type VerifierConfig } from '../config';
import { centsOff, freqToMidi } from '../dsp/pitch';
import type { AcousticFrame, AcousticVerifier, AttemptKind, AttemptResult } from '../practice/ChordVerifier';

/**
 * T-07 (SRS 3.1.6.2): single-note verifier on pitchy f0.
 *
 * A frame passes only when it is voiced, its pitchy clarity is ≥ minClarity (0.85)
 * and its f0 is within ±centsTolerance (35 cents) of the exact target MIDI note, so
 * a wrong octave is a miss. The attempt lifecycle (onset gate, attack skip, 200 ms
 * sustain window, pass/voiced ratios, roll grace, onset merge) is the same as
 * NoteVerifier / ChordVerifier, so WaitStateMachine serves it unchanged.
 */
export class PitchVerifier implements AcousticVerifier {
  readonly config: Readonly<VerifierConfig & PitchConfig>;
  readonly targetMidi: number;

  private open = false;
  private clusterStartMs = 0;
  private windowStartMs = 0;
  private frames: Array<{ tMs: number; voiced: boolean; passed: boolean }> = [];
  private bestClarity = -1;
  private bestHeardMidi = -1;
  private _lastHeardMidi = -1;

  constructor(targetMidi: number, config: Partial<VerifierConfig & PitchConfig> = {}) {
    this.config = Object.freeze({ ...DEFAULT_VERIFIER_CONFIG, ...DEFAULT_PITCH_CONFIG, ...config });
    this.targetMidi = Math.round(targetMidi);
  }

  get isOpen(): boolean {
    return this.open;
  }

  /** MIDI note heard in the last decided attempt (the clearest voiced frame), −1 if none. */
  get lastHeardMidi(): number {
    return this._lastHeardMidi;
  }

  reset(): void {
    this.open = false;
    this.frames = [];
    this.bestClarity = -1;
    this.bestHeardMidi = -1;
  }

  push(frame: AcousticFrame): AttemptResult | null {
    const cfg = this.config;

    if (frame.onset) {
      const sameCluster = this.open && frame.onsetMs - this.clusterStartMs <= cfg.onsetMergeMs;
      this.openAt(frame.onsetMs, !sameCluster);
    }
    if (!this.open) return null;

    const sinceOnset = frame.tMs - this.windowStartMs;
    if (sinceOnset < cfg.attackSkipMs) return null;

    let passed = false;
    const hz = frame.pitchHz;
    const clarity = frame.clarity ?? 0;
    if (frame.voiced && hz != null && hz > 0) {
      passed = clarity >= cfg.minClarity && Math.abs(centsOff(hz, this.targetMidi)) <= cfg.centsTolerance;
      if (clarity > this.bestClarity) {
        this.bestClarity = clarity;
        this.bestHeardMidi = Math.round(freqToMidi(hz));
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
    this._lastHeardMidi = kind === 'match' ? this.targetMidi : this.bestHeardMidi;
    this.reset();
    return result;
  }

  private openAt(onsetMs: number, newCluster: boolean): void {
    if (newCluster) this.clusterStartMs = onsetMs;
    this.open = true;
    this.windowStartMs = onsetMs;
    this.frames = [];
    this.bestClarity = -1;
    this.bestHeardMidi = -1;
  }
}
