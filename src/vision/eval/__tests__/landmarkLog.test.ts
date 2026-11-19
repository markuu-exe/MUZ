import { describe, expect, it } from 'vitest';
import { PostureAnalyzer } from '../../posture/PostureAnalyzer';
import { LM, TRACKED_LANDMARKS, createPoseFrame, type PoseFrame } from '../../posture/landmarks';
import type { PostureSnapshot } from '../../posture/types';
import { makeSkeleton, occlude, type SkeletonSpec } from '../../posture/__tests__/fixtures';
import { ANALYZER_INPUT_LENGTH, packAnalyzerInput, unpackAnalyzerInput } from '../analyzerInput';
import { DEFAULT_MAX_FRAMES, LandmarkLog } from '../landmarkLog';

/** MediaPipe hands out float32 values; round the synthetic skeleton the same way. */
function asFloat32(frame: PoseFrame): PoseFrame {
  for (const arr of [frame.world, frame.image, frame.visibility]) for (let i = 0; i < arr.length; i++) arr[i] = Math.fround(arr[i]);
  return frame;
}

function cloneFrame(f: PoseFrame): PoseFrame {
  return { timestampMs: f.timestampMs, hasPose: f.hasPose, world: f.world.slice(), image: f.image.slice(), visibility: f.visibility.slice() };
}

/** A session with good posture, an elbow violation, NaN coordinates, visibility-0 joints and a lost pose. */
function session(t0: number): PoseFrame[] {
  const frames: PoseFrame[] = [];
  const specs: SkeletonSpec[] = [
    ...Array.from({ length: 10 }, () => ({ elbowDeg: 95, wristFlexDeg: 4 })),
    ...Array.from({ length: 10 }, () => ({ elbowDeg: 125 })),
    ...Array.from({ length: 10 }, () => ({ wristFlexDeg: -40 })),
  ];
  specs.forEach((spec, i) => {
    const f = asFloat32(makeSkeleton({ ...spec, yawDeg: 30, timestampMs: t0 + i * 33 }));
    // Image coordinates spread over the frame so the in-frame gate matters.
    for (const lm of TRACKED_LANDMARKS) f.image.set([Math.fround(0.3 + lm / 100), Math.fround(0.6 - lm / 200), Math.fround(-0.1)], lm * 3);
    if (i % 7 === 3) f.world.fill(NaN, LM.RIGHT_WRIST * 3, LM.RIGHT_WRIST * 3 + 3);
    if (i % 5 === 1) f.visibility[LM.LEFT_ELBOW] = 0;
    if (i % 9 === 4) occlude(f, LM.RIGHT_INDEX);
    if (i % 6 === 2) f.image[LM.LEFT_WRIST * 3] = 1.2; // off-screen: fails the in-frame gate
    frames.push(asFloat32(f)); // occlude() writes a float64 visibility
  });
  // Person leaves the frame for longer than the occlusion grace: compliance becomes null.
  let t = t0 + specs.length * 33;
  for (let k = 0; k < 15; k++, t += 33) {
    const lost = createPoseFrame();
    lost.timestampMs = t;
    frames.push(lost);
  }
  frames.push(asFloat32(makeSkeleton({ timestampMs: t })));
  return frames;
}

function analyse(frames: PoseFrame[]): PostureSnapshot[] {
  const a = new PostureAnalyzer();
  return frames.map((f) => a.process(cloneFrame(f)));
}

function replay(log: LandmarkLog): PostureSnapshot[] {
  const a = new PostureAnalyzer();
  const out: PostureSnapshot[] = [];
  log.forEachPoseFrame((f) => out.push(a.process(f)));
  return out;
}

function record(frames: PoseFrame[]): LandmarkLog {
  const log = new LandmarkLog();
  for (const f of frames) log.push(f.timestampMs, packAnalyzerInput(f));
  return log;
}

