import { describe, expect, it } from 'vitest';
import {
  COLOR_LUT,
  colorId,
  createToneAnim,
  FADE_STEPS,
  hexToRgb,
  mixOklab,
  oklabToRgb,
  rgbToHex,
  rgbToOklab,
  setToneTarget,
  stepToneAnim,
  Tone,
  TONE_HEX,
  toneAnimColorId,
  toneColorId,
} from '../palette';

describe('palette (KAN-257)', () => {
  it('round-trips sRGB through OKLab', () => {
    for (const hex of [...TONE_HEX, '#000000', '#ffffff', '#123456']) {
      expect(rgbToHex(oklabToRgb(rgbToOklab(hexToRgb(hex))))).toBe(hex);
    }
  });

  it('settled tones resolve to the exact spec colours', () => {
    expect(COLOR_LUT[toneColorId(Tone.Ok)]).toBe('#54d18c');
    expect(COLOR_LUT[toneColorId(Tone.Violation)]).toBe('#ff5d73');
    expect(COLOR_LUT[colorId(Tone.Ok, Tone.Violation, 1)]).toBe('#ff5d73');
    expect(COLOR_LUT[colorId(Tone.Ok, Tone.Violation, 0)]).toBe('#54d18c');
  });

  it('the green→red midpoint is not a muddy dark olive (OKLab, not sRGB)', () => {
    const mid = mixOklab(TONE_HEX[Tone.Ok], TONE_HEX[Tone.Violation], 0.5);
    const L = (h: string) => rgbToOklab(hexToRgb(h))[0];
    expect(L(mid)).toBeGreaterThan(Math.min(L(TONE_HEX[Tone.Ok]), L(TONE_HEX[Tone.Violation])) - 0.01);
  });

  it('quantises a fade into FADE_STEPS shared colour ids', () => {
    const ids = new Set<number>();
    for (let p = 0; p <= 1; p += 0.01) ids.add(colorId(Tone.Ok, Tone.Violation, p));
    expect(ids.size).toBe(FADE_STEPS);
  });

  it('animates a tone change over the fade time and settles exactly', () => {
    const a = createToneAnim(Tone.Ok);
    setToneTarget(a, Tone.Violation);
    expect(a.progress).toBe(0);
    expect(stepToneAnim(a, 75, 150)).toBe(true);
    expect(a.progress).toBeCloseTo(0.5, 6);
    expect(stepToneAnim(a, 100, 150)).toBe(false);
    expect(a.from).toBe(Tone.Violation);
    expect(toneAnimColorId(a)).toBe(toneColorId(Tone.Violation));
  });

  it('reverses mid-fade instead of jumping', () => {
    const a = createToneAnim(Tone.Ok);
    setToneTarget(a, Tone.Violation);
    stepToneAnim(a, 45, 150); // 0.3 of the way to red
    const before = COLOR_LUT[toneAnimColorId(a)];
    setToneTarget(a, Tone.Ok);
    expect(a.from).toBe(Tone.Violation);
    expect(a.to).toBe(Tone.Ok);
    expect(a.progress).toBeCloseTo(0.7, 6);
    expect(COLOR_LUT[toneAnimColorId(a)]).toBe(before);
  });
});
