/**
 * KAN-257 — HUD colour tones and the precomputed crossfade LUT.
 *
 * Colours are discrete states (Tone). A change of state crossfades over a short time, but
 * the crossfade is QUANTISED to `FADE_STEPS` precomputed colours, interpolated in OKLab.
 * (A plain sRGB lerp between green and red passes through a muddy olive brown.)
 *
 * Why quantise: every bone in the same (from, to, step) shares one interned CSS string with a
 * numeric id, so the renderer can batch strokes by colour id. That keeps the work to a few
 * `stroke()` calls per frame and allocates no strings in the rAF loop.
 */

/** Plain object instead of `const enum` so it survives `isolatedModules` / esbuild unchanged. */
export const Tone = {
  Ok: 0,
  Violation: 1,
  Advisory: 2,
  Unknown: 3,
} as const;
export type Tone = (typeof Tone)[keyof typeof Tone];

export const TONE_COUNT = 4;

/** Neon palette, aligned with tailwind `muz.*` (accentStrong, danger, warning, muted). */
export const TONE_HEX: readonly string[] = [
  '#54d18c', // Ok: green
  '#ff5d73', // Violation: red (gating metrics only, SRS 3.1.5.5)
  '#ffb454', // Advisory: amber (non-gating cues)
  '#9aa8bd', // Unknown: muted grey
];

/** Number of colours from `from` to `to`, inclusive of both ends. */
export const FADE_STEPS = 7;

/** Crossfade duration for a tone change (ms). */
export const TONE_FADE_MS = 150;

// ---------------------------------------------------------------------------------------------
// OKLab (Björn Ottosson, 2020)

type Rgb = [number, number, number];
type Lab = [number, number, number];

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c: number): number {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.min(1, Math.max(0, v));
}

export function hexToRgb(hex: string): Rgb {
  const h = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error(`bad hex colour: ${hex}`);
  return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
}

export function rgbToHex([r, g, b]: Rgb): string {
  const to = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function rgbToOklab([r8, g8, b8]: Rgb): Lab {
  const r = srgbToLinear(r8);
  const g = srgbToLinear(g8);
  const b = srgbToLinear(b8);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function oklabToRgb([L, A, B]: Lab): Rgb {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

export function mixOklab(fromHex: string, toHex: string, t: number): string {
  const a = rgbToOklab(hexToRgb(fromHex));
  const b = rgbToOklab(hexToRgb(toHex));
  return rgbToHex(oklabToRgb([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]));
}

// ---------------------------------------------------------------------------------------------
// LUT: id = (from · TONE_COUNT + to) · FADE_STEPS + step

export const COLOR_COUNT = TONE_COUNT * TONE_COUNT * FADE_STEPS;

/** Interned CSS colour strings, indexed by colour id. Built once at module load. */
export const COLOR_LUT: readonly string[] = (() => {
  const lut: string[] = new Array(COLOR_COUNT);
  for (let from = 0; from < TONE_COUNT; from++) {
    for (let to = 0; to < TONE_COUNT; to++) {
      for (let step = 0; step < FADE_STEPS; step++) {
        const id = (from * TONE_COUNT + to) * FADE_STEPS + step;
        lut[id] = from === to ? TONE_HEX[to] : mixOklab(TONE_HEX[from], TONE_HEX[to], step / (FADE_STEPS - 1));
      }
    }
  }
  return lut;
})();

export function colorId(from: Tone, to: Tone, progress: number): number {
  const p = progress <= 0 ? 0 : progress >= 1 ? 1 : progress;
  const step = from === to ? FADE_STEPS - 1 : Math.round(p * (FADE_STEPS - 1));
  return (from * TONE_COUNT + to) * FADE_STEPS + step;
}

/** The colour id a fully settled tone resolves to. */
export function toneColorId(tone: Tone): number {
  return colorId(tone, tone, 1);
}

// ---------------------------------------------------------------------------------------------

/** One animated colour channel ("slot"): a crossfade between two tones. Mutable, no allocation. */
export interface ToneAnim {
  from: Tone;
  to: Tone;
  /** 0 → 1 */
  progress: number;
}

export function createToneAnim(initial: Tone = Tone.Unknown): ToneAnim {
  return { from: initial, to: initial, progress: 1 };
}

/** Retargets the slot. Reversing mid-fade runs backwards smoothly instead of jumping. */
export function setToneTarget(anim: ToneAnim, target: Tone): void {
  if (anim.to === target) return;
  if (anim.from === target && anim.progress < 1) {
    anim.from = anim.to;
    anim.to = target;
    anim.progress = 1 - anim.progress;
    return;
  }
  anim.from = anim.progress >= 0.5 ? anim.to : anim.from;
  anim.to = target;
  anim.progress = anim.from === target ? 1 : 0;
}

/** Advances the fade. Returns true while it is still animating. */
export function stepToneAnim(anim: ToneAnim, dtMs: number, fadeMs = TONE_FADE_MS): boolean {
  if (anim.progress >= 1) return false;
  anim.progress = fadeMs <= 0 ? 1 : Math.min(1, anim.progress + dtMs / fadeMs);
  if (anim.progress >= 1) anim.from = anim.to;
  return anim.progress < 1;
}

export function toneAnimColorId(anim: ToneAnim): number {
  return colorId(anim.from, anim.to, anim.progress);
}
