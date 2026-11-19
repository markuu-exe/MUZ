/**
 * AI-2 (dev-only): replay one recorded clip through the UNCHANGED live pipeline,
 * ChromaFrameProcessor → ChordVerifier / PitchVerifier / NoteVerifier, and
 * collect every attempt verdict. Used by scripts/eval/audio-eval.ts; nothing in
 * the shipped app imports this module.
 *
 * Frames are built the way AudioInputService builds them for the drill
 * (tMs, chroma, voiced, ringing, onset, onsetMs — 0 when not an onset — pitchHz,
 * clarity), on the clip's own clock (ms from the first sample). Each verifier is
 * fed directly, without the WaitStateMachine: no posture latch, no 15 s timeout,
 * no hearts, so every strike in the clip is judged.
 */
import { ChordMatcher } from '../chords/ChordMatcher';
import { ChordParseError, parseChord, type ChordSpec } from '../chords/vocabulary';
import { ChromaFrameProcessor } from '../dsp/ChromaFrameProcessor';
import { PITCH_CLASS_NAMES, midiToNoteName } from '../dsp/pitch';
import { NoteMatcher } from '../notes/NoteMatcher';
import { PitchVerifier } from '../notes/PitchVerifier';
import { ChordVerifier, type AcousticFrame, type AttemptKind, type AttemptResult } from '../practice/ChordVerifier';
import { NoteVerifier } from '../practice/NoteVerifier';

export type EvalTarget =
  | { kind: 'note'; midi: number; label: string }
  | { kind: 'chord'; chord: ChordSpec; label: string };

/** `pitch` = PitchVerifier (live default), `chroma-note` = NoteVerifier (comparison), `chord` = ChordVerifier. */
export type VerifierId = 'pitch' | 'chroma-note' | 'chord';

export interface EvalAttempt {
  kind: AttemptKind;
  onsetMs: number;
  decidedMs: number;
  /** decidedMs − onsetMs: strike to verdict. */
  latencyMs: number;
  /** What the verifier heard: "A3" (pitch), "A" (chroma note), "Am" (chord). Null when nothing was heard. */
  lastHeard: string | null;
  passRatio: number;
  voicedRatio: number;
}

export interface VerifierRun {
  verifier: VerifierId;
  attempts: EvalAttempt[];
  /** An attempt was still open when the clip ended (leave ≥ 1 s after the last strike). */
  openAtEnd: boolean;
}

export interface ClipEvaluation {
  sampleRate: number;
  durationMs: number;
  /** Every onset the processor reported, in ms from the start of the clip. */
  onsetsMs: number[];
  runs: VerifierRun[];
}

export type ClipVerdict = 'accepted' | 'rejected' | 'no attempt';

