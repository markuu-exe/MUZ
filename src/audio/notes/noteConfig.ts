/**
 * COURSE-5 tunables for single-note verification. Kept out of ../config.ts so the
 * KAN-260 files stay untouched; the same rule applies: thresholds live here only.
 * Values are tuned on the synthetic piano in ../__tests__/fixtures.ts and must be
 * re-checked on a real piano (see TASKS/COURSE-5-practice/COPILOT_PLAN.md §6).
 */
export interface NoteMatcherConfig {
  /** Cosine similarity floor against the note's harmonic template (same floor as chords, SRS 3.1.6.4). */
  minSimilarity: number;
  /** No other pitch class may exceed this share of the target after harmonic-leakage compensation. */
  maxExtraTone: number;
  /** Same ceiling on frames where a previous sound was still ringing (residue subtracted). */
  maxExtraToneRinging: number;
  /** Harmonic template model; keep equal to MatcherConfig so notes and chords agree. */
  harmonics: number;
  harmonicDecay: number;
}

export const DEFAULT_NOTE_MATCHER_CONFIG: Readonly<NoteMatcherConfig> = Object.freeze({
  minSimilarity: 0.72,
  maxExtraTone: 0.45,
  maxExtraToneRinging: 0.6,
  harmonics: 6,
  harmonicDecay: 0.6,
});
