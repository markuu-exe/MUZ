# Master Team Execution Schedule

This schedule covers all four members. D1–D15 are working days, counted from the day the team accepts the plan. No calendar date has been fixed yet; see U-01 in `UNRESOLVED_DECISIONS_AND_INFORMATION_NEEDED.md`.

- Task IDs, priorities and owners come from `docs/audit/TASK_DECOMPOSITION.md` and `TEAM_ASSIGNMENT_MATRIX.md`, unchanged.
- The milestones IC-0 to IC-4, RC and Release are kept as planned.

**Legend**

| Mark | Meaning |
|---|---|
| ★ | Critical-path task |
| ⚠ | At risk of delaying the project |
| → | Hard dependency |
| ⇢ | Soft dependency (interface, merge order, or acceptance only) |

| Member | Name | Role |
|---|---|---|
| A | Amatong | Lead and integrator |
| B | Barnaija | Full-stack |
| C | Rosales | Backend, infrastructure and audio support |
| D | Bernante | Frontend, QA and documentation |

---

## 1. Day-by-day plan

| Day | A | B | C | D | Milestone / reviews due |
|---|---|---|---|---|---|
| **D1** | ★T-01 baseline (AM) · T-02 rulings meeting (PM) · agree contracts · start T-06 | T-03 profile fix (code + unit tests) · ★T-04 salvage list | T-05 Supabase staging + Vercel + CI (start) | T-16 timing tests (formula after D13 ruling) | **IC-0**: baseline green, rulings recorded, contracts posted |
| **D2** | T-06 → PR · start T-09 | T-03 staging check → PR · ★T-11 start | T-05 → PR · start T-07 (PM) | T-16 → PR · ★T-15 start | A reviews T-03 and T-05 |
| **D3** | T-09 · review T-16, T-15, T-11 | ★T-11 → PR, merged by end of day | T-07 · post migration design for T-13 | ★T-15 → PR, merged by end of day | **IC-1**: T-15, T-16, T-06, T-03, T-11, T-05 merged; staging walkthrough. C reviews T-16. |
| **D4** | T-09 → PR · review T-07, T-18 | ★⚠T-12 analytics (cut after T-15 merged) | T-07 → PR, merged | T-18 dead code → PR | A reviews T-07 (must merge D4 so T-08 can start) |
| **D5** | T-08 (→ T-07) | ★⚠T-12 | T-13 offline (→ T-11 merged; migration approved) | T-14 welcome → PR | B reviews T-14 |
| **D6** | T-08 → PR, merged · merge T-09, T-14 | ★⚠T-12 (tell A by midday if late) | T-13 | T-17 flats | **IC-2**: T-18, T-07, T-09, T-08, T-14 merged; keyboard check on staging. B reviews T-08. |
| **D7** | ⚠T-19 hardware session (→ T-08, T-09) | ★T-12 → PR | T-13 → PR · Google provider on staging (for T-10) | T-17 → PR (C reviews first) | Contingency check on T-12 |
| **D8** | ⚠T-19 + tuning PR · review T-20, T-21, T-12 | T-10 auth completion (→ T-03; staging) | T-20 RLS script + report | T-21 privacy audit (→ T-08) | A reviews T-17, T-12 |
| **D9** | Merge IC-3 set · IC-3 walkthrough | T-10 → PR | Buffer / T-13 fixes · draft T-23 | T-26 change list (→ T-02) · prepare T-22 table | **IC-3 FEATURE FREEZE**: T-17, T-13, T-12, T-10 merged; T-19 report in |
| **D10** | Triage (≤ 1 day per defect) · support T-22 | Pair on T-23 (auth, analytics) · fixes | ★T-23 E2E checklist | ★T-22 compatibility matrix | — |
| **D11** | Triage · review fix PRs | Pair on T-23 · fixes | ★T-23 | ★T-22 · T-26 | — |
| **D12** | Collect results, prioritise, assign · start T-24 | Fixes in own area | ★T-23 → done · T-20 re-run | ★T-22 → done · T-26 | **IC-4**: QA complete, every defect has a priority and owner |
| **D13** | ★T-24 regression, regression log, go/no-go | Fixes · prepare T-25 (read ENVIRONMENTS.md) | Fixes · prepare production Supabase | Fixes · T-26 | **RC**: no open P0/P1, CI green, T-20 and T-21 pass |
| **D14** | Approve production config · witness smoke test · approve T-26 | ★T-25 production deploy, tag v1.0.0, backup video | Production Supabase support | T-26 → PDFs | **Release** |
| **D15** | Demo rehearsal (everyone) | Demo rehearsal | Demo rehearsal | Demo rehearsal | **Demo preparation complete** (buffer day) |

