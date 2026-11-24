import { getCourseLesson, lessonEngines } from '../../content';
import { toLocalDate } from '../progress/streak';

export type AnalyticsDateRange = '7d' | '30d' | 'all';

export interface PerformanceSample {
  lesson_id: string;
  session_timestamp: string;
  pitch_accuracy: number;
  rhythm_consistency: number;
  posture_score: number;
  drill_duration_sec: number;
}

export interface AnalyticsSessionPoint {
  day: string;
  pitch: number | null;
  rhythm: number | null;
  posture: number | null;
  minutes: number;
}

export interface RhythmHistogramBucket {
  bucket: string;
  count: number;
}

export interface MeasuredMetrics {
  pitch: boolean;
  rhythm: boolean;
  posture: boolean;
}

export type MetricDetector = (lessonId: string) => MeasuredMetrics;

export const HISTOGRAM_BUCKETS = ['0–59', '60–69', '70–79', '80–89', '90–100'] as const;

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Derives which performance metrics a lesson actually measures from its
 * bundled exercise engines so unmeasured zeros are never plotted as scores.
 */
export function metricsMeasured(lessonId: string): MeasuredMetrics {
  const lesson = getCourseLesson(lessonId);
  if (!lesson) return { pitch: false, rhythm: false, posture: false };
  const engines = lessonEngines(lesson.payload);
  const hasPractice = engines.includes('practice');
  const hasRhythm = engines.includes('rhythm');
  return {
    pitch: hasPractice,
    rhythm: hasRhythm,
    posture: hasPractice,
  };
}

/**
 * Groups performance rows by local calendar day (YYYY-MM-DD), averaging only
 * the metrics measured by each row's lesson and setting unmeasured ones to null.
 */
export function toSessions(
  rows: readonly PerformanceSample[],
  measure: MetricDetector = metricsMeasured,
): AnalyticsSessionPoint[] {
  if (rows.length === 0) return [];

  const byDay = new Map<
    string,
    {
      pitchSum: number;
      pitchCount: number;
      rhythmSum: number;
      rhythmCount: number;
      postureSum: number;
      postureCount: number;
      durationSec: number;
    }
  >();

  for (const row of rows) {
    const date = new Date(row.session_timestamp);
    if (Number.isNaN(date.getTime())) continue;
    const day = toLocalDate(date);
    const measured = measure(row.lesson_id);

    const acc = byDay.get(day) ?? {
      pitchSum: 0,
      pitchCount: 0,
      rhythmSum: 0,
      rhythmCount: 0,
      postureSum: 0,
      postureCount: 0,
      durationSec: 0,
    };

    if (measured.pitch) {
      acc.pitchSum += row.pitch_accuracy;
      acc.pitchCount += 1;
    }
    if (measured.rhythm) {
      acc.rhythmSum += row.rhythm_consistency;
      acc.rhythmCount += 1;
    }
    if (measured.posture) {
      acc.postureSum += row.posture_score;
      acc.postureCount += 1;
    }
    acc.durationSec += Math.max(0, row.drill_duration_sec);
    byDay.set(day, acc);
  }

  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, acc]) => ({
      day,
      pitch: acc.pitchCount > 0 ? round2(acc.pitchSum / acc.pitchCount) : null,
      rhythm: acc.rhythmCount > 0 ? round2(acc.rhythmSum / acc.rhythmCount) : null,
      posture: acc.postureCount > 0 ? round2(acc.postureSum / acc.postureCount) : null,
      minutes: Math.round((acc.durationSec / 60) * 10) / 10,
    }));
}

/**
 * Counts measured rhythm_consistency values into 5 buckets:
 * 0–59, 60–69, 70–79, 80–89, 90–100.
 */
export function rhythmHistogram(
  rows: readonly PerformanceSample[],
  measure: MetricDetector = metricsMeasured,
): RhythmHistogramBucket[] {
  const counts = [0, 0, 0, 0, 0];

  for (const row of rows) {
    if (!measure(row.lesson_id).rhythm) continue;
    const score = row.rhythm_consistency;
    if (score < 60) counts[0] += 1;
    else if (score < 70) counts[1] += 1;
    else if (score < 80) counts[2] += 1;
    else if (score < 90) counts[3] += 1;
    else counts[4] += 1;
  }

  return HISTOGRAM_BUCKETS.map((bucket, idx) => ({
    bucket,
    count: counts[idx],
  }));
}

/** Returns an ISO timestamp for the start of the selected date range, or null for 'all'. */
export function rangeSinceIso(range: AnalyticsDateRange, now: Date = new Date()): string | null {
  if (range === 'all') return null;
  const days = range === '7d' ? 7 : 30;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}
