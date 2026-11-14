/**
 * KAN-257 — Colour-coded skeleton (SRS 3.1.5.3–5, SDD C-05).
 *
 * Colour comes from the worker's per-metric states (with hysteresis and occlusion grace,
 * KAN-248), never from raw angles in the HUD. So red is exactly the spec band edge, and the
 * HUD cannot disagree with the FSM.
 *
 *   elbow  (gating)   → upper arm, forearm near half, elbow joint     green / RED / grey
 *   wrist  (gating)   → forearm far half, hand segment, wrist joint   green / RED / grey
 *   forearm slope     → both forearm halves (if no gating red)        AMBER (advisory)
 *   trunk lean        → shoulders, flanks, hips                        green / AMBER / grey
 *   head forward      → ear → shoulder                                 green / AMBER / grey
 *
 * Red is only ever used for a gating violation. Advisory cues are amber. A violating joint
 * also gets a ring, so the state doesn't depend on colour alone.
 *
 * Drawing is batched by colour id (see palette.ts): one glow + one core stroke per colour,
 * and one fill per colour for joints. Nothing allocates per frame.
 */
import { ARM, LM } from '../posture/landmarks';
import type { MetricState, PostureSnapshot, Side } from '../posture/types';
import {
  createToneAnim,
  COLOR_LUT,
  FADE_STEPS,
  TONE_COUNT,
  setToneTarget,
  stepToneAnim,
  Tone,
  toneAnimColorId,
  toneColorId,
  TONE_FADE_MS,
  type ToneAnim,
} from './palette';
import type { LandmarkInterpolator } from './interpolator';
import type { Viewport } from './viewport';

/** The subset of CanvasRenderingContext2D the HUD uses (lets tests pass a recorder). */
export type HudContext = Pick<
  CanvasRenderingContext2D,
  'beginPath' | 'moveTo' | 'lineTo' | 'arc' | 'stroke' | 'fill' | 'clearRect' | 'setTransform'
> & {
  strokeStyle: CanvasRenderingContext2D['strokeStyle'];
  fillStyle: CanvasRenderingContext2D['fillStyle'];
  lineWidth: number;
  globalAlpha: number;
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
};

// --- colour slots ---------------------------------------------------------------------------

export const Slot = {
  L_UPPER: 0,
  L_FORE_A: 1,
  L_FORE_B: 2,
  L_HAND: 3,
  R_UPPER: 4,
  R_FORE_A: 5,
  R_FORE_B: 6,
  R_HAND: 7,
  TRUNK: 8,
  HEAD: 9,
} as const;
export type Slot = (typeof Slot)[keyof typeof Slot];
const SLOT_COUNT = 10;

const ARM_SLOTS: Record<Side, { upper: Slot; foreA: Slot; foreB: Slot; hand: Slot }> = {
  left: { upper: Slot.L_UPPER, foreA: Slot.L_FORE_A, foreB: Slot.L_FORE_B, hand: Slot.L_HAND },
  right: { upper: Slot.R_UPPER, foreA: Slot.R_FORE_A, foreB: Slot.R_FORE_B, hand: Slot.R_HAND },
};

export function metricTone(state: MetricState | undefined, gating: boolean): Tone {
  switch (state) {
    case 'ok':
      return Tone.Ok;
    case 'low':
    case 'high':
      return gating ? Tone.Violation : Tone.Advisory;
    default:
      return Tone.Unknown;
  }
}

/** Arm precedence: gating red > advisory amber > green > grey. */
function withAdvisory(base: Tone, advisory: boolean): Tone {
  if (base === Tone.Violation) return base;
  return advisory ? Tone.Advisory : base;
}

/** Target tone for every slot, from one snapshot. Exposed for tests. */
export function resolveSlotTones(snapshot: PostureSnapshot | null, out: Tone[] = new Array(SLOT_COUNT)): Tone[] {
  if (!snapshot || !snapshot.hasPose) {
    out.fill(Tone.Unknown, 0, SLOT_COUNT);
    return out;
  }
  for (const side of ['left', 'right'] as const) {
    const arm = snapshot.arms[side];
    const s = ARM_SLOTS[side];
    const elbow = metricTone(arm?.elbow.state, true);
    const wrist = metricTone(arm?.wrist.state, true);
    const slope = arm?.forearmPitch.state === 'low' || arm?.forearmPitch.state === 'high';
    out[s.upper] = elbow;
    out[s.foreA] = withAdvisory(elbow, slope);
    out[s.foreB] = withAdvisory(wrist, slope);
    out[s.hand] = wrist;
  }
  out[Slot.TRUNK] = metricTone(snapshot.trunk?.flexion.state, false);
  out[Slot.HEAD] = metricTone(snapshot.trunk?.headForward.state, false);
  return out;
}

// --- topology ---------------------------------------------------------------------------------

