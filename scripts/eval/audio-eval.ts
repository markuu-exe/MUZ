/**
 * AI-2: offline audio evaluation harness (dev-only; nothing here ships).
 *
 *   npm run eval:audio -- eval-data/audio/labels.csv [--json out.json]
 *
 * Replays each labelled WAV through the UNCHANGED ChromaFrameProcessor and the
 * live verifiers (PitchVerifier + chroma NoteVerifier for note targets,
 * ChordVerifier for chord targets) and prints, per verifier, a confusion table
 * with n, latency percentiles and a per-clip list. Method: docs/test/AUDIO_EVAL_METHOD.md.
 *
 * Exit codes: 0 done, 1 malformed input (labels, missing or unreadable WAV),
 * 2 bad command line.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { evaluateClip } from '../../src/audio/eval/evaluateClip';
import { LabelsError, parseLabels, type LabelRow } from '../../src/audio/eval/labels';
import { formatReport, strikesWarning, summarise, type ClipReport } from '../../src/audio/eval/summary';
import { downmix, readWav, type WavAudio } from './wav';

const USAGE = 'usage: npm run eval:audio -- <labels.csv> [--json out.json]';
/** SPEC drill timeout (SRS 3.1.2.4); clips longer than this are judged in full but flagged. */
const DRILL_TIMEOUT_MS = 15_000;
const VALIDATED_RATES = [44100, 48000];

function usage(msg?: string): never {
  if (msg) console.error(`audio-eval: ${msg}`);
  console.error(USAGE);
  process.exit(2);
}

function fail(lines: string[]): never {
  for (const l of lines) console.error(`audio-eval: ${l}`);
  process.exit(1);
}

function parseArgs(argv: string[]): { csv: string; json: string | null } {
  let csv: string | null = null;
  let json: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') {
      console.log(USAGE);
      process.exit(0);
    } else if (a === '--json') {
      const out = argv[++i];
      if (!out || out.startsWith('--')) usage('--json needs an output file');
      json = out;
    } else if (a.startsWith('-')) {
      usage(`unknown option ${a}`);
    } else if (csv === null) {
      csv = a;
    } else {
      usage(`unexpected argument ${a}`);
    }
  }
  if (csv === null) usage('missing <labels.csv>');
  return { csv, json };
}

function loadClip(row: LabelRow, baseDir: string): WavAudio {
  const file = path.resolve(baseDir, row.file);
  return readWav(new Uint8Array(fs.readFileSync(file)));
}

function main(): void {
  const { csv, json } = parseArgs(process.argv.slice(2));
  const csvName = path.basename(csv);
  let text: string;
  try {
    text = fs.readFileSync(csv, 'utf8');
  } catch (e) {
    fail([`cannot read labels file ${csv}: ${(e as NodeJS.ErrnoException).code ?? (e as Error).message}`]);
  }

  let rows: LabelRow[];
  try {
    rows = parseLabels(text, csvName);
  } catch (e) {
    if (e instanceof LabelsError) fail(e.errors);
    throw e;
  }

  // Pass 1: every listed file must exist and parse, before any slow analysis.
  const baseDir = path.dirname(path.resolve(csv));
  const problems: string[] = [];
  for (const row of rows) {
    try {
      loadClip(row, baseDir);
    } catch (e) {
      const err = e as NodeJS.ErrnoException;
      const why = err.code === 'ENOENT' ? 'file not found' : err.code ? `cannot read file (${err.code})` : err.message;
      problems.push(`${csvName}:${row.line}: ${row.file}: ${why}`);
    }
  }
  if (problems.length > 0) fail(problems);

  // Pass 2: replay.
  const reports: ClipReport[] = [];
  rows.forEach((row, i) => {
    process.stderr.write(`[${i + 1}/${rows.length}] ${row.file}\n`);
    let wav: ReturnType<typeof loadClip>;
    let ev: ReturnType<typeof evaluateClip>;
    try {
      wav = loadClip(row, baseDir);
      ev = evaluateClip(downmix(wav.channels), wav.sampleRate, row.target);
    } catch (err) {
      fail([`${csvName}:${row.line}: ${row.file}: evaluation failed: ${err instanceof Error ? err.message : String(err)}`]);
    }

    const warnings: string[] = [];
    if (!VALIDATED_RATES.includes(wav.sampleRate)) {
      warnings.push(`${wav.sampleRate} Hz: the pipeline is tuned at 44.1 and 48 kHz; re-record or resample`);
    }
    if (ev.durationMs > DRILL_TIMEOUT_MS) {
      warnings.push(`clip is ${(ev.durationMs / 1000).toFixed(1)} s; a live drill times out after 15 s (every strike is still judged here)`);
    }
    let clipped = 0;
    for (const ch of wav.channels) for (let k = 0; k < ch.length; k++) if (Math.abs(ch[k]) >= 0.999) clipped++;
    if (clipped > 0) warnings.push(`${clipped} sample(s) at full scale: the recording may be clipped; lower the input gain`);
    if (ev.onsetsMs.length === 0) warnings.push('no onset detected: silent, too quiet, or the strike is in the first ~0.2 s');
    for (const run of ev.runs) {
      const judged = run.attempts.filter((a) => a.kind !== 'unvoiced').length;
      const w = strikesWarning(row.strikes, ev.onsetsMs.length, judged, run.openAtEnd);
      if (w) {
        warnings.push(w);
        break;
      }
    }

    reports.push({
      line: row.line,
      file: row.file,
      target: row.targetText,
      expected: row.expected,
      strikes: row.strikes,
      notes: row.notes,
      sampleRate: wav.sampleRate,
      channels: wav.channels.length,
      durationMs: ev.durationMs,
      onsetsMs: ev.onsetsMs,
      warnings,
      runs: ev.runs,
    });
  });

  console.log(formatReport(reports));

  if (json) {
    const ids = ['pitch', 'chroma-note', 'chord'] as const;
    const summaries = ids.flatMap((id) => {
      const clips = reports.flatMap((r) => {
        const run = r.runs.find((x) => x.verifier === id);
        return run ? [{ expected: r.expected, strikes: r.strikes, attempts: run.attempts }] : [];
      });
      return clips.length > 0 ? [summarise(id, clips)] : [];
    });
    try {
      fs.writeFileSync(json, JSON.stringify({ labels: csvName, generatedAt: new Date().toISOString(), summaries, clips: reports }, null, 2) + '\n');
    } catch (err) {
      fail([`cannot write ${json}: ${err instanceof Error ? err.message : String(err)}`]);
    }
    console.error(`audio-eval: wrote ${json}`);
  }
}

main();
