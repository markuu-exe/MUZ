/**
 * The free, offline fallback for "Ask the coach": find the Lesson Notes cards that best match
 * the question's words (titles count more than body text). Used when no AI is set up, it is
 * busy or offline, or it declines. Nothing leaves the device.
 */
import type { LessonNoteCard, UnitNotes } from '../dashboard/lessonNotes';

const STOP = new Set(
  'a an the is are was were be to of in on at for and or but what whats which who how why when where do does did can could should would i me my you your it its this that these those with from about please tell explain mean means play playing piano'.split(
    ' ',
  ),
);

/** Light stemming: dotted -> dot, ties -> tie, swinging -> swing. */
function stem(w: string): string {
  const base = w.replace(/(ings?|ed|es|s)$/, '');
  // A doubled final consonant left by -ed / -ing (dott-ed, stopp-ing) is undoubled.
  return base !== w && /([b-df-hj-np-tv-z])\1$/.test(base) ? base.slice(0, -1) : base;
}

/** Lower-case words, light stemming, music tokens like 6/8 and c# kept whole. */
export function keywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[“”"'’()?!.,:;]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP.has(w))
    .map((w) => (/^[a-g][#b]?\d?$/.test(w) || /\d\/\d/.test(w) ? w : stem(w)))
    .filter((w) => w.length >= 2);
}

export interface NoteMatch {
  unitTitle: string;
  lessonTitle: string;
  card: LessonNoteCard;
  score: number;
}

export function searchNotes(question: string, units: readonly UnitNotes[], limit = 2): NoteMatch[] {
  const words = keywords(question);
  if (words.length === 0) return [];
  const has = (text: string, w: string) => keywords(text).some((k) => k === w || (k.length > 3 && w.length > 3 && (k.startsWith(w) || w.startsWith(k))));
  const out: NoteMatch[] = [];
  for (const unit of units) {
    for (const lesson of unit.lessons) {
      for (const card of lesson.cards) {
        let score = 0;
        for (const w of words) {
          if (has(card.title, w)) score += 3;
          if (has(lesson.title, w)) score += 2;
          if (has(card.body, w)) score += 1;
        }
        if (score > 0) out.push({ unitTitle: unit.title, lessonTitle: lesson.title, card, score });
      }
    }
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}