/** Point refs ≥ MID_BASE are virtual forearm midpoints (elbow + wrist) / 2. */
const MID_BASE = 100;
const MID_LEFT = MID_BASE;
const MID_RIGHT = MID_BASE + 1;

interface Segment {
  a: number;
  b: number;
  slot: Slot;
}

interface Joint {
  p: number;
  slot: Slot;
  /** Radius multiplier. */
  size: number;
  /** Draw a warning ring when the slot's target tone is red or amber. */
  ring: boolean;
}

function armSegments(side: Side, mid: number): Segment[] {
  const a = ARM[side];
  const s = ARM_SLOTS[side];
  return [
    { a: a.shoulder, b: a.elbow, slot: s.upper },
    { a: a.elbow, b: mid, slot: s.foreA },
    { a: mid, b: a.wrist, slot: s.foreB },
    { a: a.wrist, b: a.index, slot: s.hand },
  ];
}

export const SEGMENTS: readonly Segment[] = [
  { a: LM.LEFT_SHOULDER, b: LM.RIGHT_SHOULDER, slot: Slot.TRUNK },
  { a: LM.LEFT_SHOULDER, b: LM.LEFT_HIP, slot: Slot.TRUNK },
  { a: LM.RIGHT_SHOULDER, b: LM.RIGHT_HIP, slot: Slot.TRUNK },
  { a: LM.LEFT_HIP, b: LM.RIGHT_HIP, slot: Slot.TRUNK },
  { a: LM.LEFT_EAR, b: LM.LEFT_SHOULDER, slot: Slot.HEAD },
  { a: LM.RIGHT_EAR, b: LM.RIGHT_SHOULDER, slot: Slot.HEAD },
  ...armSegments('left', MID_LEFT),
  ...armSegments('right', MID_RIGHT),
];

export const JOINTS: readonly Joint[] = [
  { p: LM.LEFT_EAR, slot: Slot.HEAD, size: 0.8, ring: true },
  { p: LM.RIGHT_EAR, slot: Slot.HEAD, size: 0.8, ring: true },
  { p: LM.LEFT_SHOULDER, slot: Slot.TRUNK, size: 1, ring: true },
  { p: LM.RIGHT_SHOULDER, slot: Slot.TRUNK, size: 1, ring: true },
  { p: LM.LEFT_HIP, slot: Slot.TRUNK, size: 0.8, ring: false },
  { p: LM.RIGHT_HIP, slot: Slot.TRUNK, size: 0.8, ring: false },
  { p: LM.LEFT_ELBOW, slot: Slot.L_UPPER, size: 1.15, ring: true },
  { p: LM.RIGHT_ELBOW, slot: Slot.R_UPPER, size: 1.15, ring: true },
  { p: LM.LEFT_WRIST, slot: Slot.L_HAND, size: 1.15, ring: true },
  { p: LM.RIGHT_WRIST, slot: Slot.R_HAND, size: 1.15, ring: true },
  { p: LM.LEFT_INDEX, slot: Slot.L_HAND, size: 0.75, ring: false },
  { p: LM.RIGHT_INDEX, slot: Slot.R_HAND, size: 0.75, ring: false },
];

// --- renderer ---------------------------------------------------------------------------------

export interface SkeletonStyle {
  /** Core bone width at a 720-px-tall video (CSS px); scaled with the rendered video size. */
  boneWidth: number;
  /** Glow width as a multiple of the core width. */
  glowScale: number;
  glowAlpha: number;
  jointRadius: number;
  ringRadius: number;
  ringWidth: number;
  /** Ring pulse period (ms); 0 disables the pulse. */
  pulsePeriodMs: number;
  /** Extra ring radius at the top of the pulse, as a fraction. */
  pulseAmount: number;
}

export const DEFAULT_SKELETON_STYLE: SkeletonStyle = {
  boneWidth: 4,
  glowScale: 3.2,
  glowAlpha: 0.22,
  jointRadius: 5.5,
  ringRadius: 13,
  ringWidth: 2.5,
  pulsePeriodMs: 1000,
  pulseAmount: 0.18,
};

const MAX_ITEMS = 32;
const MIN_ALPHA = 0.01;
const UNKNOWN_ID = toneColorId(Tone.Unknown);

/** Draw order rank of a colour id, by its target tone. */
const TONE_RANK = [1, 3, 2, 0]; // Ok, Violation, Advisory, Unknown
function rankOf(id: number): number {
  return TONE_RANK[Math.floor(id / FADE_STEPS) % TONE_COUNT];
}

export class SkeletonRenderer {
  readonly style: SkeletonStyle;
  private readonly anims: ToneAnim[] = Array.from({ length: SLOT_COUNT }, () => createToneAnim(Tone.Unknown));
  private readonly targets: Tone[] = new Array(SLOT_COUNT).fill(Tone.Unknown);

