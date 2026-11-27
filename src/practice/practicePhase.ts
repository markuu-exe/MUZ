/**
 * P5: "practice before grading" for play-note / play-chord / play-sequence drills.
 *
 * Every drill opens in an ungraded practice run: the SAME PracticeDrill (same verifiers,
 * same posture latch, same Hearing feedback) with heartCost 0, so a timeout or three wrong
 * notes only restarts the attempt and nothing is reported to the lesson. The learner may
 * retry practice as often as they like, then choose "Start graded attempt", which disposes the
 * practice drill and arms a fresh graded one (hearts, timer and penalties as before).
 * There is no way back from graded to practice inside the same exercise.
 */

export type DrillPhase =
  /** `passes` counts practice runs that met the target (sound + posture). */
  | { kind: 'practice'; passes: number; justPassed: boolean }
  | { kind: 'graded' };

export type DrillPhaseAction = { type: 'practice-passed' } | { type: 'retry-practice' } | { type: 'start-graded' };

export const INITIAL_DRILL_PHASE: DrillPhase = Object.freeze({ kind: 'practice', passes: 0, justPassed: false }) as DrillPhase;

export function drillPhaseReducer(state: DrillPhase, action: DrillPhaseAction): DrillPhase {
  if (state.kind === 'graded') return state; // graded is final for this exercise
  switch (action.type) {
    case 'practice-passed':
      return { kind: 'practice', passes: state.passes + 1, justPassed: true };
    case 'retry-practice':
      return { kind: 'practice', passes: state.passes, justPassed: false };
    case 'start-graded':
      return { kind: 'graded' };
  }
}

/**
 * Options for the practice run. One heart (the drill locks at once with none) that can never
 * be lost (heartCost 0), independent of the learner's real hearts, which practice never touches.
 */
export function practiceDrillOptions(timeoutSec: number): { hearts: number; timeoutSec: number; heartCost: 0 } {
  return { hearts: 1, timeoutSec, heartCost: 0 };
}
