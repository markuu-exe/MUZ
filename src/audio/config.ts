/**
 * KAN-260 tunables. Spec-fixed values are marked SPEC and must not be changed
 * without an SRS/SDD amendment. Everything else is an engineering default
 * validated in simulation (see TASKS/KAN-260/COPILOT_PLAN.md §3) and should be
 * re-tuned on real piano recordings.
 */

export interface ChromaConfig {
  /** Analysis window in samples. SPEC: SRS 3.1.6.1 / SDD 4.2 (fftSize 4096). Power of two. */
  fftSize: number;
  /** Hop between analysis frames, in samples. 512 = 10.7 ms @ 48 kHz. */
  hopSize: number;
  /** Lowest / highest partial frequency used for chroma (Hz). */
  minFreqHz: number;
  maxFreqHz: number;
  /** Log compression strength: Y = log1p(gamma * |X| / max|X|). */
  logGamma: number;
  /** Peak threshold = median(Y) * floorMedianFactor + floorOffset. */
  floorMedianFactor: number;
  floorOffset: number;
  /** Absolute gate: frames quieter than this (dBFS RMS) produce an all-zero chroma. */
  minRmsDb: number;
  /** Adaptive gate: frames must also be this many dB above the tracked room-noise level. */
  noiseGateDb: number;
  /** Onset detection: adaptive threshold = median + k * MAD of recent flux. */
  onsetK: number;
  onsetHistoryFrames: number;
  /** Absolute minimum flux for an onset (guards against triggering on near-silence). */
  onsetMinFlux: number;
  /** Flux must also exceed this multiple of the recent median (rejects beating in a sustained chord). */
  onsetMedianRatio: number;
  /** Short-window (1024) energy must rise by this many dB over the quietest of the previous 3 hops. */
  onsetMinRiseDb: number;
  /** Minimum time between two reported onsets (ms). */
  onsetRefractoryMs: number;
  /** After an onset, subtract the pre-onset spectrum for this long (ms). Covers the 200 ms sustain window. */
  residueHoldMs: number;
  /** Over-subtraction factor for the residue (spectral-subtraction α). Swept 1–2 in simulation: 1 is best. */
  residueOverSubtract: number;
  /** Onsets within this time of the residue-capturing onset keep the original residue (rolled chords). Match VerifierConfig.onsetMergeMs. */
  residueRecaptureMs: number;
}

export const DEFAULT_CHROMA_CONFIG: Readonly<ChromaConfig> = Object.freeze({
  fftSize: 4096, // SPEC
  hopSize: 512,
  minFreqHz: 55,
  maxFreqHz: 5000,
  logGamma: 100,
  floorMedianFactor: 2,
  floorOffset: 0.05,
  minRmsDb: -65,
  noiseGateDb: 10,
  onsetK: 4,
  onsetHistoryFrames: 30,
  onsetMinFlux: 0.5,
  onsetMedianRatio: 3,
  onsetMinRiseDb: 2,
  onsetRefractoryMs: 60,
  residueHoldMs: 500,
  residueOverSubtract: 1,
  residueRecaptureMs: 150,
});

export interface MatcherConfig {
  /** Cosine similarity floor. SPEC: SRS 3.1.6.4 / SDD C-06 (≥ 0.72). */
  minSimilarity: number;
  /** Every chord tone must reach this share of the strongest pitch class AFTER harmonic-leakage compensation. */
  minToneCoverage: number;
  /** Target must beat the best other full chord in the vocabulary by this much (supersets of the target excluded). */
  minFullChordMargin: number;
  /** No non-chord pitch class may exceed this share of the strongest one (after leakage compensation). Catches added notes (C7 for C) and fat-fingered neighbours. */
  maxExtraTone: number;
  /** Extra-tone ceiling on frames where a previous chord was still ringing at the onset (residue subtracted). */
  maxExtraToneRinging: number;
  /** Target must beat its own partial voicings (root alone, any 2-tone subset) by this much. */
  minPartialMargin: number;
  /** Harmonic template model: harmonics 1..harmonics, amplitude decay^(h-1). */
  harmonics: number;
  harmonicDecay: number;
}

export const DEFAULT_MATCHER_CONFIG: Readonly<MatcherConfig> = Object.freeze({
  minSimilarity: 0.72, // SPEC
  minToneCoverage: 0.25,
  minFullChordMargin: 0.03,
  maxExtraTone: 0.35,
  maxExtraToneRinging: 0.5,
  minPartialMargin: 0.01,
  harmonics: 6,
  harmonicDecay: 0.6,
});

export interface VerifierConfig {
  /** Sustain window after the onset. SPEC: SRS 3.1.6.4 (200 ms). */
  sustainWindowMs: number;
  /** Share of gated-on frames in the window that must pass the matcher. */
  minPassRatio: number;
  /** Share of window frames that must carry tonal energy for the attempt to count at all. */
  minVoicedRatio: number;
  /** Onsets within this time of the first onset of a cluster are one attempt (rolled chords). */
  onsetMergeMs: number;
  /**
   * Frames this soon after the onset are not judged: their 85 ms analysis window
   * is still mostly pre-onset audio + attack transient. ≈ fftSize / sampleRate / 2.
   */
  attackSkipMs: number;
  /**
   * Rolled / staggered chords: if the window ending at onset + 200 ms does not pass,
   * keep sliding it for up to this long (window length stays 200 − attackSkip ms).
   * A clean strike still decides at exactly onset + 200 ms.
   */
  rollGraceMs: number;
}

export const DEFAULT_VERIFIER_CONFIG: Readonly<VerifierConfig> = Object.freeze({
  sustainWindowMs: 200, // SPEC
  minPassRatio: 0.8,
  minVoicedRatio: 0.5,
  onsetMergeMs: 150,
  attackSkipMs: 45,
  rollGraceMs: 150,
});

/** T-07: single-note acceptance (SRS 3.1.6.2). */
export interface PitchConfig {
  /** Max distance from the exact target note. SPEC: SRS 3.1.6.2 (±35 cents). */
  centsTolerance: number;
  /** Frames with lower pitchy clarity never pass. SPEC: SRS 3.1.6.2 (0.85). */
  minClarity: number;
}

export const DEFAULT_PITCH_CONFIG: Readonly<PitchConfig> = Object.freeze({
  centsTolerance: 35, // SPEC
  minClarity: 0.85, // SPEC
});

export interface WaitStateConfig {
  /** Posture and acoustic criteria must coincide within this window. SPEC: SRS 3.1.6.5 (400 ms). */
  latchWindowMs: number;
  /** Drill timeout. SPEC: SRS 3.1.2.4 / SDD C-06 (15 s). Lesson payload `timeoutSec` overrides. */
  timeoutMs: number;
  /** Consecutive wrong attempts that cost a heart. SPEC: SRS 3.1.2.4 (3). */
  maxConsecutiveMisses: number;
}

export const DEFAULT_WAIT_STATE_CONFIG: Readonly<WaitStateConfig> = Object.freeze({
  latchWindowMs: 400, // SPEC
  timeoutMs: 15_000, // SPEC
  maxConsecutiveMisses: 3, // SPEC
});
