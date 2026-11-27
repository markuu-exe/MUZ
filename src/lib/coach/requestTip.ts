/**
 * Browser side of the AI coach: POST the lesson summary to /api/coach and map every failure
 * to a short message the results screen can show. Never throws.
 */
import type { CoachInput } from './coach';

export type TipResponse = { ok: true; tip: string } | { ok: false; message: string };

export const COACH_TIMEOUT_MS = 25_000;

export function coachErrorMessage(status: number, error?: string): string {
  if (status === 404 || error === 'not_configured') return 'The AI coach is not available on this version of MUZ.';
  if (status === 429 || error === 'rate_limited') return 'The coach needs a short break. Try again in a minute.';
  if (error === 'declined') return 'The coach could not write a tip for this lesson.';
  return 'The coach could not be reached. Check your connection and try again.';
}

export async function requestTip(input: CoachInput, fetchImpl: typeof fetch = fetch): Promise<TipResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), COACH_TIMEOUT_MS);
  try {
    const res = await fetchImpl('/api/coach', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    let data: { tip?: unknown; error?: string } = {};
    try {
      data = (await res.json()) as typeof data;
    } catch {
      // Not JSON (e.g. the dev server's HTML for an unknown route).
    }
    if (res.ok && typeof data.tip === 'string' && data.tip.trim()) return { ok: true, tip: data.tip };
    return { ok: false, message: coachErrorMessage(res.ok ? 502 : res.status, data.error) };
  } catch {
    return { ok: false, message: coachErrorMessage(0) };
  } finally {
    clearTimeout(timer);
  }
}
