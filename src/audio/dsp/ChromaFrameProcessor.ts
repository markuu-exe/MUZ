import { DEFAULT_CHROMA_CONFIG, type ChromaConfig } from '../config';
import { FFT, hannWindow } from './fft';
import { freqToMidi } from './pitch';

/**
 * One analysis frame (KAN-265). Emitted every `hopSize` samples.
 * The same object is reused between callbacks — copy what you keep.
 */
export interface ChromaFrame {
  /** Audio-clock time (s) of the newest sample in the analysis window. */
  time: number;
  /** L2-normalised 12-bin pitch-class profile [C … B]. All zeros when not voiced. */
  chroma: Float32Array;
  /** Frame RMS in dBFS. */
  rmsDb: number;
  /** Tracked room-noise level in dBFS. */
  noiseDb: number;
  /** True when the frame carries enough tonal energy to be judged. */
  voiced: boolean;
  /** True when a previous sound was still ringing at the last onset and was subtracted from this frame. */
  ringing: boolean;
  /** Positive log-spectral flux (onset strength). */
  flux: number;
  /** True on the frame where an onset was detected. */
  onset: boolean;
  /** Audio-clock time (s) of the detected onset (meaningful only when `onset`). */
  onsetTime: number;
}

const ONSET_FFT = 1024;
/** Frames of magnitude history kept for residue capture (covers ~64 ms of onset-detection lag at hop 512). */
const RESIDUE_RING = 6;
const WARMUP_FRAMES = 8;

/**
 * Pure, allocation-free (after construction) STFT → chroma + onset pipeline.
 * Runs identically inside the AudioWorklet and in unit tests.
 *
 * Chroma method (validated in simulation; see COPILOT_PLAN §3):
 *  1. Hann window, 4096-pt FFT, magnitude.
 *  2. Per-frame log compression Y = log1p(γ·|X|/max|X|).
 *  3. Spectral peaks above median(Y)·2 + 0.05 within 55 Hz–5 kHz.
 *  4. Parabolic interpolation → fractional MIDI → linear split between the
 *     two nearest pitch classes (tolerates a piano up to ±50 cents out of tune).
 *  5. L2 normalisation.
 * For `residueHoldMs` after each onset, step 1 uses max(0, |X| − α·|X_pre|),
 * where X_pre is the last spectrum that ended before the onset (α = 2). This
 * removes the previous chord still ringing (sustain pedal / held keys). Onsets
 * inside a rolled chord keep the residue captured before the roll began.
 */
export class ChromaFrameProcessor {
  readonly config: Readonly<ChromaConfig>;
  readonly sampleRate: number;

  private readonly ring: Float32Array;
  private writePos = 0;
  private filled = 0;
  private sinceHop = 0;

  private readonly fft: FFT;
  private readonly win: Float64Array;
  private readonly re: Float64Array;
  private readonly im: Float64Array;
  private readonly logMag: Float64Array;
  private readonly scratch: Float64Array;

  private readonly onsetFft: FFT;
  private readonly onsetWin: Float64Array;
  private readonly oRe: Float64Array;
  private readonly oIm: Float64Array;
  private readonly onsetSpec: Float64Array;
  private readonly prevOnsetSpec: Float64Array;
  private readonly onsetWinSum: number;
  private readonly fluxHistory: Float64Array;
  private fluxCount = 0;
  private fluxPos = 0;
  private prevAbove = false;
  private lastOnsetTime = -Infinity;
  private hasPrevSpec = false;
  /** Short-window energy (dB) of the last 3 hops, for the energy-rise test. */
  private readonly shortDb = new Float64Array(3).fill(-Infinity);
  private shortDbPos = 0;

  private readonly minBin: number;
  private readonly maxBin: number;
  private readonly oMinBin: number;
  private readonly oMaxBin: number;

  // Onset-relative residue subtraction: magnitude spectra of recent frames,
  // so energy already ringing before an onset (sustain pedal, previous chord)
  // is not credited to the new chord.
  private readonly magRing: Float64Array[];
  private readonly magRingTime: Float64Array;
  private magRingPos = 0;
  private readonly residue: Float64Array;
  private residueUntil = -Infinity;
  private residueOnset = -Infinity;
  private residueAudible = false;
  private readonly mag: Float64Array;

  private noiseDb: number;
  private readonly frame: ChromaFrame;
  private readonly onFrame: (frame: ChromaFrame) => void;