  // Scratch buffers (no per-frame allocation).
  private readonly sx1 = new Float32Array(MAX_ITEMS);
  private readonly sy1 = new Float32Array(MAX_ITEMS);
  private readonly sx2 = new Float32Array(MAX_ITEMS);
  private readonly sy2 = new Float32Array(MAX_ITEMS);
  private readonly sAlpha = new Float32Array(MAX_ITEMS);
  private readonly sColor = new Int16Array(MAX_ITEMS);
  private readonly uniq = new Int16Array(MAX_ITEMS);
  private px = 0;
  private py = 0;
  private pa = 0;

  constructor(style: Partial<SkeletonStyle> = {}) {
    this.style = { ...DEFAULT_SKELETON_STYLE, ...style };
  }

  /** Updates tone targets from the snapshot and advances crossfades. Returns true while animating. */
  update(snapshot: PostureSnapshot | null, dtMs: number, fadeMs = TONE_FADE_MS): boolean {
    resolveSlotTones(snapshot, this.targets);
    let animating = false;
    for (let i = 0; i < SLOT_COUNT; i++) {
      setToneTarget(this.anims[i], this.targets[i]);
      if (stepToneAnim(this.anims[i], dtMs, fadeMs)) animating = true;
    }
    return animating;
  }

  /** True if any slot is showing a warning ring (which pulses, so the frame is never idle). */
  hasRings(): boolean {
    for (const j of JOINTS) {
      const t = this.anims[j.slot].to;
      if (j.ring && (t === Tone.Violation || t === Tone.Advisory)) return true;
    }
    return false;
  }

  /** Current target tone of a slot (for tests / debugging). */
  slotTone(slot: Slot): Tone {
    return this.anims[slot].to;
  }

