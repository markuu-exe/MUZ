import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { ChordMatcher } from '../audio/chords/ChordMatcher';
import type { AudioErrorCode } from '../audio/errors/AudioError';
import { AudioInputService, type AudioInputStatus } from '../audio/input/AudioInputService';
import { ChordVerifier, type AttemptResult } from '../audio/practice/ChordVerifier';
import { WaitStateMachine, type HeartLossReason, type WaitState } from '../audio/practice/WaitStateMachine';
import type { PostureSnapshot } from '../vision/posture/types';

/** One matcher (84 templates) shared by every drill. */
const sharedMatcher = new ChordMatcher();

export interface UseChordDrillOptions {
  /** Lesson payload `target`, e.g. "C", "Am", "G_Maj". */
  target: string;
  /** Learner's current hearts (profiles.hearts). */
  hearts: number;
  /** Lesson payload `timeoutSec` (defaults to the SRS 15 s). */
  timeoutSec?: number;
  /** `usePostureWorker().snapshotRef` — read on every audio frame, never re-renders. */
  postureRef: RefObject<PostureSnapshot | null>;
  onHeartLost?: (reason: HeartLossReason, hearts: number) => void;
  onSuccess?: () => void;
}

export interface ChordDrillView {
  state: WaitState;
  hearts: number;
  remainingMs: number;
  consecutiveMisses: number;
  lastAttempt: AttemptResult | null;
  micStatus: AudioInputStatus;
  micError: AudioErrorCode | null;
  /** Live input level for a "can you hear me?" meter. */
  rmsDb: number;
}

const UI_INTERVAL_MS = 100; // UI refresh 10 Hz; detection itself runs at ~94 Hz

/**
 * KAN-267 React adapter. The wait-state machine, verifier and DSP are
 * framework-agnostic; this hook only wires them to React and to the posture worker.
 * `start()` must be called from a click/tap (AudioContext autoplay policy).
 */
export function useChordDrill(options: UseChordDrillOptions) {
  const { target, hearts, timeoutSec, postureRef } = options;
  const callbacks = useRef(options);
  callbacks.current = options;

  const audioRef = useRef<AudioInputService | null>(null);
  const machineRef = useRef<WaitStateMachine | null>(null);
  const lastPostureTs = useRef<number>(-1);
  const lastUiMs = useRef(0);
  const rmsRef = useRef(-Infinity);

  const [view, setView] = useState<ChordDrillView>({
    state: 'idle',
    hearts,
    remainingMs: 0,
    consecutiveMisses: 0,
    lastAttempt: null,
    micStatus: 'idle',
    micError: null,
    rmsDb: -Infinity,
  });

  const refreshView = useCallback((nowMs: number, patch: Partial<ChordDrillView> = {}) => {
    const m = machineRef.current;
    if (!m) return;
    lastUiMs.current = nowMs;
    setView((v) => ({
      ...v,
      state: m.state,
      hearts: m.state === 'idle' ? v.hearts : m.hearts,
      remainingMs: m.remainingMs(nowMs),
      consecutiveMisses: m.consecutiveMisses,
      rmsDb: rmsRef.current,
      ...patch,
    }));
  }, []);

  // (Re)build the machine when the drill target or timeout changes.
  useEffect(() => {
    const verifier = new ChordVerifier(sharedMatcher, target);
    const machine = new WaitStateMachine(verifier, {
      timeoutMs: (timeoutSec ?? 15) * 1000,
    });
    machineRef.current = machine;
    const offs = [
      machine.on('state', (e) => refreshView(e.atMs)),
      machine.on('attempt', (a) => refreshView(a.decidedMs, { lastAttempt: a })),
      machine.on('heartLost', (e) => callbacks.current.onHeartLost?.(e.reason, e.hearts)),
      machine.on('success', () => callbacks.current.onSuccess?.()),
    ];
    return () => {
      offs.forEach((off) => off());
      machine.stop(performance.now());
      machineRef.current = null;
    };
  }, [target, timeoutSec, refreshView]);

  // Audio service lives for the component's lifetime.
  useEffect(() => {
    const audio = new AudioInputService();
    audioRef.current = audio;
    const offStatus = audio.on('status', (s) => {
      setView((v) => ({ ...v, micStatus: s.status, micError: s.error?.code ?? null }));
      if (s.status === 'error') machineRef.current?.stop(performance.now());
    });
    const offFrame = audio.on('frame', (frame) => {
      const m = machineRef.current;
      if (!m) return;
      rmsRef.current = frame.rmsDb;
      const snap = postureRef.current;
      if (snap && snap.timestampMs !== lastPostureTs.current) {
        lastPostureTs.current = snap.timestampMs;
        m.pushPosture(snap.timestampMs, snap.compliant);
      }
      m.pushFrame(frame);
      if (frame.tMs - lastUiMs.current >= UI_INTERVAL_MS) refreshView(frame.tMs);
    });
    return () => {
      offStatus();
      offFrame();
      audio.dispose();
      audioRef.current = null;
    };
  }, [postureRef, refreshView]);

  // Freeze the drill timer while the tab is hidden (no hearts lost while away).
  useEffect(() => {
    const onVis = () => {
      const m = machineRef.current;
      if (!m) return;
      const now = performance.now();
      if (document.hidden) m.pause(now);
      else m.resume(now);
      refreshView(now);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [refreshView]);

  const start = useCallback(async () => {
    const audio = audioRef.current;
    const m = machineRef.current;
    if (!audio || !m) return;
    await audio.start();
    if (audio.status !== 'running') return;
    audio.resetAnalysis();
    lastPostureTs.current = -1;
    const now = performance.now();
    m.start(now, hearts);
    refreshView(now, { lastAttempt: null });
  }, [hearts, refreshView]);

  /** Re-arm for the next drill without re-opening the microphone. */
  const rearm = useCallback(() => {
    const m = machineRef.current;
    if (!m || audioRef.current?.status !== 'running') return;
    const now = performance.now();
    m.start(now, m.state === 'idle' ? hearts : m.hearts);
    refreshView(now, { lastAttempt: null });
  }, [hearts, refreshView]);

  const stop = useCallback(() => {
    const now = performance.now();
    machineRef.current?.stop(now);
    audioRef.current?.stop();
    refreshView(now);
  }, [refreshView]);

  return { ...view, start, rearm, stop };
}
