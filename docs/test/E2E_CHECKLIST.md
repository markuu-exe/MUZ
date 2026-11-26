# MUZ end-to-end checklist

> Status: DRAFT. Nothing below has been run yet. Fill in the header and the Actual, Result and Defect columns while testing. Do not fix bugs inside this task. Log each failure in the SPMP Issue Log (all 9 fields) and tell A.

## Header (fill in before testing)

| Item | Value |
|---|---|
| Environment and role (U-22) | ___ (for example: isolated staging E1 / `muz-staging`) |
| Commit tested | ___ |
| Migrations applied there (list file names, applied by) | ___ |
| Progression architecture deployed (U-23) | Current client save path, ruling U-30 option (c) and T-13 interim (2026-11-26), unless A says otherwise |
| Staging URL | ___ (no keys) |
| Browser and version | ___ |
| Tester and date | ___ |
| Test accounts used (emails only, never passwords) | ___ |

## Rules

- Use test accounts on the staging project only. Never test on `Muz-Database` (shared development with real users, ruling U-22).
- A † row depends on how progression is saved. Where the server-side operation was not delivered, write `n/a (U-30)`, never Pass.
- Result values: Pass, Fail, n/a (give the ruling ID), Blocked (say why).
- B pairs with you on E2E-01 to E2E-05 and E2E-22.
- Never paste keys, passwords or real users' data into this file.

## Steps

