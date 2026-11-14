export * from './config';
export { FFT, hannWindow } from './dsp/fft';
export { ChromaFrameProcessor, type ChromaFrame } from './dsp/ChromaFrameProcessor';
export { PITCH_CLASS_NAMES, freqToMidi, midiToFreq } from './dsp/pitch';
export { parseChord, makeChord, fullVocabulary, ChordParseError, type ChordSpec, type ChordQuality } from './chords/vocabulary';
export { ChordMatcher, harmonicTemplate, partialVoicings, type ChordMatch } from './chords/ChordMatcher';
export {
  ChordVerifier,
  type AcousticFrame,
  type AcousticVerifier,
  type AttemptKind,
  type AttemptResult,
} from './practice/ChordVerifier';
export { WaitStateMachine, type WaitState, type WaitStateEvents, type HeartLossReason } from './practice/WaitStateMachine';
export { AudioError, toMicError, type AudioErrorCode } from './errors/AudioError';
export { AudioInputService, type AudioInputStatus, type AudioInputFrame, type AudioInputOptions } from './input/AudioInputService';
