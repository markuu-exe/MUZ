# Session Handoff: Engineering Audit, 2026-11-16

## What this session did

- Ran an audit and planning pass only. **No source code, Jira or git state was changed.** No commits, no branches.
- Created 13 documents in `docs/audit/`. They are untracked and not committed:

| Document |
|---|
| PROJECT_REQUIREMENTS_AUDIT |
| REQUIREMENTS_TRACEABILITY_MATRIX |
| JIRA_CODEBASE_RECONCILIATION |
| MISSING_FEATURES_AND_TASKS |
| TASK_DECOMPOSITION |
| DEPENDENCY_AND_PARALLEL_WORK_PLAN |
| TEAM_ASSIGNMENT_MATRIX |
| INDIVIDUAL_DELEGATION_PACKAGES |
| INTEGRATION_AND_COORDINATION_PLAN |
| JIRA_BOARD_IMPROVEMENT_PROPOSAL |
| DEVELOPMENT_ROADMAP |
| TEAM_EXECUTION_OVERVIEW |
| SESSION_HANDOFF (this file) |

## Repository state at audit time

| Item | Value |
|---|---|
| Branch | `course-handoff` @ `59448bd`, working tree clean |
| Unpushed commits | 2: `317844d` COURSE-6 and `59448bd` heart-regen fix |
| `origin/main` | `11bf8ef` (PR #15 merged at `bcff618`). Lacks COURSE-6. |
| Local `main` | `ebb03a7`, stale |
| Unmerged remote work | `features-integration` (`dec609e`, B, about 3,000 lines of gamification; do not merge, see reconciliation §4); `dashboard`, `Lag-in`, `login-bins` (stale, delete in T-01) |
| Gitignored handoff notes | `TASKS/COURSE-1…6/COPILOT_PLAN.md`, `TASKS/KAN-247/248/249/260/*`. COURSE-6 §6 lists manual Supabase checks that are still open; they are covered by T-03, T-11 and T-23. |

## Commands run and their results

All were run on 2026-11-16 against `course-handoff` @ `59448bd`.

| Command | Result |
|---|---|
| `npx vitest run` | 27 files, 387 tests, all pass |
| `npx tsc -p tsconfig.json` | exit 0 |
| `npx vite build --outDir <scratchpad>/dist` | success. Initial JS 814.5 kB (244.9 kB gzip) + CSS 59.2 kB. `dist/` total 44 MB (three WASM files of about 13 MB each + a 5.8 MB model). |
| `npx tsx scripts/generate-lesson-seed.ts --check` | up to date, 59 lessons |
| `git status` after the commands | clean |

The build was sent to the scratchpad so the tracked `tsconfig.tsbuildinfo` was not touched.

## Verification limits

The following were **not** used: a browser, a camera or microphone, a piano, or a live Supabase project. So the following are unverified:
- runtime behaviour;
- FPS, Hz and latency;
- live RLS;
- TLS;
- OAuth configuration;
- whether the migration was ever pushed to the real project.

## Key findings to carry forward

The P0 items, in order:
1. **Profile wipe.** `AuthContext.tsx:70-118` upserts `exp:100, current_streak:1, hearts:5` after any profile-read error. Fix: T-03 (B).
2. **Heart refund on quit.** `LessonPlayer.tsx:143-151` versus in-drill losses. Fix: T-06 (A).
3. **Password recovery incomplete.** `updatePassword` is never called, and there is no new-password form. Fix: T-10 (B).
4. **pitchy not used at runtime.** Single-note drills use chroma pitch class. Fix: T-07 (C) + T-08 (A).
5. **Analytics are mock data; achievements and offline sync are absent.** Fix: T-12, T-11 (B); T-13 (C).
6. **No deploy, no CI, no staging.** Fix: T-05 (C), T-25 (B).

**Security.** No secret keys are in git history; only `sb_publishable_` keys appear. The `Lag-in` branch still tracks `.env.local` with the publishable key; delete the branch. Gamification is client-trusted: users can PATCH their own `exp` and `hearts`. This is ruling D14, with T-28 deferred.

## Decisions already made

| Decision | Detail |
|---|---|
| Team mapping (confirmed by the user) | A = Amatong (Jira "Mark Lawrence", git markuu-exe); B = Barnaija (Jira dev_account, git "Confusion 996"); C = Rosales (Jira and git ashwwyr); D = Bernante (Jira Neve, git "Bins") |
| Gamification branch | Do not merge `features-integration`. Re-implement only the achievement evaluator and the chart layout on `main`. |
| Single-note detection | Keep the SRS: pitchy is required. |

## Decisions still open (owner A)

| Item | Detail |
|---|---|
| Rulings D1–D14 | Listed in `PROJECT_REQUIREMENTS_AUDIT.md` §5, each with a recommendation. To be settled in T-02. |
| **Final delivery date** | Not stated in any document. Map D1–D15 to real dates. If fewer days remain, use the roadmap §9 cut order. |
| Who ran the migration | The commit author is "LAB64_USER ON WS25". Whether the live Supabase project matches the migration file is unknown. |
| Committing the audit docs | Whether to commit `docs/audit/` to the repo, and where the team will read them. |

## Next actions

| Who | Action |
|---|---|
| A | Read `TEAM_EXECUTION_OVERVIEW.md`, set the dates, then start T-01 |
| A | Send each member their section of `INDIVIDUAL_DELEGATION_PACKAGES.md` |
| A | Apply the Jira changes in `JIRA_BOARD_IMPROVEMENT_PROPOSAL.md`, by hand, after review |
| Next coding session | Start from `main` after T-01. Re-run the four commands to confirm the baseline before working on any task. |