  constructor(sampleRate: number, onFrame: (frame: ChromaFrame) => void, config: Partial<ChromaConfig> = {}) {
    this.config = Object.freeze({ ...DEFAULT_CHROMA_CONFIG, ...config });
    const { fftSize, hopSize, minFreqHz, maxFreqHz } = this.config;
    if (hopSize <= 0 || hopSize > fftSize) throw new RangeError('hopSize must be in (0, fftSize]');
    this.sampleRate = sampleRate;
    this.onFrame = onFrame;

    this.ring = new Float32Array(fftSize);
    this.fft = new FFT(fftSize);
    this.win = hannWindow(fftSize);
    this.re = new Float64Array(fftSize);
    this.im = new Float64Array(fftSize);
    this.logMag = new Float64Array(fftSize >> 1);
    this.scratch = new Float64Array(fftSize >> 1);
    this.mag = new Float64Array(fftSize >> 1);
    this.residue = new Float64Array(fftSize >> 1);
    this.magRing = Array.from({ length: RESIDUE_RING }, () => new Float64Array(fftSize >> 1));
    this.magRingTime = new Float64Array(RESIDUE_RING).fill(-Infinity);

    this.onsetFft = new FFT(ONSET_FFT);
    this.onsetWin = hannWindow(ONSET_FFT);
    this.oRe = new Float64Array(ONSET_FFT);
    this.oIm = new Float64Array(ONSET_FFT);
    this.onsetSpec = new Float64Array(ONSET_FFT >> 1);
    this.prevOnsetSpec = new Float64Array(ONSET_FFT >> 1);
    let s = 0;
    for (let i = 0; i < ONSET_FFT; i++) s += this.onsetWin[i];
    this.onsetWinSum = s;
    this.fluxHistory = new Float64Array(this.config.onsetHistoryFrames);

    const binHz = sampleRate / fftSize;
    this.minBin = Math.max(2, Math.ceil(minFreqHz / binHz));
    this.maxBin = Math.min((fftSize >> 1) - 2, Math.floor(maxFreqHz / binHz));
    const oBinHz = sampleRate / ONSET_FFT;
    this.oMinBin = Math.max(1, Math.ceil(minFreqHz / oBinHz));
    this.oMaxBin = Math.min((ONSET_FFT >> 1) - 1, Math.floor(maxFreqHz / oBinHz));

    this.noiseDb = this.config.minRmsDb;
    this.frame = {
      time: 0,
      chroma: new Float32Array(12),
      rmsDb: -Infinity,
      noiseDb: this.noiseDb,
      voiced: false,
      ringing: false,
      flux: 0,
      onset: false,
      onsetTime: 0,
    };
  }

  /**
   * Feed a block of mono samples. `blockStartTime` is the audio-clock time (s)
   * of `block[0]` (AudioWorkletGlobalScope.currentTime inside the worklet).
   */
  process(block: Float32Array, blockStartTime: number): void {
    const { fftSize, hopSize } = this.config;
    for (let i = 0; i < block.length; i++) {
      this.ring[this.writePos] = block[i];
      this.writePos = (this.writePos + 1) % fftSize;
      if (this.filled < fftSize) this.filled++;
      if (++this.sinceHop >= hopSize && this.filled >= fftSize) {
        this.sinceHop = 0;
        this.analyse(blockStartTime + i / this.sampleRate);
      }
    }
  }

  /** Clear history (e.g. after the input device changes). */
  reset(): void {
    this.ring.fill(0);
    this.writePos = 0;
    this.filled = 0;
    this.sinceHop = 0;
    this.fluxCount = 0;
    this.fluxPos = 0;
    this.prevAbove = false;
    this.hasPrevSpec = false;
    this.lastOnsetTime = -Infinity;
    this.shortDb.fill(-Infinity);
    this.shortDbPos = 0;
    this.noiseDb = this.config.minRmsDb;
    this.residueUntil = -Infinity;
    this.residueOnset = -Infinity;
    this.residueAudible = false;
    this.magRingTime.fill(-Infinity);
    for (const m of this.magRing) m.fill(0);
  }

