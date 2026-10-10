import { useCallback, useEffect, useRef, useState } from 'react';
import type { Phase, PracticeEvaluation } from '../types/engine.types';

const LATCH_WINDOW_MS = 400;
const TIMEOUT_MS = 15000;

export function usePracticeFSM(initialHearts = 5) {
  const [phase, setPhase] = useState<Phase>('Listening');
  const [hearts, setHearts] = useState(initialHearts);
  const [score, setScore] = useState(0);
  const latchingStartedAt = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const clearTimeoutRef = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    clearTimeoutRef();
    latchingStartedAt.current = null;
    setPhase('Listening');
    setScore(0);

    timeoutRef.current = window.setTimeout(() => {
      setPhase('Timeout');
      setHearts((current) => Math.max(0, current - 1));
    }, TIMEOUT_MS);
  }, [clearTimeoutRef]);

  const penalize = useCallback(() => {
    clearTimeoutRef();
    setPhase('Penalize');
    setHearts((current) => Math.max(0, current - 1));
  }, [clearTimeoutRef]);

  const evaluate = useCallback(
    (result: PracticeEvaluation) => {
      const isReady = Boolean(result.posturePassed && result.audioPassed);

      if (!isReady) {
        if (phase !== 'Listening') {
          setPhase('Listening');
          latchingStartedAt.current = null;
        }
        return;
      }

      if (phase === 'Listening') {
        latchingStartedAt.current = performance.now();
        setPhase('Latching');
        return;
      }

      if (phase === 'Latching' && latchingStartedAt.current !== null) {
        const elapsed = performance.now() - latchingStartedAt.current;

        if (elapsed >= LATCH_WINDOW_MS) {
          clearTimeoutRef();
          setPhase('Success');
          const increment = result.verdict === 'Perfect' ? 100 : result.verdict === 'Good' ? 70 : 0;
          setScore((current) => current + increment);
        }
      }
    },
    [clearTimeoutRef, phase],
  );

  useEffect(() => {
    return () => clearTimeoutRef();
  }, [clearTimeoutRef]);

  return {
    phase,
    hearts,
    score,
    start,
    evaluate,
    penalize,
  };
}
