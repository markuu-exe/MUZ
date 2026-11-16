# Unresolved Decisions and Information Needed

Each item gives the question, why it matters, the affected tasks, the **default** the guides assume if nobody answers, who decides, and the day an answer is needed. A should settle the "D1" items before work starts.

## 1. Blocking before work starts (needed on D1)

| ID | Question | Why it matters | Affects | Default if unanswered | Decides | Needed by |
|---|---|---|---|---|---|---|
| **U-01** | What is the final delivery date, and which calendar day is D1? | No document states a deadline, and the SPMP schedule (deployment in week 9) has already passed. Every date in the plan is relative. | All | Plan stays at D1–D15 relative. If fewer than 15 days remain, apply the cut order (roadmap §9). | A, with the adviser | D1 |
| **U-02** | Rulings D1–D14: audio window, AudioWorklet, the 10 MB cap, pitchy, timeouts, KAN-244 labels, synth previews, 3 placement tiers, streak counting, heart restore on replays, Google only, hysteresis, consistency formula, client-trusted gamification | Several tasks implement whichever answer is chosen | T-07, T-08, T-14, T-16, T-11, T-26 | The recommendations in `docs/audit/PROJECT_REQUIREMENTS_AUDIT.md` §5 | Team (T-02) | D1 |
| **U-17** | Can A review about 18 PRs in 14 days, or should C review some of D's PRs (T-16, T-18)? | A is at capacity | T-15…T-18 | A reviews everything; C reviews T-16 and the T-18 theory files | A | D1 |
| **U-18** | Confirm D's cut order: T-17, then T-18; T-19 recording help is optional | D is over capacity (about 14.5 days in 14) | T-17, T-18, T-19 | As stated | A | D1 |

## 2. Needed during implementation

| ID | Question | Why it matters | Affects | Default if unanswered | Decides | Needed by |
|---|---|---|---|---|---|---|
| **U-03** | Can someone provide Jira data with descriptions, acceptance criteria, parent/epic links, issue links and comments? Either re-export the CSV with those columns, or authorise the Atlassian connector. | The export has none of these fields. The connector failed to connect during planning. Subtask parents were *inferred* from key order. | Jira proposal, all guides | Guides rely on the SRS/SDD plus the code. The parent hierarchy is a proposal to confirm in the Jira UI. | A | D2 |
| **U-04** | Exact badge rules: is `posture-stable` triggered by posture score ≥ 90 in one practice run? Does `exp-500` count EXP before or after badge bonuses? Is `first-lesson` the first *mastered* lesson? | No document defines the thresholds; only the titles exist (`seed.sql:441-447`) | T-11, T-12 | first-lesson = first mastery; streak ≥ 7 / ≥ 30; exp-500 on EXP after the lesson, before bonuses (no cascade); posture-stable = this run's `posture_score` ≥ 90 | A + B | D2 |
| **U-05** | How should analytics treat metrics that were never measured? A rhythm-only run stores `pitch_accuracy = 0` and `posture_score = 0` because the columns are NOT NULL (`applyResult.ts:120-127`). | Charts would plot false zeros | T-12 (optionally T-13) | Derive "was it measured" from the lesson content (`getCourseLesson`), with no schema change. Alternative: a migration making the columns nullable, but that changes `applyResult`. | A + B | D4 |
| **U-08** | Which Supabase project does the current `.env.local` point to, and does it match the migration file? The migration author is "LAB64_USER ON WS25" (a lab PC). Is that project dev, staging or production? | Decides whether T-05 creates a new staging project or reuses this one, and whether the migration was ever applied | T-05, T-20, T-25 | C creates a new staging project and leaves the existing one untouched | A + C | D1 |
| **U-09** | May C add `fake-indexeddb` as a dev dependency for the T-13 tests? | Unit-testing IndexedDB in Node needs it | T-13 | No: test the queue logic with an in-memory store and check IndexedDB manually | A | D4 |
| **U-07** | Who owns the Google Cloud project and OAuth client for "Continue with Google"? Is the consent screen configured? | T-10 needs a client ID and secret entered in Supabase | T-10, T-25 | B creates a Google Cloud project with the team account; C enters it in staging | B | D7 |
| **U-15** | Vercel or Netlify, and whose account? | Hosting config and env vars | T-05, T-25 | Vercel, B's account (B supports T-05) | B + C | D1 |
| **U-14** | For the end-to-end test of 15-minute heart regeneration, may the tester edit the localStorage key `muz-heart-regen-v2-<userId>` to shorten the wait? | Otherwise the test takes 15+ minutes per heart | T-23 | Wait out one real 15-minute cycle | A | D10 |
| **U-19** | Practice-drill target labels always use sharps (`src/practice/PracticeDrill.ts:36-38`). Should flats be fixed there too? | T-17 fixes only staff and theory labels | T-17, T-08 | Out of scope; recorded as a known limitation | A | D6 |
| **U-20** | Confirm that at 0 hearts only lessons containing **practice** exercises are blocked, with theory and rhythm lessons left open | This matches `runner.ts:45` and `rhythmFailHeartCost: 0` in all tiers. `SkillTreeView` currently blocks rhythm lessons too. | T-15 | Practice-only blocking | A | D2 |

