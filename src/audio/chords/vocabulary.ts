import { PITCH_CLASS_NAMES, pc } from '../dsp/pitch';

export type ChordQuality = 'maj' | 'min' | 'dim' | 'aug' | '7' | 'maj7' | 'm7';

/** Intervals in semitones above the root, root first. */
export const QUALITY_INTERVALS: Readonly<Record<ChordQuality, readonly number[]>> = Object.freeze({
  maj: [0, 4, 7],
  min: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  '7': [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
});

export interface ChordSpec {
  /** Canonical label, e.g. "C", "Am", "F#7", "Bbmaj7" is canonicalised to "A#maj7". */
  label: string;
  root: number;
  quality: ChordQuality;
  /** Pitch classes, root first. */
  pcs: readonly number[];
}

const ROOT_RE = /^([A-Ga-g])([#b♯♭]?)(.*)$/;
const LETTER: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/**
 * Suffix aliases. Covers the seed format ("C", "Am") and the SDD C-06 format
 * ("G_Maj"), plus common spellings. First match wins.
 */
const SUFFIX: Array<[RegExp, ChordQuality]> = [
  // Case-sensitive single-letter forms first: "m" = minor, "M" = major.
  [/^(M|)$/, 'maj'],
  [/^(m|-)$/, 'min'],
  [/^(M7|Δ7?)$/, 'maj7'],
  [/^(m7|-7)$/, 'm7'],
  // Word forms, any case, optional "_" (SDD C-06 uses "G_Maj").
  [/^_?(maj|major)$/i, 'maj'],
  [/^_?(min|minor)$/i, 'min'],
  [/^_?(maj7|major7)$/i, 'maj7'],
  [/^_?(min7|minor7)$/i, 'm7'],
  [/^(_?dim|°|o)$/i, 'dim'],
  [/^(_?aug|\+)$/i, 'aug'],
  [/^_?(7|dom7)$/i, '7'],
];

export class ChordParseError extends Error {
  constructor(input: string) {
    super(`Unrecognised chord target "${input}"`);
    this.name = 'ChordParseError';
  }
}

/** Parse a lesson `target` string into a chord spec. Throws ChordParseError. */
export function parseChord(input: string): ChordSpec {
  const m = ROOT_RE.exec(input.trim());
  if (!m) throw new ChordParseError(input);
  const [, letter, accidental, rest] = m;
  let root = LETTER[letter.toUpperCase()];
  if (accidental === '#' || accidental === '♯') root += 1;
  if (accidental === 'b' || accidental === '♭') root -= 1;
  root = pc(root);

  let quality: ChordQuality | undefined;
  for (const [re, q] of SUFFIX) {
    if (re.test(rest)) {
      quality = q;
      break;
    }
  }
  if (!quality) throw new ChordParseError(input);
  return makeChord(root, quality);
}

const LABEL_SUFFIX: Record<ChordQuality, string> = {
  maj: '',
  min: 'm',
  dim: 'dim',
  aug: 'aug',
  '7': '7',
  maj7: 'maj7',
  m7: 'm7',
};

export function makeChord(root: number, quality: ChordQuality): ChordSpec {
  const r = pc(root);
  return {
    label: `${PITCH_CLASS_NAMES[r]}${LABEL_SUFFIX[quality]}`,
    root: r,
    quality,
    pcs: QUALITY_INTERVALS[quality].map((i) => pc(r + i)),
  };
}

/** Every chord in the recognition vocabulary (12 roots × 7 qualities = 84). */
export function fullVocabulary(): ChordSpec[] {
  const out: ChordSpec[] = [];
  for (let r = 0; r < 12; r++) {
    for (const q of Object.keys(QUALITY_INTERVALS) as ChordQuality[]) out.push(makeChord(r, q));
  }
  return out;
}
