# AI-3 Posture Rule Evaluation — Method

| | |
|---|---|
| **Owner** | A (vision) |
| **Tools** | `?debug` landmark export (PerfOverlay), `npm run eval:posture` |
| **Measures** | Precision and recall of the elbow rule, the wrist rule and the overall compliance verdict of `PostureAnalyzer`, against hand labels |
| **Model** | `pose_landmarker_lite` only (SRS 3.6.2). The log records which model produced it; the script rejects any other. |

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
   Leave about 2 s between conditions to change position. Do not label those gaps.
5. Press **Export landmarks** to download `muz-landmarks.json`. The log holds up to 10 minutes at 30 fps; after that the button says "(full)" and new frames are not recorded. Reload the page to start a new log.

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

rule      TP  FP  FN   TN  precision  recall    n  unevaluable
elbow     85   0   0  195      1.000   1.000  280            0
...
```

(Synthetic data shown; real recordings will not score 1.000.)

## 4. What the numbers mean

- **Positive = violation.** A `good` frame expects no violation on any rule. An `elbow` frame expects the elbow rule and the overall verdict to fire and the wrist rule not to fire; a `wrist` frame the reverse for elbow and wrist.
- **elbow / wrist**: the rule fires when either arm's elbow (or wrist) state is out of band. The state includes the app's recovery hysteresis and 300 ms occlusion grace, so it is what the user is shown.
- **overall**: the analyzer's `compliant` verdict (elbow + wrist gate it by default); `false` counts as a violation.
- **precision** = TP / (TP + FP): when the app says "wrong", how often it is right. Low precision means false alarms.
- **recall** = TP / (TP + FN): of the frames that were wrong, how many the app caught. Low recall means missed faults.
- **n** = scored frames. **unevaluable** = labelled frames where the rule could not measure either arm. These are left out of precision and recall, so always report them: a high share means the camera position or lighting needs fixing, not that the rule is good.
- Expect a few misses or false alarms right after each change of position (smoothing and hysteresis lag). Leaving the 2 s gaps unlabelled keeps that out of the numbers.
- "—" means the ratio is undefined (no predicted positives, or no labelled positives).

## 5. Privacy

The export holds numbers only: per frame, a time in ms since the first frame, whether a person was detected, and for 15 body landmarks the 3D position, the 2D image position and the visibility score. No video, images, user name or ID, email, wall-clock date or device details. The log exists only in the page's memory and only under `?debug`. It stays on the device unless the tester downloads the file and shares it. Delete shared files when the evaluation is finished.
