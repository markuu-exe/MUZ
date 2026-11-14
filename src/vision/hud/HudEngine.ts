/**
 * KAN-247 — Real-time posture feedback HUD engine (SRS 3.1.5.3–5, 3.2.1, 3.4 · SDD C-05).
 *
 * A framework-agnostic, main-thread Canvas2D renderer driven by requestAnimationFrame:
 *
 *   push(result) ──▶ LandmarkInterpolator (ring of 4 samples, adaptive render delay D)
 *   rAF tick:
 *     resize?        ─ viewport.ts (DPR cap, object-fit, mirror → one affine)
 *     sample(now−D)  ─ interpolated landmarks + the snapshot nearest that time
 *     animate        ─ landmark alpha, tone crossfades, stale fade-out
 *     dirty?         ─ skip clear + draw when nothing changed (idle laptop stays cool)
 *     draw           ─ SkeletonRenderer (batched by colour, neon glow, warning rings)
 *     prompts        ─ CueScheduler → PromptLayer (DOM, written only on change)
 *
 * Budget: SRS 3.4 asks for a sustained 60 FPS. The HUD's own cost per frame is measured
 * into a ring buffer and exposed via `getStats()` (target: p95 < 2 ms).
 */
import type { PostureSnapshot } from '../posture/types';
import type { HudPoints } from '../posture/workerProtocol';
import { CueScheduler, type CueSchedulerOptions } from './cues';
import { LandmarkInterpolator, type InterpolatorOptions } from './interpolator';
import { PromptLayer } from './PromptLayer';
import { SkeletonRenderer, type HudContext, type SkeletonStyle } from './skeleton';
import { computeViewport, createViewport, type HudFit, type Viewport } from './viewport';

export interface HudResultInput {
  snapshot: PostureSnapshot;
  hud: HudPoints;
  /** Display time of the analysed video frame (performance clock; rVFC `expectedDisplayTime`). */
  captureTimeMs?: number;
}

/** Anything that emits worker results, e.g. FrameLoop. */
export interface HudResultSource {
  on(event: 'result', fn: (result: HudResultInput) => void): () => void;
}

export interface HudEngineOptions {
  fit: HudFit;
  mirrored: boolean;
  /** Backing-store DPR cap. */
  maxDpr: number;
  /** No results for this long → the skeleton and prompt fade out. */
  staleMs: number;
  /** Global fade in/out time. */
  fadeMs: number;
  /** Element the DOM prompt is appended to (positioned container over the video). null = no prompts. */
  promptRoot: HTMLElement | null;
  interpolator: Partial<InterpolatorOptions>;
  style: Partial<SkeletonStyle>;
  cues: Partial<CueSchedulerOptions>;
}

export const DEFAULT_HUD_OPTIONS: HudEngineOptions = {
  fit: 'cover',
  mirrored: true,
  maxDpr: 2,
  staleMs: 300,
  fadeMs: 200,
  promptRoot: null,
  interpolator: {},
  style: {},
  cues: {},
};

export interface HudStats {
  /** Frames actually drawn / total rAF ticks since start. */
  framesDrawn: number;
  ticks: number;
  /** Display refresh measured from rAF cadence. */
  rafFps: number;
  /** HUD cost per tick (ms): includes sampling, animation, drawing and prompt scheduling. */
  meanCostMs: number;
  p95CostMs: number;
  maxCostMs: number;
  renderDelayMs: number;
  inferenceIntervalMs: number;
  inferenceLatencyMs: number;
}

const COST_WINDOW = 240;

export class HudEngine {
  private readonly canvas: HTMLCanvasElement;
  private readonly video: HTMLVideoElement;
  private readonly options: HudEngineOptions;
  private ctx: HudContext | null;
  private readonly vp: Viewport = createViewport();
  private readonly interp: LandmarkInterpolator;
  private readonly skeleton: SkeletonRenderer;
  private readonly scheduler: CueScheduler;
  private readonly prompt: PromptLayer | null;

  private rafId: number | null = null;
  private running = false;
  private disposed = false;
  private lastTickMs = Number.NaN;
  private globalAlpha = 0;
  private needsResize = true;
  private cssWidth = 0;
  private cssHeight = 0;
  private drawnVersion = -1;
  private reducedMotion = false;

  private readonly cost = new Float32Array(COST_WINDOW);
  private costIndex = 0;
  private costCount = 0;
  private ticks = 0;
  private framesDrawn = 0;
  private rafIntervalEma = 1000 / 60;

  private readonly resizeObserver: ResizeObserver | null;
  private readonly motionQuery: MediaQueryList | null;
  private readonly cleanup: Array<() => void> = [];

