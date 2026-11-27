/**
 * Shared AI providers for the Vercel Functions (/api/coach, /api/ask). The leading underscore
 * keeps Vercel from serving this file as an endpoint.
 *
 *   1. Google Gemini free tier, when GEMINI_API_KEY is set (GEMINI_MODEL, default
 *      gemini-3.5-flash-lite). Free-tier content is used by Google to improve its products.
 *   2. Anthropic Claude, when ANTHROPIC_API_KEY is set (prepaid), as main provider or as the
 *      backup when Gemini is busy, failing or declines.
 * Keys live only in Vercel environment variables. No request contents are logged.
 */
import Anthropic from '@anthropic-ai/sdk';
import { DEFAULT_GEMINI_MODEL, geminiTextBody, geminiUrl, parseGeminiResponse } from '../src/lib/coach/gemini';
import type { TipResult } from '../src/lib/coach/handler';

const CLAUDE_MODEL = 'claude-opus-5-5';

export function aiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY);
}

async function gemini(system: string, user: string, maxTokens: number, key: string): Promise<TipResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(geminiUrl(process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL), {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(geminiTextBody(system, user, maxTokens)),
      signal: controller.signal,
    });
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      // Non-JSON error page: judged by status below.
    }
    if (!res.ok) console.error(`ai: Gemini HTTP ${res.status}`);
    const result = parseGeminiResponse(res.status, body);
    return result.kind === 'tip' ? { ...result, source: 'gemini' } : result;
  } catch {
    return { kind: 'error', retryable: true };
  } finally {
    clearTimeout(timer);
  }
}

let anthropic: Anthropic | null = null;

async function claude(system: string, user: string): Promise<TipResult> {
  anthropic ??= new Anthropic({ timeout: 20_000, maxRetries: 1 });
  try {
    const response = await anthropic.beta.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2000,
      output_config: { effort: 'low' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system,
      messages: [{ role: 'user', content: user }],
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
      console.error(`ai: Claude API error ${error.status}`);
      return { kind: 'error', retryable: false };
    }
    throw error;
  }
}

/** Ask Gemini, then Claude as a backup when it is set up. */
export async function writeText(system: string, user: string, maxTokens = 1024): Promise<TipResult> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const hasClaude = Boolean(process.env.ANTHROPIC_API_KEY);
  if (geminiKey) {
    const first = await gemini(system, user, maxTokens, geminiKey);
    if (first.kind === 'tip' || !hasClaude) return first;
  }
  return hasClaude ? claude(system, user) : { kind: 'error', retryable: false };
}
