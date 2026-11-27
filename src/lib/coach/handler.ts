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
import { clientIp, createRateLimiter, json, readJson, sameSite } from './guard';

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

const limiter = createRateLimiter(RATE_LIMIT.windowMs, RATE_LIMIT.max);

/** Test hook: clear the in-memory rate limiter. */
export function resetCoachRateLimit(): void {
  limiter.reset();
}

export async function handleCoachRequest(request: Request, deps: CoachDeps): Promise<Response> {
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  if (!deps.configured) return json(503, { error: 'not_configured' });
  if (!sameSite(request)) return json(403, { error: 'forbidden' });

  if (limiter.hit(clientIp(request), (deps.now ?? Date.now)())) return json(429, { error: 'rate_limited' });

  const read = await readJson(request, MAX_BODY_BYTES);
  if (!read.ok) return json(read.status, { error: read.status === 413 ? 'too_large' : 'bad_request' });
  const input = parseCoachInput(read.body);
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
