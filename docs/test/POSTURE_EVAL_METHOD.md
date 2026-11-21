# AI-3 Posture Rule Evaluation — Method

| | |
|---|---|
| **Owner** | A (vision) |
| **Tools** | `?debug` landmark export (PerfOverlay), `npm run eval:posture` |
| **Measures** | Precision and recall of the elbow rule, the wrist rule and the overall compliance verdict of `PostureAnalyzer`, against hand labels |
| **Model** | `pose_landmarker_lite` only (SRS 3.6.2). The log is tagged with the model file the app asks the worker to load (`pose_landmarker_lite`, taken from `POSE_MODEL_PATH`); files with another tag are rejected. The tag is not read back from the worker. |

## 1. Record

1. Open the app with `?debug` added to the URL (e.g. `http://localhost:5173/?debug`), then a lesson with a posture exercise (e.g. "Hand Shape & Posture"). The performance overlay appears on the camera panel with an **Export landmarks (numbers only)** button and a frame count.
2. Camera set-up:
   - **Side view** of the playing arm, roughly 45–90° from the front, so the shoulder, elbow, wrist and index knuckle of the near arm are in view. Both hips and shoulders should stay in frame.
   - Camera at about keyboard-to-chest height, 1–1.5 m away, level (the analyzer assumes "up" is the image's up).
   - Even light from the front or side. No bright window behind the player. Short sleeves or fitted sleeves help.
3. Turn the camera on. Logging starts with the first analysed frame (t = 0), which is when the overlay's `samples` counter starts to rise. Start a stopwatch at that moment.
4. Play or hold the position for each condition, following a timed script, e.g. 20 s for each:
   - **good**: elbow 80–110°, wrist straight in line with the forearm (SRS 3.1.5.4).
   - **elbow**: the elbow clearly outside the band (arm too closed or too open, e.g. sitting too close or too far).
   - **wrist**: the wrist clearly bent (dropped below or raised above the forearm line).

   **Keep the other joint in band while holding a fault** (wrist straight during `elbow`, elbow 80–110° during `wrist`). The other joint is not scored on fault spans, but a stray second fault still muddies the overall verdict.
   Leave about 2 s between conditions to change position. Do not label those gaps.
5. Press **Export landmarks** to download `muz-landmarks.json`. Do it before the lesson's last exercise ends:
   - The log lives with the lesson. There is one camera rig per lesson; it stays alive across that lesson's exercises and retries, and is discarded (log included) when the exercises end or you leave the lesson. The next lesson starts a fresh log at t = 0.
   - The log holds up to 10 minutes at 30 fps; after that the button says "(full)" and new frames are not recorded.
   - For a long log, stop the camera first if you can: building a full file (~16 MB of JSON) can freeze the page for a moment while inference keeps running. The practice view has no camera-off button; covering the lens does not stop the log, and switching browser tabs pauses the camera but also hides the button. If you cannot stop it, export straight after the last condition; any extra frames simply stay unlabelled.

## 2. Label

Write a CSV with one row per span, times in milliseconds from t = 0:

```csv
startMs,endMs,label
0,19000,good
21000,40000,elbow
42000,61000,wrist
```

- `label` is `good`, `elbow`, `wrist` or `unknown` (use `unknown` where you are not sure what the posture was).
- `startMs` is inclusive and `endMs` exclusive. Spans must not overlap. A header row, blank lines and `#` comments are allowed.
- Frames outside every span are counted as "no label" and not scored.

## 3. Run

```sh
npm run eval:posture -- muz-landmarks.json labels.csv
```

The script replays every frame through a fresh `PostureAnalyzer` with the app's default config (the same thresholds, smoothing and gating as the practice view) and prints:

```text
frames: 334  labelled: 298 (good 110, elbow 85, wrist 85, unknown 18)
no label: 36 (10.8%)
unevaluable (compliant=null): 9 (2.7% of all frames)

rule      TP  FP  FN   TN  precision  recall  strict recall    n  unev+  unev−
elbow     79   0   0  110      1.000   1.000          0.929  189      6      0
wrist     85   0   0  110      1.000   1.000          1.000  195      0      0
overall  164   0   0  110      1.000   1.000          0.965  274      6      0
```

(Synthetic data shown; real recordings will not score 1.000.) The script also prints a `warning:` on stderr when a label span ends more than 1 s after the last frame, or when more than half the frames have no label (often labels written in seconds instead of milliseconds).

## 4. What the numbers mean

- **Positive = violation.** A `good` frame expects no violation on any rule. An `elbow` frame expects the elbow rule and the overall verdict to fire; a `wrist` frame expects the wrist rule and the overall verdict to fire. On a fault span the other joint's rule is **not scored**: negatives for a rule come only from `good` spans.
- **elbow / wrist**: the rule fires when either arm's elbow (or wrist) state is out of band. This is the state that colours the HUD skeleton and sets `compliant`. It reacts at once, with the app's recovery hysteresis and 300 ms occlusion grace. The corrective cue text appears only after a violation has lasted 600 ms (`cueDelayMs`) and is not what is scored.
- **overall**: the analyzer's `compliant` verdict (elbow + wrist gate it by default); `false` counts as a violation.
- **precision** = TP / (TP + FP): when the app says "wrong", how often it is right. Low precision means false alarms.
- **recall** = TP / (TP + FN): of the frames that were wrong, how many the app caught. Low recall means missed faults.
- **n** = scored frames. **unev+** = frames where the rule should fire but could not measure either arm; **unev−** = the same where it should stay quiet. Both are left out of precision and recall.
- **strict recall** = TP / (TP + FN + unev+): a fault the app could not see counts as missed. Report it next to recall. A large gap between the two means the camera position or lighting needs fixing, not that the rule is good.
- Frames at 30 fps are strongly correlated: 20 s of one held position is 600 frames but one observation. Report the table per session and per person, not only one pooled `n`, and do not read small differences as significant.
- Expect a few misses or false alarms right after each change of position (smoothing and hysteresis lag). Leaving the 2 s gaps unlabelled keeps that out of the numbers.
- "—" means the ratio is undefined (no predicted positives, or no labelled positives).

## 5. Privacy

The export holds numbers only: per frame, a time in ms since the first frame, whether a person was detected, and for 15 body landmarks the 3D position, the 2D image position and the visibility score. The landmarks are the nose (0), both ears (7, 8), shoulders (11, 12), elbows (13, 14), wrists (15, 16), pinky and index knuckles (17–20) and hips (23, 24). The nose and ears are included because the analyzer reads them for its advisory head and trunk readings; logging exactly what the analyzer reads lets the replay reproduce the whole snapshot.

There is no video, image, user name or ID, email, wall-clock date or device detail in the file. Even so, **handle the file as personal data**: body proportions and movement over time are soft-biometric and could help recognise a person. The log exists only in the page's memory, only under `?debug`, and only for the current lesson. It stays on the device unless the tester downloads the file and shares it. Share it only with the evaluation team, and delete copies when the evaluation is finished.
