# Offline Audio Evaluation Method (AI-2)

| | |
|---|---|
| **Status** | Harness built and tested on synthetic clips. **No real recordings measured yet.** |
| **Owner** | A (audio). C records the note trials, D may record the tables (see T-19). |
| **Tool** | `npm run eval:audio -- <labels.csv> [--json out.json]` (`scripts/eval/audio-eval.ts`) |
| **Feeds** | `docs/test/PERFORMANCE_REPORT.md` §4 (chords), §5 (notes), §6 (onset → verdict) |
| **Rule** | Dev-only. Nothing is added to the app bundle, and recordings never go into git. |

## 1. What it does

The harness replays labelled WAV clips through the same code the live drill runs, with no changes:

```
WAV → readWav → down-mix (same rule as chroma.worklet.ts) → ChromaFrameProcessor (128-sample quanta)
    → note target:  PitchVerifier (live default, SRS 3.1.6.2)  +  chroma NoteVerifier (comparison mode)
    → chord target: ChordVerifier
```

It reports every attempt in each clip, not just the first. For each verifier it prints a confusion table with n, latency percentiles, and a per-clip list showing what each verifier heard.

The live drill puts a `WaitStateMachine` around the verifier. The harness does not: there is no posture latch, no hearts and no 15 s timeout, so every strike in a clip is judged. All acoustic thresholds, `// SPEC` values included, are the live defaults from `src/audio/config.ts`.

Because it is offline, the same recordings can be re-run after any tuning change. Use that to fill the before/after rows of PERFORMANCE_REPORT §7.

## 2. Recording requirements

| Item | Requirement |
|---|---|
| Format | WAV (RIFF). PCM 16-bit or 24-bit, or 32-bit float. Mono or stereo (stereo is averaged exactly as the worklet does it). |
| Sample rate | 44.1 kHz or 48 kHz. Other rates run, but they trigger a warning because the pipeline is tuned at those two. |
| Microphones | Record every set twice: once with the **laptop's built-in mic** and once with a **USB mic**. Keep the two sets in separate folders. |
| Distance | Laptop where the learner would put it: on the music stand or a table, about 0.5–1 m from the keys. USB mic at 0.5–1 m, pointed at the middle of the keyboard. Note the distance in `notes`. |
| Gain | Loud strikes should peak around −12 to −6 dBFS. The harness warns about samples at full scale (clipping). Turn off automatic gain if the recorder allows it. |
| Room noise | Normal room. Fridge or traffic hum is fine, but no TV or music. Before the first strike, record ~1 s of room tone; the detector needs ~0.2 s to warm up, so a strike in the first 0.2 s is missed. |
| Strikes per clip | Either one strike per clip, or several strikes spaced **≥ 1.5 s** apart. **A clip with more than one strike must have its `strikes` count** in the labels (the harness warns if it is missing), otherwise missed strikes are not counted. Leave **≥ 1 s** after the last strike: a verdict comes 200–350 ms after the onset, and an attempt still open at the end of the file is reported as "no attempt". |
| Clip length | Keep clips **under 15 s**, the drill's timeout (SRS 3.1.2.4). Longer clips are still judged in full but flagged. |
| Instrument | Digital or acoustic piano, normal velocity. Sustain pedal is allowed, but say so in `notes`. |

Any recorder that saves WAV will do: Audacity, Windows Voice Recorder exported to WAV, or a phone app with WAV output. **Do not use MP3 or M4A.**

## 3. What to record (the T-19 set)

Record each block once per microphone.

| Block | Target | Played | Expected | Count |
|---|---|---|---|---|
| Correct chords | `chord:C`, `chord:F`, `chord:G`, `chord:Am`, `chord:Dm` | that chord, any inversion | `correct` | 20 strikes each |
| Wrong chords | e.g. `chord:G` | a different chord, e.g. C (include some that share two tones: F for Am, Am for C) | `wrong` | 20 strikes |
| Correct notes | `note:C4`, `note:A3`, `note:G4` | that exact note | `correct` | 20 strikes each |
| Octave errors | e.g. `note:A4` | the same letter in another octave, e.g. A3 (C5 for C4, G3 for G4…) | `wrong` | 10 strikes |