| ID | Flow | Precondition | Action | Expected | Actual | Result | Defect ID |
|---|---|---|---|---|---|---|---|
| E2E-01 | Email signup | Signed out. A real inbox you control. Test project only. | Open the app, choose Sign Up, enter username, email, password (6+ characters) and confirm password, then Create Account. | Account is created. Exactly one new row appears in `profiles` for this user (made by the signup trigger, not by the app). No error banner. |  |  |  |
| E2E-02 | Sign-in | Account from E2E-01, email confirmed. | Sign out, then sign in with the same email and password. | You land on the dashboard. Wrong password shows a readable error and no crash. |  |  |  |
| E2E-03 | Password recovery | Existing account. | Click Forgot, enter the email, open the email link, set a new password, sign in with it. | Email arrives. Old password no longer works. New password works. |  |  |  |
| E2E-04 | Google sign-in | Google provider enabled in the project (waits for A's authorization, T-10). | Choose Continue with Google and finish the Google screen. | You are signed in. One `profiles` row exists for this Google user. If the provider is not enabled, mark n/a and note why. |  |  |  |
| E2E-05 | Unverified email and resend | Account created but email link not clicked. | Try to sign in. Use the resend option. | Sign-in is refused with a clear message about verifying the email. Resend sends a new email. After clicking the link, sign-in works. |  |  |  |
| E2E-06 | Welcome screen and placement | New account that has never chosen a level. | Sign in. On the Welcome screen choose Novice, then repeat with new accounts for Proficient and Virtuoso. | Each choice opens the right starting unit (about unit 1 / 5 / 9, ruling D8). Welcome is shown once per account (U-25): a second sign-in goes straight to the dashboard. |  |  |  |
| E2E-07 | Locked node | Dashboard with at least one locked lesson. | Click a locked lesson. | The node shakes and a banner names the lesson that blocks it. Nothing opens. |  |  |  |
| E2E-08 | Theory lesson: wrong answer re-queued | Theory lesson available. | Answer one question wrong on purpose, then finish the lesson. | The wrong question comes back later in the same lesson. Completion needs every question answered correctly. |  |  |  |
| E2E-09 | Rhythm lesson | Rhythm lesson available, speakers or headphones on, device tap test done if offered. | Tap Space on the beat for most beats, early on some, and skip some. | Each tap shows Perfect, Good or Miss. Results show counts and a consistency score that is never above 100 %. |  |  |  |
| E2E-10 | Posture hold | Webcam allowed, seated at a piano or keyboard, side or front view. | Start a posture lesson. Hold good posture, then drop the wrist or lift the elbow. | Joints are green when elbow is 80 to 110 degrees and wrist is 140 to 180 degrees (ruling W2). They turn red with a cue text when outside those bands. |  |  |  |
| E2E-11 | Play a note | Microphone allowed, instrument available (or a tone source). | In a play-note drill, play the right note, then the same letter in the wrong octave. | Right note passes. Wrong octave is a miss. Other wrong notes are a miss. |  |  |  |
| E2E-12 | Play a chord | Chord drill available. | Play the target chord, then a different chord that shares two notes with it. | Target chord passes. The other chord does not. |  |  |  |
| E2E-13 | Wait-state: posture and sound | Practice drill with camera and mic on. | Play the correct sound while holding bad posture. Then play it again with good posture. | The first attempt does not succeed (blocked by posture). The second succeeds within the 400 ms latch window. |  |  |  |
| E2E-14 | Hearts: timeout | Practice lesson outside units 1 and 2 (warm-up units give no heart loss, ruling W1). Note hearts before. | Do nothing for 15 seconds. | One heart is lost and the drill restarts. |  |  |  |
| E2E-15 | Hearts: three misses | Same as E2E-14. | Play three wrong notes in a row. | One heart is lost after the third miss. |  |  |  |
| E2E-16 | Hearts: quit mid-drill | Same as E2E-14, after losing a heart. | Quit the drill, return to the dashboard, reload. | The lost heart stays lost. |  |  |  |
| E2E-17 | Hearts: regeneration | Hearts below 5. Do not edit local storage unless A approves (U-14). | Wait one full 15-minute cycle with the app open or closed. | One heart comes back after 15 minutes. |  |  |  |
| E2E-18 | Hearts: theory restores one | Hearts below 5. | Finish a theory lesson with 80 % or more. | One heart is restored at once. |  |  |  |
| E2E-19 | Zero hearts | Hearts at 0. | Open a practice lesson, then a theory lesson and a rhythm lesson. | Practice lessons are blocked. Theory and rhythm open. |  |  |  |
| E2E-20 | EXP and streak † | Lesson not yet mastered. Note EXP and streak. | Master the lesson. Then repeat it. Next day, complete another lesson. | EXP is awarded only the first time. Streak goes up on the next day (mark 'not testable in one day' if you cannot wait). Under the current client save path these are computed in the browser (ruling D14). |  |  |  |
| E2E-21 | Achievements † | New account. | Complete the first lesson. | The first-lesson achievement unlocks once and is not awarded again after a repeat. |  |  |  |
| E2E-22 | Analytics | Account with several completed sessions. | Open the Profile or Analytics page. | Charts show points that match what you did, not placeholder data. |  |  |  |
| E2E-23 | Offline save then sync † | Signed in as a learner (not demo, not a developer test account). DevTools open on Application > IndexedDB. | Set DevTools Network to Offline just before a lesson ends. Finish it. Then set Network back to No throttling. | Results screen says 'Saved offline. It will sync when you are back online.' One item is in `muz-sync`. After reconnecting, it syncs, the queue empties, and one new `performance_records` row appears. Record the accepted limits (ruling dated 2026-11-26): replay is not atomic and only `performance_records` is duplicate-protected. |  |  |  |
| E2E-24 | Demo / guest mode | Not signed in. | Choose Continue as Guest. Finish a lesson. Check the project tables. | The lesson works. Nothing is written to `profiles`, `user_progress` or `performance_records`. Nothing is queued. |  |  |  |
| E2E-25 | Trusted progression operation † | Only applies if the server-side operation shipped. | Check the Network tab after finishing a lesson. | n/a under ruling U-30 option (c): the server-side operation was not delivered. Browser writes are accepted risk D14. |  |  |  |
| E2E-26 | Duplicate submission † | Signed in, online. | Double-click the finish button, or finish the same run in two tabs. | Under the interim path only the performance record is protected by `run_id`: one `performance_records` row for the run. Record what happens to progress, hearts and streak as an observation, not as a pass. |  |  |  |
| E2E-27 | Queue replay of an applied item † | An item already synced once. | Restore a copy of the item into the queue (or repeat E2E-23 reload step), then go online. | No second `performance_records` row appears. EXP is not awarded again for an already completed lesson. Hearts and streak may follow the replayed run (accepted limit). |  |  |  |
| E2E-28 | Retry behaviour † | Item in the queue. | Go online but make the request fail (for example block the Supabase host in DevTools, or stay offline), watch the retries. | Retries wait longer each time (1, 2, 4 ... up to 30 s) and stop after 6 attempts, keeping the item. No crash. The interim queue has no 'permanent rejection' class (accepted limit). |  |  |  |
| E2E-29 | Atomicity † | Only applies if the server-side operation shipped. | Make a save fail halfway. | n/a under ruling U-30 option (c). Saves are three separate requests and are not atomic (accepted). |  |  |  |
| E2E-30 | Failure recovery † | A failed save. | Reload, sign out and back in, then retry. | You see the state stored on the server. A retry saves once. Compare against the accepted limits. |  |  |  |
| E2E-31 | Persistence after reload | A finished lesson. | Reload the page and open the dashboard and Profile. | Completion and the performance record are still there. |  |  |  |
| E2E-32 | Camera or mic blocked | Browser permission set to Block for camera, then for microphone. | Open a posture lesson, then a sound lesson. | A readable message explains how to allow access. Practice modes are disabled. The app does not crash (SRS 3.3.1). |  |  |  |
| E2E-33 | Missing configuration | A local copy with VITE_SUPABASE_URL removed from `.env`. Restart the dev server. | Open the app. | A readable 'MUZ configuration error' message shows, not a blank page (DEF-004). |  |  |  |
| E2E-34 | Deep link | Deployed staging URL. | Open `<staging-url>/some/deep/path` and refresh. | The app loads. No 404. |  |  |  |
| E2E-35 | Small screen | Desktop browser. | Narrow the window below 1024 px wide. | An alert asks you to widen the window (SRS 3.2.2). |  |  |  |
| E2E-36 | No media leaves the device | DevTools Network open during a posture and a sound lesson. | Run both lessons for about a minute. | No request carries video frames or audio. Only normal Supabase requests appear (SRS 3.5.1). |  |  |  |

† = depends on the progression architecture (guide, T-23).

## Known accepted limitations to keep in mind (rulings dated 2026-11-26)

1. Offline replay is not atomic and can half-apply if the connection drops mid-save.
2. Only `performance_records` is protected against duplicates (`run_id`); progress and profile are recalculated from fresh reads on replay.
3. The queue stores client-supplied lesson facts (`passMark`, `expReward`).
4. Developer test runs are never queued.
5. Learners can change their own progression through the API (ruling D14). This is documented, not a defect found by this checklist.

## Summary (fill in at the end)

| Total steps | Pass | Fail | n/a | Blocked |
|---|---|---|---|---|
|  |  |  |  |  |

Acceptance: every step is executed or marked n/a with a ruling ID, every Fail has a defect ID, and the header is complete.