const NOTE_RE = /^([A-Ga-g])([#b♯♭]?)(-?\d)$/;
const LETTER: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const MIN_MIDI = 21; // A0
const MAX_MIDI = 108; // C8

/** `note:69`, `note:A4`, `note:C#4`, `note:Bb3`, `chord:Am`, `chord:G_Maj`. Throws an Error naming the problem. */
export function parseTarget(text: string): EvalTarget {
  const s = text.trim();
  const colon = s.indexOf(':');
  const kind = colon < 0 ? '' : s.slice(0, colon).trim().toLowerCase();
  const value = colon < 0 ? '' : s.slice(colon + 1).trim();
  if (kind === 'note') {
    let midi: number;
    if (/^\d+$/.test(value)) {
      midi = Number(value);
    } else {
      const m = NOTE_RE.exec(value);
      if (!m) throw new Error(`target "${text}": note must be a MIDI number or a name like A4, C#4, Bb3`);
      const acc = m[2] === '#' || m[2] === '♯' ? 1 : m[2] === 'b' || m[2] === '♭' ? -1 : 0;
      midi = 12 * (Number(m[3]) + 1) + LETTER[m[1].toUpperCase()] + acc;
    }
    if (midi < MIN_MIDI || midi > MAX_MIDI) throw new Error(`target "${text}": note must be on the piano, MIDI ${MIN_MIDI}–${MAX_MIDI}`);
    return { kind: 'note', midi, label: midiToNoteName(midi) };
  }
  if (kind === 'chord') {
    try {
      const chord = parseChord(value);
      return { kind: 'chord', chord, label: chord.label };
    } catch (e) {
      if (e instanceof ChordParseError) throw new Error(`target "${text}": unrecognised chord "${value}"`);
      throw e;
    }
  }
  throw new Error(`target "${text}": use note:<MIDI or name> or chord:<symbol>`);
}

/** Render-quantum size the AudioWorklet receives. */
const QUANTUM = 128;

/**
 * Feed mono samples through a fresh ChromaFrameProcessor in 128-sample quanta,
 * as chroma.worklet.ts does, and hand each frame on as a drill AcousticFrame.
 * The frame (and its chroma array) is reused: copy what you keep.
 */
export function replay(samples: Float32Array, sampleRate: number, onFrame: (frame: AcousticFrame) => void): void {
  const frame: AcousticFrame = {
    tMs: 0, chroma: new Float32Array(12), voiced: false, ringing: false, onset: false, onsetMs: 0, pitchHz: null, clarity: 0,
  };
  const proc = new ChromaFrameProcessor(sampleRate, (f) => {
    frame.tMs = f.time * 1000;
    frame.chroma = f.chroma;
    frame.voiced = f.voiced;
    frame.ringing = f.ringing;
    frame.onset = f.onset;
    frame.onsetMs = f.onset ? f.onsetTime * 1000 : 0;
    frame.pitchHz = f.pitchHz;
    frame.clarity = f.clarity;
    onFrame(frame);
  });
  for (let i = 0; i < samples.length; i += QUANTUM) {
    proc.process(samples.subarray(i, Math.min(i + QUANTUM, samples.length)), i / sampleRate);
  }
}

const chordMatcher = new ChordMatcher();
const noteMatcher = new NoteMatcher();

interface Lane {
  id: VerifierId;
  push(frame: AcousticFrame): AttemptResult | null;
  isOpen(): boolean;
  heard(result: AttemptResult): string | null;
  attempts: EvalAttempt[];
}

function lanes(target: EvalTarget): Lane[] {
  if (target.kind === 'chord') {
    const v = new ChordVerifier(chordMatcher, target.chord);
    return [{
      id: 'chord', attempts: [], push: (f) => v.push(f), isOpen: () => v.isOpen,
      // Same as PracticeDrill.describeHeard: the closest competing chord on a miss.
      heard: (r) => (r.kind === 'match' ? target.label : r.detail?.closest.label || null),
    }];
  }
  const pitch = new PitchVerifier(target.midi);
  const chroma = new NoteVerifier(noteMatcher, target.midi);
  return [
    {
      id: 'pitch', attempts: [], push: (f) => pitch.push(f), isOpen: () => pitch.isOpen,
      heard: () => (pitch.lastHeardMidi >= 0 ? midiToNoteName(pitch.lastHeardMidi) : null),
    },
    {
      id: 'chroma-note', attempts: [], push: (f) => chroma.push(f), isOpen: () => chroma.isOpen,
      heard: () => (chroma.lastHeardPc >= 0 ? PITCH_CLASS_NAMES[chroma.lastHeardPc] : null),
    },
  ];
}

/** Replay a mono clip and collect every attempt each relevant verifier decides. */
export function evaluateClip(samples: Float32Array, sampleRate: number, target: EvalTarget): ClipEvaluation {
  const ls = lanes(target);
  const onsetsMs: number[] = [];
  replay(samples, sampleRate, (frame) => {
    if (frame.onset) onsetsMs.push(frame.onsetMs);
    for (const lane of ls) {
      const r = lane.push(frame);
      if (!r) continue;
      lane.attempts.push({
        kind: r.kind,
        onsetMs: r.onsetMs,
        decidedMs: r.decidedMs,
        latencyMs: r.decidedMs - r.onsetMs,
        lastHeard: lane.heard(r),
        passRatio: r.passRatio,
        voicedRatio: r.voicedRatio,
      });
    }
  });
  return {
    sampleRate,
    durationMs: (samples.length / sampleRate) * 1000,
    onsetsMs,
    runs: ls.map((l) => ({ verifier: l.id, attempts: l.attempts, openAtEnd: l.isOpen() })),
  };
}

/** One-word summary of a clip for one verifier: its first judged (match / miss) attempt. */
export function clipVerdict(run: VerifierRun): ClipVerdict {
  const first = run.attempts.find((a) => a.kind !== 'unvoiced');
  if (!first) return 'no attempt';
  return first.kind === 'match' ? 'accepted' : 'rejected';
}
