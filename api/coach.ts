/**
 * Vercel Function: POST /api/coach → { tip, source } (guards: src/lib/coach/handler.ts).
 * Providers (Gemini free tier, then Claude) live in server/llm.ts. With neither key the endpoint
 * answers 503 not_configured and the app shows its built-in tip.
 */
import { COACH_SYSTEM_PROMPT, coachUserMessage } from '../src/lib/coach/coach.js';
import { handleCoachRequest } from '../src/lib/coach/handler.js';
import { aiConfigured, writeText } from '../server/llm.js';

export async function POST(request: Request): Promise<Response> {
  return handleCoachRequest(request, {
    writeTip: (input) => writeText(COACH_SYSTEM_PROMPT, coachUserMessage(input)),
    configured: aiConfigured(),
  });
}
