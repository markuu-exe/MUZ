# Member A Implementation Audit (Workstream B, Phase 2)

| | |
|---|---|
| **Date** | 2026-11-21 (Saturday) |
| **Baseline audited** | `origin/main` @ `e96c34c` (PR #33, 2026-11-21 01:47 UTC) |
| **Scope** | Member A's tasks T-01, T-02, T-06, T-09, T-08, T-19, T-24, and the team-lead duties in `docs/execution/MEMBER_A_EXECUTION_GUIDE.md` §4 |
| **Method** | Read-only. Source at `e96c34c` (`git show`), git history, every PR #1–#38 (`gh`), GitHub Actions logs, Jira (live), the SPMP / SRS / SDD (Drive + PDFs in `docs/execution/`), the SPMP Issue Log sheet. No code, branch, Jira or database was changed. |
| **Evidence labels** | **[V]** verified by me in this audit · **[H]** historical claim from a document or PR description that I could not re-check · **[A]** assumption · **[U]** unresolved |

## 0. Evidence and access notes

| Item | Result |
|---|---|
| Tests on `e96c34c` | **[V]** GitHub Actions run `44852278231` (push to `main`, 2026-11-21 01:48 UTC): 49/49 files, **599/599 tests pass**; typecheck, `vite build`, seed check and size gate in the same job are green. Locally: 583/583 pass; the two PGlite suites (`supabase/__tests__/*`, 16 tests) did not load because the local `node_modules` lacks `@electric-sql/pglite` (see §0.1). |
| Branch protection | **[V]** `GET /repos/markuu-exe/MUZ/branches/main/protection` → 404 "Branch not protected"; no rulesets. |
| Jira | **[V]** 66 KAN issues. **No issue updated since 2026-11-16.** No comments on any Member A issue checked. Proposed tickets NEW-01…NEW-08 (T-01, T-02, T-06, T-09 …) **do not exist**. |
| SPMP Issue Log (system of record per SPMP §10.1) | **[V]** The Google Sheet is **empty** (headers only; last modified 2026-10-10). |
| SRS / SDD | **[V]** `MUZ_SRS-Latest.pdf` is **v01.01** (revision history ends 09/05/2026); `MUZ_SDD-Latest.pdf` is **v01.00**. Word sources exist in Drive (`MUZ_SRS.docx`, `MUZ_SDD.docx`, modified 2026-11-19 03:20/03:29 UTC); the PDFs exported later the same day show no v01.02 row. |
| Team chat, adviser communication, checkpoint posts | **Not accessible.** Anything that depends on them is marked **Cannot verify**. |
| Manual / hardware evidence | None found in the repository other than `docs/test/PERFORMANCE_REPORT.md` §1 **[H]**. No screenshots or recordings are attached to any Member A PR. |
| Identity note | **[A]** GitHub account `markuu-exe` is Member A (Amatong): it is the git user of this checkout and authored the A-designated PRs. All A PRs and several C-owned PRs (T-05 #30, T-07 in #31, F2 #33) were authored by this account. |

### 0.1 Working-tree state found during the audit (not caused by this audit)

Between my branch switch (22:36) and the test run, `git stash pop` was run on `task/SEC-AUDIT-guide-revision` by someone else. Current state: `package.json` staged with the extra `supabase` dev dependency, **`package-lock.json` unmerged (`UU`) with conflict markers**, and `stash@{0}` still listed. `npm ci` then installed from that state, which is why `@electric-sql/pglite` is missing locally. Not resolved by me; needs the owner's decision.

---

## A. Task status matrix

| Task | Original requirement (guide §C) | Current implementation | Evidence | Missing verification | Status | Remaining work |
|---|---|---|---|---|---|---|
| **T-01** Integration baseline | Push + merge COURSE-6 (`317844d`) and heart-regen fix (`59448bd`); untrack 5 generated files; ignore them; delete `Lag-in`, `dashboard`, `login-bins`; protect `main` (PR + 1 approval); fresh-clone run of 5 commands with a clean tree | Baseline commits are in `main` **[V]**. No generated file is tracked; `.gitignore:10-12` ignores `*.tsbuildinfo`, `vite.config.js`, `vite.config.d.ts` **[V]**. The 3 stale branches **still exist** (`git ls-remote`) **[V]**. **No branch protection** **[V]**. | PR #18 (merged 2026-11-16, **no description, no review**, self-merged). CI runs on fresh checkouts (`npm ci`, test, tsc, `vite build`, seed) are green. | Fresh-clone terminal output never posted (PR #18 body empty). CI runs `npx vite build`, not `npm run build` (`tsc -b`), so "build leaves the tree clean" is not exercised by CI; **Update (Phase 4):** after the dependency reinstall, a local `npm run build` on `e96c34c` left only documentation changes in `git status`. The clean-tree criterion is verified; the fresh-clone transcript is still not posted. | **Partially implemented** | Delete the 3 branches (after the owners confirm, register §T-01); enable protection (require PR + 1 approval from someone other than the author); post the fresh-clone run. |
| **T-02** Rulings | 14 rows (ID, outcome, reason, tasks, doc edit Y/N, decided by); team agreement; B accuracy review; post unblocking rulings; every "doc edit = Y" names the section | `docs/decisions/RULINGS.md` on `main` has D1–D14, each "By: A", status "DECIDED by the chair on 2026-11-16" **[V]**. D11 still outstanding (authorize Google or escalate) **[V]**. Spec edit guide `T-02_SPEC_EDIT_GUIDE.md` exists **[V]**. | PRs #21 (draft agenda) and #24 (final record), both self-merged without review **[V]**. | **B's accuracy-review line in §5 sign-off is blank** **[V]**. "Agreed by the team" rests on the record's own statement that B, C, D attended **[H]**. Notification of members: **Cannot verify** (team chat). **SRS/SDD edited but not re-versioned** (corrected in Phase 3): the Nov 19 PDFs already contain ruling wording (D1/D2 AudioWorklet and 4096-sample window, D9 streak wording in SRS 3.1.2.2, D10 and D14 text in the SDD) **[V]**, but the revision history still reads v01.01 / v01.00 with no v01.02 row **[V]**. Not every "doc edit = Y" row was checked. D14 is now being revisited (security audit). | **Partially implemented** | B signs the accuracy review; resolve D11; add the v01.02 revision rows and check the remaining "doc edit = Y" items (now A's T-26 part); re-open D14 formally (see the progression architecture workstream). |
| **T-06** Heart loss on quit | `quitLesson(state, nowMs, unreportedHeartsLost = 0)`; `onHeartsSpent` prop; `PracticeDrillView` reports `drill.heartsLost`; `LessonPlayer` ref, reset in `advance()`; 2 runner tests; manual staging check | Implemented as specified **[V]**: `runner.ts:124-126`; `registry.ts:25`; `PracticeDrillView.tsx:64-69`; `LessonPlayer.tsx:120-127,159,166` (reset in `advance` and `retry`); exercise view keyed per exercise + attempt (`LessonPlayer.tsx:256`), so a previous drill's count cannot leak. | PR #19 (self-merged; author's own "COMMENTED" review only). Tests `runner.test.ts:93,103,114,121`: quit mid-drill, quit after a finished drill (no double count across drills), floor at 0, nothing awarded on quit — all pass in CI **[V]**. Path survived the PR #22 revert **[V]**. | **No manual staging check** (no verified staging exists; T-05 Part 2 open). React wiring has no component test (PR #19 says so). No Jira ticket (NEW-04 never created; KAN-267 is a different, Done item). | **Implemented, verification missing** | Manual check on prepared staging: timeout → quit → dashboard and `profiles.hearts` both one lower. |
| **T-09** Vision hardening | Main-thread timestamps; `awaitingResult` before the await; try/catch on `createImageBitmap`; `minIntervalMs` frame cap; `lastInferenceMs`; `?debug` overlay; 4 FrameLoop tests; manual overlay + camera-restart check | Implemented **[V]**: `FrameLoop.ts:102-135` (in-flight guard, interval gate, `sentAt` clock, catch → non-fatal error, slot released). Cap is **30 ms**, not 33: ruling M5, approved **[V]**. `PerfOverlay.tsx`, wired in `CameraPanel.tsx:53` **[V]**. | PR #20 (self-merged). `FrameLoop.test.ts`: 5 T-09 tests (clock after `mediaTime` restart, no second in-flight frame, 30 ms cap, delegate memory, capture failure keeps the loop alive) + `inferenceStats.test.ts` 5 tests; pass in CI **[V]**. Overlay rendered with GPU delegate in a `vite preview` build **[H]** (`PERFORMANCE_REPORT.md` §1). | **Camera-restart cue timing not measured** (`PERFORMANCE_REPORT.md` §3.1 blank). No overlay screenshot showing interval ≥ 33 ms. | **Implemented, verification missing** | Measure in the T-19 session: overlay screenshot; replug → cue ≈ 0.6 s. |
| **T-08** Pitch wiring | pitchy f0 + clarity in the worklet; protocol + `AudioInputService` pass-through; `PitchVerifier` default with `useChromaNoteVerifier` flag; octave test; worklet size; no new network requests; manual A4/A3 check; latency note for T-19 | Implemented **[V]**: `ChromaFrameProcessor.ts:1,30-34` (pitchy `PitchDetector`); `protocol.ts:22-24`; `AudioInputService.ts:178-179`; `ChordVerifier.ts:15-17`; `PracticeDrill.ts:15-17,85-98`; `config.ts:141-148` (`useChromaNoteVerifier: false`). | PR #31 (self-merged; "independent reviewer → with fixes" **[H]**, no GitHub review). Tests: `PracticeDrill.test.ts:214` (A3 vs A4 target is a miss by default), `pitch.test.ts:79,85,89,159,224` (octave, clarity 0.85 edge, ±12 rejected), `framePitch.test.ts:55`; pass in CI **[V]**. Synthetic acceptance table and worklet cost 0.86–0.98 ms/hop, worklet 17.76 kB **[H]** (PR #31 body). | **No real-instrument check** (PR #31: "Not verified: real piano / mic"). No DevTools no-network check recorded. Latency note not written (`PERFORMANCE_REPORT.md` §6 method undecided). PR #31 cites `docs/test/T-19_SESSION_PROCEDURE.md`, **which does not exist on any branch** **[V]**. | **Implemented, verification missing** | Real A4/A3 + out-of-tune trials (T-19 §5); network check; decide the latency method. Confirm with A that the two behaviours beyond the SRS text are accepted: credible frames must also pass the chroma `NoteMatcher`, and f0 < 55 Hz is judged by chroma alone (PR #31 "Review fixes"). |
| **T-19** Hardware benchmark | Production loader check; 2 machines × Chrome + Edge × 60 s overlay figures; chord trials (20 × 5 chords × 2 mics + 20 wrong); note trials (20 × 3 + 10 octave errors); latency; non-SPEC tuning only; every fail logged | `docs/test/PERFORMANCE_REPORT.md` is a **scaffold** **[V]**. Only §1 (production loader check on one machine, built-in Chromium) is filled **[H]**, and its worker-fetch timing is "inferred, not captured". Bundle and model sizes recorded **[H]**. §2–§7 blank; §8 lists every runtime target as "not measured" **[V]**. | PR #27 (report scaffold, self-merged). | **No hardware measurement of any kind.** No machine listed. No Edge run. No chord / note / latency trials. No tuning. | **Partially implemented** (scaffold + one loader check) | The whole hardware session. Upstream now satisfied (T-08 and T-09 merged); blocked on hardware (U-10) and the latency method. |
| **T-24** Triage + regression | Collect T-19…T-23 results; priority within 1 day; owners by area; fixes merged in approved order; `REGRESSION_LOG`; go/no-go evaluated | `docs/test/DEFECT_LOG_AND_TRIAGE.md` is a **scaffold** with DEF-001…DEF-010 pre-seeded **[V]**. **No `REGRESSION_LOG`**; the regression table is empty **[V]**. None of T-20…T-23's reports exist **[V]**. | PR #27. | The log is **stale**: DEF-003 (revert merged in #26), DEF-004 (env guard merged in #30), DEF-005 (D5 merged in #25) and DEF-006 (T-07/T-08 merged in #31) still read "Open" / "not merged" **[V]**. DEF-001's repo fix merged (#33) but is not applied to the hosted DB [U]. The SPMP Issue Log sheet, named as the system of record, is empty **[V]**. | **Not implemented** (scaffold only; upstream results do not exist) | Update the log to repository truth; mirror to the Issue Log sheet or change the system of record; start triage as T-19…T-23 produce results. |

**Dependency check.**
- T-08 needs C's T-07. T-07 **was merged**, but authored by A (`372f1d7`), not C. C's own PR #35 was closed with "applied patch on a separate branch". The dependency is satisfied in code. The ownership rule (guide §4.4: "do not write … the PitchVerifier (C)") was not followed, and the "2026-11-19 takeover directive" cited in PR #31 **is not recorded anywhere in the repository** [V].
- T-19 needs T-08 and T-09: both merged, so the code is unblocked. Hardware is the blocker.
- T-24 needs T-19…T-23: none has results. T-24 cannot be more than "not implemented".

---

## B. PR and commit mapping

| PR | Merged (UTC) | Author → merger | Reviews | Task(s) | Notes |
|---|---|---|---|---|---|
| #18 | 11-16 01:18 | A → A | none | T-01 | Empty description; untracks the 5 generated files, adds ignores |
| #19 | 11-16 02:05 | A → A | self-comment | T-06 | `ed037d4` |
| #20 | 11-16 02:06 | A → A | self-comment | T-09 | `ebbad77` |
| #21 | 11-16 02:08 | A → A | self-comment | T-02 (draft agenda) | Superseded by #24 |
| #22 | 11-16 16:45 | B (Confusion996) → B | none | — (`features-integration`, "heart countdown integration") | Merged by B without review or approval; violated the decision "do not merge". Reverted by #26. |
| #23 | 11-19 04:14 | A → A | none | AUX-TEST-ACCESS-01 (`is_dev`) | Outside T-01…T-26 |
| #24 | 11-19 05:23 | A → A | none | T-02 (final record + spec edit guide + handoff) | |
| #25 | 11-19 08:09 | A → A | none | D5 content fix | A's area (content) |
| #26 | 11-19 05:24 | A → A | none | PR #22 remedy | Revert merged ~2.5 days after the decision |
| #27 | 11-19 05:25 | A → A | none | T-19 / T-24 scaffolds, A register | Scaffolds only |
| #28 | closed | A | none | T-08 (early) | Superseded by #31 |
| #29 | 11-19 08:44 | A → A | none | AI-1 (posture "can't see you" cue) | Outside T-01…T-26 |
| #30 | 11-21 00:38 | A → A | none | **T-05 (C's task)** | Implemented by A |
| #31 | 11-21 00:40 | A → A | none on GitHub | **T-07 (C's task)** + T-08 | Contains a commit titled "WIP (not for merge)" (`57dcfbf`), merged as-is |
| #32 | 11-21 01:02 | A → A | none | AI-3 (landmark export) | Outside T-01…T-26 |
| #34 | 11-21 00:38 | A → A | none | Developer test results ("Decision D1", which clashes with ruling D1) | **Stacked on F2:** F2's commits reached `main` through #34, an hour before F2's own PR #33 |
| #35 | closed | C (ashwwyr) | none | T-07 | Closed by A; work re-applied in #31 |
| #36 | 11-21 01:45 | A → A | none | AI-2 (offline audio eval) | Outside T-01…T-26 |
| #38 | 11-21 01:47 | A → A | none | AUX ownership docs, "temp cloud (git) storage for aux documentation" | Empty description |
| #33 | 11-21 01:47 | A → A | none | **F2 (C's task)** | Merged after its content was already on `main` via #34 |

**Findings**
1. **Work completed outside its intended owner or branch:** T-05 (#30), T-07 (#31) and F2 (#33/#34) are C's tasks, implemented by A. T-07 duplicated C's PR #35.
2. **Unmerged implementation:** none for A's T-tasks. C's `task/T-07-pitch-verifier` (`b1fcd70`) remains as a superseded branch.
3. **Merged work that does not meet its acceptance criteria:** T-01 (branches, protection), T-02 (B sign-off, document edits), T-06 / T-09 / T-08 (manual and hardware criteria).
4. **Duplicate or superseded:** #21 → #24; #28 → #31; #35 → #31; `engine.ts` from PR #22 (removed by #26).
5. **Process:** of the 20 PRs merged since #18, **none has an independent approving review**. A's guide named B as reviewer for A's PRs; U-17 made A the reviewer of everyone else's. With no branch protection, nothing enforced either rule.

---

## C. Team-lead responsibilities audit

| Duty (guide §4) | Expected | Found | Assessment |
|---|---|---|---|
| Code review (§4.2) | A reviews B/C/D PRs; B reviews A's | No B, C or D PR was ever reviewed or merged through review. B/C/D opened only #22 (B, self-merged) and #35 (C, closed). A's PRs have no reviewer. | **Not performed / not possible as designed.** There was almost nothing to review from others, and A's own work was never reviewed. |
| Integration and merge order (§4.5) | IC-1/2/3 order; rebase + CI per merge; revert on red | CI green on every `main` push checked **[V]**. Merge order is not the planned one (stacked PRs: #34 carried F2 into `main` before #33; #36 stacked on #31). PR #22 was merged by B against the ruling; the revert took ~2.5 days. | **Partially followed.** `main` stayed green; ordering and gatekeeping were not enforced. |
| Checkpoints IC-0…IC-4, RC | Pass/fail post at each | No checkpoint record in the repository. The register (11-19) says IC-1 slipped. | **Cannot verify** (team chat); **no written evidence**. |
| Architecture / technical decisions | Rulings, contracts C1–C8, schema control | Rulings recorded; contracts C1–C8 "not posted" per the register **[H]**; schema migrations added (F2, `is_dev`, `dev_test_results`) without a recorded hosted-DB application plan. | **Partially done.** |
| Delegation (§4.4) | Do not take over B/C/D work except via §4.6 contingency | A implemented C's T-05, T-07 and F2. The contingency table in §4.6 covers T-07 only as "start T-08 with a stub verifier", not as "implement T-07". | **Not followed** (undocumented takeover). |
| Defect management (§4.6) | Priority within 1 day; Issue Log maintained | Repo log stale; Issue Log sheet empty. | **Not maintained.** |
| Jira tracking (§4.6) | Daily updates; In Progress on branch; Done with evidence; reopen KAN-228, 229, 10, 11, 258 before D3 | No Jira update since 11-16. The five issues are **still Done** **[V]**. NEW tickets never created. | **Not done.** |
| QA / performance oversight | T-19 led by A; T-20…T-23 owners tracked | T-19 not run; T-20…T-23 not started; no tracking artefact. | **Not done.** |
| Release coordination (§4.7) | RC go/no-go needs: no open P0/P1, CI green, T-20 pass, T-21 pass, regression log | Only "CI green" is met. P0s open (DEF-001 on the hosted DB, DEF-002), T-20/T-21 not run, no regression log. | **Release criteria currently fail.** |
| Reporting (SPMP §8) | Status to the team and adviser | Cannot verify. | **Cannot verify.** |

---

## D. Remaining-work plan (prioritised)

Order: blocking dependencies → security / data loss → core correctness → verification gaps → release impact.

| # | Work | Why first | Owner | Blocked by |
|---|---|---|---|---|
| 1 | Resolve the working-tree conflict (§0.1) | Local test runs are unreliable until it is resolved | whoever ran the pop | — |
| 2 | Enable branch protection on `main` (PR + 1 non-author approval) | Every later merge is otherwise unreviewed | A (admin) | — |
| 3 | Classify the hosted DB and decide F2's application (U-22, U-26) | DEF-001: anonymous read **and write** of every profile on the hosted DB | A | — |
| 4 | Bring the defect log to repository truth; pick one system of record (repo log or Issue Log sheet) | T-24 and the go/no-go both read from it | A | — |
| 5 | T-19 hardware session (two machines, Chrome + Edge, chords, notes, latency) | Closes T-08 / T-09 / T-19 verification; produces T-24 input | A (+ C notes, D records) | Hardware (U-10); latency method decision |
| 6 | T-06 manual staging check | Last T-06 criterion | A | A prepared staging (C's T-05 Part 2) |
| 7 | T-01 branch deletions, fresh-clone evidence | Low risk, quick | A | Owner confirmation per branch |
| 8 | T-02: B accuracy sign-off; D11 decision; D14 revisit | Feeds T-26 and the progression architecture | A + B | — |
| 9 | Jira reconciliation (§E) and the five reopen actions | Board does not reflect reality | A | — |
| 10 | T-24 triage and regression log | Final gate | A | T-19…T-23 results |
| 11 | SRS/SDD v01.02 (A's T-26 part) | Delivery documentation | A | Rulings final, incl. D14 |

**Schedule realism [V dates, A estimates].** Today is Sat 2026-11-21. The plan targets freeze Tue 11-24, release Fri 11-27, demo Sat 11-28 (U-01). Remaining A-owned verification (items 5, 6, 10) needs at least one hardware day. It also needs a prepared staging, which does not exist, and T-20…T-23 results, none of which have started. **Full T-24 sign-off by 11-27 is not realistic** unless the cut order is applied explicitly (U-30). The old D-day numbers in the guide no longer describe the work.

---

## E. Jira reconciliation (recommendations only; nothing was changed)

| Issue | Current | Recommended | Reason |
|---|---|---|---|
| KAN-261 (Pitchy single-note epic task) | In Progress | **In Progress** | Code merged (#31); real-instrument verification pending (T-19 §5) |
| KAN-262 (Hz → note names) | In Progress | **Done**, with comment linking #31 / `pitch.test.ts` | Implemented and unit tested; no hardware criterion |
| KAN-263 (Pitchy, < 50 ms latency) | In Progress | **In Progress** (or **Blocked** on the latency method) | Latency never measured |
| KAN-264 (AnalyserNode stream) | In Progress | **Done** with comment citing ruling D2 (AudioWorklet accepted) | The requirement was changed by ruling |
| KAN-277 (benchmark) | To do | **In Progress** → **Blocked** on hardware | Only the scaffold and loader check exist |
| KAN-273 / KAN-281 / KAN-282 (bug fixes, regression) | To do | **Blocked** (T-19…T-23 results) | No upstream results |
| KAN-267 (wait-state) | Done | Leave Done; **create** the T-06 bug (NEW-04) and close it only after the staging check | T-06 has no ticket |
| T-01 / T-02 / T-09 (NEW-01, NEW-02, NEW-05) | missing | **Create.** T-01 **In Progress**; T-02 **In Progress** (sign-off, doc edits); T-09 **In Progress** (hardware check) | No tracking at all today |
| KAN-228, KAN-229, KAN-10, KAN-11, KAN-258 | Done | **Reopen**, as the guide already instructed | Audit found them incorrect; directive not carried out |
| KAN-268 / KAN-275 / KAN-276 / KAN-279 / KAN-283 (B/C/D) | To do | **To do** / **Blocked** as appropriate (see the C/D guide revision) | Not Member A's, listed for completeness |

**Status summary:** 0 tasks implemented and verified · 3 implemented, verification missing (T-06, T-09, T-08) · 3 partially implemented (T-01, T-02, T-19) · 1 not implemented (T-24) · 0 broken or regressed.
