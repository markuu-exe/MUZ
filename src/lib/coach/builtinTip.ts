/**
 * The free, built-in coach: a tip written by fixed rules from the same lesson summary the AI
 * coach gets. Used when no AI service is set up, when it is busy or offline, or when it
 * declines. Deterministic, instant, nothing leaves the device. Labelled "built-in, not AI".
 */
import type { CoachInput, CoachSkill } from './coach';

type Area = 'posture' | 'rhythm' | 'notes' | 'chords' | 'theory' | 'accuracy';

const PRAISE: Record<Area, (v: number) => string> = {
  posture: (v) => `Your posture held up well (${v}% of the time in the good range).`,
  rhythm: (v) => `Your timing was steady (${v}% rhythm consistency).`,
  notes: (v) => `Your notes were accurate (${v}% of tries matched).`,
  chords: (v) => `Your notes were accurate (${v}% of tries matched).`,
  theory: (v) => `You knew the theory (${v}% on the first try).`,
  accuracy: (v) => `You got ${v}% of the exercises right on the first try.`,
};

const ADVICE: Record<Area, string> = {
  posture:
    'Next, check your posture before you play: elbow between 80 and 110 degrees, wrist almost straight, forearms level with the keys.',
  rhythm: 'Next, count aloud with the count-in and keep your taps even; replay this rhythm at the same tempo.',
  notes: 'Next, play each note slowly and let it ring until the Hearing panel turns green before moving on.',
  chords: 'Next, press all the chord keys at exactly the same time and hold them; the Hearing panel shows which note is missing.',
  theory: 'Next, read this unit in the Lessons tab, then replay the check questions.',
  accuracy: 'Next, replay the lesson and take each exercise slowly; first-try accuracy is what counts.',
};

const SKILL_AREA: Record<CoachSkill, Area> = { posture: 'posture', rhythm: 'rhythm', notes: 'notes', chords: 'chords', theory: 'theory' };
const GOOD = 80;

export function builtinTip(input: CoachInput): string {
  const scores: Array<[Area, number]> = [];
  if (input.postureScore !== null) scores.push(['posture', input.postureScore]);
  if (input.rhythmConsistency !== null) scores.push(['rhythm', input.rhythmConsistency]);
  if (input.pitchAccuracy !== null) scores.push([input.struggledWith.includes('chords') ? 'chords' : 'notes', input.pitchAccuracy]);
  if (input.theoryScore !== null) scores.push(['theory', input.theoryScore]);
  scores.push(['accuracy', input.accuracy]);

  const best = [...scores].sort((a, b) => b[1] - a[1])[0];
  const weakest = [...scores].sort((a, b) => a[1] - b[1])[0];
  const parts: string[] = [];

  if (input.status === 'out-of-hearts') {
    parts.push('You ran out of hearts, which happens to everyone while learning.');
    parts.push('Take a theory lesson (80% or more gives a heart back) or rest about 15 minutes, then try again.');
    return parts.join(' ');
  }

  parts.push(best[1] >= GOOD ? PRAISE[best[0]](best[1]) : `You finished "${input.lessonTitle}", and every run builds the skill.`);

  // Prefer the weakest measured score; otherwise a skill that needed retries; otherwise keep going.
  const focus: Area | null =
    weakest[1] < GOOD && weakest[0] !== best[0]
      ? weakest[0]
      : input.struggledWith.length > 0
        ? SKILL_AREA[input.struggledWith[0]]
        : weakest[1] < GOOD
          ? weakest[0]
          : null;
  if (focus) parts.push(ADVICE[focus]);
  else parts.push(input.status === 'passed' ? 'Great run: move on to the next lesson while it is fresh.' : 'Replay it once more; you are close.');
  if (input.status === 'failed') parts.push('You will get it on the next try.');
  return parts.join(' ');
}