## 3. Needed for testing, release and documentation

| ID | Question | Why it matters | Affects | Default if unanswered | Decides | Needed by |
|---|---|---|---|---|---|---|
| **U-10** | Which hardware is available: two laptops (one mid-range with a 720p30 webcam), USB webcam and microphone, an acoustic piano or 61+ key digital keyboard (SPMP §11), a Mac for Safari? | T-19 and T-22 need it, and A should book it | T-19, T-22 | Chrome + Edge + Firefox on whatever team laptops exist; Safari column marked n/a | A | D5 |
| **U-06** | Production: a new Supabase project, or promote staging? | Data separation for the demo | T-25 | A new production project | A + B | D12 |
| **U-11** | Where are the SRS and SDD Word source files (`MUZ_SRS.docx`, `MUZ_SDD.docx`, named in SPMP Appendix B)? | T-26 edits the source documents | T-26 | Ask the document owner. If the files are lost, edit the PDFs as an addendum. | A | D9 |
| **U-12** | Who has edit access to the SPMP Issue Log and Risk Log Google Sheets (SPMP §9.1, §10.1)? | T-22 logs defects there | T-22, T-24 | D gets edit access from the sheet owner | A | D9 |
| **U-13** | Does guest/demo mode ("Continue as Guest") stay in the release, and is it used in the defence demo? | It is untracked and saves nothing | T-23, T-25 | Keep it. The end-to-end test confirms it saves nothing. | A | D12 |
| **U-16** | How will the team receive `docs/audit/` and `docs/execution/`? | Commit `91b5d16` on `course-handoff` added `docs/` to `.gitignore`, so these files are not versioned. The new test reports (`docs/test/*`), `docs/decisions/RULINGS.md` and `docs/ENVIRONMENTS.md` planned in the guides would also be ignored. | All; T-02, T-05, T-19…T-23 | Share the guides outside git, for example in the team drive. **Before T-02**, either narrow the ignore rule (for example `docs/audit/` and `docs/execution/` only), or choose another folder for decisions and test reports. | A | D1 |

## 4. Facts the plan assumed that the team should confirm

These were inferred, not verified:

1. **Jira hierarchy.** The subtask → task → epic structure was inferred from key order. Confirm it in the Jira UI.
2. **Missing Jira keys.** KAN-1…4 and KAN-15…227 are absent from the export. Were they deleted, or are they in another project?
3. **Effort figures.** All estimates are planning numbers, not measurements. D's are the least certain, because only 3 of D's commits exist to judge from.
4. **Branch protection.** Whether it is already enabled on `main` could not be checked, because the `gh` CLI is not installed.
5. **Old branches.** The audit found nothing on `Lag-in`, `dashboard` or `login-bins` that the release needs. Each author should confirm before A deletes them.