  private analyse(time: number): void {
    const cfg = this.config;
    const n = cfg.fftSize;
    const f = this.frame;
    f.time = time;
    f.onset = false;

    // ---- window + RMS (oldest sample first) ----
    let sumSq = 0;
    for (let i = 0; i < n; i++) {
      const x = this.ring[(this.writePos + i) % n];
      sumSq += x * x;
      this.re[i] = x * this.win[i];
      this.im[i] = 0;
    }
    const rms = Math.sqrt(sumSq / n);
    const rmsDb = rms > 0 ? 20 * Math.log10(rms) : -Infinity;
    f.rmsDb = rmsDb;

    // Room-noise tracker: drop fast, rise ~0.9 dB/s while sound is present.
    if (rmsDb < this.noiseDb) this.noiseDb = 0.5 * this.noiseDb + 0.5 * Math.max(rmsDb, -120);
    else this.noiseDb += 0.01;
    f.noiseDb = this.noiseDb;

    this.computeOnset(time, rmsDb);

    const gated = rmsDb >= cfg.minRmsDb && rmsDb >= this.noiseDb + cfg.noiseGateDb;
    const chroma = f.chroma;
    chroma.fill(0);
    f.ringing = false;
    const half = n >> 1;

    // On an onset, freeze the newest spectrum that ends before the onset as "residue".
    const recapture = f.onset && (f.onsetTime - this.residueOnset) * 1000 > cfg.residueRecaptureMs;
    if (f.onset && !recapture) {
      // Later note of a rolled chord: keep the residue from before the roll began.
      this.residueUntil = f.onsetTime + cfg.residueHoldMs / 1000;
    } else if (recapture) {
      this.residueOnset = f.onsetTime;
      let best = -1;
      for (let i = 0; i < RESIDUE_RING; i++) {
        const t = this.magRingTime[i];
        if (t <= f.onsetTime - 0.005 && (best < 0 || t > this.magRingTime[best])) best = i;
      }
      if (best >= 0 && Number.isFinite(this.magRingTime[best])) this.residue.set(this.magRing[best]);
      else this.residue.fill(0);
      let any = false;
      for (let k = 0; k < half && !any; k++) any = this.residue[k] > 0;
      this.residueAudible = any;
      this.residueUntil = f.onsetTime + cfg.residueHoldMs / 1000;
    }

    const slot = this.magRingPos;
    this.magRingPos = (this.magRingPos + 1) % RESIDUE_RING;
    this.magRingTime[slot] = time;
    if (!gated) {
      this.magRing[slot].fill(0); // quiet frame: nothing to carry over
      f.voiced = false;
      this.onFrame(f);
      return;
    }

    // ---- spectrum ----
    this.fft.transform(this.re, this.im);
    const ringSlot = this.magRing[slot];
    const subtract = time <= this.residueUntil && this.residueAudible;
    f.ringing = subtract;
    const alpha = cfg.residueOverSubtract;
    let maxMag = 0;
    for (let k = 0; k < half; k++) {
      const raw = Math.hypot(this.re[k], this.im[k]);
      ringSlot[k] = raw;
      const m = subtract ? Math.max(0, raw - alpha * this.residue[k]) : raw;
      this.mag[k] = m;
      if (m > maxMag) maxMag = m;
    }
    if (maxMag <= 0) {
      f.voiced = false;
      this.onFrame(f);
      return;
    }
    const g = cfg.logGamma / maxMag;
    for (let k = 0; k < half; k++) {
      const y = Math.log1p(g * this.mag[k]);
      this.logMag[k] = y;
      this.scratch[k] = y;
    }
    const floor = median(this.scratch, half) * cfg.floorMedianFactor + cfg.floorOffset;

    // ---- peaks → soft pitch-class mapping ----
    const Y = this.logMag;
    const binHz = this.sampleRate / n;
    let peaks = 0;
    for (let k = this.minBin; k <= this.maxBin; k++) {
      const b = Y[k];
      if (b <= floor || b <= Y[k - 1] || b < Y[k + 1]) continue;
      const a = Y[k - 1];
      const c = Y[k + 1];
      const denom = a - 2 * b + c;
      const p = denom !== 0 ? (0.5 * (a - c)) / denom : 0;
      const midi = freqToMidi((k + p) * binHz);
      const lo = Math.floor(midi);
      const frac = midi - lo;
      const w = b - floor;
      chroma[((lo % 12) + 12) % 12] += (1 - frac) * w;
      chroma[(((lo + 1) % 12) + 12) % 12] += frac * w;
      peaks++;
    }

    let norm = 0;
    for (let i = 0; i < 12; i++) norm += chroma[i] * chroma[i];
    norm = Math.sqrt(norm);
    if (peaks === 0 || norm === 0) {
      chroma.fill(0);
      f.voiced = false;
    } else {
      for (let i = 0; i < 12; i++) chroma[i] /= norm;
      f.voiced = true;
    }
    this.onFrame(f);
  }

