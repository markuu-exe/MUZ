/**
 * COURSE-5: one PracticeRig per open lesson. The rig is created the first time a
 * practice exercise asks for it and disposed when the provider unmounts, so the
 * camera and microphone are released as soon as the lesson's exercises end.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { PracticeRig, type RigState } from '../../../practice/PracticeRig';

interface RigHandle {
  getRig: () => PracticeRig;
}

const RigContext = createContext<RigHandle | null>(null);

export function PracticeRigProvider({ children }: { children: ReactNode }) {
  const rigRef = useRef<PracticeRig | null>(null);
  const getRig = useCallback(() => (rigRef.current ??= new PracticeRig()), []);
  const pendingDispose = useRef<number | null>(null);
  useEffect(() => {
    // React StrictMode unmounts and remounts once in development; only a real unmount disposes.
    if (pendingDispose.current !== null) {
      window.clearTimeout(pendingDispose.current);
      pendingDispose.current = null;
    }
    return () => {
      pendingDispose.current = window.setTimeout(() => {
        rigRef.current?.dispose();
        rigRef.current = null;
      }, 0);
    };
  }, []);
  const handle = useMemo(() => ({ getRig }), [getRig]);
  return <RigContext.Provider value={handle}>{children}</RigContext.Provider>;
}

/** The lesson's rig and its live state. Must be used under <PracticeRigProvider>. */
export function usePracticeRig(): { rig: PracticeRig; state: RigState } {
  const handle = useContext(RigContext);
  if (!handle) throw new Error('usePracticeRig must be used inside <PracticeRigProvider>.');
  const rig = handle.getRig();
  const state = useSyncExternalStore(
    useCallback((notify: () => void) => rig.on('state', notify), [rig]),
    () => rig.state,
  );
  return { rig, state };
}