  constructor(canvas: HTMLCanvasElement, video: HTMLVideoElement, options: Partial<HudEngineOptions> = {}) {
    this.canvas = canvas;
    this.video = video;
    this.options = { ...DEFAULT_HUD_OPTIONS, ...options };
    this.ctx = this.acquireContext();
    this.interp = new LandmarkInterpolator(this.options.interpolator);
    this.skeleton = new SkeletonRenderer(this.options.style);
    this.scheduler = new CueScheduler(this.options.cues);

    const win = canvas.ownerDocument.defaultView;
    this.motionQuery = win?.matchMedia?.('(prefers-reduced-motion: reduce)') ?? null;
    this.reducedMotion = this.motionQuery?.matches ?? false;
    if (this.motionQuery) this.listen(this.motionQuery, 'change', () => (this.reducedMotion = this.motionQuery!.matches));

    this.prompt = this.options.promptRoot ? new PromptLayer(this.options.promptRoot, { reducedMotion: this.reducedMotion }) : null;

    this.resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(this.onResize) : null;
    this.resizeObserver?.observe(canvas);
    this.listen(video, 'resize', this.invalidate);
    this.listen(video, 'loadedmetadata', this.invalidate);
    // Canvas2D context loss (Chrome): rebuild state when the context comes back.
    this.listen(canvas, 'contextlost', () => (this.ctx = null));
    this.listen(canvas, 'contextrestored', () => {
      this.ctx = this.acquireContext();
      this.invalidate();
    });
    this.watchDpr();
  }

  // --- public API ------------------------------------------------------------------------------

  start(): void {
    this.assertAlive();
    if (this.running) return;
    this.running = true;
    this.lastTickMs = Number.NaN;
    this.rafId = requestAnimationFrame(this.tick);
  }

  /** Stops the loop and clears the overlay (camera paused / practice view left). */
  stop(): void {
    if (!this.running) return;
    this.running = false;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.clear();
  }

  /** Feeds one worker result. Cheap: one 396-byte copy into a preallocated ring slot. */
  push(result: HudResultInput): void {
    if (this.disposed) return;
    const arrival = performance.now();
    const capture = Number.isFinite(result.captureTimeMs) ? (result.captureTimeMs as number) : arrival;
    this.interp.push(result.hud, result.snapshot, capture, arrival);
  }

  /** Subscribes to a result source (e.g. FrameLoop). Returns the unsubscribe function. */
  connect(source: HudResultSource): () => void {
    return source.on('result', (r) => this.push(r));
  }

  /** Drops all samples and hides the overlay at once (camera switched, RESET sent to the worker). */
  clear(): void {
    this.interp.clear();
    this.interp.alpha.fill(0);
    this.globalAlpha = 0;
    this.scheduler.reset();
    this.prompt?.apply(null);
    if (this.ctx && this.vp.valid) this.ctx.clearRect(0, 0, this.vp.cssWidth, this.vp.cssHeight);
  }

  setView(fit: HudFit, mirrored: boolean): void {
    if (fit === this.options.fit && mirrored === this.options.mirrored) return;
    this.options.fit = fit;
    this.options.mirrored = mirrored;
    this.invalidate();
  }

  getStats(): HudStats {
    const n = this.costCount;
    const values = Array.from(this.cost.subarray(0, n)).sort((a, b) => a - b);
    const mean = n ? values.reduce((s, v) => s + v, 0) / n : 0;
    return {
      framesDrawn: this.framesDrawn,
      ticks: this.ticks,
      rafFps: 1000 / this.rafIntervalEma,
      meanCostMs: mean,
      p95CostMs: n ? values[Math.min(n - 1, Math.floor(n * 0.95))] : 0,
      maxCostMs: n ? values[n - 1] : 0,
      renderDelayMs: this.interp.delayMs,
      inferenceIntervalMs: this.interp.intervalMs,
      inferenceLatencyMs: this.interp.latencyMs,
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.stop();
    this.resizeObserver?.disconnect();
    for (const off of this.cleanup) off();
    this.cleanup.length = 0;
    this.prompt?.dispose();
    this.disposed = true;
  }

  // --- loop ------------------------------------------------------------------------------------

  private tick = (ts: number): void => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.tick);
    const t0 = performance.now();
    this.ticks++;

    const dt = Number.isNaN(this.lastTickMs) ? 0 : Math.min(100, Math.max(0, ts - this.lastTickMs));
    if (dt > 0) this.rafIntervalEma += 0.05 * (dt - this.rafIntervalEma);
    this.lastTickMs = ts;

    const ctx = this.ctx;
    if (!ctx) return;
    if (this.needsResize) this.applyResize(ctx);
    if (!this.vp.valid) return;

