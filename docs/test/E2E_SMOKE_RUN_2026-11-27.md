# E2E smoke run, live site, demo mode (2026-11-27)

Owner decision 2026-11-27: Playwright automation was dropped as too heavy; this is a hand-run smoke check of the landing → demo → lesson flow against `docs/test/E2E_CHECKLIST.md`, driven in a real browser (Claude Code built-in browser, Chromium) on the **live** site. Demo mode writes nothing to the database, so this run touches no real data.

| Item | Value |
|---|---|
| Environment | Production, https://muz-dawgz.vercel.app (demo mode only) |
| Commit deployed | `b63b52e` (main after PR #65) |
| Browser | Chromium (built-in browser), 1400×900 viewport |
| Tester and date | Claude Code for the owner, 2026-11-27 |
| Accounts | None (demo mode) |

## Results

| ID | Flow | Actual | Result |
|---|---|---|---|
| E2E-34 | Deep link | Opened `/some/deep/path` directly: the landing page loaded, no 404. | Pass |
| E2E-24 | Demo / guest mode | "Try Demo Mode" → Skill Tree → "The Musical Alphabet" → 3 concept cards → 4 checks → results → back to Skill Tree. Zero requests to Supabase during the whole run; no IndexedDB database (nothing queued). | Pass |
| E2E-08 | Theory lesson: wrong answer re-queued | Answered "Click any C." with D3: "Not quite. You will see this one again.", the correct key highlighted, explanation shown. The same question came back after the other three; answering it correctly finished the lesson. | Pass |
| E2E-35 | Small screen | At 900 px wide: "Expanded Desktop Display Required" notice with current and required widths. | Pass (note 1) |
| — | Refresh keeps the place (PR #65) | Opened Profile, reloaded: Profile still showing. | Pass |
| E2E-07 | Locked node | Demo mode unlocks every lesson, so no locked node exists. | n/a (demo) |
| E2E-01…06, 20–23, 25–31 | Sign-up, sign-in, placement, saving, sync | Need a signed-in account; demo mode saves nothing. | Not run |
| E2E-09…16, 32, 36 | Rhythm, posture, notes, chords, hearts, permissions, media | Need a keyboard/piano, camera and microphone. | Not run (owner, hardware) |
| E2E-17 | Heart regeneration | Needs a 15-minute wait on a signed-in account. | Not run |
| E2E-33 | Missing configuration | Needs a local build without env vars. | Not run |

Summary: 5 executed, 5 Pass, 0 Fail; E2E-07 n/a in demo; the rest not run, with the reason above.

## Findings

1. E2E-35: the small-screen notice is not announced to screen readers (no `role="alert"`/`alertdialog`). Low; for the accessibility pass.

## Not covered here

Everything that needs an account, saving, hardware (camera, microphone, piano) or time. Those rows stay with the owner on real hardware, using `docs/test/E2E_CHECKLIST.md`.
