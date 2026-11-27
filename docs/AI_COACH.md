# Coach (free AI tier + built-in tips)

After a lesson, the results screen has a **Coach** card. When the learner presses **Get a tip**:

1. The app sends that lesson's scores to a Vercel Function (`api/coach.ts`), which asks an AI for a 2–3 sentence tip.
2. If no AI is set up, or it is busy, offline or declines, the app shows **MUZ's built-in tip** instead: written by fixed rules from the same scores (`src/lib/coach/builtinTip.ts`), instant, and nothing leaves the device.

The card always says which one wrote the tip (Google Gemini, Anthropic Claude, or "built-in, not AI").

## Free setup (owner, once): Google Gemini free tier

1. Go to Google AI Studio (aistudio.google.com), sign in, and create an API key (**Get API key**). No payment needed for the free tier.
2. In Vercel → the `muz` project → **Settings → Environment Variables**, add `GEMINI_API_KEY` for **Production**. Never put it in a `VITE_` variable: those are shipped to the browser.
3. Optional: `GEMINI_MODEL` to choose another model. The default is `gemini-3.5-flash-lite`, which Google's pricing page (checked 2026-11-27) lists as free.
4. Redeploy (Deployments → latest → Redeploy).
5. Check: finish any lesson on the live site (demo mode works), press **Get a tip**. The note under the tip should say "Written by Google Gemini (AI)".

**Free-tier trade-offs (from Google's pricing page):** on the free tier Google uses the content you send to improve its products, and requests are rate-limited. MUZ sends only scores and the lesson title (below), and the card tells the learner this before they press the button. When the free limit is hit, the built-in tip is shown.

## Optional: Anthropic Claude (prepaid)

Anthropic's API has no free tier: you buy credit up front in console.anthropic.com. If you add `ANTHROPIC_API_KEY` in Vercel, Claude (`claude-opus-5-5`, low effort, server-side refusal fallback) is used when Gemini is not set up, or as the backup when Gemini fails. Set a spend limit on the Console workspace; well under US$0.01 per tip.

## What is sent

Only: the lesson's course title, its status (passed / failed / out of hearts), first-try accuracy, theory score, hearts lost, duration, rhythm consistency, pitch accuracy, posture score (each only if the lesson had that part), and which skill groups needed retries (`theory`, `rhythm`, `notes`, `chords`, `posture`). Never the learner's name, email, account id, audio or video. Nothing is sent unless the learner presses the button. The function does not log request contents.

## Guards

`src/lib/coach/handler.ts`: POST only; JSON body ≤ 4 KB; strict validation (numbers 0–100, fixed enums, title ≤ 80 chars without control characters), so nothing the learner types reaches the model; requests whose `Origin` is another site are refused; at most 10 tips per minute per IP per server instance (best effort). The Gemini key is sent in the `x-goog-api-key` header, never in a URL. Tests: `src/lib/coach/__tests__/`.

## Limits

- AI tips can be wrong; the card says so. Lesson results and grading never depend on them.
- It works in demo mode on purpose (for the capstone demo), so anyone using the live site can request tips within those limits.

## Ask the coach (Lesson Notes)

A box at the top of **Lesson Notes** answers one music question at a time (`/api/ask`, same keys and providers as the coach; shared code in `api/_llm.ts`). Because the learner's own words are sent, the guards are tighter (`src/lib/coach/ask.ts`):

- 3–300 characters, plain text; one question per request, no chat history kept.
- The prompt limits answers to piano, music and using MUZ (2–5 sentences, under 120 words); anything else gets one fixed reply, and the question is treated as a question, never as instructions. The model has no tools and the prompt holds no secrets.
- 6 questions a minute per IP per server instance.
- The box says the question goes to Google Gemini's free tier (used to improve Google's products) or Anthropic Claude, and asks learners not to type personal details.
- When AI is not set up, busy, offline, declines or the question is off-topic, MUZ searches the Lesson Notes on the device instead (`src/lib/coach/notesSearch.ts`) and labels the result "not AI".
