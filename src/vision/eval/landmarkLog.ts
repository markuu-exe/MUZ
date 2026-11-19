/**
 * AI-3: an in-memory log of the posture analyzer's input, for offline evaluation
 * (scripts/eval/posture-eval.ts). Recorded only under `?debug`.
 *
 * Numbers only: a session-relative time (first frame = 0 ms) and the landmark
 * coordinates/visibility the analyzer reads (see analyzerInput.ts). No pixels, no
 * wall-clock time, no user or device details. Nothing leaves the device unless the
 * tester downloads the file and shares it.
 */
import { TRACKED_LANDMARKS, createPoseFrame, type PoseFrame } from '../posture/landmarks';
import {
  ANALYZER_INPUT_FIELDS,
  ANALYZER_INPUT_LENGTH,
  ANALYZER_INPUT_STRIDE,
  unpackAnalyzerInput,
} from './analyzerInput';

export const LANDMARK_LOG_FORMAT = 'muz-landmarks';
export const LANDMARK_LOG_VERSION = 1;
export const LANDMARK_LOG_MODEL = 'pose_landmarker_lite';
/** 30 fps × 10 minutes (~6.5 MB in memory, ~20 MB of JSON). Later frames are dropped. */
export const DEFAULT_MAX_FRAMES = 30 * 60 * 10;

export interface LandmarkLogFrame {
  /** Milliseconds since the first logged frame. */
  t: number;
  /** Whether MediaPipe found a person in this frame. */
  pose: boolean;
  /** `fields` for each of `landmarks`, in order. null = not available (NaN). */
  v: Array<number | null>;
}

export interface LandmarkLogFile {
  format: typeof LANDMARK_LOG_FORMAT;
  version: typeof LANDMARK_LOG_VERSION;
  model: typeof LANDMARK_LOG_MODEL;
  /** MediaPipe Pose landmark indices, in the order they appear in each frame's `v`. */
  landmarks: number[];
  /** Per landmark: world x/y/z (metres), image x/y (normalised), visibility. */
  fields: string[];
  frames: LandmarkLogFrame[];
}

const VALUES_PER_FRAME = ANALYZER_INPUT_LENGTH - 1;

/** Float32 values need at most 9 significant digits to round-trip; this keeps files ~half the size. */
function encode(x: number): number | null {
  return Number.isFinite(x) ? Number(x.toPrecision(9)) : null;
}

