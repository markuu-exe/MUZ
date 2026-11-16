# Team Execution Overview

The one-page version of the plan. Full briefs are in [INDIVIDUAL_DELEGATION_PACKAGES.md](INDIVIDUAL_DELEGATION_PACKAGES.md). D1 is the first working day after the plan is accepted; **put real dates in.**

## Where we are (2026-11-16)

- **Built and unit-tested** (387 tests pass; the build is 0.87 MB): theory lessons, the rhythm game, the posture HUD, chord detection, the wait-state, hearts, streak, EXP, gating and placement.
- **Not built yet:**
  - single-note checking with pitchy;
  - achievements;
  - real analytics (the profile page is mock data);
  - offline sync;
  - Google sign-in;
  - completing a password reset;
  - deployment;
  - all testing beyond unit tests.
- **Urgent bugs:**
  - sign-in can wipe a learner's progress if the profile read fails;
  - hearts are refunded when quitting mid-drill;
  - password reset cannot be finished.
- **Do not merge `features-integration`.** We keep the achievements and the chart layout from it, and rebuild them on `main`.

## Who does what

| Member | Responsibilities | **Start now (D1–D2)** | Then |
|---|---|---|---|
| **A** Amatong (lead / integrator) | Baseline, rulings, audio + vision runtime, benchmarks, integration, triage | T-01 baseline on `main` (morning); T-02 rulings meeting; agree contracts with B and C; T-06 heart-refund fix | T-09 vision hardening (D2–D4) → T-08 pitchy wiring (D5–D6) → T-19 hardware benchmark (D7–D8) → IC-3 → triage and T-24 (D10–D13) |
| **B** Barnaija (full-stack) | Auth, gamification, analytics (critical path), production deploy | T-03 profile-wipe fix; T-04 confirm salvage list, archive the branch | T-11 achievements (D2–D3) → **T-12 analytics (D4–D7)** → T-10 recovery + Google + resend (D8–D9) → pair on T-23 → T-25 deploy (D13–D14) |
| **C** Rosales (backend) | Staging + CI, PitchVerifier, offline sync, RLS, E2E | T-05 staging Supabase + Vercel + CI (D1–D2) | T-07 PitchVerifier (D2–D4) → T-13 offline sync (D5–D7) → T-20 RLS script (D8) → T-23 E2E checklist (D10–D12) |
| **D** Bernante (frontend) | Tests, small UI fixes, cleanup, scripted QA, docs | T-16 rhythm timing tests + consistency formula (D1–D2) | T-15 eight UI fixes (D2–D3) → T-18 dead code (D4) → T-14 welcome step (D5) → T-17 flats (D6–D7) → T-21 privacy audit (D8) → T-22 compatibility matrix (D10–D12) → T-26 docs v01.02 (D9–D14) |

## What runs in parallel

| Days | Running at the same time | Notes |
|---|---|---|
| D1–D3 | T-03, T-04, T-05, T-06, T-16, T-15, T-11, T-09, T-07 | All independent after T-01 |
| D4–D9 | A's T-09 → T-08 → T-19; B's T-12 → T-10; C's T-13 → T-20; D's T-18 → T-14 → T-17 → T-21 | Merge-order rules on shared files |
| D10–D12 | T-22 (D) and T-23 (C) on the frozen build | — |

## Hard waits

| Task | Waits for |
|---|---|
| Everything | T-01 |
| T-11 and T-12 | T-04 |
| T-20, T-23 and T-25 | T-05 |
| T-08 | T-07 |
| T-19 | T-08 and T-09 |
| T-22 and T-23 | IC-3 feature freeze (D9) |
| T-25 | T-24 |

## Checkpoints

| Checkpoint | Day | What it means |
|---|---|---|
| IC-0 | D1 | Baseline |
| IC-1 | D3 | Fixes + achievements + staging |
| IC-2 | D6 | Pitch + vision |
| IC-3 | D9 | **Feature freeze** |
| IC-4 | D12 | Testing done |
| RC | D13 | Release candidate |
| Release | D14 | Production |
| Rehearsal | D15 | Demo run-through |

## Shared-file rules

| Files | Rule |
|---|---|
| `DashboardScreen.tsx`, `App.tsx` | D merges first; B only passes props or rebases |
| `saveLessonResult.ts`, `supabaseStore.ts` | B (T-11) merges first, then C (T-13) |
| `AcousticFrame`, worker and worklet protocols, `src/audio/config.ts` | Owned by A; C only adds the `pitch` section |
| Migrations | New files only, approved by A, one at a time |

## Definition of Done

A Jira issue is Done only when all of these hold:
- the PR is merged with reviewer approval;
- CI is green;
- every acceptance criterion is ticked with evidence (a test name, a screenshot, a staging note, or measured numbers);
- anything not verified is stated explicitly.

Saying "it works on my machine" is not evidence.
