import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase/client';
import {
  DEMO_CURRICULUM,
  DEMO_PROGRESS,
  toCurriculumNode,
  type CurriculumNode,
} from '../lib/dashboard/curriculum';
import type { UserProgress } from '../types/database.types';
import type { UserProfile } from '../types/auth.types';

interface DashboardData {
  lessons: CurriculumNode[];
  progress: Record<string, UserProgress | Pick<UserProgress, 'lesson_id' | 'completed'>>;
  loading: boolean;
  usingFallback: boolean;
}

function asProgressMap(
  rows: Array<Partial<UserProgress> & { lesson_id?: string; completed?: boolean }>,
): DashboardData['progress'] {
  const map: DashboardData['progress'] = {};
  for (const row of rows) {
    if (!row.lesson_id) continue;
    map[row.lesson_id] = {
      id: row.id ?? row.lesson_id,
      user_id: row.user_id ?? row.profile_id ?? '',
      profile_id: row.profile_id ?? row.user_id ?? '',
      lesson_id: row.lesson_id,
      completed: Boolean(row.completed),
      accuracy_percentage: row.accuracy_percentage ?? (row.completed ? 100 : 0),
      posture_stability_score: row.posture_stability_score ?? (row.completed ? 94 : 0),
      unlocked_at: row.unlocked_at ?? row.created_at ?? null,
      completed_at: row.completed_at ?? row.updated_at ?? null,
      created_at: row.created_at ?? null,
      updated_at: row.updated_at ?? null,
    };
  }
  return map;
}

export function useDashboardData(profile: UserProfile | null, isDemo: boolean): DashboardData {
  const [lessons, setLessons] = useState<CurriculumNode[]>(DEMO_CURRICULUM);
  const [progress, setProgress] = useState<DashboardData['progress']>(DEMO_PROGRESS);
  const [loading, setLoading] = useState(!isDemo);
  const [usingFallback, setUsingFallback] = useState(true);

  useEffect(() => {
    if (isDemo || !profile?.id) {
      setLessons(DEMO_CURRICULUM);
      setProgress(DEMO_PROGRESS);
      setUsingFallback(true);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [{ data: lessonRows, error: lessonError }, progressByUser] = await Promise.all([
          supabase
            .from('lessons')
            .select('*')
            .eq('instrument', 'piano')
            .order('module_index')
            .order('node_index'),
          supabase.from('user_progress').select('*').eq('user_id', profile.id),
        ]);

        if (cancelled) return;

        let remoteProgress = (progressByUser.data ?? []) as UserProgress[];
        if (progressByUser.error && remoteProgress.length === 0) {
          const fallbackProgress = await supabase
            .from('user_progress')
            .select('*')
            .eq('profile_id', profile.id);
          remoteProgress = (fallbackProgress.data ?? []) as UserProgress[];
        }

        const remoteLessons = lessonRows ?? [];

        if (lessonError || remoteLessons.length === 0) {
          setLessons(DEMO_CURRICULUM);
          setProgress(remoteProgress.length > 0 ? asProgressMap(remoteProgress) : DEMO_PROGRESS);
          setUsingFallback(true);
          return;
        }

        const progressMap = asProgressMap(remoteProgress);
        setLessons(
          remoteLessons.map((lesson) =>
            toCurriculumNode(lesson, progressMap[lesson.id] as UserProgress | undefined),
          ),
        );
        setProgress(progressMap);
        setUsingFallback(false);
      } catch {
        if (cancelled) return;
        setLessons(DEMO_CURRICULUM);
        setProgress(DEMO_PROGRESS);
        setUsingFallback(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [isDemo, profile?.id]);

  return useMemo(
    () => ({ lessons, progress, loading, usingFallback }),
    [lessons, progress, loading, usingFallback],
  );
}
