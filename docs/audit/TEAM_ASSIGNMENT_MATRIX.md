# Team Assignment Matrix

The working-style profiles come from Member A. They are delegation preferences, not assessments of anyone's ability. Where an assignment rests on thin evidence, it is marked **provisional**.

## 1. Members and the evidence used

| | Member | Profile (from A) | What git history shows | Assignment rationale |
|---|---|---|---|---|
| **A** | Amatong (tech lead / PM) | Highly hands-on: architecture, debugging, integration | 89+ commits. Built all of vision, chord audio, the wait-state, the lesson player, curriculum and progress. | Owns the runtime-risk chain (audio and vision) and integration. A is the only person familiar with `src/audio`, `src/vision` and `src/practice`. |
| **B** | Barnaija (full-stack) | Highly hands-on: can share hard work | Built the auth stack (`AuthContext`, `LoginPage`), the dashboard UI edits, the analytics mock, and the 3,000-line gamification branch (unmerged) | Owns auth and gamification, which are B's own files, and the analytics critical path. Production deploy. |
| **C** | Rosales (backend) | Hands-on and conservative; wants explicit scope | Built the rhythm timing hooks and `GrandStaff` / `PianoKeyboard`; both are **live in the app** and of good quality. Also built the theory test pages, now dead. | Clearly bounded, interface-defined work: a pure verifier with numeric tests, a CI and staging checklist, an offline queue behind an existing seam, and scripted tests |
| **D** | Bernante (frontend) | Needs small, structured tasks and review | Three authored commits: "skilltree initial" and "login initial" (Oct 24), "initial dashboard" (Nov 2). Parts of that dashboard were later rewritten by B and A. | Small, enumerated tasks with line-level scope, test-only tasks, and scripted manual QA. None is on the critical path, and all are reviewed. |

**Evidence limits**
- **D:** three commits are too few to judge code quality. D's assignments rest on A's profile, not on code evidence, so **T-15 and T-17 are provisional**. Re-evaluate them after D's first PR (T-16).
- **B:** git history shows several commits with uninformative messages and a delete-then-revert cycle on `.env.local`. This is not a judgement of ability. It means B's PRs should carry descriptive commit messages and a clean history (see [INTEGRATION_AND_COORDINATION_PLAN.md](INTEGRATION_AND_COORDINATION_PLAN.md) §5).

## 2. Assignment by task

| Task | Primary | Support | Reviewer | Priority | Size | Window |
|---|---|---|---|---|---|---|
| T-01 Integration baseline | A | — | B | P0 | S | D1 |
| T-02 Rulings | A | B, C, D | team | P0 | S | D1 |
| T-03 Profile-bootstrap fix | B | A | A | P0 | S | D1 |
| T-04 Branch salvage decision | B | — | A | P0 | S | D1 |
| T-05 Staging + CI | C | B | A | P0 | M | D1–D2 |
| T-06 Heart refund | A | — | B | P1 | S | D1–D2 |
| T-07 PitchVerifier | C | A | A | P1 | M | D2–D4 |
| T-08 Pitch wiring | A | C | B | P1 | M | D5–D6 |
| T-09 Vision hardening | A | — | B | P1 | M | D2–D4 |
| T-10 Auth completion | B | C | A | P1 | M | D8–D9 |
| T-11 Achievements | B | A | A | P1 | M | D2–D3 |
| T-12 Analytics | B | D (styling, if asked) | A | P1 | L | D4–D7 |
| T-13 Offline sync | C | A | A | P1 | L | D5–D7 (D9 buffer) |
| T-14 Onboarding welcome | D | B | B | P2 | S | D5 |
| T-15 UI fixes (provisional) | D | A | A | P1 | M | D2–D3 |
| T-16 Rhythm tests + formula | D | C | A | P1 | S | D1–D2 |
| T-17 Flats (provisional) | D | C | C, then A | P2 | M | D6–D7 |
| T-18 Dead code | D | — | A (C for theory files) | P2 | S | D4 |
| T-19 Hardware benchmark | A | C, D | B | P1 | M | D7–D8 |
| T-20 RLS verification | C | — | A | P1 | M | D8 |
| T-21 Media privacy audit | D | — | A | P1 | S | D8 |
| T-22 Compatibility matrix + defect log | D | A (triage) | A | P1 | M | D10–D12 |
| T-23 E2E checklist | C | B | A | P1 | M | D10–D12 |
| T-24 Fixes + regression | A | all | the original reviewer | P1 | M | D12–D13 |
| T-25 Production deploy + demo | B | A, C | A | P0 | M | D14 |
| T-26 SRS/SDD v01.02 | D | A | A | P1 | M | D9–D14 |
| T-27…T-30 | unscheduled | — | — | P3 / deferred | — | — |
| AUX-TEST-ACCESS-01 follow-up (outside T-01…T-26; added 2026-11-19) | A | — (C: F2 prerequisite only) | — | — | S | after C's F2 fix is merged |

