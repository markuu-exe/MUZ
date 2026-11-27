/**
 * P8: the learner's recorded sessions for the last 7 local days (src/lib/analytics/weekly.ts).
 * Independent of the Profile chart range, so the weekly summary is always "this week".
 * Nothing is fetched in demo mode (nothing is saved there).
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase/client';
import { weekStartIso, type WeeklyRow } from '../lib/analytics/weekly';

export interface WeeklyActivity {
  rows: WeeklyRow[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useWeeklyActivity(userId: string | null | undefined, isDemo: boolean): WeeklyActivity {
  const [rows, setRows] = useState<WeeklyRow[]>([]);
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
    void (async () => {
      const { data, error: err } = await supabase
        .from('performance_records')
        .select('session_timestamp, drill_duration_sec')
        .eq('user_id', userId)
        .gte('session_timestamp', weekStartIso(new Date()));
      if (cancelled) return;
      if (err) {
        setRows([]);
        setError(err.message);
      } else {
        setRows((data ?? []) as WeeklyRow[]);
      }
      setLoading(false);
    })().catch((e: unknown) => {
      if (cancelled) return;
      setRows([]);
      setError(e instanceof Error ? e.message : 'Could not load this week.');
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, isDemo, version]);

  return { rows, loading, error, reload };
}
