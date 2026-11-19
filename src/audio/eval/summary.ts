/**
 * AI-2 (dev-only): confusion counts, rates, latency percentiles and the text
 * report for `npm run eval:audio`.
 *
 * Counting is per attempt, because one clip may hold several strikes:
 *   - each `match` is an accept, each `miss` a reject;
 *   - `unvoiced` attempts (knock, cough) are ignored, as in the drill;
 *   - "no attempt": with `strikes` given, strikes − judged attempts (≥ 0);
 *     without it, 1 when the clip produced no judged attempt at all;
 *   - judged attempts beyond `strikes` are counted (as what they were) and
 *     reported as `extra` (re-triggers, echoes).
 */
import type { EvalAttempt, VerifierId, VerifierRun } from './evaluateClip';
import type { Expected } from './labels';

export interface Counts {
  accepted: number;
  rejected: number;
  noAttempt: number;
  n: number;
}

export interface ClipAttempts {
  expected: Expected;
  strikes: number | null;
  attempts: readonly EvalAttempt[];
}

export interface LatencyStats {
  /** Accepted attempts measured. */
  n: number;
  p50: number;
  p95: number;
  max: number;
}

export interface VerifierSummary {
  verifier: VerifierId;
  correct: Counts;
  wrong: Counts;
  /** Onset → verdict (ms) over every accepted attempt, correct or wrong clip. Null when none. */
  latency: LatencyStats | null;
  extraAttempts: number;
}

/** One labelled clip with its results, as the CLI prints and writes to --json. */
export interface ClipReport {
  line: number;
  file: string;
  target: string;
  expected: Expected;
  strikes: number | null;
  notes: string;
  sampleRate: number;
  channels: number;
  durationMs: number;
  onsetsMs: number[];
  warnings: string[];
  runs: VerifierRun[];
}

export function countClip(attempts: readonly EvalAttempt[], strikes: number | null): Omit<Counts, 'n'> & { extra: number } {
  let accepted = 0;
  let rejected = 0;
  for (const a of attempts) {
    if (a.kind === 'match') accepted++;
    else if (a.kind === 'miss') rejected++;
  }
  const judged = accepted + rejected;
  if (strikes === null) return { accepted, rejected, noAttempt: judged === 0 ? 1 : 0, extra: 0 };
  return { accepted, rejected, noAttempt: Math.max(0, strikes - judged), extra: Math.max(0, judged - strikes) };
}

/** Nearest-rank percentile (p in (0, 100]); NaN for an empty list. */
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil((p / 100) * sorted.length));
  return sorted[Math.min(rank, sorted.length) - 1];
}

export function summarise(verifier: VerifierId, clips: readonly ClipAttempts[]): VerifierSummary {
  const empty = (): Counts => ({ accepted: 0, rejected: 0, noAttempt: 0, n: 0 });
  const correct = empty();
  const wrong = empty();
  const latencies: number[] = [];
  let extraAttempts = 0;
  for (const clip of clips) {
    const c = countClip(clip.attempts, clip.strikes);
    const into = clip.expected === 'correct' ? correct : wrong;
    into.accepted += c.accepted;
    into.rejected += c.rejected;
    into.noAttempt += c.noAttempt;
    into.n += c.accepted + c.rejected + c.noAttempt;
    extraAttempts += c.extra;
    for (const a of clip.attempts) if (a.kind === 'match') latencies.push(a.latencyMs);
  }
  const latency =
    latencies.length === 0
      ? null
      : { n: latencies.length, p50: percentile(latencies, 50), p95: percentile(latencies, 95), max: percentile(latencies, 100) };
  return { verifier, correct, wrong, latency, extraAttempts };
}

const TITLES: Record<VerifierId, string> = {
  pitch: 'PitchVerifier: pitchy f0 ±35 cents, octave checked (live default for notes)',
  'chroma-note': 'NoteVerifier: chroma pitch class, any octave (comparison mode)',
  chord: 'ChordVerifier: chroma chord match (live chord drills)',
};
const ORDER: VerifierId[] = ['pitch', 'chroma-note', 'chord'];

