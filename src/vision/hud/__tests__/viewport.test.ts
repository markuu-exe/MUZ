import { describe, expect, it } from 'vitest';
import { computeViewport, hudVideoStyle, type ViewportInput } from '../viewport';

const base: ViewportInput = {
  cssWidth: 1280,
  cssHeight: 720,
  videoWidth: 1280,
  videoHeight: 720,
  fit: 'cover',
  mirrored: false,
  devicePixelRatio: 1,
  maxDpr: 2,
};

const map = (vp: ReturnType<typeof computeViewport>, nx: number, ny: number) => [vp.ax * nx + vp.bx, vp.ay * ny + vp.by];

describe('viewport mapping (KAN-258)', () => {
  it('maps 1:1 when box and video share an aspect ratio', () => {
    const vp = computeViewport(base);
    expect(vp.valid).toBe(true);
    expect(map(vp, 0, 0)).toEqual([0, 0]);
    expect(map(vp, 1, 1)).toEqual([1280, 720]);
  });

  it('crops with cover: a 4:3 camera in a 16:9 box overflows vertically', () => {
    const vp = computeViewport({ ...base, videoWidth: 640, videoHeight: 480 });
    // scale = max(2, 1.5) = 2 → 1280 × 960, centred: top 120 px cropped.
    expect(map(vp, 0, 0)).toEqual([0, -120]);
    expect(map(vp, 1, 1)).toEqual([1280, 840]);
    expect(map(vp, 0.5, 0.5)).toEqual([640, 360]);
  });

  it('letterboxes with contain', () => {
    const vp = computeViewport({ ...base, fit: 'contain', videoWidth: 640, videoHeight: 480 });
    // scale = min(2, 1.5) = 1.5 → 960 × 720, pillarboxed by 160 px each side.
    expect(map(vp, 0, 0)).toEqual([160, 0]);
    expect(map(vp, 1, 1)).toEqual([1120, 720]);
  });

  it('mirrors in the maths, matching CSS scaleX(-1) on the video', () => {
    const vp = computeViewport({ ...base, mirrored: true });
    expect(map(vp, 0, 0)).toEqual([1280, 0]);
    expect(map(vp, 0.25, 0.5)).toEqual([960, 360]);
    // cover + mirror + crop
    const vp2 = computeViewport({ ...base, mirrored: true, cssWidth: 1000, cssHeight: 720 });
    // scale = max(0.78125, 1) = 1 → 1280 wide, ox = −140 → mirrored x = 1000 − (−140 + nx·1280)
    expect(map(vp2, 0.5, 0)[0]).toBeCloseTo(500, 6);
    expect(hudVideoStyle('cover', true)).toEqual({ objectFit: 'cover', transform: 'scaleX(-1)' });
  });

  it('caps the backing-store DPR and rounds the pixel size', () => {
    const vp = computeViewport({ ...base, cssWidth: 1001, cssHeight: 563, devicePixelRatio: 3 });
    expect(vp.dpr).toBe(2);
    expect(vp.pixelWidth).toBe(2002);
    expect(vp.pixelHeight).toBe(1126);
    expect(computeViewport({ ...base, devicePixelRatio: 1.25 }).pixelWidth).toBe(1600);
  });

  it('is invalid until the video metadata and the box size exist', () => {
    expect(computeViewport({ ...base, videoWidth: 0 }).valid).toBe(false);
    expect(computeViewport({ ...base, cssHeight: 0 }).valid).toBe(false);
    expect(computeViewport({ ...base, devicePixelRatio: NaN }).dpr).toBe(1);
  });
});
