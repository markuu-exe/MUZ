import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase/client';
import {
  DEMO_CURRICULUM,
  demoProgressForExp,
  toCurriculumNode,
  type CurriculumNode,
  type ProgressMap,
} from '../lib/dashboard/curriculum';
import { isLessonPayload } from '../types/lesson.types';
import type { UserProgress } from '../types/database.types';
import type { UserProfile } from '../types/auth.types';

interface DashboardData {
  lessons: CurriculumNode[];
  progress: ProgressMap;
  loading: boolean;
  /** True when the bundled course is shown instead of the database rows. */
  usingFallback: boolean;
  /** Re-read progress after a lesson finishes (COURSE-6). */
  reload: () => void;
}

function asProgressMap(rows: UserProgress[]): ProgressMap {
  const map: ProgressMap = {};
  for (const row of rows) map[row.lesson_id] = row;
  return map;
}

/**
 * COURSE-2: lessons come from Supabase when the table holds v2 payloads;
 * otherwise (offline, empty table, or the old seed) the bundled course is used.
 * Progress is always read from `user_progress.user_id` (was the non-existent `profile_id`).
 */
export function useDashboardData(profile: UserProfile | null, isDemo: boolean): DashboardData {
  const [lessons, setLessons] = useState<CurriculumNode[]>(DEMO_CURRICULUM);
  const [progress, setProgress] = useState<ProgressMap>({});
  const [loading, setLoading] = useState(!isDemo);
  const [usingFallback, setUsingFallback] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (isDemo || !profile?.id) {
      setLessons(DEMO_CURRICULUM);
      setProgress(demoProgressForExp(profile?.exp ?? 0));
      setUsingFallback(true);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [{ data: lessonRows, error: lessonError }, progressResult] = await Promise.all([
          supabase.from('lessons').select('*').eq('instrument', 'piano').order('module_index').order('node_index'),
          supabase.from('user_progress').select('*').eq('user_id', profile.id),
        ]);
        if (cancelled) return;

        const remoteProgress = (progressResult.data ?? []) as UserProgress[];
        setProgress(asProgressMap(remoteProgress));

        const remoteLessons = lessonRows ?? [];
        const usable = !lessonError && remoteLessons.length > 0 && remoteLessons.every((l) => isLessonPayload(l.payload));
        if (!usable) {
          setLessons(DEMO_CURRICULUM);
          setUsingFallback(true);
          return;
        }
        setLessons(remoteLessons.map((lesson) => toCurriculumNode(lesson, asProgressMap(remoteProgress)[lesson.id])));
        setUsingFallback(false);
      } catch {
        if (cancelled) return;
        setLessons(DEMO_CURRICULUM);
        setUsingFallback(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [isDemo, profile?.id, profile?.exp, version]);

  return useMemo(
    () => ({ lessons, progress, loading, usingFallback, reload: () => setVersion((v) => v + 1) }),
    [lessons, progress, loading, usingFallback],
  );
}