  draw(ctx: HudContext, vp: Viewport, lm: LandmarkInterpolator, globalAlpha: number, timeMs: number, reducedMotion: boolean): void {
    if (!vp.valid || globalAlpha <= MIN_ALPHA) return;
    const st = this.style;
    const k = Math.min(1.5, Math.max(0.75, vp.videoCssHeight / 720));
    const core = st.boneWidth * k;

    // --- bones -------------------------------------------------------------------------------
    let n = 0;
    for (let i = 0; i < SEGMENTS.length && n < MAX_ITEMS; i++) {
      const seg = SEGMENTS[i];
      if (!this.point(lm, vp, seg.a)) continue;
      const x1 = this.px;
      const y1 = this.py;
      const a1 = this.pa;
      if (!this.point(lm, vp, seg.b)) continue;
      const alpha = Math.min(a1, this.pa) * globalAlpha;
      if (alpha <= MIN_ALPHA) continue;
      this.sx1[n] = x1;
      this.sy1[n] = y1;
      this.sx2[n] = this.px;
      this.sy2[n] = this.py;
      this.sAlpha[n] = alpha;
      this.sColor[n] = toneAnimColorId(this.anims[seg.slot]);
      n++;
    }
    const u = this.collectColors(n);
    // Glow under everything first, then the cores.
    for (let pass = 0; pass < 2; pass++) {
      const glow = pass === 0;
      ctx.lineWidth = glow ? core * st.glowScale : core;
      for (let c = 0; c < u; c++) {
        const id = this.uniq[c];
        if (glow && id === UNKNOWN_ID) continue;
        this.strokeBatch(ctx, n, id, glow ? st.glowAlpha : 1);
      }
    }

    // --- joints ------------------------------------------------------------------------------
    let m = 0;
    for (let i = 0; i < JOINTS.length && m < MAX_ITEMS; i++) {
      const j = JOINTS[i];
      if (!this.point(lm, vp, j.p)) continue;
      const alpha = this.pa * globalAlpha;
      if (alpha <= MIN_ALPHA) continue;
      this.sx1[m] = this.px;
      this.sy1[m] = this.py;
      this.sx2[m] = st.jointRadius * k * j.size; // radius
      this.sAlpha[m] = alpha;
      this.sColor[m] = toneAnimColorId(this.anims[j.slot]);
      m++;
    }
    const uj = this.collectColors(m);
    for (let c = 0; c < uj; c++) this.fillJoints(ctx, m, this.uniq[c]);

    // --- warning rings -----------------------------------------------------------------------
    const pulse = reducedMotion || st.pulsePeriodMs <= 0 ? 0 : 0.5 + 0.5 * Math.sin((2 * Math.PI * timeMs) / st.pulsePeriodMs);
    const ringR = st.ringRadius * k * (1 + st.pulseAmount * pulse);
    ctx.lineWidth = st.ringWidth * k;
    for (let i = 0; i < JOINTS.length; i++) {
      const j = JOINTS[i];
      if (!j.ring) continue;
      const anim = this.anims[j.slot];
      if (anim.to !== Tone.Violation && anim.to !== Tone.Advisory) continue;
      if (!this.point(lm, vp, j.p)) continue;
      const alpha = this.pa * globalAlpha * Math.min(1, anim.progress * 2);
      if (alpha <= MIN_ALPHA) continue;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = COLOR_LUT[toneAnimColorId(anim)];
      ctx.beginPath();
      ctx.arc(this.px, this.py, ringR * j.size, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /** Resolves a point ref into px / py (CSS px) and pa. False if not drawable. */
  private point(lm: LandmarkInterpolator, vp: Viewport, ref: number): boolean {
    let nx: number;
    let ny: number;
    let a: number;
    if (ref >= MID_BASE) {
      const arm = ref === MID_LEFT ? ARM.left : ARM.right;
      a = Math.min(lm.alpha[arm.elbow], lm.alpha[arm.wrist]);
      nx = (lm.x[arm.elbow] + lm.x[arm.wrist]) * 0.5;
      ny = (lm.y[arm.elbow] + lm.y[arm.wrist]) * 0.5;
    } else {
      a = lm.alpha[ref];
      nx = lm.x[ref];
      ny = lm.y[ref];
    }
    if (!(a > MIN_ALPHA) || !Number.isFinite(nx) || !Number.isFinite(ny)) return false;
    this.px = vp.ax * nx + vp.bx;
    this.py = vp.ay * ny + vp.by;
    this.pa = a;
    return true;
  }

  /** Writes the distinct colour ids of items [0, n) into `uniq`; returns the count. */
  private collectColors(n: number): number {
    let u = 0;
    for (let i = 0; i < n; i++) {
      const id = this.sColor[i];
      let seen = false;
      for (let c = 0; c < u; c++) {
        if (this.uniq[c] === id) {
          seen = true;
          break;
        }
      }
      if (!seen) this.uniq[u++] = id;
    }
    // Z-order by severity of the target tone: grey < green < amber < red (red always on top).
    for (let i = 1; i < u; i++) {
      const id = this.uniq[i];
      const r = rankOf(id);
      let j = i - 1;
      while (j >= 0 && rankOf(this.uniq[j]) > r) {
        this.uniq[j + 1] = this.uniq[j];
        j--;
      }
      this.uniq[j + 1] = id;
    }
    return u;
  }

  /** One path per colour for fully opaque items; fading items are stroked one by one. */
  private strokeBatch(ctx: HudContext, n: number, id: number, alphaScale: number): void {
    ctx.strokeStyle = COLOR_LUT[id];
    let open = false;
    for (let i = 0; i < n; i++) {
      if (this.sColor[i] !== id || this.sAlpha[i] < 0.999) continue;
      if (!open) {
        ctx.globalAlpha = alphaScale;
        ctx.beginPath();
        open = true;
      }
      ctx.moveTo(this.sx1[i], this.sy1[i]);
      ctx.lineTo(this.sx2[i], this.sy2[i]);
    }
    if (open) ctx.stroke();
    for (let i = 0; i < n; i++) {
      if (this.sColor[i] !== id || this.sAlpha[i] >= 0.999) continue;
      ctx.globalAlpha = this.sAlpha[i] * alphaScale;
      ctx.beginPath();
      ctx.moveTo(this.sx1[i], this.sy1[i]);
      ctx.lineTo(this.sx2[i], this.sy2[i]);
      ctx.stroke();
    }
  }

  private fillJoints(ctx: HudContext, m: number, id: number): void {
    const st = this.style;
    ctx.fillStyle = COLOR_LUT[id];
    // Glow halo (skipped for grey), then the solid core.
    for (let pass = 0; pass < 2; pass++) {
      const glow = pass === 0;
      if (glow && id === UNKNOWN_ID) continue;
      const scale = glow ? 2.1 : 1;
      const alphaScale = glow ? st.glowAlpha : 1;
      let open = false;
      for (let i = 0; i < m; i++) {
        if (this.sColor[i] !== id || this.sAlpha[i] < 0.999) continue;
        if (!open) {
          ctx.globalAlpha = alphaScale;
          ctx.beginPath();
          open = true;
        }
        const r = this.sx2[i] * scale;
        ctx.moveTo(this.sx1[i] + r, this.sy1[i]);
        ctx.arc(this.sx1[i], this.sy1[i], r, 0, Math.PI * 2);
      }
      if (open) ctx.fill();
      for (let i = 0; i < m; i++) {
        if (this.sColor[i] !== id || this.sAlpha[i] >= 0.999) continue;
        const r = this.sx2[i] * scale;
        ctx.globalAlpha = this.sAlpha[i] * alphaScale;
        ctx.beginPath();
        ctx.moveTo(this.sx1[i] + r, this.sy1[i]);
        ctx.arc(this.sx1[i], this.sy1[i], r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
