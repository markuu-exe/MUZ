import { useMemo } from 'react';
import { BookOpen, ChevronDown } from 'lucide-react';
import { COURSE_LESSONS, COURSE_UNITS } from '../../content';
import { buildLessonNotes } from '../../lib/dashboard/lessonNotes';
import NoteFigure from '../lesson/theory/NoteFigure';

/**
 * Lessons tab: study notes only. Practice happens on the Skill Tree; nothing
 * here is graded, saved or gated by hearts.
 */
export default function LessonNotesView() {
  const units = useMemo(() => buildLessonNotes(COURSE_LESSONS, COURSE_UNITS), []);

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-28">
      <div>
        <h2 className="text-2xl font-bold text-white">Lesson Notes</h2>
        <p className="mt-1 text-sm text-slate-400">
          Read-only notes from the Novice units. To practise a topic, open its lesson on the Skill Tree.
        </p>
      </div>

      {units.map((unit) => (
        <section key={unit.unit} className="space-y-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400">Unit {unit.unit}</p>
            <h3 className="text-lg font-bold text-white">{unit.title}</h3>
            <p className="text-xs text-slate-400">{unit.blurb}</p>
          </div>

          {unit.lessons.map((lesson, index) => (
            <details
              key={lesson.id}
              open={unit.unit === 1 && index === 0}
              className="group rounded-2xl border border-slate-800 bg-slate-900/80 open:border-violet-500/40"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5">
                <div className="flex min-w-0 items-start gap-3">
                  <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
                  <div className="min-w-0">
                    <h4 className="text-base font-bold text-white">{lesson.title}</h4>
                    <p className="mt-0.5 text-xs text-slate-400">{lesson.description}</p>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
              </summary>

              <div className="space-y-6 border-t border-slate-800/80 p-5">
                {lesson.cards.map((card, cardIndex) => (
                  <article key={`${lesson.id}-${cardIndex}`} className="space-y-3">
                    <h5 className="text-sm font-bold text-white">{card.title}</h5>
                    <p className="text-sm leading-relaxed text-slate-300">{card.body}</p>
                    {card.notes && card.notes.length > 0 && (
                      <NoteFigure notes={card.notes} display={card.display} chord={card.chord} />
                    )}
                  </article>
                ))}
              </div>
            </details>
          ))}
        </section>
      ))}
    </div>
  );
}