---

## 2. Every task: window, dependencies and review

| Task | Owner | Window | Hard dependencies (→) | Soft dependencies (⇢) | Reviewer | Review due | Merge at |
|---|---|---|---|---|---|---|---|
| T-01 Baseline | A | D1 AM | — | — | B | D1 | IC-0 |
| T-02 Rulings | A | D1 PM | — | — | team | D1 | IC-0 |
| T-03 Profile fix | B | D1–D2 | T-01 | T-05 (acceptance) | A | D2 | IC-1 (no shared file; merge as soon as approved) |
| T-04 Salvage | B | D1 | — | — | A | D1 | — |
| T-05 Staging + CI | C | D1–D2 | T-01 | — | A | D2 | IC-1 |
| T-06 Heart refund | A | D1–D2 | T-01 | — | B | D3 | IC-1 |
| T-07 PitchVerifier | C | D2–D4 | T-01 | T-02 D4; field names with A | A | **D4** | IC-2 |
| T-08 Pitch wiring | A | D5–D6 | T-07 merged | T-02 D1/D2 | B | D6 | IC-2 |
| T-09 Vision hardening | A | D2–D4 | T-01 | — | B | D5 | IC-2 |
| T-10 Auth completion | B | D8–D9 | T-03; T-05 (acceptance) | T-15 merged (`App.tsx`); Google provider (C, D7) | A | D9 | IC-3 |
| T-11 Achievements | B | D2–D3 | T-04 | T-02 D14; badge rules U-04 | A | **D3** | IC-1 (before T-13) |
| T-12 Analytics | B | D4–D7 | T-04 | T-11; T-15 merged | A | D8 | IC-3 |
| T-13 Offline sync | C | D5–D7 (+D9) | T-11 merged; migration approved | T-15 merged | A | D8–D9 | IC-3 |
| T-14 Welcome | D | D5 | T-01 | T-15 merged; T-02 D8 | B | D6 | IC-2 |
| T-15 UI fixes | D | D2–D3 | T-01 | — | A | **D3** | IC-1 (first) |
| T-16 Rhythm tests | D | D1–D2 | T-01; D13 (formula) | — | A (C helps) | D3 | IC-1 |
| T-17 Flats | D | D6–D7 | T-01 | — | C, then A | D8 | IC-3 |
| T-18 Dead code | D | D4 | T-01 | T-15 merged | A (+C) | D4 | IC-2 |
| T-19 Hardware bench | A | D7–D8 | T-08, T-09 | — | B | D9 | report before IC-3 |
| T-20 RLS | C | D8 (+D12 re-run) | T-05 | — | A | D9 | — |
| T-21 Privacy | D | D8 | T-08 | — | A | D9 | — |
| T-22 Compatibility | D | D10–D12 | IC-3 | — | A | D12 | — |
| T-23 End-to-end | C | D10–D12 | IC-3; T-05 | — | A | D12 | — |
| T-24 Fixes + regression | A + all | D12–D13 | T-19…T-23 | — | original reviewers | D13 | RC |
| T-25 Deploy + demo | B | D14 (prep D13) | T-24 (RC) | U-06 | A | D14 | Release |
| T-26 Docs v01.02 | D | D9–D14 | T-02 | T-19…T-23 reports | A | D14 | — |

**Review deadline rule.** A reviewer responds within 4 working hours. A PR opened after 14:00 is reviewed by 12:00 the next day. A bold review-due date means a later task is waiting on that review.

---

## 3. What runs in parallel

