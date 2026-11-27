/**
 * Vercel Function: POST /api/ask → { answer, source, offTopic } for the "Ask the coach" box
 * (guards and prompt: src/lib/coach/ask.ts; providers: api/_llm.ts).
 */
import { ASK_SYSTEM_PROMPT, askUserMessage, handleAskRequest } from '../src/lib/coach/ask';
import { aiConfigured, writeText } from './_llm';

export async function POST(request: Request): Promise<Response> {
  return handleAskRequest(request, {
    writeAnswer: (input) => writeText(ASK_SYSTEM_PROMPT, askUserMessage(input), 1024),
    configured: aiConfigured(),
  });
}
