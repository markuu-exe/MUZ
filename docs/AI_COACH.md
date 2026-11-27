# AI coach (Claude)

After a lesson, the results screen has an **AI coach** card. When the learner presses **Get a tip**, the app sends that lesson's scores to a Vercel Function (`api/coach.ts`), which asks Claude (Anthropic) for a 2–3 sentence tip and shows it.

## Setup (owner, once)

1. In the Anthropic Console (console.anthropic.com), create an API key for MUZ and **set a monthly spend limit** on the workspace (e.g. US$5). That limit is the real ceiling on cost.
2. In Vercel → the `muz` project → **Settings → Environment Variables**, add `ANTHROPIC_API_KEY` with that key, for **Production** (and Preview if you want it on preview deployments). Never put it in a `VITE_` variable: those are shipped to the browser.
3. Redeploy (Deployments → the latest → Redeploy) so the function picks up the variable.
4. Check: finish any lesson on the live site (demo mode works), press **Get a tip**. Without the key the card says "The AI coach is not available on this version of MUZ."

## What is sent

Only: the lesson's course title, its status (passed / failed / out of hearts), first-try accuracy, theory score, hearts lost, duration, rhythm consistency, pitch accuracy, posture score (each only if the lesson had that part), and which skill groups needed retries (`theory`, `rhythm`, `notes`, `chords`, `posture`). Never the learner's name, email, account id, audio or video. Nothing is sent unless the learner presses the button. The function does not log request contents.

## Model and cost

`claude-opus-5-5` at low effort, `max_tokens` 2000, with Anthropic's server-side refusal fallback enabled (if Claude declines, the API retries on a fallback model in the same call). A tip is roughly 600 input and 150 output tokens plus a little thinking: well under US$0.01 each at the listed $4 / $20 per million tokens. To make it cheaper, change `MODEL` in `api/coach.ts` to `claude-haiku-5-5` and remove the `betas`/`fallbacks` lines (Haiku has no server-side fallback).

## Guards

`src/lib/coach/handler.ts`: POST only; JSON body ≤ 4 KB; strict validation (numbers 0–100, fixed enums, title ≤ 80 chars without control characters), so nothing the learner types reaches the model; requests whose `Origin` is another site are refused; at most 10 tips per minute per IP per server instance (best effort). Tests: `src/lib/coach/__tests__/coach.test.ts`.

## Limits

- The tip is AI-written and can be wrong; the card says so. Lesson results and grading never depend on it.
- The rate limit is per server instance, not global; the Console spend limit is the hard cap.
- It works in demo mode on purpose (for the capstone demo), so anyone using the live site can request tips within those limits.
