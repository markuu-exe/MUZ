# Defect Log and Triage (T-22 log, T-24 triage)

| | |
|---|---|
| **Status** | **Scaffolded.** Pre-seeded with defects already found by code reading and read-only checks; testing (T-19 to T-23) has not run. |
| **Process (SPMP §6)** | "Identified defects will be recorded, prioritized, assigned, fixed, and retested before being considered resolved." |
| **System of record** | The SPMP Issue Log Google Sheet (SPMP §10.1). Its own columns govern; this file mirrors the P0/P1 rows for the repo. Edit access: U-12. |
| **Triage** | A gives each new defect a priority within 1 working day. Owners follow the area table below. |

## Priority scale

| Priority | Meaning |
|---|---|
| P0 | Blocks a core flow, loses data, or a security problem |
| P1 | An SRS requirement fails |
| P2 | Cosmetic, or has a workaround |

## Area owners (Member A guide §4.4)

| Area | Owner |
|---|---|
| `src/audio`, `src/vision`, `src/practice`, `src/workers`, `src/lesson`, `src/content` | A |
| `src/context`, `src/components/auth`, `src/lib/progress`, `src/hooks/useDashboardData.ts`, analytics | B |
| `src/lib/sync`, `supabase/`, CI and hosting, `src/lib/rhythm` | C |
| Dashboard layout and copy, rhythm-view copy, `src/lib/theory/notes.ts` | D |

## Log

"Proposed" priorities are A's to confirm. "Found by" says how it was found; none of these come from the formal test runs yet.

| ID | Summary | Found by (date) | Requirement | Priority | Owner | Task | Status | Retest evidence |
|---|---|---|---|---|---|---|---|---|
| DEF-001 | Live `profiles` table readable without signing in (5 rows, all columns) | Read-only REST check (2026-11-17) | SRS 3.5.2 | P0 (proposed) | C | F2 / T-20 | Open | — |
| DEF-002 | Profile read error other than "no row" falls through to `upsert({ exp: 100, current_streak: 1, hearts: 5 })` — overwrites progress | Code reading (`AuthContext.tsx`, 2026-11-17) | SDD C-01 | P0 | B | T-03 | Open | — |
| DEF-003 | PR #22 on `main`: two writers per passed lesson (duplicate `performance_records`), `|| 95` fake scores, badge rules ≠ U-04, initial migration edited | Code reading (2026-11-17) | SRS 3.1.2, 3.1.7 | P0 (proposed) | A decides / B | revert `task/revert-pr-22` | Fix ready, not merged (re-verified on `f2c79ed` 2026-11-19: merges cleanly, `tsc` OK, 410/410 tests) | — |
| DEF-004 | App white-screens when Supabase env vars are missing (`supabaseUrl is required`) | Production preview without `.env.local` (2026-11-19) | SRS 3.3.1 (no crash) | P1 (proposed) | C | T-05 env guard | Open | — |
| DEF-005 | Drill timeout 12 s (Virtuoso) and 10 s (one Proficient drill) instead of 15 s | Code + seed (2026-11-17) | SRS 3.1.2.4, ruling D5 | P1 | A | D5 | Fix on `task/D5-drill-timeouts` (`f2d0f75`), not merged; seed must be re-applied to Supabase | Unit test `drill timeout (ruling D5)` |
| DEF-006 | Single-note drills pass any octave (pitch class only) | Audit (2026-11-16) | SRS 3.1.6.2, ruling D4 | P1 | C (T-07) + A (T-08) | T-07, T-08 | In progress: f0 + verifier seam on `task/T-08-pitch-wiring`; waits for T-07 | — |
| DEF-007 | Rhythm consistency ignores omitted beats (1 of 10 hits → 100 %) | Audit (2026-11-16) | SRS 3.1.4.4, ruling D13 | P1 | D | T-16 | Open | — |
| DEF-008 | At 0 hearts, Skill Tree blocks rhythm lessons too | Code (`SkillTreeView.tsx:117`) | U-20 | P2 (proposed) | D | T-15 | Open | — |
| DEF-009 | No OAuth provider enabled; no Google button | Live `/auth/v1/settings` (2026-11-17) | SRS 3.1.1.1 | P1 | B (+ C config) | T-10, D11 | Waits for A's authorization | — |
| DEF-010 | Password reset cannot be completed | Audit (2026-11-16) | SDD C-01 | P1 | B | T-10 | Open | — |

## Regression run (T-24)

Fill after fixes merge. Commands: `npm test`, `npx tsc -p tsconfig.json`, `npm run build`, `npm run seed:lessons:check`; T-23 steps for the affected flows; T-20 script.

| Date | Commit | Unit tests | tsc | Build | Seed | T-23 steps re-run | T-20 | Result |
|---|---|---|---|---|---|---|---|---|
| | | | | | | | | |
