# T-19 Performance and Hardware Report

| | |
|---|---|
| **Status** | **Scaffolded.** One production-build check is done (§1). Every hardware figure below is blank until it is measured. |
| **Owner** | A (lead); D records tables (optional, U-18); C runs the note trials |
| **Hard waits** | T-08 merged (needs C's T-07) for §6; hardware (U-10) for §3–§7 |
| **Due** | Tue 2026-11-24 (IC-3) |
| **Rule** | Write only measured numbers. A target with no measurement stays "not measured", never "pass". |

## 0. Build under test

| Item | Value |
|---|---|
| Commit (`git rev-parse --short HEAD`) | |
| Command | `npm run build` then `npm run preview` (http://localhost:4173), or the Vercel staging URL |
| `.env.local` / host env vars present | (required: without them the app white-screens — see §1) |
| Date | |

## 1. Production-build loader check (KAN-249, `bcff618`) — done 2026-11-19

Build of `main` @ `f2c79ed` served with `vite preview`; built-in browser (Chromium); guest mode; lesson "Hand Shape & Posture" with `?debug`.

| Check | Result | Evidence |
|---|---|---|
| App starts without env vars | **FAIL (known defect)** | Build without `.env.local` → blank page, console `Uncaught Error: supabaseUrl is required.` Fix belongs to C (T-05 env guard); Vercel must have `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` set. |
| App starts with env vars | Pass | Dashboard, lesson and `?debug` overlay render. |
| No model files before "Turn on camera" | Pass (page level) | Page resource timing before the click: only `assets/posture.worker-*.js` (20 kB). No `.wasm`, `.task` or `vision_bundle`. |
| Model loads after "Turn on camera" | Pass | Overlay `delegate` changed from "—" to **GPU**; console: `Graph successfully started running`. |
| No "ModuleFactory not set" error | Pass | Not present in the console. |
| `.wasm` / `.task` fetched **only after** the click | **Inferred, not captured** | Worker fetches are not visible in the page timeline or the tool's network log. Inferred from code (`INIT` is sent only by `PracticeRig.startCamera()`) and READY timing. **Confirm in DevTools → Network (worker requests shown) during the hardware session.** |
| Camera denied | Pass | "Camera: Access was blocked" diagnostic; no crash. |

## 2. Machines and devices

| # | Machine (CPU / GPU / RAM) | OS | Browser + version | Webcam (model, mode) | Microphone | Piano / keyboard |
|---|---|---|---|---|---|---|
| M1 | | | | | | |
| M2 | | | | | | |

## 3. Vision runtime (SRS 3.4a, 3.4c, 3.1.5.3)

How: open a posture exercise with `?debug`, turn the camera on, sit in playing position for **60 s**, then read the overlay (it keeps the last 120 results). Take a screenshot of the overlay.

| Machine / browser | Delegate | Worker Hz | Interval p50 / p95 (ms) | Inference p50 / p95 (ms) | HUD fps | HUD cost p95 (ms) | Screenshot |
|---|---|---|---|---|---|---|---|
| M1 Chrome | | | | | | | |
| M1 Edge | | | | | | | |
| M2 Chrome | | | | | | | |
| M2 Edge | | | | | | | |

Targets: worker 20–30 Hz (interval 33–50 ms; the 30 ms gate allows up to ~33 Hz, ruling M5); inference ≤ 35 ms (record CPU separately if it falls back); HUD 60 fps with cost p95 well under 16.7 ms.

### 3.1 Camera restart (T-09 acceptance)

Unplug and replug the webcam (or press Retry), hold a bad elbow angle, time how long before the red cue appears.

| Machine | Cue delay after restart (s) | Expected | Pass/fail |
|---|---|---|---|
| | | ≈ 0.6 s (`cueDelayMs`) | |

## 4. Chord accuracy (SRS 3.1.6.3–3.1.6.4)

20 strikes per chord, laptop mic then USB mic. "Pass" = drill locks in.

| Chord | Laptop mic pass / 20 | USB mic pass / 20 |
|---|---|---|
| C | | |
| F | | |
| G | | |
| Am | | |
| Dm | | |
| **Total (target ≥ 95 %)** | | |

Wrong-chord rejection: 20 strikes of a wrong chord (e.g. C when G is the target). Rejected: ___ / 20 (laptop), ___ / 20 (USB).

## 5. Single-note accuracy (SRS 3.1.6.2) — **needs T-08 merged (T-07)**

| Note | Correct, pass / 20 | Octave error (e.g. A3 for A4), rejected / 10 |
|---|---|---|
| C4 | | |
| A3 | | |
| G4 | | |

Repeat once with the chroma `NoteVerifier` (flag `useChromaNoteVerifier`, added in T-08) for the comparison ruling D4 asks for.

## 6. Latency (SRS 3.1.6.1: "within 50 ms of instrument excitation")

**Method not decided yet.** What exists: each attempt carries `onsetMs` and `decidedMs` (`AttemptResult`), so the *algorithmic* delay (onset → verdict, ≈ 200 ms by design for chords) can be logged. The SRS figure is about detection relative to the physical strike, which needs an external reference (for example a phone video of the key and screen, or a click track recorded together with the mic). A decides the method before the session; the result may need a ruling if it fails.

| Measure | Value | Method |
|---|---|---|
| Onset → verdict, chord | | |
| Onset → verdict, note | | |
| Strike → onset detected | | |

## 7. Tuning log (non-SPEC values only; `// SPEC` values in `src/audio/config.ts` never change)

| Parameter | Before | After | Reason | Tests re-run (`npx vitest run src/audio`) |
|---|---|---|---|---|
| | | | | |

## 8. Summary against the SRS

| Requirement | Target | Measured | Pass / fail / not measured | Defect ID |
|---|---|---|---|---|
| 3.4a inference rate | 20–30 Hz | | not measured | |
| 3.4a inference latency | ≤ 35 ms | | not measured | |
| 3.4c / 3.1.5.3 HUD | 60 fps | | not measured | |
| 3.4b / 3.1.6.1 audio latency | < 50 ms | | not measured | |
| 3.1.6.4 chord pass rate | ≥ 95 % (plan target) | | not measured | |
| 3.1.6.2 single note | ±35 cents, octave-exact | | not measured | |
| 3.4d initial bundle | ≤ 5 MB | 837 kB JS + 62 kB CSS (build of `f2c79ed`, 2026-11-19) | pass | — |
| 3.4d model asset | ≤ 10 MB (D3) | 5.78 MB | pass | — |
| KAN-249 production loader | loads, no ModuleFactory error | GPU delegate, graph running | pass (§1) | — |

Every fail goes into the defect log (`docs/test/DEFECT_LOG_AND_TRIAGE.md`) with a priority.
