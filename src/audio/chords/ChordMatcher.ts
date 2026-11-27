import { DEFAULT_MATCHER_CONFIG, type MatcherConfig } from '../config';
import { fullVocabulary, parseChord, type ChordSpec } from './vocabulary';

/**
 * Harmonic chord template: every chord tone contributes harmonics 1..H with
 * amplitude decay^(h-1), folded to pitch classes, then L2-normalised.
 * Modelling overtones in the template (instead of trying to remove them from
 * the signal) is what makes a played triad score ≈ 0.95 instead of ≈ 0.85.
 */
export function harmonicTemplate(pcs: readonly number[], harmonics: number, decay: number): Float64Array {
  const v = new Float64Array(12);
  for (const p of pcs) {
    for (let h = 1; h <= harmonics; h++) {
      const offset = Math.round(12 * Math.log2(h));
      v[(p + offset) % 12] += decay ** (h - 1);
    }
  }
  let n = 0;
  for (let i = 0; i < 12; i++) n += v[i] * v[i];
  n = Math.sqrt(n);
  for (let i = 0; i < 12; i++) v[i] /= n;
  return v;
}

/**
 * Harmonic-leakage compensation, shared by grading (ChordMatcher.match) and the
 * live "Hearing" display (src/practice/heard.ts) so the two cannot disagree about
 * which pitch classes are sounding. A tone's 3rd harmonic lands a fifth up
 * (decay² ≈ 0.36) and its 5th harmonic a major third up (decay⁴ ≈ 0.13); both
 * are subtracted, negatives clamp to 0. Returns the maximum of the result.
 * Without this, root + third alone "covers" the fifth via the root's 3rd harmonic.
 */
export function compensateHarmonics(chroma: ArrayLike<number>, decay: number, out: Float64Array): number {
  const k3 = decay * decay;
  const k5 = decay ** 4;
  for (let i = 0; i < 12; i++) out[i] = chroma[i] ?? 0;
  for (let p = 0; p < 12; p++) {
    const v = chroma[p] ?? 0;
    out[(p + 7) % 12] -= k3 * v;
    out[(p + 4) % 12] -= k5 * v;
  }
  let max = 0;
  for (let i = 0; i < 12; i++) {
    if (out[i] < 0) out[i] = 0;
    if (out[i] > max) max = out[i];
  }
  return max;
}

function dot(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < 12; i++) s += a[i] * b[i];
  return s;
}

export interface ChordMatch {
  /** Cosine similarity to the target's harmonic template (SRS 3.1.6.4 score). */
  similarity: number;
  /** Weakest chord tone's share of the strongest pitch class, after harmonic-leakage compensation. */
  toneCoverage: number;
  /** similarity − best other full chord that is not a superset of the target. */
  fullChordMargin: number;
  /** Strongest non-chord pitch class relative to the strongest pitch class, after leakage compensation. */
  extraTone: number;
  /** similarity − best partial voicing of the target (root alone, any 2-tone subset). */
  partialMargin: number;
  /** Best competing full chord (useful for cue text: "Sounds like C minor"). */
  closest: { label: string; similarity: number };
  /** Index (into target.pcs) of the weakest tone — e.g. 2 = the fifth is missing. */
  weakestTone: number;
  passes: boolean;
}

interface Compiled {
  spec: ChordSpec;
  isChordTone: boolean[];
  template: Float64Array;
  partials: Float64Array[];
  rivals: Array<{ label: string; template: Float64Array }>;
}

/**
 * KAN-266 matcher. Decision rule (all must hold):
 *   similarity ≥ 0.72 (SPEC)          — SRS 3.1.6.4
 *   toneCoverage ≥ 0.25               — every chord tone is actually sounding
 *   extraTone ≤ 0.35 (0.5 if ringing) — no added note (C7 / Cmaj7 / neighbour key for C)
 *   fullChordMargin ≥ 0.03            — not a neighbouring chord (Am vs F, C vs Em…)
 *   partialMargin ≥ 0.01              — not just the root, or a dyad
 * Supersets (Am7 ⊃ C) are excluded from the margin test because a correct triad
 * can never beat them by much; the extraTone rule rejects them instead.
 * Any inversion or voicing of the pitch-class set passes (chroma is octave-folded by design).
 */
export class ChordMatcher {
  readonly config: Readonly<MatcherConfig>;
  private readonly vocab: Array<{ label: string; key: string; pcs: readonly number[]; template: Float64Array }>;
  private readonly cache = new Map<string, Compiled>();
  private readonly comp = new Float64Array(12);

  constructor(config: Partial<MatcherConfig> = {}) {
    this.config = Object.freeze({ ...DEFAULT_MATCHER_CONFIG, ...config });
    const { harmonics, harmonicDecay } = this.config;
    this.vocab = fullVocabulary().map((c) => ({
      label: c.label,
      key: [...c.pcs].sort((a, b) => a - b).join(','),
      pcs: c.pcs,
      template: harmonicTemplate(c.pcs, harmonics, harmonicDecay),
    }));
  }

