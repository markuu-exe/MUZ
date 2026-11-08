import { describe, expect, it } from 'vitest';
import { PostureAnalyzer } from '../PostureAnalyzer';
import { LM } from '../landmarks';
import { BandTracker, classifyBand } from '../rules';
import { PostureSession } from '../session';
import { DEFAULT_POSTURE_CONFIG } from '../config';
import { makeSkeleton, occlude, type SkeletonSpec } from './fixtures';

const noSmoothing = { smoothing: { enabled: false } } as const;

function run(analyzer: PostureAnalyzer, spec: SkeletonSpec, fromMs: number, toMs: number, stepMs = 33) {
  let snap = analyzer.process(makeSkeleton({ ...spec, timestampMs: fromMs }));
  for (let t = fromMs + stepMs; t <= toMs; t += stepMs) snap = analyzer.process(makeSkeleton({ ...spec, timestampMs: t }));
  return snap;
}

describe('band classification (SRS 3.1.5.4 / 3.1.5.5)', () => {
  it('uses the exact spec edges', () => {
    const { elbow, wrist } = DEFAULT_POSTURE_CONFIG.thresholds;
    expect(classifyBand(80, elbow)).toBe('ok');
    expect(classifyBand(110, elbow)).toBe('ok');
    expect(classifyBand(79.99, elbow)).toBe('low');
    expect(classifyBand(110.01, elbow)).toBe('high');
    expect(classifyBand(150, wrist)).toBe('ok');
    expect(classifyBand(149.99, wrist)).toBe('low');
    expect(classifyBand(NaN, wrist)).toBe('unknown');
  });

  it('applies hysteresis on recovery only, and grace on dropouts', () => {
    const b = new BandTracker();
    const band = { min: 80, max: 110 };
    expect(b.update(79, band, 2, 300, 0)).toBe('low');
    expect(b.update(81, band, 2, 300, 33)).toBe('low'); // inside band but within hysteresis
    expect(b.update(82.5, band, 2, 300, 66)).toBe('ok');
    expect(b.update(NaN, band, 2, 300, 100)).toBe('ok'); // held during grace
    expect(b.update(NaN, band, 2, 300, 400)).toBe('unknown');
  });
});

describe('PostureAnalyzer rules (KAN-253)', () => {
  it('is compliant with good piano posture', () => {
    const a = new PostureAnalyzer(noSmoothing);
    const s = run(a, { elbowDeg: 95, wristFlexDeg: 5 }, 0, 300);
    expect(s.compliant).toBe(true);
    expect(s.inBandStrict).toBe(true);
    expect(s.cues).toHaveLength(0);
  });

  it('flags compliance immediately but delays the cue text', () => {
    const a = new PostureAnalyzer(noSmoothing);
    let s = a.process(makeSkeleton({ elbowDeg: 125, timestampMs: 0 }));
    expect(s.compliant).toBe(false);
    expect(s.cues).toHaveLength(0);
    s = run(a, { elbowDeg: 125 }, 33, 700);
    expect(s.cues.map((c) => c.code)).toContain('ELBOW_TOO_WIDE');
    expect(s.cues[0].label).toBe('Adjust Elbow: Too Wide');
  });

  it('distinguishes wrist droop from a raised wrist', () => {
    const droop = run(new PostureAnalyzer(noSmoothing), { wristFlexDeg: -40 }, 0, 800);
    expect(droop.cues.map((c) => c.code)).toEqual(['WRIST_DROOP', 'WRIST_DROOP']);
    expect(droop.arms.left.wrist.state).toBe('low');
    const raised = run(new PostureAnalyzer(noSmoothing), { wristFlexDeg: 40 }, 0, 800);
    expect(raised.cues.every((c) => c.code === 'WRIST_RAISED')).toBe(true);
  });

  it('reports unknown (null) when no arm is visible, never a pass', () => {
    const a = new PostureAnalyzer(noSmoothing);
    const f = makeSkeleton();
    for (const i of [LM.LEFT_WRIST, LM.RIGHT_WRIST]) occlude(f, i);
    const s = a.process(f);
    expect(s.compliant).toBeNull();
    expect(s.inBandStrict).toBeNull();
  });

  it('passes on the near arm alone when the far arm is occluded (minKnownArms = 1)', () => {
    const a = new PostureAnalyzer(noSmoothing);
    const s = a.process(occlude(makeSkeleton({ yawDeg: 45 }), LM.LEFT_ELBOW));
    expect(s.arms.left.status).toBe('unknown');
    expect(s.arms.right.status).toBe('ok');
    expect(s.compliant).toBe(true);
  });

  it('treats slouch as an advisory cue by default, gating when enabled', () => {
    const advisory = run(new PostureAnalyzer(noSmoothing), { trunkFlexDeg: 35 }, 0, 800);
    expect(advisory.compliant).toBe(true);
    expect(advisory.cues.find((c) => c.code === 'SLOUCH')?.gating).toBe(false);
    const gated = run(new PostureAnalyzer({ ...noSmoothing, gating: { trunk: true } }), { trunkFlexDeg: 35 }, 0, 800);
    expect(gated.compliant).toBe(false);
  });

  it('calibration removes camera-pitch bias for slouch detection', () => {
    const a = new PostureAnalyzer(noSmoothing);
    const pitched = { trunkFlexDeg: 10, pitchDeg: 15 }; // reads as 25° uncalibrated → slouch
    let s = run(a, pitched, 0, 800);
    expect(s.trunk.flexion.state).toBe('high');
    a.startCalibration({ durationMs: 1000 });
    s = run(a, pitched, 833, 2000);
    expect(s.calibration.status).toBe('done');
    expect(s.trunk.flexion.value).toBeCloseTo(0, 6);
    expect(s.trunk.flexion.state).toBe('ok');
    s = run(a, { trunkFlexDeg: 25, pitchDeg: 15 }, 2033, 2800);
    expect(s.trunk.flexion.value).toBeCloseTo(15, 6);
    expect(s.cues.map((c) => c.code)).toContain('SLOUCH');
  });
});

describe('PostureSession (SDD posture_score)', () => {
  it('scores the percentage of evaluable frames in band', () => {
    const a = new PostureAnalyzer(noSmoothing);
    const { elbow, wrist } = DEFAULT_POSTURE_CONFIG.thresholds;
    const session = new PostureSession(elbow, wrist);
    let t = 0;
    for (let i = 0; i < 30; i++) session.add(a.process(makeSkeleton({ elbowDeg: 95, timestampMs: (t += 33) })));
    for (let i = 0; i < 10; i++) session.add(a.process(makeSkeleton({ elbowDeg: 120, timestampMs: (t += 33) })));
    const hidden = makeSkeleton({ timestampMs: (t += 33) });
    occlude(hidden, LM.LEFT_WRIST);
    occlude(hidden, LM.RIGHT_WRIST);
    session.add(a.process(hidden));
    const sum = session.summary();
    expect(sum.framesTotal).toBe(41);
    expect(sum.framesEvaluated).toBe(40);
    expect(sum.postureScore).toBe(75);
    expect(sum.elbow.left?.meanDeviationDeg).toBeCloseTo(2.5, 6); // 10 frames × 10° / 40
  });
});
