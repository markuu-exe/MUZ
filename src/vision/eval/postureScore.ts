/**
 * AI-3: scores PostureAnalyzer against hand labels, offline.
 *
 * A recorded landmark log is replayed through a fresh analyzer with the app's
 * default config (PracticeRig sends INIT without `config`), and every frame is
 * compared with the label of the span it falls in:
 *
 *   good  — no fault           → elbow −, wrist −, overall −
 *   elbow — elbow out of band  → elbow +, wrist not scored, overall +
 *   wrist — wrist bent         → elbow not scored, wrist +, overall +
 *   unknown / no label         → not scored (counted)
 *
 * "Positive" means "violation". Negatives for a rule come only from `good` spans:
 * a fault span says nothing reliable about the other joint. A rule's prediction is
 * unevaluable (null) when neither arm could be measured for it; those frames are
 * counted by polarity (unevaluable+ where the rule should fire, unevaluable− where
 * it should not) and `strictRecall` counts unevaluable+ frames as misses.
 */
import { PostureAnalyzer } from '../posture/PostureAnalyzer';
import type { MetricState, PostureSnapshot } from '../posture/types';
import type { LandmarkLog } from './landmarkLog';

export const POSTURE_LABELS = ['good', 'elbow', 'wrist', 'unknown'] as const;
export type PostureLabel = (typeof POSTURE_LABELS)[number];
export const RULES = ['elbow', 'wrist', 'overall'] as const;
export type RuleName = (typeof RULES)[number];

export interface LabelSpan {
  /** Inclusive, ms since the first logged frame. */
  startMs: number;
  /** Exclusive. */
  endMs: number;
  label: PostureLabel;
}

export interface Confusion {
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  /** Scored frames: tp + fp + fn + tn. */
  n: number;
  /** Frames where the rule should fire but could not decide. */
  unevaluablePos: number;
  /** Frames where the rule should stay quiet but could not decide. */
  unevaluableNeg: number;
  /** tp / (tp + fp), null when nothing was predicted positive. */
  precision: number | null;
  /** tp / (tp + fn), null when no frame was labelled positive. */
  recall: number | null;
  /** tp / (tp + fn + unevaluablePos): a fault the app could not see counts as missed. */
  strictRecall: number | null;
}

export interface PostureEvalReport {
  frames: number;
  /** Time of the last frame (ms since the first), null for an empty log. */
  lastMs: number | null;
  /** Frames outside every label span. */
  unlabelled: number;
  byLabel: Record<PostureLabel, number>;
  /** All frames (labelled or not) where `compliant` was null. */
  compliantNull: number;
  rules: Record<RuleName, Confusion>;
}

/** Parses `startMs,endMs,label` rows. A header row, blank lines and `#` comments are allowed. */
export function parseLabelsCsv(text: string): LabelSpan[] {
  const spans: LabelSpan[] = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((raw, i) => {
    const line = raw.trim();
    const where = `labels line ${i + 1}`;
    if (!line || line.startsWith('#')) return;
    const cols = line.split(',').map((c) => c.trim());
    if (spans.length === 0 && cols[0]?.toLowerCase() === 'startms') return; // header
    if (cols.length !== 3) throw new Error(`${where}: expected 3 columns (startMs,endMs,label), got ${cols.length}`);
    const [startText, endText, labelText] = cols;
    const startMs = Number(startText);
    const endMs = Number(endText);
    if (startText === '' || !Number.isFinite(startMs) || startMs < 0) throw new Error(`${where}: startMs must be a number >= 0`);
    if (endText === '' || !Number.isFinite(endMs)) throw new Error(`${where}: endMs must be a number`);
    if (!(endMs > startMs)) throw new Error(`${where}: endMs must be greater than startMs`);
    const label = labelText.toLowerCase();
    if (!(POSTURE_LABELS as readonly string[]).includes(label)) {
      throw new Error(`${where}: label must be one of ${POSTURE_LABELS.join('|')}, got "${labelText}"`);
    }
    spans.push({ startMs, endMs, label: label as PostureLabel });
  });
  spans.sort((a, b) => a.startMs - b.startMs);
  for (let i = 1; i < spans.length; i++) {
    const a = spans[i - 1];
    const b = spans[i];
    if (b.startMs < a.endMs) throw new Error(`labels overlap: ${a.startMs}-${a.endMs} and ${b.startMs}-${b.endMs}`);
  }
  return spans;
}