Octave errors are the case where the two note verifiers should differ. PitchVerifier must reject them. The chroma NoteVerifier is expected to accept them, because it only knows the pitch class, and its FALSE ACCEPT row will show that. This is the comparison PERFORMANCE_REPORT §5 and ruling D4 ask for.

## 4. File naming and layout

Put everything under `eval-data/audio/` at the repo root. That folder is git-ignored.

```
eval-data/audio/
  labels.csv
  laptop/chords/c_01.wav … c_20.wav        (or one c_x20.wav with 20 strikes)
  laptop/chords/wrong_c_for_g_01.wav …
  laptop/notes/c4_01.wav …
  laptop/notes/octave_a3_for_a4_01.wav …
  usb/…                                    same structure
```

Name files `<what was played>[_for_<target>]_<take>.wav`, in lower case with no spaces. Example: `octave_a3_for_a4_03.wav`.

## 5. Labels CSV

```
file,target,expected,notes,strikes
laptop/chords/c_01.wav,chord:C,correct,laptop mic 0.7 m,
laptop/chords/c_x20.wav,chord:C,correct,"20 strikes, 1.5 s apart",20
laptop/chords/wrong_c_for_g_01.wav,chord:G,wrong,played C,
laptop/notes/octave_a3_for_a4_01.wav,note:A4,wrong,octave error,
usb/notes/c4_01.wav,note:60,correct,USB mic 0.5 m,
```

| Column | Required | Meaning |
|---|---|---|
| `file` | yes | Path relative to the CSV. |
| `target` | yes | `note:<MIDI or name>` (`note:60`, `note:C4`, `note:F#3`, `note:Bb3`; piano range 21–108) or `chord:<symbol>` (anything the lesson chord parser accepts: `C`, `Am`, `G_Maj`, `F#7`…). |
| `expected` | yes | `correct` if the target was played, `wrong` if something else was. |
| `notes` | no | Free text: mic, distance, pedal, anything odd. |
| `strikes` | no | Number of strikes in the clip. When it is set, strikes the detector never heard count as "no attempt", and attempts beyond it are reported as extra (re-triggers). When it is left blank, the clip counts as **one** unit (a clip with no judged attempt is one "no attempt"), so blank is only correct for single-strike clips; the harness warns when a blank-`strikes` clip has several onsets, several judged attempts or an attempt still open at the end. |

Columns may come in any order. Fields with commas go in `"double quotes"`. Blank lines and lines starting with `#` are ignored. Every bad row is reported as `labels.csv:<line>: <reason>`, and nothing runs until the CSV and every WAV it lists are valid.

## 6. How to run

```
npm run eval:audio -- eval-data/audio/labels.csv
npm run eval:audio -- eval-data/audio/labels.csv --json eval-data/audio/results.json
```

Progress goes to stderr and the report to stdout. Exit codes: `0` done; `1` malformed input (named error with CSV line: bad label, file not found, not a WAV, unsupported format) or a runtime failure (a clip that cannot be evaluated, a `--json` file that cannot be written); `2` bad command line (prints the usage line). The `--json` file holds the summaries and every attempt of every clip. Write it inside `eval-data/` so it is git-ignored as well.

On the dev laptop, analysis took about 0.4 s per second of audio, plus ~5 s of startup. At that rate, 400 clips of 2.5 s each take about 7 minutes.

## 7. Reading the report

Results are counted **per attempt**: an onset that the verifier judged as `match` (accepted) or `miss` (rejected). `unvoiced` attempts, such as a knock or a cough, are ignored, as they are in the drill.

```
== chord — ChordVerifier: chroma chord match (live chord drills)
  correct played  n=100   true accept    97  97.0 %  |  false reject    3   3.0 %  |  no attempt    0   0.0 %
  wrong played    n=20    true reject    20 100.0 %  |  FALSE ACCEPT    0   0.0 %  |  no attempt    0   0.0 %
  latency onset→verdict, 97 true accepts: p50 203 ms, p95 214 ms, max 341 ms
```
(The numbers above only show the layout. They are not measurements.)

