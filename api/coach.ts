/**
 * Vercel Function: POST /api/coach → { tip, source } (guards: src/lib/coach/handler.ts).
 *
 * Providers, in order (owner preference 2026-11-27: stay free where possible):
 *   1. Google Gemini free tier, when GEMINI_API_KEY is set (model: GEMINI_MODEL, default
 *      gemini-3.5-flash-lite). Free-tier content is used by Google to improve its products.
 *   2. Anthropic Claude, when ANTHROPIC_API_KEY is set (prepaid credit), as the main provider
 *      or as the backup when Gemini is busy, failing or declines.
 * With neither key the endpoint answers 503 not_configured and the app shows its built-in tip.
 * Keys live only in Vercel environment variables, never in the browser.
 */
import Anthropic from '@anthropic-ai/sdk';
import { COACH_SYSTEM_PROMPT, coachUserMessage, type CoachInput } from '../src/lib/coach/coach';
import { DEFAULT_GEMINI_MODEL, geminiRequestBody, geminiUrl, parseGeminiResponse } from '../src/lib/coach/gemini';
import { handleCoachRequest, type TipResult } from '../src/lib/coach/handler';

const CLAUDE_MODEL = 'claude-opus-5-5';

async function geminiTip(input: CoachInput, key: string): Promise<TipResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(geminiUrl(process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL), {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(geminiRequestBody(input)),
      signal: controller.signal,
    });
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      // Non-JSON error page: treated by status below.
    }
    if (!res.ok) console.error(`coach: Gemini HTTP ${res.status}`); // no request data in logs
    const result = parseGeminiResponse(res.status, body);
    return result.kind === 'tip' ? { ...result, source: 'gemini' } : result;
  } catch {
    return { kind: 'error', retryable: true };
  } finally {
    clearTimeout(timer);
  }
}

let anthropic: Anthropic | null = null;

async function claudeTip(input: CoachInput): Promise<TipResult> {
  anthropic ??= new Anthropic({ timeout: 20_000, maxRetries: 1 });
  try {
    const response = await anthropic.beta.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2000,
      output_config: { effort: 'low' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: COACH_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: coachUserMessage(input) }],
    });
    if (response.stop_reason === 'refusal') return { kind: 'declined' };
    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
      .map((b) => b.text)
      .join(' ');
    return text.trim() ? { kind: 'tip', text, source: 'claude' } : { kind: 'error', retryable: true };
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError || error instanceof Anthropic.InternalServerError || error instanceof Anthropic.APIConnectionError) {
      return { kind: 'error', retryable: true };
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`coach: Claude API error ${error.status}`);
      return { kind: 'error', retryable: false };
    }
    throw error;
  }
}

async function writeTip(input: CoachInput): Promise<TipResult> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const hasClaude = Boolean(process.env.ANTHROPIC_API_KEY);
  if (geminiKey) {
    const first = await geminiTip(input, geminiKey);
    if (first.kind === 'tip' || !hasClaude) return first;
  }
  return hasClaude ? claudeTip(input) : { kind: 'error', retryable: false };
}

export async function POST(request: Request): Promise<Response> {
  return handleCoachRequest(request, {
    writeTip,
    configured: Boolean(process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY),
  });
}
