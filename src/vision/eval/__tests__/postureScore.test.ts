import { describe, expect, it } from 'vitest';
import type { MetricState, PostureSnapshot } from '../../posture/types';
import { makeSkeleton, type SkeletonSpec } from '../../posture/__tests__/fixtures';
import { packAnalyzerInput } from '../analyzerInput';
import { LandmarkLog } from '../landmarkLog';
import { PostureScorer, evaluateLog, formatReport, labelAt, labelWarnings, parseLabelsCsv, predictRules, truthFor } from '../postureScore';

function snap(compliant: boolean | null, elbow: [MetricState, MetricState], wrist: [MetricState, MetricState]): PostureSnapshot {
  const arm = (i: 0 | 1) => ({ elbow: { value: null, state: elbow[i] }, wrist: { value: null, state: wrist[i] } });
  return { compliant, arms: { left: arm(0), right: arm(1) } } as unknown as PostureSnapshot;
}

describe('parseLabelsCsv (AI-3)', () => {
  it('reads startMs,endMs,label rows, with an optional header, comments and blank lines', () => {
    const csv = 'startMs,endMs,label\r\n# warm-up\n0,1000,good\n\n1000, 2500 ,elbow\n2500,4000,WRIST\n4000,4100,unknown\n';
    expect(parseLabelsCsv(csv)).toEqual([
      { startMs: 0, endMs: 1000, label: 'good' },
      { startMs: 1000, endMs: 2500, label: 'elbow' },
      { startMs: 2500, endMs: 4000, label: 'wrist' },
      { startMs: 4000, endMs: 4100, label: 'unknown' },
    ]);
  });

  it('sorts spans by start', () => {
    expect(parseLabelsCsv('2000,3000,good\n0,1000,elbow').map((s) => s.startMs)).toEqual([0, 2000]);
  });

  const bad: Array<[string, string, RegExp]> = [
    ['unknown label', '0,10,slouch', /line 1.*label/],
    ['missing column', '0,10', /line 1.*3 columns/],
    ['not a number', '0,abc,good', /line 1.*endMs/],
    ['empty span', 'startMs,endMs,label\n10,10,good', /line 2.*endMs must be greater/],
    ['negative start', '-5,10,good', /line 1.*startMs/],
    ['overlap', '0,100,good\n50,150,elbow', /overlap/],
  ];
  for (const [name, csv, message] of bad) {
    it(`rejects ${name}`, () => expect(() => parseLabelsCsv(csv)).toThrow(message));
  }
});

describe('labelAt (AI-3)', () => {
  const spans = parseLabelsCsv('0,100,good\n200,300,elbow');
  it('start is inclusive, end exclusive, gaps are unlabelled', () => {
    expect(labelAt(spans, 0)).toBe('good');
    expect(labelAt(spans, 99.9)).toBe('good');
    expect(labelAt(spans, 100)).toBeNull();
    expect(labelAt(spans, 250)).toBe('elbow');
    expect(labelAt(spans, 300)).toBeNull();
    expect(labelAt(spans, -1)).toBeNull();
  });
});

describe('rule predictions and ground truth (AI-3)', () => {
  it('a rule fires when either arm violates it, is negative when an arm is ok, else unevaluable', () => {
    expect(predictRules(snap(false, ['high', 'unknown'], ['ok', 'unknown']))).toEqual({ elbow: true, wrist: false, overall: true });
    expect(predictRules(snap(false, ['ok', 'ok'], ['ok', 'low']))).toEqual({ elbow: false, wrist: true, overall: true });
    expect(predictRules(snap(true, ['ok', 'unknown'], ['ok', 'unknown']))).toEqual({ elbow: false, wrist: false, overall: false });
    expect(predictRules(snap(null, ['unknown', 'unknown'], ['unknown', 'unknown']))).toEqual({ elbow: null, wrist: null, overall: null });
  });

  it('a fault span is positive for its rule and overall; the other joint is not scored (null) there', () => {
    expect(truthFor('good')).toEqual({ elbow: false, wrist: false, overall: false });
    expect(truthFor('elbow')).toEqual({ elbow: true, wrist: null, overall: true });
    expect(truthFor('wrist')).toEqual({ elbow: null, wrist: true, overall: true });
    expect(truthFor('unknown')).toBeNull();
  });
});

