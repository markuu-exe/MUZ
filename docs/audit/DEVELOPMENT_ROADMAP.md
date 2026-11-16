# Development Roadmap

**Day 1 is the first working day after the team accepts this plan.** None of the project documents give a final delivery date, and the SPMP schedule (deployment in week 9) has already passed. **A should write real dates next to D1–D15 today** (risk R1). If fewer than 15 days remain, apply the cut order in §9.

Task IDs refer to [TASK_DECOMPOSITION.md](TASK_DECOMPOSITION.md). The same schedule appears in [TEAM_ASSIGNMENT_MATRIX.md](TEAM_ASSIGNMENT_MATRIX.md) and [DEPENDENCY_AND_PARALLEL_WORK_PLAN.md](DEPENDENCY_AND_PARALLEL_WORK_PLAN.md).

## 1. Immediate blockers (D1)

| Task | Owner | Done by |
|---|---|---|
| T-01 Integration baseline: push `course-handoff`, PR into `main`, delete stale branches, untrack generated files | A | D1 midday |
| T-02 Rulings meeting (45 min, all four members) on D1–D14 | A | D1 |
| T-03 Profile-bootstrap data-loss fix | B | D1 (accepted on staging on D2) |
| T-04 Close `features-integration`; confirm the salvage list | B, A approves | D1 |
| Agree the four data contracts (dependency plan §5) | A with B and C | D1 |

## 2. Tasks that can start immediately (D1–D2)

| Task | Owner | Window |
|---|---|---|
| T-05 Staging Supabase + Vercel + CI | C | D1–D2 |
| T-06 Heart refund on quit | A | D1–D2 |
| T-16 Rhythm timing tests (formula once D13 is ruled) | D | D1–D2 |
| T-15 Dashboard and lesson UI fixes | D | D2–D3 |
| T-11 Achievements | B | D2–D3 |
| T-09 Vision hardening + perf overlay | A | D2–D4 |
| T-07 PitchVerifier | C | D2–D4 |

**IC-1 (end of D3):** T-03, T-05, T-06, T-11, T-15 and T-16 merged; staging is live.

## 3. Parallel implementation (D4–D9)

| Day | A | B | C | D |
|---|---|---|---|---|
| D4 | T-09 (finish) | T-12 | T-07 (finish, merge) | T-18 |
| D5 | T-08 | T-12 | T-13 | T-14 |
| D6 | T-08 (merge) | T-12 | T-13 | T-17 |
| D7 | T-19 | T-12 (finish) | T-13 (finish) | T-17 |
| D8 | T-19 | T-10 | T-20 | T-21 |
| D9 | IC-3 integration | T-10 (finish) | buffer / T-13 fixes | buffer / T-26 start |

**IC-2 (end of D6):** T-07, T-08, T-09, T-14 and T-18 merged. The pitch path is live on staging.

## 4. Integration (D9)

**IC-3, feature freeze.** T-10, T-12, T-13 and T-17 are merged, and the T-19 report is in. After this point, only defect fixes are merged.

## 5. Testing and quality assurance

T-19 (D7–D8), T-20 (D8) and T-21 (D8) run before the freeze. They then repeat as part of regression.

| Day | A | B | C | D |
|---|---|---|---|---|
| D10 | Triage and support T-22 | Pairs on T-23 auth/analytics | T-23 | T-22 |
| D11 | Triage | Pairs on T-23 | T-23 | T-22; T-26 |
| D12 | Triage; T-24 starts | Defect fixes | T-23 (finish) | T-22 (finish); T-26 |

**IC-4 (end of D12):** the T-22 and T-23 results are recorded, and every defect has a priority and an owner.

## 6. Bug fixing and regression (D12–D13)

T-24 is time-boxed to 2 days.
- Each owner fixes the defects in their own area.
- Every fix gets a test where one is feasible.
- Regression rerun: the unit suite, the T-23 steps for affected flows, and the T-20 script.

**RC (end of D13):** no open P0 or P1 defects. CI is green on `main`.

## 7. Deployment preparation and release (D14)

T-25: production Supabase project, auth URLs, Google provider, host deploy, smoke test, tag `v1.0.0`. B owns it; A and C support.

## 8. Final delivery (D14–D15)

| Day | Activity |
|---|---|
| D14 | T-26 documents approved (SRS/SDD v01.02, test appendix) |
| D15 | Demo script rehearsal with the whole team; record the backup demo video; buffer |

## Critical path and integration sequence

- **Critical path:** T-01 → T-04 → T-11 → T-12 → IC-3 → T-22 ∥ T-23 → T-24 → T-25.
- **Highest-risk chain:** T-05 → T-07 → T-08 → T-19 (real hardware).
- **Integration sequence:** IC-0 (D1) → IC-1 (D3) → IC-2 (D6) → IC-3 (D9, freeze) → IC-4 (D12) → RC (D13) → Release (D14).

## 9. If the deadline is shorter: cut order

Cut items from the top of this list first.

| Order | Cut | Consequence |
|---|---|---|
| 1 | T-27…T-30 | Already unscheduled |
| 2 | T-17 flats | Only one lesson card shows A♯ instead of B♭. Fix that card's text instead. |
| 3 | T-14 welcome step | Piano lock still enforced by the DB. Note it in the SDD. |
| 4 | T-18 dead code | No user impact |
| 5 | T-13 offline sync, reduced | Keep only "enqueue on network error + flush on reconnect" with no backoff. **Do not drop it entirely:** SRS 3.3.2 requires it. |
| 6 | T-23 reduced | Run the functional checklist only for the core flows |

**Never cut:** T-01, T-03, T-05, T-06, T-07/T-08, T-10, T-11, T-12, T-19, T-20, T-21, T-24, T-25.
