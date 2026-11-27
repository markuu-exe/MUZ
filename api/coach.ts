/**
 * Vercel Function: POST /api/coach → { tip } (see src/lib/coach/handler.ts for the guards).
 * Needs ANTHROPIC_API_KEY in the Vercel project's environment variables (never in the browser).
 * Model: Claude Opus 5.5 at low effort (a short tip needs little thinking); if Claude declines
 * for safety reasons the API retries on a fallback model in the same call ("fallbacks").
 */
import Anthropic from '@anthropic-ai/sdk';
import { COACH_SYSTEM_PROMPT, coachUserMessage, type CoachInput } from '../src/lib/coach/coach';
import { handleCoachRequest, type TipResult } from '../src/lib/coach/handler';

const MODEL = 'claude-opus-5-5';

let client: Anthropic | null = null;

async function writeTip(input: CoachInput): Promise<TipResult> {
  client ??= new Anthropic({ timeout: 20_000, maxRetries: 1 });
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
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
    return text.trim() ? { kind: 'tip', text } : { kind: 'error', retryable: true };
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError || error instanceof Anthropic.InternalServerError || error instanceof Anthropic.APIConnectionError) {
      return { kind: 'error', retryable: true };
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`coach: API error ${error.status}`); // no request data in logs
      return { kind: 'error', retryable: false };
    }
    throw error;
  }
}

export async function POST(request: Request): Promise<Response> {
  return handleCoachRequest(request, { writeTip, configured: Boolean(process.env.ANTHROPIC_API_KEY) });
}