    // 1. Sample the pose at now − D (SRS 3.4 interpolation).
    const renderTime = ts - this.interp.delayMs;
    const fresh = ts - this.interp.lastArrival <= this.options.staleMs;
    const snapshot = this.interp.sample(renderTime);

    // 2. Animate.
    const visAnimating = this.interp.stepVisibility(dt);
    const target = fresh && this.interp.size > 0 ? 1 : 0;
    const fadeStep = this.options.fadeMs > 0 ? dt / this.options.fadeMs : 1;
    const prevAlpha = this.globalAlpha;
    this.globalAlpha = target > this.globalAlpha ? Math.min(target, this.globalAlpha + fadeStep) : Math.max(target, this.globalAlpha - fadeStep);
    // Keep the last tones while fading out on stale data (no grey flash).
    const toneAnimating = this.skeleton.update(snapshot, dt);
    const moving = this.interp.size > 1 && renderTime < this.interp.newestTime;

    // 3. Prompts (DOM, only written on change).
    if (this.prompt && this.scheduler.update(fresh ? snapshot : null, ts)) this.prompt.apply(this.scheduler.current);

    // 4. Draw only when something on screen can have changed.
    const pulsing = !this.reducedMotion && this.globalAlpha > 0 && this.skeleton.hasRings();
    const dirty =
      this.interp.version !== this.drawnVersion || moving || visAnimating || toneAnimating || pulsing || this.globalAlpha !== prevAlpha;
    if (dirty) {
      ctx.clearRect(0, 0, this.vp.cssWidth, this.vp.cssHeight);
      if (this.globalAlpha > 0) this.skeleton.draw(ctx, this.vp, this.interp, this.globalAlpha, ts, this.reducedMotion);
      this.drawnVersion = this.interp.version;
      this.framesDrawn++;
    }

    this.recordCost(performance.now() - t0);
  };

  // --- sizing ----------------------------------------------------------------------------------

  private onResize = (entries: ResizeObserverEntry[]): void => {
    const e = entries[entries.length - 1];
    if (!e) return;
    this.cssWidth = e.contentRect.width;
    this.cssHeight = e.contentRect.height;
    this.invalidate();
  };

  private invalidate = (): void => {
    this.needsResize = true;
    this.drawnVersion = -1;
  };

  private applyResize(ctx: HudContext): void {
    this.needsResize = false;
    if (!this.resizeObserver) {
      this.cssWidth = this.canvas.clientWidth;
      this.cssHeight = this.canvas.clientHeight;
    }
    const win = this.canvas.ownerDocument.defaultView;
    computeViewport(
      {
        cssWidth: this.cssWidth,
        cssHeight: this.cssHeight,
        videoWidth: this.video.videoWidth,
        videoHeight: this.video.videoHeight,
        fit: this.options.fit,
        mirrored: this.options.mirrored,
        devicePixelRatio: win?.devicePixelRatio ?? 1,
        maxDpr: this.options.maxDpr,
      },
      this.vp,
    );
    // Assigning width/height resets ALL context state, so only touch them on real changes.
    if (this.canvas.width !== this.vp.pixelWidth || this.canvas.height !== this.vp.pixelHeight) {
      this.canvas.width = this.vp.pixelWidth;
      this.canvas.height = this.vp.pixelHeight;
    }
    ctx.setTransform(this.vp.dpr, 0, 0, this.vp.dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    this.prompt?.setScale(this.vp.videoCssHeight || this.vp.cssHeight);
  }

  /** Re-arms a resolution media query so moving the window between monitors triggers a resize. */
  private watchDpr(): void {
    const win = this.canvas.ownerDocument.defaultView;
    if (!win?.matchMedia) return;
    const query = win.matchMedia(`(resolution: ${win.devicePixelRatio}dppx)`);
    const onChange = () => {
      query.removeEventListener('change', onChange);
      this.invalidate();
      if (!this.disposed) this.watchDpr();
    };
    query.addEventListener('change', onChange);
    this.cleanup.push(() => query.removeEventListener('change', onChange));
  }

  // --- helpers ---------------------------------------------------------------------------------

  private acquireContext(): HudContext | null {
    return this.canvas.getContext('2d', { alpha: true }) as HudContext | null;
  }

  private listen(target: EventTarget, type: string, fn: () => void): void {
    target.addEventListener(type, fn);
    this.cleanup.push(() => target.removeEventListener(type, fn));
  }

  private recordCost(ms: number): void {
    this.cost[this.costIndex] = ms;
    this.costIndex = (this.costIndex + 1) % COST_WINDOW;
    if (this.costCount < COST_WINDOW) this.costCount++;
  }

  private assertAlive(): void {
    if (this.disposed) throw new Error('HudEngine has been disposed.');
  }
}
