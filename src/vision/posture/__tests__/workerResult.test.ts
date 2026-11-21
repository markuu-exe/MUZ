import { describe, expect, it } from 'vitest';
import { PostureAnalyzer } from '../PostureAnalyzer';
import { LM, POSE_LANDMARK_COUNT, type PoseFrame } from '../landmarks';
import { HUD_STRIDE } from '../workerProtocol';
import { analyseFrame as analyse, type ResultMessage } from '../workerResult';
import { packAnalyzerInput, unpackAnalyzerInput } from '../../eval/analyzerInput';
import { makeSkeleton } from './fixtures';

function cloneFrame(f: PoseFrame): PoseFrame {
  return { timestampMs: f.timestampMs, hasPose: f.hasPose, world: f.world.slice(), image: f.image.slice(), visibility: f.visibility.slice() };
}

/** MediaPipe hands out float32 values; round the synthetic skeleton the same way. */
function asFloat32(frame: PoseFrame): PoseFrame {
  for (const arr of [frame.world, frame.image, frame.visibility]) for (let i = 0; i < arr.length; i++) arr[i] = Math.fround(arr[i]);
  return frame;
}

/** Two frames so the One-Euro smoother actually changes the second one in place. */
function frames(): PoseFrame[] {
  return [makeSkeleton({ elbowDeg: 95, timestampMs: 0 }), makeSkeleton({ elbowDeg: 120, timestampMs: 33 })].map(asFloat32);
}

function analyseFrame(analyzer: PostureAnalyzer, frame: PoseFrame, inferenceMs: number, debug: boolean) {
  const posted: Array<{ message: ResultMessage; transfer: Transferable[] }> = [];
  analyse(analyzer, frame, inferenceMs, debug, (message, transfer) => posted.push({ message, transfer }));
  expect(posted).toHaveLength(1);
  return posted[0];
}

describe('posture worker RESULT (AI-3)', () => {
  it('without debugLandmarks: no landmarks field, only the HUD buffer is transferred', () => {
    const analyzer = new PostureAnalyzer();
    let out!: ReturnType<typeof analyseFrame>;
    for (const f of frames()) out = analyseFrame(analyzer, f, 7, false);
    expect(Object.keys(out.message).sort()).toEqual(['hud', 'inferenceMs', 'snapshot', 'type']);
    expect('landmarks' in out.message).toBe(false);
    expect(out.transfer).toEqual([out.message.hud.buffer]);
    expect(out.message.inferenceMs).toBe(7);
    expect(out.message.hud).toHaveLength(POSE_LANDMARK_COUNT * HUD_STRIDE);
    expect(out.message.hud[LM.LEFT_ELBOW * HUD_STRIDE + 2]).toBe(1);
  });

  it('with debugLandmarks: carries the unsmoothed analyzer input as a transferable Float32Array', () => {
    const analyzer = new PostureAnalyzer();
    const [a, b] = frames();
    analyseFrame(analyzer, a, 5, true);
    const raw = cloneFrame(b);
    const out = analyseFrame(analyzer, b, 5, true);
    expect(out.message.landmarks).toBeInstanceOf(Float32Array);
    // Packed before PostureAnalyzer smooths the frame in place.
    expect(Array.from(out.message.landmarks!)).toEqual(Array.from(packAnalyzerInput(raw)));
    expect(Array.from(out.message.landmarks!)).not.toEqual(Array.from(packAnalyzerInput(b)));
    expect(out.transfer).toEqual([out.message.hud.buffer, out.message.landmarks!.buffer]);
  });

  it('the same snapshot, debug on or off', () => {
    const on = new PostureAnalyzer();
    const off = new PostureAnalyzer();
    for (const f of frames()) {
      const s1 = analyseFrame(on, cloneFrame(f), 1, true).message.snapshot;
      const s2 = analyseFrame(off, cloneFrame(f), 1, false).message.snapshot;
      expect(s1).toEqual(s2);
    }
  });

  it('replaying the exported landmarks reproduces the worker snapshot', () => {
    const live = new PostureAnalyzer();
    const replay = new PostureAnalyzer();
    for (const f of frames()) {
      const { message } = analyseFrame(live, f, 1, true);
      expect(replay.process(unpackAnalyzerInput(message.landmarks!, message.snapshot.timestampMs))).toEqual(message.snapshot);
    }
  });
});