/** The label covering `tMs`, or null. `spans` must be sorted (parseLabelsCsv does that). */
export function labelAt(spans: readonly LabelSpan[], tMs: number): PostureLabel | null {
  let lo = 0;
  let hi = spans.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const s = spans[mid];
    if (tMs < s.startMs) hi = mid - 1;
    else if (tMs >= s.endMs) lo = mid + 1;
    else return s.label;
  }
  return null;
}

function armRule(a: MetricState, b: MetricState): boolean | null {
  const bad = (s: MetricState) => s === 'low' || s === 'high';
  if (bad(a) || bad(b)) return true;
  if (a === 'ok' || b === 'ok') return false;
  return null;
}

/** What the analyzer said about each rule in this frame (true = violation, null = could not tell). */
export function predictRules(s: PostureSnapshot): Record<RuleName, boolean | null> {
  return {
    elbow: armRule(s.arms.left.elbow.state, s.arms.right.elbow.state),
    wrist: armRule(s.arms.left.wrist.state, s.arms.right.wrist.state),
    overall: s.compliant === null ? null : !s.compliant,
  };
}

/** Ground truth per rule for a label (null = this rule is not scored here), or null when the frame is not scored at all. */
export function truthFor(label: PostureLabel): Record<RuleName, boolean | null> | null {
  switch (label) {
    case 'good':
      return { elbow: false, wrist: false, overall: false };
    case 'elbow':
      return { elbow: true, wrist: null, overall: true };
    case 'wrist':
      return { elbow: null, wrist: true, overall: true };
    case 'unknown':
      return null;
  }
}

function ratio(num: number, den: number): number | null {
  return den > 0 ? num / den : null;
}

export class PostureScorer {
  private frames = 0;
  private lastMs: number | null = null;
  private unlabelled = 0;
  private compliantNull = 0;
  private readonly byLabel: Record<PostureLabel, number> = { good: 0, elbow: 0, wrist: 0, unknown: 0 };
  private readonly counts: Record<RuleName, Omit<Confusion, 'n' | 'precision' | 'recall' | 'strictRecall'>> = {
    elbow: { tp: 0, fp: 0, fn: 0, tn: 0, unevaluablePos: 0, unevaluableNeg: 0 },
    wrist: { tp: 0, fp: 0, fn: 0, tn: 0, unevaluablePos: 0, unevaluableNeg: 0 },
    overall: { tp: 0, fp: 0, fn: 0, tn: 0, unevaluablePos: 0, unevaluableNeg: 0 },
  };

  constructor(private readonly spans: readonly LabelSpan[]) {}

  add(tMs: number, snapshot: PostureSnapshot): void {
    this.frames++;
    this.lastMs = tMs;
    if (snapshot.compliant === null) this.compliantNull++;
    const label = labelAt(this.spans, tMs);
    if (label === null) {
      this.unlabelled++;
      return;
    }
    this.byLabel[label]++;
    const truth = truthFor(label);
    if (!truth) return;
    const pred = predictRules(snapshot);
    for (const rule of RULES) {
      const want = truth[rule];
      if (want === null) continue;
      const c = this.counts[rule];
      const p = pred[rule];
      if (p === null) {
        if (want) c.unevaluablePos++;
        else c.unevaluableNeg++;
      } else if (p && want) c.tp++;
      else if (p) c.fp++;
      else if (want) c.fn++;
      else c.tn++;
    }
  }