function sameList(a: unknown, b: readonly unknown[]): boolean {
  return Array.isArray(a) && a.length === b.length && a.every((x, i) => x === b[i]);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export class LandmarkLog {
  private readonly times: number[] = [];
  private readonly data: Float32Array[] = [];
  private t0 = NaN;
  private _dropped = 0;

  constructor(readonly maxFrames: number = DEFAULT_MAX_FRAMES) {}

  get length(): number {
    return this.data.length;
  }

  /** True once the cap is reached; further frames are dropped. */
  get full(): boolean {
    return this.data.length >= this.maxFrames;
  }

  /** Frames refused because the log was full. */
  get dropped(): number {
    return this._dropped;
  }

  /**
   * Appends one frame. `tMs` is any monotonic clock (it is rebased to the first frame);
   * `input` comes from packAnalyzerInput and is copied. Returns false when the log is full.
   */
  push(tMs: number, input: Float32Array): boolean {
    if (input.length !== ANALYZER_INPUT_LENGTH) {
      throw new RangeError(`landmark log: input length must be ${ANALYZER_INPUT_LENGTH}, got ${input.length}`);
    }
    if (this.full) {
      this._dropped++;
      return false;
    }
    if (!Number.isFinite(this.t0)) this.t0 = tMs;
    this.times.push(tMs - this.t0);
    this.data.push(input.slice());
    return true;
  }

  clear(): void {
    this.times.length = 0;
    this.data.length = 0;
    this.t0 = NaN;
    this._dropped = 0;
  }

  /** Raw access: rebased time and packed analyzer input (do not modify). */
  forEachRaw(fn: (tMs: number, input: Float32Array) => void): void {
    for (let i = 0; i < this.data.length; i++) fn(this.times[i], this.data[i]);
  }

  /** Replays the log as PoseFrames. The same frame object is reused (the analyzer smooths it in place). */
  forEachPoseFrame(fn: (frame: PoseFrame, index: number) => void): void {
    const frame = createPoseFrame();
    for (let i = 0; i < this.data.length; i++) fn(unpackAnalyzerInput(this.data[i], this.times[i], frame), i);
  }

  toJSON(): LandmarkLogFile {
    const frames: LandmarkLogFrame[] = new Array(this.data.length);
    for (let i = 0; i < this.data.length; i++) {
      const d = this.data[i];
      const v: Array<number | null> = new Array(VALUES_PER_FRAME);
      for (let k = 0; k < VALUES_PER_FRAME; k++) v[k] = encode(d[k + 1]);
      frames[i] = { t: this.times[i], pose: d[0] === 1, v };
    }
    return {
      format: LANDMARK_LOG_FORMAT,
      version: LANDMARK_LOG_VERSION,
      model: LANDMARK_LOG_MODEL,
      landmarks: [...TRACKED_LANDMARKS],
      fields: [...ANALYZER_INPUT_FIELDS],
      frames,
    };
  }

  /** Parses an exported file. Throws an Error naming the first problem found. */
  static fromJSON(json: unknown): LandmarkLog {
    const fail = (msg: string): never => {
      throw new Error(`Invalid landmark log: ${msg}`);
    };
    if (!isRecord(json)) return fail('expected a JSON object');
    if (json.format !== LANDMARK_LOG_FORMAT) fail(`format must be "${LANDMARK_LOG_FORMAT}"`);
    if (json.version !== LANDMARK_LOG_VERSION) fail(`unsupported version ${String(json.version)} (expected ${LANDMARK_LOG_VERSION})`);
    if (json.model !== LANDMARK_LOG_MODEL) fail(`model must be "${LANDMARK_LOG_MODEL}"`);
    if (!sameList(json.landmarks, TRACKED_LANDMARKS)) fail('landmarks list does not match this version of the analyzer');
    if (!sameList(json.fields, ANALYZER_INPUT_FIELDS)) fail(`fields must be ${ANALYZER_INPUT_FIELDS.join(',')}`);
    if (!Array.isArray(json.frames)) return fail('frames must be an array');

    const frames = json.frames as unknown[];
    const log = new LandmarkLog(Math.max(DEFAULT_MAX_FRAMES, frames.length));
    let prevT = 0;
    const input = new Float32Array(ANALYZER_INPUT_LENGTH);
    frames.forEach((fr, i) => {
      const where = `frame ${i}`;
      if (!isRecord(fr)) fail(`${where} must be an object`);
      const { t, pose, v } = fr as Record<string, unknown>;
      if (typeof t !== 'number' || !Number.isFinite(t) || t < prevT) fail(`${where}: t must be a finite number >= the previous frame's`);
      if (typeof pose !== 'boolean') fail(`${where}: pose must be true or false`);
      if (!Array.isArray(v) || v.length !== VALUES_PER_FRAME) {
        fail(`${where}: v must hold ${VALUES_PER_FRAME} values (${TRACKED_LANDMARKS.length} landmarks × ${ANALYZER_INPUT_STRIDE})`);
      }
      input[0] = pose ? 1 : 0;
      (v as unknown[]).forEach((x, k) => {
        if (x === null) input[k + 1] = NaN;
        else if (typeof x === 'number' && Number.isFinite(x)) input[k + 1] = x;
        else fail(`${where}: v[${k}] must be a number or null`);
      });
      log.push(t as number, input);
      prevT = t as number;
    });
    return log;
  }
}
