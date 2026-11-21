/**
 * AI-2 (dev-only): RIFF/WAVE reader for the offline audio evaluation harness
 * (`npm run eval:audio`). Nothing in the shipped app imports this module.
 *
 * Supported: PCM 16/24/32-bit and IEEE float 32-bit, any channel count,
 * WAVE_FORMAT_EXTENSIBLE with a PCM or float sub-format, unknown chunks
 * (LIST, JUNK, bext, …) skipped with their odd-size pad byte, fmt after data,
 * and a data size larger than the file (streaming recorders) clamped to the
 * whole frames present. Everything else throws an Error that says why.
 */

export interface WavAudio {
  sampleRate: number;
  /** One array per channel, samples in [-1, 1). */
  channels: Float32Array[];
}

const FORMAT_PCM = 1;
const FORMAT_FLOAT = 3;
const FORMAT_EXTENSIBLE = 0xfffe;
/** KSDATAFORMAT_SUBTYPE_* GUIDs share these 14 bytes after the 2-byte format tag. */
const GUID_TAIL = [0x00, 0x00, 0x00, 0x00, 0x10, 0x00, 0x80, 0x00, 0x00, 0xaa, 0x00, 0x38, 0x9b, 0x71];

function fourcc(b: Uint8Array, at: number): string {
  return String.fromCharCode(b[at], b[at + 1], b[at + 2], b[at + 3]);
}

export function readWav(buf: Uint8Array): WavAudio {
  if (buf.length < 12 || fourcc(buf, 0) !== 'RIFF' || fourcc(buf, 8) !== 'WAVE') {
    const head = buf.length >= 4 ? fourcc(buf, 0) : '';
    const hint = head === 'RIFX' ? ' (big-endian RIFX is not supported)' : head === 'RF64' ? ' (RF64 is not supported)' : '';
    throw new Error(`not a WAV file: missing RIFF/WAVE header${hint}`);
  }
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

  let fmtAt = -1;
  let fmtSize = 0;
  let dataAt = -1;
  let dataSize = 0;
  let p = 12;
  while (p + 8 <= buf.length) {
    const id = fourcc(buf, p);
    const size = dv.getUint32(p + 4, true);
    const body = p + 8;
    if (id === 'fmt ' && fmtAt < 0) {
      fmtAt = body;
      fmtSize = size;
    } else if (id === 'data' && dataAt < 0) {
      dataAt = body;
      dataSize = Math.min(size, buf.length - body);
    }
    if (id === 'data' && size > buf.length - body) break; // oversized data runs to EOF
    p = body + size + (size & 1);
  }
  if (fmtAt < 0) throw new Error('WAV has no fmt chunk');
  if (dataAt < 0) throw new Error('WAV has no data chunk');
  if (fmtSize < 16 || fmtAt + 16 > buf.length) throw new Error(`WAV fmt chunk is too short (${fmtSize} bytes)`);

  let tag = dv.getUint16(fmtAt, true);
  const channelCount = dv.getUint16(fmtAt + 2, true);
  const sampleRate = dv.getUint32(fmtAt + 4, true);
  const blockAlign = dv.getUint16(fmtAt + 12, true);
  const bits = dv.getUint16(fmtAt + 14, true);

  if (tag === FORMAT_EXTENSIBLE) {
    if (fmtSize < 40 || fmtAt + 40 > buf.length) throw new Error('WAVE_FORMAT_EXTENSIBLE fmt chunk is too short');
    const sub = fmtAt + 24;
    const subTag = dv.getUint16(sub, true);
    const standard = GUID_TAIL.every((b, i) => buf[sub + 2 + i] === b);
    if (!standard) throw new Error('WAVE_FORMAT_EXTENSIBLE with a non-standard sub-format GUID is not supported');
    tag = subTag;
  }

  if (tag !== FORMAT_PCM && tag !== FORMAT_FLOAT) {
    throw new Error(`unsupported WAV format tag ${tag}: only PCM (1) and IEEE float (3) are supported`);
  }
  if (tag === FORMAT_PCM && bits !== 16 && bits !== 24 && bits !== 32) {
    throw new Error(`unsupported ${bits}-bit PCM: use 16, 24 or 32-bit`);
  }
  if (tag === FORMAT_FLOAT && bits !== 32) throw new Error(`unsupported ${bits}-bit float: use 32-bit float`);
  if (channelCount < 1) throw new Error('WAV declares 0 channels');
  if (sampleRate < 1) throw new Error('WAV declares a sample rate of 0');
  const bytesPerSample = bits / 8;
  if (blockAlign !== channelCount * bytesPerSample) {
    throw new Error(`WAV block align ${blockAlign} does not match ${channelCount} channel(s) × ${bits}-bit`);
  }

  const frames = Math.floor(dataSize / blockAlign);
  const channels = Array.from({ length: channelCount }, () => new Float32Array(frames));
  for (let f = 0; f < frames; f++) {
    const base = dataAt + f * blockAlign;
    for (let c = 0; c < channelCount; c++) {
      const at = base + c * bytesPerSample;
      let v: number;
      if (tag === FORMAT_FLOAT) v = dv.getFloat32(at, true);
      else if (bits === 16) v = dv.getInt16(at, true) / 32768;
      else if (bits === 24) v = (((buf[at] | (buf[at + 1] << 8) | (buf[at + 2] << 16)) << 8) >> 8) / 8388608;
      else v = dv.getInt32(at, true) / 2147483648;
      channels[c][f] = v;
    }
  }
  return { sampleRate, channels };
}

