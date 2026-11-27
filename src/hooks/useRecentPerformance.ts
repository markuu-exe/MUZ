/**
 * The learner's own performance rows for the last 30 days (for the practice suggestion).
 * Fetched only when Profile opens; nothing in demo mode (nothing is saved there).
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase/client';
import { WINDOW_DAYS, type RecentRow } from '../lib/analytics/suggestion';

export function useRecentPerformance(userId: string | null | undefined, isDemo: boolean) {
  const [rows, setRows] = useState<RecentRow[]>([]);
  const [loading, setLoading] = useState(!isDemo && Boolean(userId));
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (isDemo || !userId) {
      setRows([]);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();
    void (async () => {
      const { data, error: err } = await supabase
        .from('performance_records')
        .select('lesson_id, session_timestamp, pitch_accuracy, rhythm_consistency, posture_score')
        .eq('user_id', userId)
        .gte('session_timestamp', since)
        .order('session_timestamp', { ascending: false })
        .limit(200);
      if (cancelled) return;
      if (err) {
        setRows([]);
        setError(err.message);
      } else setRows((data ?? []) as RecentRow[]);
      setLoading(false);
    })().catch((e: unknown) => {
      if (cancelled) return;
      setRows([]);
      setError(e instanceof Error ? e.message : 'Could not load your recent results.');
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, isDemo, version]);

  return { rows, loading, error, reload };
}
