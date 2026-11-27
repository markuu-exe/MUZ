/**
 * The AI coach endpoint's logic, without the Anthropic SDK (so it is unit-tested with a fake).
 * `api/coach.ts` supplies the real `writeTip` that calls Claude.
 *
 * Guards, because the endpoint spends the owner's API credit and must work in demo mode
 * (no account) for the capstone demo:
 * - POST only, JSON body of at most 4 KB, validated by parseCoachInput (numbers/enums only).
 * - Same-site only: a browser Origin header from another site is refused.
 * - A small per-IP limit per server instance (best effort; the real ceiling is the spend limit
 *   set on the Anthropic Console key).
 */
import { cleanTip, parseCoachInput, type CoachInput } from './coach';

export type CoachSource = 'gemini' | 'claude';
export type TipResult = { kind: 'tip'; text: string; source?: CoachSource } | { kind: 'declined' } | { kind: 'error'; retryable: boolean };

export interface CoachDeps {
  writeTip: (input: CoachInput) => Promise<TipResult>;
  /** Whether the server has an API key at all. */
  configured: boolean;
  now?: () => number;
}

export const MAX_BODY_BYTES = 4096;
export const RATE_LIMIT = { windowMs: 60_000, max: 10 };

const hits = new Map<string, number[]>();

/** Test hook: clear the in-memory rate limiter. */
export function resetCoachRateLimit(): void {
  hits.clear();
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

function sameSite(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true; // same-origin fetches from some browsers omit it; non-browsers are covered by the rate limit
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

function rateLimited(ip: string, now: number): boolean {
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT.windowMs);
  if (recent.length >= RATE_LIMIT.max) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

export async function handleCoachRequest(request: Request, deps: CoachDeps): Promise<Response> {
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  if (!deps.configured) return json(503, { error: 'not_configured' });
  if (!sameSite(request)) return json(403, { error: 'forbidden' });

  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip, (deps.now ?? Date.now)())) return json(429, { error: 'rate_limited' });

  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return json(413, { error: 'too_large' });
    body = JSON.parse(raw);
  } catch {
    return json(400, { error: 'bad_request' });
  }
  const input = parseCoachInput(body);
  if (!input) return json(400, { error: 'bad_request' });

  let result: TipResult;
  try {
    result = await deps.writeTip(input);
  } catch {
    result = { kind: 'error', retryable: true };
  }
  if (result.kind === 'tip') {
    const tip = cleanTip(result.text);
    return tip ? json(200, { tip, source: result.source ?? null }) : json(502, { error: 'empty' });
  }
  if (result.kind === 'declined') return json(422, { error: 'declined' });
  return json(result.retryable ? 503 : 502, { error: 'upstream' });
}