  /** Pre-compile a target (also validates it). Throws ChordParseError. */
  compile(target: string | ChordSpec): ChordSpec {
    return this.get(target).spec;
  }

  /**
   * @param ringing true when a previous sound was still ringing at the onset
   *   (ChromaFrame.ringing). Pitch classes left over from it are tolerated up to
   *   `maxExtraToneRinging` instead of `maxExtraTone`.
   */
  match(chroma: ArrayLike<number>, target: string | ChordSpec, ringing = false): ChordMatch {
    const c = this.get(target);
    const cfg = this.config;

    let maxC = 0;
    for (let i = 0; i < 12; i++) if (chroma[i] > maxC) maxC = chroma[i];
    if (maxC <= 0) {
      return {
        similarity: 0,
        toneCoverage: 0,
        fullChordMargin: 0,
        partialMargin: 0,
        extraTone: 0,
        closest: { label: '', similarity: 0 },
        weakestTone: 0,
        passes: false,
      };
    }

    let norm = 0;
    for (let i = 0; i < 12; i++) norm += chroma[i] * chroma[i];
    norm = Math.sqrt(norm);
    const similarity = dot(chroma, c.template) / norm;

    let bestRival = -Infinity;
    let bestRivalLabel = '';
    for (const r of c.rivals) {
      const s = dot(chroma, r.template) / norm;
      if (s > bestRival) {
        bestRival = s;
        bestRivalLabel = r.label;
      }
    }
    let bestPartial = -Infinity;
    for (const p of c.partials) bestPartial = Math.max(bestPartial, dot(chroma, p) / norm);

    // Harmonic-leakage compensation (shared with the Hearing display).
    const comp = this.comp;
    const maxComp = compensateHarmonics(chroma, cfg.harmonicDecay, comp);
    let toneCoverage = Infinity;
    let weakestTone = 0;
    c.spec.pcs.forEach((p, idx) => {
      const v = maxComp > 0 ? comp[p] / maxComp : 0;
      if (v < toneCoverage) {
        toneCoverage = v;
        weakestTone = idx;
      }
    });
    let extraTone = 0;
    for (let i = 0; i < 12; i++) {
      if (!c.isChordTone[i] && maxComp > 0) extraTone = Math.max(extraTone, comp[i] / maxComp);
    }

    const fullChordMargin = similarity - bestRival;
    const partialMargin = similarity - bestPartial;
    const passes =
      similarity >= cfg.minSimilarity &&
      toneCoverage >= cfg.minToneCoverage &&
      extraTone <= (ringing ? cfg.maxExtraToneRinging : cfg.maxExtraTone) &&
      fullChordMargin >= cfg.minFullChordMargin &&
      partialMargin >= cfg.minPartialMargin;

    return {
      similarity,
      toneCoverage,
      fullChordMargin,
      extraTone,
      partialMargin,
      closest: { label: bestRivalLabel, similarity: bestRival },
      weakestTone,
      passes,
    };
  }

  private get(target: string | ChordSpec): Compiled {
    const spec = typeof target === 'string' ? parseChord(target) : target;
    const hit = this.cache.get(spec.label);
    if (hit) return hit;

    const { harmonics, harmonicDecay } = this.config;
    const ownKey = [...spec.pcs].sort((a, b) => a - b).join(',');
    const isChordTone = Array.from({ length: 12 }, (_, i) => spec.pcs.includes(i));
    const compiled: Compiled = {
      spec,
      isChordTone,
      template: harmonicTemplate(spec.pcs, harmonics, harmonicDecay),
      partials: partialVoicings(spec.pcs).map((p) => harmonicTemplate(p, harmonics, harmonicDecay)),
      // Rivals: every other pitch-class set in the vocabulary, except the target's own
      // set (enharmonic duplicates such as C+ / E+) and its supersets (handled by extraTone).
      rivals: this.vocab.filter((v) => v.key !== ownKey && !spec.pcs.every((p) => v.pcs.includes(p))),
    };
    this.cache.set(spec.label, compiled);
    return compiled;
  }
}

/** Root alone and every proper subset with ≥ 2 tones (for a triad: R, R3, R5, 35). */
export function partialVoicings(pcs: readonly number[]): number[][] {
  const out: number[][] = [[pcs[0]]];
  const n = pcs.length;
  for (let mask = 1; mask < (1 << n) - 1; mask++) {
    const subset: number[] = [];
    for (let i = 0; i < n; i++) if (mask & (1 << i)) subset.push(pcs[i]);
    if (subset.length >= 2) out.push(subset);
  }
  return out;
}
