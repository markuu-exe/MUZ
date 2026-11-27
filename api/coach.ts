/**
 * Vercel Function: POST /api/coach → { tip, source } (guards: src/lib/coach/handler.ts).
 * Providers (Gemini free tier, then Claude) live in server/llm.ts. With neither key the endpoint
 * answers 503 not_configured and the app shows its built-in tip.
 */
import { COACH_SYSTEM_PROMPT, coachUserMessage } from '../src/lib/coach/coach';
import { handleCoachRequest } from '../src/lib/coach/handler';
import { aiConfigured, writeText } from '../server/llm';

export async function POST(request: Request): Promise<Response> {
  return handleCoachRequest(request, {
    writeTip: (input) => writeText(COACH_SYSTEM_PROMPT, coachUserMessage(input)),
    configured: aiConfigured(),
  });
}