/**
 * Down-mix to mono exactly like chroma.worklet.ts: sum the channels into a
 * Float32Array in channel order, then multiply by 1 / channelCount.
 * A single channel is returned as is.
 */
export function downmix(channels: readonly Float32Array[]): Float32Array {
  if (channels.length === 0) throw new Error('no channels to down-mix');
  if (channels.length === 1) return channels[0];
  const m = new Float32Array(channels[0].length);
  for (const ch of channels) for (let i = 0; i < ch.length; i++) m[i] += ch[i];
  const g = 1 / channels.length;
  for (let i = 0; i < m.length; i++) m[i] *= g;
  return m;
}

export type WavEncoding = 'pcm16' | 'pcm24' | 'float32';

/** Minimal WAV writer for tests and synthetic demo clips. Samples are clipped to [-1, 1]. */
export function encodeWav(channels: readonly Float32Array[], sampleRate: number, encoding: WavEncoding = 'pcm16'): Uint8Array {
  const nch = channels.length;
  const frames = nch > 0 ? channels[0].length : 0;
  const bytes = encoding === 'pcm16' ? 2 : encoding === 'pcm24' ? 3 : 4;
  const blockAlign = nch * bytes;
  const dataSize = frames * blockAlign;
  const pad = dataSize & 1;
  const out = new Uint8Array(44 + dataSize + pad);
  const dv = new DataView(out.buffer);
  const put = (at: number, s: string) => {
    for (let i = 0; i < 4; i++) out[at + i] = s.charCodeAt(i);
  };
  put(0, 'RIFF');
  dv.setUint32(4, 36 + dataSize + pad, true);
  put(8, 'WAVE');
  put(12, 'fmt ');
  dv.setUint32(16, 16, true);
  dv.setUint16(20, encoding === 'float32' ? FORMAT_FLOAT : FORMAT_PCM, true);
  dv.setUint16(22, nch, true);
  dv.setUint32(24, sampleRate, true);
  dv.setUint32(28, sampleRate * blockAlign, true);
  dv.setUint16(32, blockAlign, true);
  dv.setUint16(34, bytes * 8, true);
  put(36, 'data');
  dv.setUint32(40, dataSize, true);
  for (let f = 0; f < frames; f++) {
    for (let c = 0; c < nch; c++) {
      const at = 44 + f * blockAlign + c * bytes;
      const x = Math.max(-1, Math.min(1, channels[c][f]));
      if (encoding === 'float32') dv.setFloat32(at, x, true);
      else if (encoding === 'pcm16') dv.setInt16(at, Math.max(-32768, Math.min(32767, Math.round(x * 32768))), true);
      else {
        const v = Math.max(-8388608, Math.min(8388607, Math.round(x * 8388608)));
        out[at] = v & 0xff;
        out[at + 1] = (v >> 8) & 0xff;
        out[at + 2] = (v >> 16) & 0xff;
      }
    }
  }
  return out;
}