describe('analyzer input packing (AI-3)', () => {
  it('packs hasPose plus world xyz, image xy and visibility of the tracked landmarks only', () => {
    expect(ANALYZER_INPUT_LENGTH).toBe(1 + TRACKED_LANDMARKS.length * 6);
    const f = asFloat32(makeSkeleton());
    const packed = packAnalyzerInput(f);
    expect(packed).toBeInstanceOf(Float32Array);
    expect(packed.length).toBe(ANALYZER_INPUT_LENGTH);
    expect(packed[0]).toBe(1);
  });

  it('copies: smoothing the frame in place afterwards does not change the packed values', () => {
    const f = asFloat32(makeSkeleton());
    const packed = packAnalyzerInput(f);
    const before = Array.from(packed);
    f.world.fill(0);
    expect(Array.from(packed)).toEqual(before);
  });

  it('unpacks to a frame the analyzer reads identically (untracked landmarks absent)', () => {
    const f = asFloat32(makeSkeleton({ elbowDeg: 120, timestampMs: 5 }));
    f.visibility[LM.LEFT_WRIST] = 0;
    f.world[LM.NOSE * 3] = NaN;
    const back = unpackAnalyzerInput(packAnalyzerInput(f), 5);
    expect(back.timestampMs).toBe(5);
    expect(back.hasPose).toBe(true);
    for (const lm of TRACKED_LANDMARKS) {
      for (let k = 0; k < 3; k++) expect(back.world[lm * 3 + k]).toEqual(f.world[lm * 3 + k]);
      for (let k = 0; k < 2; k++) expect(back.image[lm * 3 + k]).toEqual(f.image[lm * 3 + k]);
      expect(back.visibility[lm]).toBe(f.visibility[lm]);
    }
    expect(back.world[1 * 3]).toBeNaN(); // landmark 1 is not tracked: never logged
    expect(back.visibility[1]).toBe(0);
  });
});

