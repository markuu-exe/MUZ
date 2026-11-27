/**
 * Request guards shared by the AI endpoints (/api/coach, /api/ask): JSON responses,
 * same-site Origin check, client IP and a small in-memory rate limiter. The limiter is per
 * server instance (best effort); the hard ceiling is the AI provider's own quota or spend limit.
 */

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

/** True when there is no browser Origin (same-origin fetches may omit it) or it matches this host. */
export function sameSite(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export function clientIp(request: Request): string {
  return (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
}

export interface RateLimiter {
  /** Records a request; true when this key is over the limit (the request must be refused). */
  hit(key: string, now: number): boolean;
  reset(): void;
}

export function createRateLimiter(windowMs: number, max: number): RateLimiter {
  const hits = new Map<string, number[]>();
  return {
    hit(key, now) {
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      const over = recent.length >= max;
      if (!over) recent.push(now);
      hits.set(key, recent);
      return over;
    },
    reset() {
      hits.clear();
    },
  };
}

/** Read a small JSON body; null for too large or invalid. */
export async function readJson(request: Request, maxBytes: number): Promise<{ ok: true; body: unknown } | { ok: false; status: 400 | 413 }> {
  try {
    const raw = await request.text();
    if (raw.length > maxBytes) return { ok: false, status: 413 };
    return { ok: true, body: JSON.parse(raw) };
  } catch {
    return { ok: false, status: 400 };
  }
}
