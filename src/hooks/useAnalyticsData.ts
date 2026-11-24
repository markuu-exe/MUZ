import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase/client';
import {
  rangeSinceIso,
  rhythmHistogram,
  toSessions,
  type AnalyticsDateRange,
  type AnalyticsSessionPoint,
  type PerformanceSample,
  type RhythmHistogramBucket,
} from '../lib/analytics/aggregate';

export interface AnalyticsBadge {
  id: string;
  title: string;
  unlockedAt: string | null;
}

export interface AnalyticsData {
  loading: boolean;
  error: string | null;
  sessions: AnalyticsSessionPoint[];
  rhythmHistogram: RhythmHistogramBucket[];
  badges: AnalyticsBadge[];
  reload: () => void;
}

const EMPTY_HISTOGRAM = rhythmHistogram([]);

/**
 * T-12: fetches performance_records, achievements, and user_achievements for
 * the Profile & Analytics view. Skips all queries in demo mode.
 */
export function useAnalyticsData(
  userId: string | null,
  range: AnalyticsDateRange,
  isDemo = false,
): AnalyticsData {
  const [rows, setRows] = useState<PerformanceSample[]>([]);
  const [badges, setBadges] = useState<AnalyticsBadge[]>([]);
  const [loading, setLoading] = useState(!isDemo && Boolean(userId));
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (isDemo || !userId) {
      setRows([]);
      setBadges([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        let perfQuery = supabase
          .from('performance_records')
          .select('lesson_id, session_timestamp, pitch_accuracy, rhythm_consistency, posture_score, drill_duration_sec')
          .eq('user_id', userId)
          .order('session_timestamp', { ascending: true });

        const since = rangeSinceIso(range);
        if (since) {
          perfQuery = perfQuery.gte('session_timestamp', since);
        }

        const [perfResult, achievementsResult, unlockedResult] = await Promise.all([
          perfQuery,
          supabase.from('achievements').select('id, title'),
          supabase.from('user_achievements').select('achievement_id, unlocked_at').eq('user_id', userId),
        ]);

        if (cancelled) return;

        if (perfResult.error) {
          throw new Error(perfResult.error.message);
        }

        const unlockedMap = new Map<string, string>();
        for (const row of unlockedResult.data ?? []) {
          unlockedMap.set(row.achievement_id, row.unlocked_at);
        }

        const nextBadges: AnalyticsBadge[] = (achievementsResult.data ?? []).map((ach) => ({
          id: ach.id,
          title: ach.title,
          unlockedAt: unlockedMap.get(ach.id) ?? null,
        }));

        setRows((perfResult.data ?? []) as PerformanceSample[]);
        setBadges(nextBadges);
      } catch (err) {
        if (cancelled) return;
        setRows([]);
        setBadges([]);
        setError(err instanceof Error ? err.message : 'Could not load analytics data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [userId, range, isDemo, version]);

  const sessions = useMemo(() => toSessions(rows), [rows]);
  const histogram = useMemo(
    () => (rows.length > 0 ? rhythmHistogram(rows) : EMPTY_HISTOGRAM),
    [rows],
  );

  return useMemo(
    () => ({
      loading,
      error,
      sessions,
      rhythmHistogram: histogram,
      badges,
      reload: () => setVersion((v) => v + 1),
    }),
    [loading, error, sessions, histogram, badges],
  );
}