## 3. Area ownership for defect fixes (T-24)

| Area | Owner |
|---|---|
| `src/audio`, `src/vision`, `src/practice`, `src/workers`, `src/lesson`, `src/content` | A |
| `src/context`, `src/components/auth`, `src/lib/progress`, `src/hooks/useDashboardData`, analytics | B |
| `src/lib/sync`, `supabase/`, CI and hosting config, `src/lib/rhythm` | C |
| `src/components/dashboard` (layout and copy), `src/components/lesson/rhythm` (copy), `src/lib/theory/notes.ts` | D, reviewed by A |

## 4. Load check (ideal days, D1–D14)

| Member | Assigned work | Days |
|---|---|---|
| A | T-01 0.5, T-02 0.5, T-06 1, T-09 2, T-08 2, T-19 2, integration and reviews ~2, T-24 lead 1.5 | ≈ 11.5 |
| B | T-03 1, T-04 0.5, T-11 2, T-12 4, T-10 2, T-23 support 1, T-25 1.5 | ≈ 12 |
| C | T-05 1.5, T-07 2.5, T-13 3, T-20 1, T-23 3, T-24 fixes 1 | ≈ 12 |
| D | T-16 1.5, T-15 2, T-18 1, T-14 1, T-17 2, T-21 1, T-22 3, T-26 3 | ≈ 14.5 calendar days of small tasks; P2 items are cuttable |

The difficult work sits with A and B, as the profiles require.
- **A's stream** carries the highest technical risk: real-time audio and vision on real hardware.
- **B's stream** carries the longest chain: the critical path through analytics.
- **C** gets independent, well-specified work, including one L-sized task (T-13).
- **D** gets no critical-path work. Every D task is reviewable in under 30 minutes.

## 5. Recommended reassignments in Jira

| Issue | From | To | Reason |
|---|---|---|---|
| KAN-233 | ashwwyr (C) | dev_account (B) | The bug is in `AuthContext.tsx`, which B wrote |
| KAN-283 | unassigned | dev_account (B) | Deploy owner (T-25) |
| KAN-261 | ashwwyr (C) | stays C; add A as a watcher | C does T-07; A does T-08 |
| KAN-264 | ashwwyr (C) | Mark Lawrence (A) | Wiring is A's T-08 |
| KAN-271, 274 | dev_account (B) | ashwwyr (C) | C runs T-23 |
| KAN-272, 277 | dev_account (B) | Mark Lawrence (A) | Performance work is T-19 |
| KAN-276, 279, 280 | dev_account (B) | Neve (D) | T-21 and T-22 |
| KAN-278 | dev_account (B) | ashwwyr (C) | Closed by T-05's CI size gate |
| KAN-273, 282 | dev_account (B) | Mark Lawrence (A) | A leads T-24 |
| KAN-281 | ashwwyr (C) | Mark Lawrence (A), as triage owner | Fixes are assigned per area |
| KAN-269, 270, 259 | dev_account (B) | stays B | — |
| KAN-268, 275 | ashwwyr (C) | stays C | — |
| KAN-231, 232, 235–238 | Neve (D) | stays D | Mostly done; D closes them through T-14 and T-15 |
