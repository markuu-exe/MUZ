import { DEFAULT_CHROMA_CONFIG, DEFAULT_PITCH_CONFIG, DEFAULT_VERIFIER_CONFIG, type PitchConfig, type VerifierConfig } from '../config';
import { centsOff, freqToMidi } from '../dsp/pitch';
import type { AcousticFrame, AcousticVerifier, AttemptKind, AttemptResult } from '../practice/ChordVerifier';
import { NoteMatcher } from './NoteMatcher';

/** "That sounded like …" only names notes within an octave and a whole tone of the target. */
const PLAUSIBLE_SEMITONES = 14;

/**
 * While a previous sound rings, a pitch reading within this many cents of the target is a mix of
 * the new note and its ringing neighbour (up to a whole tone and a half away), not a wrong note.
 */
const RINGING_NEAR_CENTS = 300;

/** Shared chroma cross-check: the target must also be the dominant pitch class. */
const defaultMatcher = new NoteMatcher();

/**
 * T-07 (SRS 3.1.6.2): single-note verifier on pitchy f0.
 *
 * Per voiced frame with pitchy clarity ≥ minClarity (0.85):
 *  - f0 inside the analysis band (DEFAULT_CHROMA_CONFIG 55 Hz – 5 kHz): passes only if
 *    it is within ±centsTolerance (35 cents) of the exact target MIDI note (a wrong
 *    octave is a miss) AND the chroma NoteMatcher hears the target as the dominant
 *    pitch class (so a two-key dyad that contains the target is not the note);
 *  - f0 below the band: pitchy has locked onto the common subharmonic of two
 *    overlapping notes (e.g. a scale step played while the previous one still rings
 *    gives f0 ≈ 37 Hz). That is a measurement artefact, not a played pitch, so the
 *    frame is judged by the chroma NoteMatcher alone (pitch class, ringing-aware).
 * Frames without a usable f0 never pass. The attempt lifecycle (onset gate, attack
 * skip, 200 ms window, pass/voiced ratios, roll grace, onset merge) is NoteVerifier's,
 * so WaitStateMachine serves it unchanged.
 */
export class PitchVerifier implements AcousticVerifier {
  readonly config: Readonly<VerifierConfig & PitchConfig>;
  readonly targetMidi: number;

  private open = false;
  private clusterStartMs = 0;
  private windowStartMs = 0;
  private frames: Array<{ tMs: number; voiced: boolean; passed: boolean }> = [];
  /** Rounded MIDI of every credible frame in the attempt → [count, best clarity]. */
  private heard = new Map<number, [number, number]>();
  private _lastHeardMidi = -1;
  private readonly matcher: NoteMatcher;

  constructor(targetMidi: number, config: Partial<VerifierConfig & PitchConfig> = {}, matcher: NoteMatcher = defaultMatcher) {
    this.config = Object.freeze({ ...DEFAULT_VERIFIER_CONFIG, ...DEFAULT_PITCH_CONFIG, ...config });
    this.targetMidi = Math.round(targetMidi);
    this.matcher = matcher;
  }

  get isOpen(): boolean {
    return this.open;
  }

  /** MIDI note heard most often (credible frames only) in the last decided attempt, −1 if none. */
  get lastHeardMidi(): number {
    return this._lastHeardMidi;
  }

  reset(): void {
    this.open = false;
    this.frames = [];
    this.heard.clear();
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
    const usableHz = frame.voiced && hz != null && Number.isFinite(hz) && hz > 0;
    if (usableHz && frame.ringing && hz >= DEFAULT_CHROMA_CONFIG.minFreqHz && Math.abs(centsOff(hz, this.targetMidi)) <= RINGING_NEAR_CENTS) {
      // A neighbouring note still rings: pitchy measures the mix (F4 over a ringing G4 reads
      // ~380 Hz, often below the clarity floor), but the ringing-subtracted chroma holds the new
      // note. The reading is near the target, so the octave is right; the chroma decides.
      passed = this.chromaPasses(frame);
    } else if (usableHz && clarity >= cfg.minClarity) {
      if (hz < DEFAULT_CHROMA_CONFIG.minFreqHz) {
        passed = this.chromaPasses(frame);
      } else if (hz <= DEFAULT_CHROMA_CONFIG.maxFreqHz) {
        passed = Math.abs(centsOff(hz, this.targetMidi)) <= cfg.centsTolerance && this.chromaPasses(frame);
        const midi = Math.round(freqToMidi(hz));
        const seen = this.heard.get(midi);
        if (seen) {
          seen[0]++;
          seen[1] = Math.max(seen[1], clarity);
        } else this.heard.set(midi, [1, clarity]);
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
    this._lastHeardMidi = kind === 'match' ? this.targetMidi : this.mostHeard();
    this.reset();
    return result;
  }

  private chromaPasses(frame: AcousticFrame): boolean {
    return this.matcher.match(frame.chroma, this.targetMidi, frame.ringing ?? false).passes;
  }

  /**
   * The note to name in "That sounded like …": the most frequent credible pitch within
   * PLAUSIBLE_SEMITONES of the target (octave errors included). Further away it is almost
   * always a subharmonic of overlapping notes, so the cue falls back to "Not quite" (−1).
   */
  private mostHeard(): number {
    let best = -1;
    let bestCount = 0;
    let bestClarity = -1;
    for (const [midi, [count, clarity]] of this.heard) {
      if (Math.abs(midi - this.targetMidi) > PLAUSIBLE_SEMITONES) continue;
      if (count > bestCount || (count === bestCount && clarity > bestClarity)) {
        best = midi;
        bestCount = count;
        bestClarity = clarity;
      }
    }
    return best;
  }

  private openAt(onsetMs: number, newCluster: boolean): void {
    if (newCluster) this.clusterStartMs = onsetMs;
    this.open = true;
    this.windowStartMs = onsetMs;
    this.frames = [];
    this.heard.clear();
  }
}
