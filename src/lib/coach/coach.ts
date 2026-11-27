/**
 * AI coach (owner request 2026-11-27): a short, specific practice tip written by Claude from
 * ONE finished lesson's scores. Shared by the browser (builds the summary) and the Vercel
 * function `api/coach.ts` (validates it, builds the prompt, calls the API).
 *
 * Privacy: only the numbers below and the lesson's course title are sent, and only when the
 * learner presses the button. No name, email, account id, audio or video ever leaves the app.
 * Prompt safety: the server accepts numbers and fixed enum values only (plus the course title,
 * length-limited and stripped of control characters), so nothing the learner types reaches Claude.
 */
import type { LessonResult } from '../../lesson/types.js';

export const COACH_STATUSES = ['passed', 'failed', 'out-of-hearts', 'quit'] as const;
export const COACH_SKILLS = ['theory', 'rhythm', 'notes', 'chords', 'posture'] as const;
export type CoachSkill = (typeof COACH_SKILLS)[number];

export interface CoachInput {
  lessonTitle: string;
  status: (typeof COACH_STATUSES)[number];
  /** 0–100, graded exercises passed on the first try. */
  accuracy: number;
  /** 0–100 or null when the lesson had no theory checks. */
  theoryScore: number | null;
  heartsLost: number;
  durationSec: number;
  rhythmConsistency: number | null;
  pitchAccuracy: number | null;
  postureScore: number | null;
  /** Skills whose exercises needed more than one try (fixed vocabulary). */
  struggledWith: CoachSkill[];
}

export const MAX_TITLE_LENGTH = 80;

function skillOf(type: string): CoachSkill | null {
  if (type === 'play-chord' || type === 'build-the-chord') return 'chords';
  if (type === 'play-note' || type === 'play-sequence') return 'notes';
  if (type === 'posture-hold') return 'posture';
  if (type.startsWith('tap-')) return 'rhythm';
  if (['choose-answer', 'name-the-note', 'find-the-key', 'ear-pick'].includes(type)) return 'theory';
  return null;
}

const round = (n: number) => Math.round(n);

/** Browser side: the summary of a finished lesson that may be sent to the coach. */
export function buildCoachInput(result: LessonResult, lessonTitle: string): CoachInput {
  const used = (engine: string) => result.records.some((r) => r.engine === engine);
  const struggled = new Set<CoachSkill>();
  for (const r of result.records) {
    if (r.attempt > 1 || !r.passed) {
      const s = skillOf(r.type);
      if (s) struggled.add(s);
    }
  }
  return {
    lessonTitle: lessonTitle.slice(0, MAX_TITLE_LENGTH),
    status: result.status,
    accuracy: round(result.accuracy),
    theoryScore: result.theoryScore === null ? null : round(result.theoryScore),
    heartsLost: result.heartsLost,
    durationSec: round(result.durationSec),
    rhythmConsistency: used('rhythm') ? round(result.metrics.rhythmConsistency) : null,
    pitchAccuracy: used('practice') ? round(result.metrics.pitchAccuracy) : null,
    postureScore: used('practice') ? round(result.metrics.postureScore) : null,
    struggledWith: COACH_SKILLS.filter((s) => struggled.has(s)),
  };
}

const pct = (v: unknown): number | null | undefined => {
  if (v === null) return null;
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100 ? Math.round(v) : undefined;
};

/** Server side: accept only a well-formed summary; anything else is rejected (null). */
export function parseCoachInput(body: unknown): CoachInput | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const b = body as Record<string, unknown>;
  const title = typeof b.lessonTitle === 'string' ? b.lessonTitle.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, MAX_TITLE_LENGTH) : '';
  if (!title) return null;
  if (!COACH_STATUSES.includes(b.status as CoachInput['status'])) return null;
  const accuracy = pct(b.accuracy);
  const theoryScore = pct(b.theoryScore);
  const rhythmConsistency = pct(b.rhythmConsistency);
  const pitchAccuracy = pct(b.pitchAccuracy);
  const postureScore = pct(b.postureScore);
  if (accuracy == null || theoryScore === undefined || rhythmConsistency === undefined || pitchAccuracy === undefined || postureScore === undefined) {
    return null;
  }
  const heartsLost = b.heartsLost;
  const durationSec = b.durationSec;
  if (typeof heartsLost !== 'number' || !Number.isInteger(heartsLost) || heartsLost < 0 || heartsLost > 5) return null;
  if (typeof durationSec !== 'number' || !Number.isFinite(durationSec) || durationSec < 0 || durationSec > 4 * 3600) return null;
  if (!Array.isArray(b.struggledWith) || b.struggledWith.length > COACH_SKILLS.length) return null;
  if (!b.struggledWith.every((s) => COACH_SKILLS.includes(s as CoachSkill))) return null;
  return {
    lessonTitle: title,
    status: b.status as CoachInput['status'],
    accuracy,
    theoryScore,
    heartsLost,
    durationSec: Math.round(durationSec),
    rhythmConsistency,
    pitchAccuracy,
    postureScore,
    struggledWith: [...new Set(b.struggledWith as CoachSkill[])],
  };
}

export const COACH_SYSTEM_PROMPT = `You are the practice coach inside MUZ, a web app that teaches beginner to intermediate piano with a camera (posture) and a microphone (notes, chords and rhythm).

You receive the scores of one lesson the learner just finished. Write a short tip for that learner:
- 2 or 3 sentences, about 60 words at most, in plain text (no markdown, no lists, no headings, no emoji).
- Start with one specific thing that went well, using a number from the scores when one supports it.
- Then give one concrete thing to practise next, tied to the weakest score or to a skill listed in struggledWith.
- Use only the numbers you were given; never invent scores, times or history.
- Posture advice in MUZ terms: elbow angle 80 to 110 degrees, wrist close to straight (140 to 180 degrees), sit tall with forearms level with the keys.
- Rhythm advice: count aloud with the count-in and keep taps even; the app checks timing to within tens of milliseconds.
- If status is "out-of-hearts", be encouraging and suggest a theory lesson (scoring 80% or more there restores a heart) or a short break.
- A null score means that part was not in this lesson: do not mention it.
- Speak to the learner directly ("you"). Be warm but not gushing.`;

/** The user turn: the scores as JSON data, so the model reads them as data, not instructions. */
export function coachUserMessage(input: CoachInput): string {
  return `Scores of the lesson just finished (JSON):\n${JSON.stringify(input)}`;
}

/** Strip anything that is not plain prose and cap the length, as a last guard for the UI. */
export function cleanTip(text: string): string {
  return text
    .replace(/[*_#`>]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 600);
}