  report(): PostureEvalReport {
    const rules = {} as Record<RuleName, Confusion>;
    for (const rule of RULES) {
      const c = this.counts[rule];
      rules[rule] = {
        ...c,
        n: c.tp + c.fp + c.fn + c.tn,
        precision: ratio(c.tp, c.tp + c.fp),
        recall: ratio(c.tp, c.tp + c.fn),
        strictRecall: ratio(c.tp, c.tp + c.fn + c.unevaluablePos),
      };
    }
    return {
      frames: this.frames,
      lastMs: this.lastMs,
      unlabelled: this.unlabelled,
      byLabel: { ...this.byLabel },
      compliantNull: this.compliantNull,
      rules,
    };
  }
}

/** Replays `log` through a fresh, default-config PostureAnalyzer and scores it against `spans`. */
export function evaluateLog(log: LandmarkLog, spans: readonly LabelSpan[]): PostureEvalReport {
  const analyzer = new PostureAnalyzer();
  const scorer = new PostureScorer(spans);
  log.forEachPoseFrame((frame) => {
    // process() may nudge a duplicate timestamp; score on the logged time.
    const t = frame.timestampMs;
    scorer.add(t, analyzer.process(frame));
  });
  return scorer.report();
}

/** A span ending this long after the last frame is suspicious (a typo, or a log cut short). */
const SPAN_PAST_END_TOLERANCE_MS = 1000;

/** Plausibility checks on the labels against the log, as human-readable warnings. */
export function labelWarnings(spans: readonly LabelSpan[], r: PostureEvalReport): string[] {
  const out: string[] = [];
  if (r.lastMs !== null) {
    for (const s of spans) {
      if (s.endMs > r.lastMs + SPAN_PAST_END_TOLERANCE_MS) {
        out.push(`label span ${s.startMs}-${s.endMs} (${s.label}) ends after the last frame (t=${r.lastMs} ms)`);
      }
    }
  }
  if (r.frames > 0 && r.unlabelled / r.frames > 0.5) {
    out.push(`${pct(r.unlabelled, r.frames)} of frames have no label: labels in seconds instead of ms?`);
  }
  return out;
}

function pct(part: number, whole: number): string {
  return whole > 0 ? `${((100 * part) / whole).toFixed(1)}%` : '—';
}

function fixed(v: number | null): string {
  return v === null ? '—' : v.toFixed(3);
}

/** Plain-text table for the CLI. */
export function formatReport(r: PostureEvalReport): string {
  const header = ['rule', 'TP', 'FP', 'FN', 'TN', 'precision', 'recall', 'strict recall', 'n', 'unev+', 'unev−'];
  const rows = RULES.map((rule) => {
    const c = r.rules[rule];
    return [rule, c.tp, c.fp, c.fn, c.tn, fixed(c.precision), fixed(c.recall), fixed(c.strictRecall), c.n, c.unevaluablePos, c.unevaluableNeg].map(
      String,
    );
  });
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((row) => row[i].length)));
  const line = (cells: string[]) => cells.map((c, i) => (i === 0 ? c.padEnd(widths[i]) : c.padStart(widths[i]))).join('  ');
  const labelled = r.frames - r.unlabelled;
  return [
    `frames: ${r.frames}  labelled: ${labelled} (good ${r.byLabel.good}, elbow ${r.byLabel.elbow}, wrist ${r.byLabel.wrist}, unknown ${r.byLabel.unknown})`,
    `no label: ${r.unlabelled} (${pct(r.unlabelled, r.frames)})`,
    `unevaluable (compliant=null): ${r.compliantNull} (${pct(r.compliantNull, r.frames)} of all frames)`,
    '',
    line(header),
    ...rows.map(line),
    '',
    'positive = violation; overall = the gated compliance verdict (elbow + wrist by default).',
    'negatives come from good spans only; unev+/unev− = could not decide where the rule should / should not fire;',
    'strict recall = TP / (TP + FN + unev+).',
  ].join('\n');
}
