import { DEFAULT_VERIFIER_CONFIG, type VerifierConfig } from '../config';
import type { ChordMatch, ChordMatcher } from '../chords/ChordMatcher';
import type { ChordSpec } from '../chords/vocabulary';

/** A chroma frame on the main-thread clock (performance.now() ms). */
export interface AcousticFrame {
  tMs: number;
  chroma: ArrayLike<number>;
  voiced: boolean;
  /** ChromaFrame.ringing — previous sound subtracted from this frame. Optional for non-chord verifiers. */
  ringing?: boolean;
  onset: boolean;
  onsetMs: number;
  /** T-08: pitchy f0 for this hop (Hz); null when unvoiced or no pitch found. Read by PitchVerifier (T-07). */
  pitchHz?: number | null;
  /** T-08: pitchy clarity 0..1 (0 when pitchHz is null). */
  clarity?: number;
}

export type AttemptKind =
  /** Target held for ≥ 80 % of the 200 ms window after an onset. */
  | 'match'
  /** Confident tonal input that is not the target — counts toward the 3-miss penalty. */
  | 'miss'
  /** Onset without enough tonal energy (knock, cough, key click) — ignored. */
  | 'unvoiced';

export interface AttemptResult {
  kind: AttemptKind;
  onsetMs: number;
  decidedMs: number;
  passRatio: number;
  voicedRatio: number;
  /** Match details from the window's most representative voiced frame, for cue text. */
  detail: ChordMatch | null;
}

/** Contract shared with the single-note verifier (pitchy) so one wait-state machine serves both modes. */
export interface AcousticVerifier {
  push(frame: AcousticFrame): AttemptResult | null;
  reset(): void;
  readonly isOpen: boolean;
}

/**
 * KAN-266/267 bridge: turns the per-frame matcher into onset-gated attempts.
 * SRS 3.1.6.4: similarity ≥ 0.72 "coincident with an audio onset energy peak
 * and sustained across a 200 ms temporal verification window".
 * A clean strike is decided exactly 200 ms after the onset, over the frames in
 * [onset + attackSkipMs, onset + 200 ms] (≈ 15 frames at hop 512 / 48 kHz).
 * If that window fails, it keeps sliding for up to `rollGraceMs` (staggered
 * notes whose onsets fell inside the detector's refractory period); a miss is
 * therefore decided at onset + 350 ms.
 *
 * Rolled chords: onsets within `onsetMergeMs` of the first onset of an attempt
 * restart the window from the latest onset instead of opening a new attempt,
 * so a beginner's staggered C–E–G is one attempt, not three misses.
 */
export class ChordVerifier implements AcousticVerifier {
  readonly config: Readonly<VerifierConfig>;
  private readonly matcher: ChordMatcher;
  private readonly target: ChordSpec;

  private open = false;
  private clusterStartMs = 0;
  private windowStartMs = 0;
  /** Judged frames of the open attempt (≤ ~35 at hop 512). */
  private frames: Array<{ tMs: number; voiced: boolean; passed: boolean }> = [];
  private bestDetail: ChordMatch | null = null;

  constructor(matcher: ChordMatcher, target: string | ChordSpec, config: Partial<VerifierConfig> = {}) {
    this.config = Object.freeze({ ...DEFAULT_VERIFIER_CONFIG, ...config });
    this.matcher = matcher;
    this.target = matcher.compile(target);
  }

  get isOpen(): boolean {
    return this.open;
  }

  get chord(): ChordSpec {
    return this.target;
  }

  reset(): void {
    this.open = false;
    this.frames = [];
    this.bestDetail = null;
  }

  push(frame: AcousticFrame): AttemptResult | null {
    const cfg = this.config;

    if (frame.onset) {
      if (!this.open) {
        this.openAt(frame.onsetMs, true);
      } else if (frame.onsetMs - this.clusterStartMs <= cfg.onsetMergeMs) {
        this.openAt(frame.onsetMs, false); // rolled chord: restart window from the newest note
      } else {
        // A fresh strike while the previous window is still open supersedes it.
        // The interrupted attempt is not judged (prevents mashing from costing hearts twice).
        this.openAt(frame.onsetMs, true);
      }
    }
    if (!this.open) return null;

    const sinceOnset = frame.tMs - this.windowStartMs;
    if (sinceOnset < cfg.attackSkipMs) return null;

    let passed = false;
    if (frame.voiced) {
      const m = this.matcher.match(frame.chroma, this.target, frame.ringing ?? false);
      passed = m.passes;
      if (!this.bestDetail || m.similarity > this.bestDetail.similarity) this.bestDetail = m;
    }
    this.frames.push({ tMs: frame.tMs, voiced: frame.voiced, passed });

    if (sinceOnset < cfg.sustainWindowMs) return null;

    // Judge the trailing window of length (sustain − attackSkip) ending at this frame.
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

    // Out of grace: decide on the whole attempt.
    let allVoiced = 0;
    for (const f of this.frames) if (f.voiced) allVoiced++;
    const attemptVoiced = this.frames.length > 0 ? allVoiced / this.frames.length : 0;
    return this.finish(attemptVoiced < cfg.minVoicedRatio ? 'unvoiced' : 'miss', frame.tMs, passRatio, attemptVoiced);
  }

  private finish(kind: AttemptKind, decidedMs: number, passRatio: number, voicedRatio: number): AttemptResult {
    const result: AttemptResult = {
      kind,
      onsetMs: this.clusterStartMs,
      decidedMs,
      passRatio,
      voicedRatio,
      detail: this.bestDetail,
    };
    this.reset();
    return result;
  }

  private openAt(onsetMs: number, newCluster: boolean): void {
    if (newCluster) this.clusterStartMs = onsetMs;
    this.open = true;
    this.windowStartMs = onsetMs;
    this.frames = [];
    this.bestDetail = null;
  }
}
