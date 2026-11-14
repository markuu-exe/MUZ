/**
 * KAN-247 — React mount point for the posture HUD.
 *
 * React only creates the canvas and prompt container. It never re-renders on posture data:
 * every result goes straight from the source (FrameLoop) to HudEngine.push() (SRS 3.2.1).
 *
 * Usage (inside the practice view, KAN-250 owns the surrounding layout):
 *
 *   <div className="relative aspect-video overflow-hidden rounded-2xl bg-black">
 *     <video ref={setVideo} autoPlay muted playsInline className="absolute inset-0 h-full w-full"
 *            style={hudVideoStyle(fit, mirrored)} />
 *     <PostureHud video={video} source={frameLoop} fit={fit} mirrored={mirrored} running={cameraActive} />
 *   </div>
 *
 * Always style the <video> with `hudVideoStyle(fit, mirrored)` and pass the same values here.
 * That keeps the skeleton aligned with the picture.
 */
import { useEffect, useRef } from 'react';
import { HudEngine, type HudEngineOptions, type HudResultSource } from '../../vision/hud/HudEngine';
import type { HudFit } from '../../vision/hud/viewport';

export interface PostureHudProps {
  video: HTMLVideoElement | null;
  /** Result emitter, e.g. the FrameLoop instance. Optional if you push results via `onEngine`. */
  source?: HudResultSource | null;
  fit?: HudFit;
  mirrored?: boolean;
  /** Runs the rAF loop while true (camera active). */
  running?: boolean;
  /** Engine-level tuning. Read once, when the engine is created. */
  options?: Partial<Omit<HudEngineOptions, 'fit' | 'mirrored' | 'promptRoot'>>;
  /** Gives access to the engine (push(), clear(), getStats()). Called with null on teardown. */
  onEngine?: (engine: HudEngine | null) => void;
  className?: string;
}

export function PostureHud({
  video,
  source = null,
  fit = 'cover',
  mirrored = true,
  running = true,
  options,
  onEngine,
  className,
}: PostureHudProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const promptRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<HudEngine | null>(null);
  // Latest values without re-creating the engine.
  const latest = useRef({ fit, mirrored, options, onEngine });
  latest.current = { fit, mirrored, options, onEngine };

  // Create the engine once per <video> element.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const { fit: f, mirrored: m, options: o, onEngine: cb } = latest.current;
    const engine = new HudEngine(canvas, video, { ...o, fit: f, mirrored: m, promptRoot: promptRef.current });
    engineRef.current = engine;
    cb?.(engine);
    return () => {
      engine.dispose();
      engineRef.current = null;
      latest.current.onEngine?.(null);
    };
  }, [video]);

  useEffect(() => {
    engineRef.current?.setView(fit, mirrored);
  }, [fit, mirrored, video]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (running) engine.start();
    else engine.stop();
  }, [running, video]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !source) return;
    return engine.connect(source);
  }, [source, video]);

  return (
    <div className={`pointer-events-none absolute inset-0 ${className ?? ''}`} aria-hidden={false}>
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" aria-hidden="true" />
      <div ref={promptRef} className="absolute inset-0" />
    </div>
  );
}
