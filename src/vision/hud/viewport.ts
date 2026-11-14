/**
 * KAN-258 — Video-to-canvas coordinate mapping.
 *
 * The worker emits landmarks in normalised image coordinates of the *intrinsic* video frame
 * ([0,1] × [0,1], x → right, y → down, never mirrored). The canvas covers the same box as the
 * <video> element, which is displayed with `object-fit` (cover/contain) and optionally mirrored.
 *
 * Everything collapses into one affine per axis, so mapping a point costs 2 multiply-adds:
 *   x_css = ax · nx + bx,   y_css = ay · ny + by
 * The device-pixel ratio is applied once with `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)`, so line
 * widths and radii are authored in CSS pixels.
 *
 * Mirroring lives here (ax < 0), never as a CSS transform on the canvas: a CSS-mirrored canvas
 * would also mirror any text or asymmetric glyph drawn on it.
 */

export type HudFit = 'cover' | 'contain';

export interface ViewportInput {
  /** Canvas box size in CSS pixels. */
  cssWidth: number;
  cssHeight: number;
  /** Intrinsic video size (`videoWidth` / `videoHeight`). 0 while metadata is not loaded. */
  videoWidth: number;
  videoHeight: number;
  fit: HudFit;
  mirrored: boolean;
  /** window.devicePixelRatio. */
  devicePixelRatio: number;
  /** Upper bound for the backing-store scale (fill-rate guard on 4K / DPR 3 screens). */
  maxDpr: number;
}

export interface Viewport {
  /** False until both the box and the video have a size. Nothing is drawn while false. */
  valid: boolean;
  cssWidth: number;
  cssHeight: number;
  /** Effective scale used for the backing store (≤ maxDpr). */
  dpr: number;
  /** Backing-store size in device pixels. */
  pixelWidth: number;
  pixelHeight: number;
  ax: number;
  bx: number;
  ay: number;
  by: number;
  /** Rendered video size in CSS px (for scaling stroke widths to the subject). */
  videoCssWidth: number;
  videoCssHeight: number;
}

export function createViewport(): Viewport {
  return {
    valid: false,
    cssWidth: 0,
    cssHeight: 0,
    dpr: 1,
    pixelWidth: 0,
    pixelHeight: 0,
    ax: 0,
    bx: 0,
    ay: 0,
    by: 0,
    videoCssWidth: 0,
    videoCssHeight: 0,
  };
}

/** Computes the mapping into `out` (no allocation). Returns `out`. */
export function computeViewport(input: ViewportInput, out: Viewport = createViewport()): Viewport {
  const { cssWidth: cw, cssHeight: ch, videoWidth: vw, videoHeight: vh } = input;
  const dprRaw = Number.isFinite(input.devicePixelRatio) && input.devicePixelRatio > 0 ? input.devicePixelRatio : 1;
  const dpr = Math.min(dprRaw, Math.max(1, input.maxDpr));

  out.cssWidth = cw;
  out.cssHeight = ch;
  out.dpr = dpr;
  out.pixelWidth = Math.max(0, Math.round(cw * dpr));
  out.pixelHeight = Math.max(0, Math.round(ch * dpr));

  if (!(cw > 0 && ch > 0 && vw > 0 && vh > 0)) {
    out.valid = false;
    out.ax = out.bx = out.ay = out.by = 0;
    out.videoCssWidth = out.videoCssHeight = 0;
    return out;
  }

  const sx = cw / vw;
  const sy = ch / vh;
  const scale = input.fit === 'cover' ? Math.max(sx, sy) : Math.min(sx, sy);
  const dw = vw * scale;
  const dh = vh * scale;
  const ox = (cw - dw) / 2; // < 0 when cover crops horizontally
  const oy = (ch - dh) / 2;

  if (input.mirrored) {
    // x_css = cw − (ox + nx·dw)
    out.ax = -dw;
    out.bx = cw - ox;
  } else {
    out.ax = dw;
    out.bx = ox;
  }
  out.ay = dh;
  out.by = oy;
  out.videoCssWidth = dw;
  out.videoCssHeight = dh;
  out.valid = true;
  return out;
}

/**
 * Inline style for the <video> element so its fit and mirroring always match the HUD mapping.
 * Use the same `fit` / `mirrored` values you pass to the HUD.
 */
export function hudVideoStyle(fit: HudFit, mirrored: boolean): { objectFit: HudFit; transform: string } {
  return { objectFit: fit, transform: mirrored ? 'scaleX(-1)' : 'none' };
}