describe('PostureScorer (AI-3)', () => {
  it('counts TP/FP/FN/TN per rule; negatives only from good spans; unevaluable split by polarity', () => {
    const spans = parseLabelsCsv('0,400,good\n400,800,elbow\n800,900,unknown');
    const s = new PostureScorer(spans);
    s.add(0, snap(true, ['ok', 'ok'], ['ok', 'ok'])); // good: TN everywhere
    s.add(100, snap(false, ['high', 'ok'], ['ok', 'ok'])); // good: elbow FP, wrist TN, overall FP
    s.add(200, snap(null, ['unknown', 'unknown'], ['unknown', 'unknown'])); // good: unevaluable− everywhere
    s.add(400, snap(false, ['high', 'ok'], ['ok', 'ok'])); // elbow: elbow TP, overall TP, wrist not scored
    s.add(500, snap(true, ['ok', 'ok'], ['ok', 'ok'])); // elbow: elbow FN, overall FN
    s.add(600, snap(false, ['ok', 'ok'], ['low', 'ok'])); // elbow: elbow FN, overall TP (wrist not scored)
    s.add(700, snap(null, ['unknown', 'unknown'], ['unknown', 'unknown'])); // elbow: unevaluable+ (elbow, overall)
    s.add(850, snap(true, ['ok', 'ok'], ['ok', 'ok'])); // labelled unknown: not scored
    s.add(1000, snap(null, ['unknown', 'unknown'], ['unknown', 'unknown'])); // no label
    const r = s.report();

    expect(r.frames).toBe(9);
    expect(r.lastMs).toBe(1000);
    expect(r.unlabelled).toBe(1);
    expect(r.byLabel).toEqual({ good: 3, elbow: 4, wrist: 0, unknown: 1 });
    expect(r.compliantNull).toBe(3);

    expect(r.rules.elbow).toMatchObject({ tp: 1, fp: 1, fn: 2, tn: 1, n: 5, unevaluablePos: 1, unevaluableNeg: 1 });
    expect(r.rules.elbow.precision).toBeCloseTo(0.5);
    expect(r.rules.elbow.recall).toBeCloseTo(1 / 3);
    expect(r.rules.elbow.strictRecall).toBeCloseTo(1 / 4);

    // Wrist is scored only on the good span here: the elbow span says nothing about the wrist.
    expect(r.rules.wrist).toMatchObject({ tp: 0, fp: 0, fn: 0, tn: 2, n: 2, unevaluablePos: 0, unevaluableNeg: 1 });
    expect(r.rules.wrist.precision).toBeNull();
    expect(r.rules.wrist.recall).toBeNull();
    expect(r.rules.wrist.strictRecall).toBeNull();

    expect(r.rules.overall).toMatchObject({ tp: 2, fp: 1, fn: 1, tn: 1, n: 5, unevaluablePos: 1, unevaluableNeg: 1 });
    expect(r.rules.overall.recall).toBeCloseTo(2 / 3);
    expect(r.rules.overall.strictRecall).toBeCloseTo(2 / 4);
  });
});

describe('labelWarnings (AI-3)', () => {
  const scored = (spansCsv: string, times: number[]) => {
    const spans = parseLabelsCsv(spansCsv);
    const s = new PostureScorer(spans);
    for (const t of times) s.add(t, snap(true, ['ok', 'ok'], ['ok', 'ok']));
    return labelWarnings(spans, s.report());
  };

  it('is quiet when the labels fit the log', () => {
    expect(scored('0,1500,good', [0, 500, 1000, 1400])).toEqual([]);
  });

  it('warns when a span ends well past the last frame', () => {
    const w = scored('0,1000,good\n1000,9000,elbow', [0, 500, 1000, 1500]);
    expect(w).toHaveLength(1);
    expect(w[0]).toMatch(/1000-9000.*last frame.*1500/);
  });

  it('warns when more than half the frames have no label (seconds instead of ms?)', () => {
    const w = scored('0,2,good', [0, 500, 1000, 1500]);
    expect(w.some((x) => /75\.0% of frames have no label.*seconds instead of ms/.test(x))).toBe(true);
  });
});

describe('evaluateLog (AI-3)', () => {
  function syntheticLog(): LandmarkLog {
    const log = new LandmarkLog();
    const segments: Array<[number, SkeletonSpec]> = [
      [0, { elbowDeg: 95, wristFlexDeg: 4 }],
      [1000, { elbowDeg: 125 }],
      [2000, { wristFlexDeg: -40 }],
    ];
    for (let t = 0; t < 3000; t += 33) {
      const spec = [...segments].reverse().find(([from]) => t >= from)![1];
      log.push(t, packAnalyzerInput(makeSkeleton({ ...spec, timestampMs: t })));
    }
    return log;
  }

  it('replays the log through a default PostureAnalyzer and scores it against the labels', () => {
    const r = evaluateLog(syntheticLog(), parseLabelsCsv('0,1000,good\n1000,2000,elbow\n2000,2900,wrist'));
    expect(r.frames).toBe(91);
    expect(r.unlabelled).toBe(3); // 2900..2999
    const { good, elbow, wrist } = r.byLabel;
    const scoredFrames = { elbow: good + elbow, wrist: good + wrist, overall: good + elbow + wrist };
    expect(scoredFrames.overall).toBe(88);
    for (const rule of ['elbow', 'wrist', 'overall'] as const) {
      const c = r.rules[rule];
      expect(c.tp + c.fp + c.fn + c.tn).toBe(c.n);
      expect(c.n + c.unevaluablePos + c.unevaluableNeg).toBe(scoredFrames[rule]);
      expect(c.strictRecall).toBeLessThanOrEqual(c.recall!);
      expect(c.precision).toBeGreaterThan(0.8); // a few frames of lag at each change
      expect(c.recall).toBeGreaterThan(0.8);
    }
  });

  it('formats a table with every rule and the unevaluable / unlabelled counts', () => {
    const text = formatReport(evaluateLog(syntheticLog(), parseLabelsCsv('0,1000,good\n1000,2000,elbow\n2000,2900,wrist')));
    expect(text).toMatch(/rule\s+TP\s+FP\s+FN\s+TN\s+precision\s+recall\s+strict recall\s+n\s+unev\+\s+unev−/);
    expect(text).toMatch(/^elbow\s+\d+/m);
    expect(text).toMatch(/^wrist\s+\d+/m);
    expect(text).toMatch(/^overall\s+\d+/m);
    expect(text).toContain('compliant=null');
    expect(text).toContain('no label: 3');
  });
});
