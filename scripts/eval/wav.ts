/**
 * AI-2: `readWav(buf: Uint8Array): { sampleRate; channels: Float32Array[] }` for the
 * eval scripts. The implementation and its tests live in src/audio/eval/ so the
 * default Vitest run covers them; this module is the scripts-side entry point.
 */
export { downmix, encodeWav, readWav, type WavAudio, type WavEncoding } from '../../src/audio/eval/wav';
