import { describe, expect, it } from 'vitest';
import { LM } from '../../posture/landmarks';
import { LandmarkInterpolator } from '../interpolator';
import { Tone, TONE_HEX } from '../palette';
import { resolveSlotTones, SkeletonRenderer, Slot } from '../skeleton';
import { computeViewport } from '../viewport';
import { RecordingContext } from './contexts';
import { makePoints, makeSnapshot } from './fixtures';

const GREEN = TONE_HEX[Tone.Ok];
const RED = TONE_HEX[Tone.Violation];
const AMBER = TONE_HEX[Tone.Advisory];
const GREY = TONE_HEX[Tone.Unknown];

const vp = computeViewport({
  cssWidth: 1280,
  cssHeight: 720,
  videoWidth: 1280,
  videoHeight: 720,
  fit: 'cover',
  mirrored: true,
  devicePixelRatio: 1,
  maxDpr: 2,
});

function frame(spec: Parameters<typeof makeSnapshot>[0], hide: number[] = []) {
  const lm = new LandmarkInterpolator();
  lm.push(makePoints(0, hide), makeSnapshot(spec), 1000, 1030);
  const snap = lm.sample(2000);
  lm.stepVisibility(1000);
  const sk = new SkeletonRenderer();
  sk.update(snap, 1000); // settle the fades
  const ctx = new RecordingContext();
  sk.draw(ctx, vp, lm, 1, 0, true);
  return { ctx, sk };
}

const coreStrokes = (ctx: RecordingContext) => ctx.ops.filter((o) => o.op === 'stroke' && o.alpha === 1 && o.lineWidth < 10);

describe('skeleton colours (KAN-257, SRS 3.1.5.4 / 3.1.5.5)', () => {
  it('compliant posture → every bone green (stroke colour inspection)', () => {
    const { ctx } = frame({});
    const cores = coreStrokes(ctx);
    expect(cores.map((o) => o.style)).toEqual([GREEN]);
    expect(cores[0].subpaths).toBe(14); // all 14 bones in ONE batched stroke
  });

  it('elbow out of band → red upper arm + near forearm half; rest stays green', () => {
    const { ctx, sk } = frame({ left: { elbow: 'high' } });
    expect(sk.slotTone(Slot.L_UPPER)).toBe(Tone.Violation);
    expect(sk.slotTone(Slot.L_FORE_A)).toBe(Tone.Violation);
    expect(sk.slotTone(Slot.L_FORE_B)).toBe(Tone.Ok);
    const red = coreStrokes(ctx).find((o) => o.style === RED)!;
    expect(red.subpaths).toBe(2);
    // a warning ring is drawn around the left elbow (colour is not the only signal)
    const ring = ctx.ops.find((o) => o.op === 'stroke' && o.style === RED && o.subpaths === 0);
    expect(ring).toBeTruthy();
  });

  it('wrist violation → red far forearm half + hand segment', () => {
    const { sk } = frame({ right: { wrist: 'low' } });
    expect(sk.slotTone(Slot.R_FORE_B)).toBe(Tone.Violation);
    expect(sk.slotTone(Slot.R_HAND)).toBe(Tone.Violation);
    expect(sk.slotTone(Slot.R_UPPER)).toBe(Tone.Ok);
  });

  it('advisory metrics are amber, never red; gating red wins over amber', () => {
    const tones = resolveSlotTones(makeSnapshot({ left: { forearm: 'low', elbow: 'low' }, trunk: 'high', head: 'high' }));
    expect(tones[Slot.L_FORE_A]).toBe(Tone.Violation);
    expect(tones[Slot.L_FORE_B]).toBe(Tone.Advisory);
    expect(tones[Slot.TRUNK]).toBe(Tone.Advisory);
    expect(tones[Slot.HEAD]).toBe(Tone.Advisory);
    const { ctx } = frame({ trunk: 'high' });
    expect(coreStrokes(ctx).some((o) => o.style === AMBER)).toBe(true);
    expect(coreStrokes(ctx).some((o) => o.style === RED)).toBe(false);
  });

  it('unknown metrics are grey and drawn without glow', () => {
    const { ctx } = frame({ hasPose: false });
    const strokes = ctx.ops.filter((o) => o.op === 'stroke');
    expect(new Set(strokes.map((o) => o.style))).toEqual(new Set([GREY]));
    expect(strokes.every((o) => o.lineWidth < 10)).toBe(true);
  });

  it('skips bones whose landmarks are not usable, and never emits NaN coordinates', () => {
    const { ctx } = frame({}, [LM.LEFT_WRIST]);
    // left forearm far half + left hand segment + left forearm near half (midpoint needs the wrist)
    expect(coreStrokes(ctx)[0].subpaths).toBe(11);
    for (const op of ctx.ops) for (const c of op.coords) expect(Number.isFinite(c)).toBe(true);
  });

  it('uses at most 2 strokes per colour for bones (glow + core) — batching', () => {
    const { ctx } = frame({ left: { elbow: 'high' }, right: { wrist: 'low' }, trunk: 'high' });
    const boneStrokes = ctx.ops.filter((o) => o.op === 'stroke' && o.subpaths > 0);
    const colours = new Set(boneStrokes.map((o) => o.style));
    expect(boneStrokes.length).toBeLessThan(colours.size * 2 + 1);
  });
});

describe('z-order (KAN-257)', () => {
  it('draws red over amber over green, whatever the segment order', () => {
    const { ctx } = frame({ left: { elbow: 'high' }, trunk: 'high' });
    const order = coreStrokes(ctx).filter((o) => o.subpaths > 0).map((o) => o.style);
    expect(order).toEqual([GREEN, AMBER, RED]);
  });
});
