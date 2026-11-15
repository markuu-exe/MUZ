import { harmonicTemplate } from '../chords/ChordMatcher';
import { pc as wrapPc } from '../dsp/pitch';
import { DEFAULT_NOTE_MATCHER_CONFIG, type NoteMatcherConfig } from './noteConfig';

export interface NoteMatch {
  /** Cosine similarity to the target note's harmonic template. */
  similarity: number;
  /** Strongest pitch class after harmonic-leakage compensation (what was actually played). */
  heardPc: number;
  /** Strongest other pitch class relative to the target, after compensation. */
  extraTone: number;
  passes: boolean;
}

/**
 * COURSE-5: single-note matcher on the chroma stream (pitch class only).
 *
 * Why chroma and not pitchy: raw audio never leaves the AudioWorklet (KAN-260,
 * SRS 3.5.1), so the main thread has no samples to autocorrelate. The octave is
 * therefore NOT checked: any C passes a "play C4" drill. SRS 3.1.6.2 (f0 within
 * 35 cents, confidence ≥ 0.85) stays open as its own ticket.
 *
 * Decision rule (all must hold):
 *   similarity ≥ 0.72                     — the frame looks like one piano note on the target
 *   heardPc === target                    — the target is the strongest fundamental
 *   extraTone ≤ 0.45 (0.6 when ringing)   — no second note (a dyad or chord is not "the note")
 */
export class NoteMatcher {
  readonly config: Readonly<NoteMatcherConfig>;
  private readonly templates: Float64Array[];
  private readonly comp = new Float64Array(12);

  constructor(config: Partial<NoteMatcherConfig> = {}) {
    this.config = Object.freeze({ ...DEFAULT_NOTE_MATCHER_CONFIG, ...config });
    const { harmonics, harmonicDecay } = this.config;
    this.templates = Array.from({ length: 12 }, (_, p) => harmonicTemplate([p], harmonics, harmonicDecay));
  }

  /** @param target pitch class 0–11, or a MIDI note (folded to its pitch class). */
  match(chroma: ArrayLike<number>, target: number, ringing = false): NoteMatch {
    const cfg = this.config;
    const t = wrapPc(target);

    let norm = 0;
    for (let i = 0; i < 12; i++) norm += chroma[i] * chroma[i];
    norm = Math.sqrt(norm);
    if (norm <= 0) return { similarity: 0, heardPc: -1, extraTone: 0, passes: false };

    const template = this.templates[t];
    let dot = 0;
    for (let i = 0; i < 12; i++) dot += chroma[i] * template[i];
    const similarity = dot / norm;

    // Same leakage compensation as ChordMatcher: remove each tone's 3rd harmonic
    // (a fifth up) and 5th harmonic (a major third up) before comparing levels.
    const d = cfg.harmonicDecay;
    const k3 = d * d;
    const k5 = d ** 4;
    const comp = this.comp;
    for (let i = 0; i < 12; i++) comp[i] = chroma[i];
    for (let p = 0; p < 12; p++) {
      comp[(p + 7) % 12] -= k3 * chroma[p];
      comp[(p + 4) % 12] -= k5 * chroma[p];
    }
    let heardPc = 0;
    let max = -Infinity;
    for (let i = 0; i < 12; i++) {
      if (comp[i] < 0) comp[i] = 0;
      if (comp[i] > max) {
        max = comp[i];
        heardPc = i;
      }
    }
    let extraTone = 0;
    if (comp[t] > 0) {
      for (let i = 0; i < 12; i++) if (i !== t) extraTone = Math.max(extraTone, comp[i] / comp[t]);
    } else {
      extraTone = Infinity;
    }

    const passes =
      similarity >= cfg.minSimilarity &&
      heardPc === t &&
      extraTone <= (ringing ? cfg.maxExtraToneRinging : cfg.maxExtraTone);
    return { similarity, heardPc, extraTone, passes };
  }
}