describe('LandmarkLog (AI-3)', () => {
  it('rebases times so the first frame is at 0', () => {
    const log = record(session(123456.7));
    const json = log.toJSON();
    expect(json.frames[0].t).toBe(0);
    expect(json.frames[1].t).toBeCloseTo(33, 9);
  });

  it('writes a versioned, numbers-only file', () => {
    const json = record(session(1000)).toJSON();
    expect(json.format).toBe('muz-landmarks');
    expect(json.version).toBe(1);
    expect(json.model).toBe('pose_landmarker_lite');
    expect(json.landmarks).toEqual([...TRACKED_LANDMARKS]);
    expect(json.fields).toEqual(['wx', 'wy', 'wz', 'ix', 'iy', 'vis']);
    expect(Object.keys(json).sort()).toEqual(['fields', 'format', 'frames', 'landmarks', 'model', 'version']);
    for (const fr of json.frames) {
      expect(Object.keys(fr).sort()).toEqual(['pose', 't', 'v']);
      expect(fr.v).toHaveLength(TRACKED_LANDMARKS.length * 6);
      for (const x of fr.v) expect(x === null || typeof x === 'number').toBe(true);
    }
  });

  it('round-trips through JSON text to the same PostureAnalyzer snapshots, NaN and visibility-0 frames included', () => {
    const frames = session(1000);
    const live = analyse(frames);
    const text = JSON.stringify(record(frames).toJSON());
    expect(text).not.toContain('NaN');
    const imported = LandmarkLog.fromJSON(JSON.parse(text));
    expect(imported.length).toBe(frames.length);
    const replayed = replay(imported);
    // Live analysis ran on the original clock; the log is rebased to 0.
    expect(replayed).toEqual(live.map((s) => ({ ...s, timestampMs: s.timestampMs - 1000 })));
    // The fixture actually exercised the interesting states.
    expect(live.some((s) => s.compliant === false)).toBe(true);
    expect(live.some((s) => s.compliant === null)).toBe(true);
    expect(live.some((s) => !s.hasPose)).toBe(true);
  });

  it('keeps NaN as NaN (encoded as null in JSON)', () => {
    const f = asFloat32(makeSkeleton());
    f.world[LM.LEFT_WRIST * 3 + 1] = NaN;
    const log = new LandmarkLog();
    log.push(0, packAnalyzerInput(f));
    const json = JSON.parse(JSON.stringify(log.toJSON()));
    const slot = TRACKED_LANDMARKS.indexOf(LM.LEFT_WRIST) * 6 + 1;
    expect(json.frames[0].v[slot]).toBeNull();
    let seen = 0;
    LandmarkLog.fromJSON(json).forEachPoseFrame((back) => {
      seen = back.world[LM.LEFT_WRIST * 3 + 1];
    });
    expect(seen).toBeNaN();
  });

  it('round-trips float32 values exactly across magnitudes', () => {
    const data = new Float32Array(ANALYZER_INPUT_LENGTH);
    data[0] = 1;
    for (let i = 1; i < data.length; i++) data[i] = (Math.sin(i * 12.9898) * 43758.5453) % 1 * 10 ** ((i % 9) - 6);
    const log = new LandmarkLog();
    log.push(0, data);
    const back = LandmarkLog.fromJSON(JSON.parse(JSON.stringify(log.toJSON())));
    let got: Float32Array | null = null;
    back.forEachRaw((_t, d) => {
      got = d;
    });
    expect(Array.from(got!)).toEqual(Array.from(data));
  });

  it('stops recording at the frame cap and counts what it dropped', () => {
    expect(DEFAULT_MAX_FRAMES).toBe(30 * 60 * 10);
    const log = new LandmarkLog(3);
    const d = packAnalyzerInput(createPoseFrame());
    expect([0, 33, 66, 99, 132].map((t) => log.push(t, d))).toEqual([true, true, true, false, false]);
    expect(log.length).toBe(3);
    expect(log.full).toBe(true);
    expect(log.dropped).toBe(2);
    expect(log.toJSON().frames).toHaveLength(3);
  });

  it('rejects input of the wrong length', () => {
    expect(() => new LandmarkLog().push(0, new Float32Array(5))).toThrow(/length/);
  });

  it('clear() empties the log and resets the time base', () => {
    const log = record(session(500));
    log.clear();
    expect(log.length).toBe(0);
    log.push(9000, packAnalyzerInput(createPoseFrame()));
    expect(log.toJSON().frames[0].t).toBe(0);
  });

  describe('fromJSON validation', () => {
    const good = () => JSON.parse(JSON.stringify(record(session(0)).toJSON()));
    const cases: Array<[string, (j: any) => unknown, RegExp]> = [
      ['not an object', () => 'hello', /object/],
      ['wrong format', (j) => ({ ...j, format: 'other' }), /format/],
      ['newer version', (j) => ({ ...j, version: 2 }), /version/],
      ['other model', (j) => ({ ...j, model: 'some_other_model' }), /model/],
      ['different landmark layout', (j) => ({ ...j, landmarks: [0, 1, 2] }), /landmarks/],
      ['different fields', (j) => ({ ...j, fields: ['x'] }), /fields/],
      ['frames missing', (j) => ({ ...j, frames: undefined }), /frames/],
      ['short frame', (j) => (j.frames[2].v.pop(), j), /frame 2/],
      ['string value', (j) => ((j.frames[1].v[0] = '0.5'), j), /frame 1/],
      ['bad time', (j) => ((j.frames[3].t = null), j), /frame 3/],
      ['time going backwards', (j) => ((j.frames[4].t = -1), j), /frame 4/],
      ['pose not boolean', (j) => ((j.frames[0].pose = 1), j), /frame 0/],
    ];
    for (const [name, mutate, message] of cases) {
      it(`throws a clear error: ${name}`, () => {
        expect(() => LandmarkLog.fromJSON(mutate(good()))).toThrow(message);
      });
    }
  });
});