  /** Positive log-spectral flux on the newest 1024 samples (sharper timing than the 4096 window). */
  private computeOnset(time: number, rmsDb: number): void {
    const cfg = this.config;
    const n = cfg.fftSize;
    const start = n - ONSET_FFT;
    let e = 0;
    for (let i = 0; i < ONSET_FFT; i++) {
      const x = this.ring[(this.writePos + start + i) % n];
      e += x * x;
      this.oRe[i] = x * this.onsetWin[i];
      this.oIm[i] = 0;
    }
    const shortDb = e > 0 ? 10 * Math.log10(e / ONSET_FFT) : -Infinity;
    let quietest = Infinity;
    for (let i = 0; i < 3; i++) quietest = Math.min(quietest, this.shortDb[i]);
    this.shortDb[this.shortDbPos] = shortDb;
    this.shortDbPos = (this.shortDbPos + 1) % 3;
    const rose = shortDb - quietest >= cfg.onsetMinRiseDb;
    this.onsetFft.transform(this.oRe, this.oIm);
    const scale = 2 / this.onsetWinSum;
    let flux = 0;
    for (let k = this.oMinBin; k <= this.oMaxBin; k++) {
      const s = Math.log1p(1000 * scale * Math.hypot(this.oRe[k], this.oIm[k]));
      if (this.hasPrevSpec) {
        const d = s - this.prevOnsetSpec[k];
        if (d > 0) flux += d;
      }
      this.onsetSpec[k] = s;
    }
    this.prevOnsetSpec.set(this.onsetSpec);
    this.hasPrevSpec = true;
    this.frame.flux = flux;

    // Adaptive threshold from recent history (excluding this frame).
    // Warm-up: no onsets until there is enough history to judge (first ~85 ms of frames).
    const warm = this.fluxCount >= WARMUP_FRAMES;
    let threshold = cfg.onsetMinFlux;
    if (this.fluxCount >= 3) {
      const len = this.fluxCount;
      for (let i = 0; i < len; i++) this.scratch[i] = this.fluxHistory[i];
      const med = median(this.scratch, len);
      for (let i = 0; i < len; i++) this.scratch[i] = Math.abs(this.fluxHistory[i] - med);
      const mad = median(this.scratch, len);
      threshold = Math.max(threshold, med + cfg.onsetK * mad, med * cfg.onsetMedianRatio);
    }
    this.fluxHistory[this.fluxPos] = flux;
    this.fluxPos = (this.fluxPos + 1) % this.fluxHistory.length;
    if (this.fluxCount < this.fluxHistory.length) this.fluxCount++;

    const above = warm && rose && flux > threshold && rmsDb >= cfg.minRmsDb;
    // Onset time ≈ centre of the short window.
    const onsetTime = time - ONSET_FFT / 2 / this.sampleRate;
    if (above && !this.prevAbove && (onsetTime - this.lastOnsetTime) * 1000 >= cfg.onsetRefractoryMs) {
      this.frame.onset = true;
      this.frame.onsetTime = onsetTime;
      this.lastOnsetTime = onsetTime;
    }
    this.prevAbove = above;
  }
}

/** Median of the first `len` entries of `a`. Reorders `a` (quickselect, O(n)). */
export function median(a: Float64Array, len: number): number {
  if (len <= 0) return 0;
  const k = len >> 1;
  const hi = select(a, 0, len - 1, k);
  if (len & 1) return hi;
  // Even length: the lower middle is the max of the left partition.
  let lo = -Infinity;
  for (let i = 0; i < k; i++) if (a[i] > lo) lo = a[i];
  return 0.5 * (lo + hi);
}

function select(a: Float64Array, left: number, right: number, k: number): number {
  while (left < right) {
    const pivot = a[(left + right) >> 1];
    let i = left;
    let j = right;
    while (i <= j) {
      while (a[i] < pivot) i++;
      while (a[j] > pivot) j--;
      if (i <= j) {
        const t = a[i];
        a[i] = a[j];
        a[j] = t;
        i++;
        j--;
      }
    }
    if (k <= j) right = j;
    else if (k >= i) left = i;
    else return a[k];
  }
  return a[k];
}
