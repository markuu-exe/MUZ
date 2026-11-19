# Member A — Dependency and Progress Register

Living document. Updated **2026-11-19** from the repository, not from earlier reports.

**Baseline:** `origin/main` @ `f2c79ed` (PR #23 `AUX-TEST-ACCESS-01` merged on top of PR #22). `npm test` 424/424, `tsc` clean, seed up to date on that commit.
**Team activity on GitHub:** no task branches from B, C or D yet (no T-03, T-04, T-05, T-07, T-10–T-16). The last B commits are on `features-integration` (Nov 16–17).
**Target:** Sat 2026-11-28 (U-01); release Fri Nov 27; freeze Tue Nov 24.

Statuses: **Implemented** · **Unit tested** · **Integration blocked** · **Scaffolded** · **Verified** · **Completed** (acceptance met). Dependency kinds: **Hard**, **Soft**, **Coordination**, **External**.

## Summary

| Category | Tasks |
|---|---|
| A. Ready | D5 (done today); merge queue actions (A's own clicks) |
| B. Partially unblocked | T-08 (part 1 + seam done; switch-over waits for T-07); T-19 (production loader check done; hardware parts wait) |
| C. Blocked but scaffoldable | T-24 (triage sheet + pre-seeded log done); T-19 report (template done) |
| D. Fully blocked | T-01 branch deletions (A's yes), AUX-TEST-ACCESS-01 follow-up (C's F2), D11 Google setup (A's authorization), T-26 SRS/SDD edits (Word sources, U-11), reviews (no PRs from B/C/D yet), Jira updates (connector down) |

## Register

| Task | Status | Dependencies (kind → owner) | Blocked part | Done independently | Files / branch | Before final integration | Next concrete action |
|---|---|---|---|---|---|---|---|
| **T-01** baseline | Mostly completed | Coordination → D (Lag-in, dashboard), B (login-bins); External → GitHub settings | Deleting 3 stale branches; branch protection (PR #22 was merged by "Raga" without A) | PR #18 merged | — | A's explicit yes per branch | A: confirm with D and B, then say "delete"; set protection (require PR + A's approval) |
| **T-02** rulings | Implemented, not merged | Soft → B (accuracy review) | — | Register, SRS/SDD edit guide, verification + plan | `task/T-02-rulings-final` @ `0fcec46` | B review | A: open PR (only `docs/decisions/`) |
| **PR #22 revert** | Verified (not merged) | Hard → A merges; Soft → B review | — | Re-verified today on current `main`: clean merge, `tsc` OK, **410/410** tests, PR #23 code kept, PR #22 code gone | `task/revert-pr-22` @ `13946d4` | Merge **before** T-03/T-11/T-12 start | A: open PR, B reviews, merge |
| **D5** timeouts | Unit tested, Verified | — (deploy: External → Supabase seed re-apply, C/A) | Seed reaching learners | Virtuoso 12→15 s, override removed, prompt reworded, seed regenerated (59/59 = 15 s), content test (failed with 18, passes) | `task/D5-drill-timeouts` @ `f2d0f75` (425/425, tsc, build) | Re-apply `seed.sql` to the Supabase project (SQL editor, not `db reset`) after merge | A: open PR (B reviews) |
| **T-06** heart refund | Implemented, Unit tested, merged | Hard → T-05 staging (C) for the manual check | Manual staging check | PR #19 | — | Note: PR #22 rewired heart persistence; the revert restores T-06's path | After revert + staging: lose heart to timeout, quit, check `profiles.hearts` |
| **T-09** vision | Implemented, Unit tested, merged | External → webcam | Real-webcam check (cue after replug, overlay numbers) | PR #20; overlay confirmed rendering in prod build today | — | — | Part of T-19 session (§3, §3.1 of the report) |
| **T-08** pitch wiring | **Partially implemented**; seam Unit tested; **Integration blocked** | **Hard → C (T-07 `PitchVerifier`)** — no branch yet; due Thu Nov 19 | Making pitchy the default; `useChromaNoteVerifier` flag; 2 integration tests (`it.todo`) | Part 1: f0 + clarity in the worklet (browser-verified). Part 2 seam: `PracticeDrillOptions.createNoteVerifier`, `SingleNoteVerifier` (accepts C2's `lastHeardMidi`), miss cue names the octave ("A3"); 3 tests with a C2-shaped double | `task/T-08-pitch-wiring` @ `9abe11f`; merged-with-main check: 433 pass + 2 todo, tsc, build | When T-07 lands: (1) import `PitchVerifier`, default factory = pitch unless `useChromaNoteVerifier`; (2) add flag to `src/audio/config.ts` next to C's `pitch` section; (3) enable the 2 `it.todo`; (4) manual A4/A3 check | A: chase C for T-07 today; integration is ~1 small commit |
| **T-19** benchmark | **Partially done** (§1 verified); rest **Scaffolded** | Hard → T-08 merged (for §5); External → 2 machines, webcams, USB mic, piano (U-10) | All hardware measurements; latency method | Production loader check (GPU delegate, graph running, no ModuleFactory error, no model files before the click at page level); report template with every table | `task/A-lead-prep`: `docs/test/PERFORMANCE_REPORT.md` | Decide the latency method (§6); book hardware | A: book machines + piano for Mon Nov 23; decide §6 method |
| **T-24** triage + regression | **Scaffolded** | Hard → T-19…T-23 results | Real triage | Log with 10 pre-seeded defects (proposed priorities), owners, regression table | `task/A-lead-prep`: `docs/test/DEFECT_LOG_AND_TRIAGE.md` | Confirm proposed priorities; mirror P0/P1 in the Issue Log sheet (U-12) | A: confirm DEF-001/003/004/008 priorities |
| **T-26** SRS/SDD (A's part) | Integration blocked | External → Word sources (U-11) | Editing the documents | Edit guide with exact wording (T-02 branch) | — | — | A: locate `MUZ_SRS.docx` / `MUZ_SDD.docx` |
| **AUX-TEST-ACCESS-01** follow-up | Code merged (PR #23); DB **not applied** | Hard → C's F2 (`profiles` RLS) | Apply migration, run guard check, grant test accounts | — (separate workstream, see `docs/auxiliary/AUX_WORKSTREAM_STATUS.md`) | — | F2 merged + backup | Wait for C's F2 notice |
| **D11** Google sign-in | Fully blocked | Decision → A (authorize) or adviser; External → Google Cloud client (B, U-07) | Everything | Finding recorded (email-only) | RULINGS.md | — | A: authorize or escalate |
| **F-major card** (T-17 cut mitigation) | Not started | Decision → A (the mitigation was proposed, not approved) | — | — | — | — | A: approve "keyboard-only card" or leave as known limitation |
| **Reviews** (U-17: A reviews all) | Idle | Hard → B/C/D open PRs | — | — | — | — | Check GitHub each morning; none open as of today |
| **Jira** | Fully blocked (for me) | External → Atlassian connector failed; CSV only | Status updates | Due dates prepared in the T-02 handoff §E.2 | — | — | A updates by hand |
| **Contracts C1–C8** | C1 implemented (T-08 branch); others not posted | Coordination → B (C3, C7), C (C2, C4), D (C6, C8) | — | C1 fields exist on branch | — | — | A: post C1–C8 in team chat |

## Critical-path risks seen today

1. **T-07 has not started** (no branch) and is due today. It gates T-08, T-19 §5 and T-21. Contingency (master schedule §5): merge T-08 with chroma as default; D4 stays unmet until T-07 lands.
2. **No B/C/D branches at all** on Day 4 of the plan. T-03 (P0), T-05, T-15, T-16 were due Nov 18 (IC-1). IC-1 has slipped.
3. **The revert is still unmerged**, and new work (PR #23) is landing on top of PR #22. Every day it waits, more code may come to depend on the PR #22 files.

## Change log

| Date | Change |
|---|---|
| 2026-11-19 | Created. D5 done; revert re-verified; T-08 seam; T-19 loader check + report scaffold; T-24 log scaffold. |