| Days | Running at the same time | Shared-file risk |
|---|---|---|
| D1–D3 | T-01→T-02 (A) · T-03, T-04, T-11 (B) · T-05, T-07 (C) · T-16, T-15 (D) · T-06, T-09 (A) | `DashboardScreen.tsx`/`App.tsx`: only D touches them before D3. `saveLessonResult.ts`: only B before D3. |
| D4–D6 | T-09, T-08 (A) · T-12 (B) · T-13 (C) · T-18, T-14, T-17 (D) | `DashboardScreen.tsx`: D's T-14 (two lines) and C's T-13 (save handler) both edit it, so D merges first. B's T-12 changes props only. |
| D7–D9 | T-19 (A) · T-12, T-10 (B) · T-13, T-20 (C) · T-17, T-21 (D) | `App.tsx`: B's T-10 rebases on D's T-15 |
| D10–D12 | T-22 (D) and T-23 (C) on the frozen build; triage (A); B pairs with C | Only defect fixes, each in its owner's area |

---

## 4. Merge order at each checkpoint

A merges. Rebase onto `main` before each merge, and run CI after it.

| Checkpoint | Order |
|---|---|
| **IC-1 (D3)** | T-15 → T-16 → T-06 → T-03 → T-11 → T-05 |
| **IC-2 (D6)** | T-18 → T-07 → T-09 → T-08 → T-14 |
| **IC-3 (D9)** | T-17 → T-13 → T-12 → T-10 |

Order only matters where files are shared. A PR with no shared files (T-03, T-05, T-09) may merge as soon as it is approved.

---

## 5. Critical path and tasks that can delay the project

**Critical path (★):** T-01 → T-04 → T-11 → T-12 → IC-3 → T-22 ∥ T-23 → T-24 → T-25.

Slack before IC-3:

| Chain | Path | Slack | Notes |
|---|---|---|---|
| B's chain | T-04 → T-11 → T-12 | About 1.5 days | — |
| Pitch / hardware chain | T-05 → T-07 → T-08 → T-19 | About 1 day | Highest technical risk |

**At-risk tasks (⚠) and what to do if they slip**

| Task | Why it is at risk | Contingency |
|---|---|---|
| T-12 Analytics | Longest single task (4 days); critical path | If late at D7, A takes the rhythm histogram. B must tell A by midday D6. |
| T-19 Hardware | Real-piano results are unknown and may need tuning | Keep `NoteVerifier` behind a flag. Log any failures as defects, not blockers. |
| T-07 → T-08 | T-08 cannot merge without T-07 | A starts T-08 with a stub. T-07 review is due D4. |
| T-13 Offline sync | L-size task; needs a migration | Reduce to the minimal version (roadmap cut order, item 5) if not merged by D8 |
| T-17 Flats (provisional) | Member D's estimates are uncertain | Hand to C after 1 day stuck |
| U-01 Deadline | Unknown | If fewer than 15 days remain, apply the cut order in `docs/audit/DEVELOPMENT_ROADMAP.md` §9 |

---

## 6. Workload realism check (flagged)

| Member | Planned ideal days in D1–D14 | Assessment |
|---|---|---|
| A | About 11.5, plus about 18 reviews | **At capacity.** Reviews are scheduled in the afternoon blocks. Do not add tasks. |
| B | About 12 | **At capacity.** Most risk sits in T-12. |
| C | About 12 | **At capacity.** T-13 and T-23 together account for 6 days. |
| D | About 14.5 | **Over capacity.** T-17 and T-18 are P2 and can be cut; T-19 recording help is optional. A should confirm this cut order on D1. |

There is no buffer apart from D9 (partly) and D15. Any sick day or hardware delay uses D15.

---

## 7. Milestone exit criteria

| Milestone | Day | Exit criteria (checked by A) |
|---|---|---|
| IC-0 | D1 | Fresh clone of `main` passes the 5 commands; `RULINGS.md` merged; 4 contracts posted |
| IC-1 | D3 | CI green. On staging: signup → placement → theory lesson saves EXP, streak and badge; quitting mid-drill keeps the heart loss. |
| IC-2 | D6 | Play-note passes A4 and fails A3; perf overlay works; chord drills unchanged |
| IC-3 freeze | D9 | Offline save → sync; Google sign-in; password reset; analytics shows real points; T-19 report written |
| IC-4 | D12 | T-20 to T-23 results recorded; every defect has a priority and an owner |
| RC | D13 | No open P0/P1; regression log written; T-20 and T-21 pass |
| Release | D14 | Production smoke test (5 flows) passes; tag `v1.0.0` |
| Demo prep | D15 | Rehearsal done; backup video recorded |