| Row / cell | Meaning | Matters because |
|---|---|---|
| **true accept** | Correct playing was passed. | T-19 target: ≥ 95 % for chords (PERFORMANCE_REPORT §4). |
| **false reject** | Correct playing was called wrong. | Costs the learner a miss, and three in a row cost a heart. This is the frustrating error. |
| **FALSE ACCEPT** | Wrong playing was passed. | The drill teaches the wrong thing. For PitchVerifier it should be ~0 on octave errors. For the chroma NoteVerifier, octave errors *will* show here, by design. |
| **true reject** | Wrong playing was caught. | Report the rate (T-19 "wrong-chord rejection"). |
| **no attempt** | (With `strikes` set.) A strike gave no judged attempt: missed onset, too quiet, only `unvoiced`, still open at the end of the clip, or replaced by a new strike more than 150 ms after it while its window was still open (the verifiers drop the older attempt, as in the drill). | Not a miss: in the drill nothing happens and the 15 s timer keeps running. A high rate points to gain or onset problems, not to the matcher. |
| **n** | Attempts plus no-attempts in that row. | Always quote rates with n. 19/20 and 95/100 are not the same evidence. |
| **latency** | `decidedMs − onsetMs` over **true accepts** (accepted attempts on `correct` clips), using nearest-rank p50 / p95 / max. With fewer than 20 accepts, p95 equals the maximum, so do not over-read it. Misses are decided later (~350 ms) and are not included. | This is the *algorithmic* delay. It is ≥ 200 ms by design (the SPEC sustain window, SRS 3.1.6.4) and steps in hops of ~10.7 ms at 48 kHz (11.6 ms at 44.1 kHz). It does **not** include mic, OS or browser input latency, so it is not the SRS 3.1.6.1 "within 50 ms of excitation" figure (see PERFORMANCE_REPORT §6). To get strike → onset, compare a clip's `@onset` time with the strike in the waveform (Audacity). |

The per-clip list shows each attempt as `kind @onset +latency heard X`. For PitchVerifier, X is a note with its octave (`A3`), for the chroma verifier a pitch class (`A`), and for chords the chord label (`F`). Use the list to find bad takes and mislabelled rows before you trust the totals.

## 8. Privacy

- Recordings stay on the tester's machine. `eval-data/` is listed in `.gitignore`. **Never commit audio**, and never attach it to a PR, Jira or chat. Share the printed tables or the `--json` summary instead.
- The harness reads local files only. It makes no network requests and uploads nothing.
- Record only the piano. If someone speaks during a take, delete that take.
- When T-19 is reported, delete the recordings unless the team agrees to keep a set for regression runs. A kept set also stays local.

## 9. Optional: Basic Pitch as an offline second opinion

[Basic Pitch](https://github.com/spotify/basic-pitch) (Spotify, Python) is a note-transcription model. It can sanity-check labels: did that "C4" take really contain a C4, and nothing else? This step is **optional and manual**, and it is kept entirely outside the project:

```
# in a separate Python environment, not in this repo
pip install basic-pitch
basic-pitch <output-folder-outside-the-repo> eval-data/audio/laptop/notes/c4_01.wav
```

Open the MIDI or CSV it writes and check the pitches against your labels.

- Its output is **model output, not ground truth**. It can miss notes, add octave ghosts and split chords. Where it disagrees with a label, listen to the take and decide by ear.
- Nothing from it is added to the app, to `package.json` or to the harness. It never feeds the pass/fail numbers.
- The same privacy rules apply: keep its output outside git and delete it with the recordings.

## 10. What has been verified

- Unit tests (`src/audio/eval/__tests__/`) cover WAV parsing, the down-mix (compared against the real `chroma.worklet.ts` code), label validation, the summariser, and synthetic piano clips. Those clips are written to in-memory WAVs, parsed back and evaluated, and they give the same verdicts as `scenarios.test.ts` / `pitch.test.ts`: A4 for A4 accepted; A3 for A4 rejected by PitchVerifier but accepted by the chroma NoteVerifier; C major for C accepted; silence gives no attempt.
- An end-to-end CLI run was done on synthetic WAVs only.
- **Not verified:** any real recording, any real microphone, any real room. Every rate in PERFORMANCE_REPORT §4–§6 stays "not measured" until the T-19 recordings are run through this harness.
