/**
 * Google Gemini (free tier) for the AI coach, over Google's documented REST endpoint
 * `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
 * with the key in the `x-goog-api-key` header (never in the URL). Pure request/response
 * helpers here; the network call is in api/coach.ts.
 *
 * Free tier note (Google's pricing page, checked 2026-11-27): on the free tier Google uses
 * the content to improve its products. The default model `gemini-3.5-flash-lite` is listed
 * there as free; set GEMINI_MODEL in Vercel to use another model.
 */
import { COACH_SYSTEM_PROMPT, coachUserMessage, type CoachInput } from './coach.js';
import type { TipResult } from './handler.js';

export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';
export const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

export function geminiUrl(model: string): string {
  if (!/^[a-z0-9][a-z0-9.\-]*$/i.test(model)) throw new Error('invalid model id');
  return `${GEMINI_ENDPOINT}/${model}:generateContent`;
}

/** A single-turn request: system instructions plus one user message. */
export function geminiTextBody(system: string, user: string, maxOutputTokens = 1024) {
  return {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: user }] }],
    // Room for a model that thinks before answering; prompts ask for short answers.
    generationConfig: { maxOutputTokens },
  };
}

export function geminiRequestBody(input: CoachInput) {
  return geminiTextBody(COACH_SYSTEM_PROMPT, coachUserMessage(input));
}

interface GeminiResponse {
  candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string; thought?: boolean }> } }>;
  promptFeedback?: { blockReason?: string };
}

/** Map an HTTP status and parsed body to a coach result. */
export function parseGeminiResponse(status: number, body: unknown): TipResult {
  if (status === 429 || status >= 500) return { kind: 'error', retryable: true };
  if (status < 200 || status >= 300) return { kind: 'error', retryable: false };
  const b = (body ?? {}) as GeminiResponse;
  if (b.promptFeedback?.blockReason) return { kind: 'declined' };
  const c = b.candidates?.[0];
  if (!c) return { kind: 'error', retryable: true };
  if (c.finishReason && ['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII', 'RECITATION'].includes(c.finishReason)) {
    return { kind: 'declined' };
  }
  const text = (c.content?.parts ?? [])
    .filter((p) => !p.thought && typeof p.text === 'string')
    .map((p) => p.text)
    .join(' ')
    .trim();
  return text ? { kind: 'tip', text } : { kind: 'error', retryable: true };
}
