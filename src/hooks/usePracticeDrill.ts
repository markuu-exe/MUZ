/**
 * COURSE-5: React adapter for PracticeDrill. Feeds it the rig's audio frames and
 * posture results, refreshes the UI at 10 Hz, and freezes the timer while the tab
 * is hidden. All rules live in PracticeDrill / WaitStateMachine.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { PracticeDrill, type DrillSnapshot, type DrillStats, type DrillTarget } from '../practice/PracticeDrill';
import type { PracticeRig } from '../practice/PracticeRig';

export interface UsePracticeDrillOptions {
  rig: PracticeRig;
  targets: readonly DrillTarget[];
  hearts: number;
  timeoutSec: number;
  /** True while the camera, pose model or microphone is not live: the drill timer is frozen. */
  suspended?: boolean;
  onComplete: (stats: DrillStats) => void;
  /** Hearts reached 0 during the drill. */
  onLocked: (stats: DrillStats) => void;
  /** Fired each time a heart is lost during the drill. */
  onHeartLost?: (e: { reason: 'timeout' | 'misses'; hearts: number }) => void;
}

const UI_INTERVAL_MS = 100;

export interface PracticeDrillView extends DrillSnapshot {
  running: boolean;
  /** Live input level in dBFS, for the "can you hear me" meter. */
  rmsDb: number;
}

export function usePracticeDrill(options: UsePracticeDrillOptions) {
  const { rig, targets, hearts, timeoutSec } = options;
  const callbacks = useRef(options);
  callbacks.current = options;

  const drillRef = useRef<PracticeDrill | null>(null);
  const rmsRef = useRef(-Infinity);
  const [view, setView] = useState<PracticeDrillView>(() => ({
    state: 'idle',
    stepIndex: 0,
    stepCount: targets.length,
    hearts,
    heartsLost: 0,
    remainingMs: timeoutSec * 1000,
    timeoutMs: timeoutSec * 1000,
    consecutiveMisses: 0,
    lastAttempt: null,
    lastHeard: null,
    postureBlocked: false,
    complete: false,
    running: false,
    rmsDb: -Infinity,
  }));

  const refresh = useCallback(() => {
    const drill = drillRef.current;
    if (!drill) return;
    setView({ ...drill.snapshot(performance.now()), running: true, rmsDb: rmsRef.current });
  }, []);

  /** Arm the drill. The rig's camera and microphone must already be running. */
  const start = useCallback(() => {
    if (drillRef.current) return;
    const drill = new PracticeDrill(targets, { hearts, timeoutMs: timeoutSec * 1000 });
    drillRef.current = drill;
    drill.on('change', refresh);
    drill.on('heartLost', (e) => {
      refresh();
      callbacks.current.onHeartLost?.(e);
    });
    drill.on('complete', (stats) => callbacks.current.onComplete(stats));
    drill.on('locked', (stats) => callbacks.current.onLocked(stats));
    rig.resetAudioAnalysis();
    drill.start(performance.now());
    refresh();
  }, [rig, targets, hearts, timeoutSec, refresh]);

  useEffect(() => {
    const offAudio = rig.on('audio', (frame) => {
      rmsRef.current = frame.rmsDb;
      drillRef.current?.pushFrame(frame);
    });
    const offPosture = rig.on('posture', (p) => {
      drillRef.current?.pushPosture(p.tMs, p.snapshot.compliant, p.snapshot.inBandStrict);
    });
    // Keeps the countdown moving (and the timeout firing) even if audio frames stop.
    const timer = window.setInterval(() => {
      const drill = drillRef.current;
      if (!drill) return;
      if (!document.hidden && !callbacks.current.suspended) drill.tick(performance.now());
      refresh();
    }, UI_INTERVAL_MS);
    const onVisibility = () => {
      const now = performance.now();
      if (document.hidden) drillRef.current?.pause(now);
      else if (!callbacks.current.suspended) drillRef.current?.resume(now);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      offAudio();
      offPosture();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      drillRef.current?.stop(performance.now());
      drillRef.current = null;
    };
  }, [rig, refresh]);

  // No hearts are lost while the hardware is unavailable (SRS 3.3.1).
  const suspended = options.suspended ?? false;
  useEffect(() => {
    const drill = drillRef.current;
    if (!drill) return;
    const now = performance.now();
    if (suspended) drill.pause(now);
    else if (!document.hidden) drill.resume(now);
    refresh();
  }, [suspended, refresh]);

  return { ...view, start };
}