const ms = (x: number) => `${Math.round(x)} ms`;

function cell(label: string, count: number, n: number): string {
  const rate = n === 0 ? '–' : `${((count / n) * 100).toFixed(1)} %`;
  return `${label} ${String(count).padStart(4)} ${rate.padStart(7)}`;
}

export function formatSummary(s: VerifierSummary): string[] {
  const { correct: c, wrong: w } = s;
  const lines = [
    `== ${s.verifier} — ${TITLES[s.verifier]}`,
    `  correct played  n=${String(c.n).padEnd(4)}  ${cell('true accept ', c.accepted, c.n)}  |  ${cell('false reject', c.rejected, c.n)}  |  ${cell('no attempt', c.noAttempt, c.n)}`,
    `  wrong played    n=${String(w.n).padEnd(4)}  ${cell('true reject ', w.rejected, w.n)}  |  ${cell('FALSE ACCEPT', w.accepted, w.n)}  |  ${cell('no attempt', w.noAttempt, w.n)}`,
  ];
  if (s.latency) {
    const l = s.latency;
    const what = l.n === 1 ? 'accepted attempt' : 'accepted attempts';
    lines.push(`  latency onset→verdict, ${l.n} ${what}: p50 ${ms(l.p50)}, p95 ${ms(l.p95)}, max ${ms(l.max)}`);
  } else {
    lines.push('  latency onset→verdict: no accepted attempts');
  }
  if (s.extraAttempts > 0) lines.push(`  note: ${s.extraAttempts} attempt(s) beyond the labelled strikes (re-triggers?)`);
  return lines;
}

function formatAttempt(a: EvalAttempt): string {
  const heard = a.lastHeard ? `heard ${a.lastHeard}` : 'heard nothing';
  return `${a.kind.padEnd(8)} @${ms(a.onsetMs)}  +${ms(a.latencyMs)}  ${heard}`;
}

export function formatReport(clips: readonly ClipReport[]): string {
  const out: string[] = [];
  const nClips = clips.length;
  out.push(`MUZ offline audio evaluation — ${nClips} clip${nClips === 1 ? '' : 's'}`);
  out.push('Counts are per attempt (a clip may hold several strikes). Rates are of n for that row.');
  out.push('');
  for (const id of ORDER) {
    const relevant = clips.flatMap((c) => {
      const run = c.runs.find((r) => r.verifier === id);
      return run ? [{ expected: c.expected, strikes: c.strikes, attempts: run.attempts }] : [];
    });
    if (relevant.length === 0) continue;
    out.push(...formatSummary(summarise(id, relevant)), '');
  }

  out.push('Per clip');
  for (const c of clips) {
    const strikes = c.strikes === null ? '' : `, ${c.strikes} strikes`;
    out.push(`  line ${c.line}  ${c.file}  ${c.target}  expected ${c.expected}${strikes}  (${(c.sampleRate / 1000).toFixed(1)} kHz, ${c.channels} ch, ${(c.durationMs / 1000).toFixed(1)} s, ${c.onsetsMs.length} onset${c.onsetsMs.length === 1 ? '' : 's'})`);
    if (c.notes) out.push(`      notes: ${c.notes}`);
    for (const r of c.runs) {
      if (r.attempts.length === 0) out.push(`      ${r.verifier.padEnd(12)} no attempt`);
      r.attempts.forEach((a, i) => out.push(`      ${(i === 0 ? r.verifier : '').padEnd(12)} ${formatAttempt(a)}`));
      if (r.openAtEnd) out.push(`      ${''.padEnd(12)} (an attempt was still open when the clip ended)`);
    }
    for (const w of c.warnings) out.push(`      warning: ${w}`);
  }
  return out.join('\n');
}
