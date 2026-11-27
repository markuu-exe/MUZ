/**
 * The performance-mode metronome: a short burst of high-passed noise instead of a pitched
 * beep. The microphone is listening while you play, and a pitched click (or a backing chord
 * from the speakers) could be graded as your note; unpitched noise has no pitch class or
 * clear pitch, so the note and chord graders ignore it. Count-in ticks are louder.
 */
const buffers = new WeakMap<BaseAudioContext, AudioBuffer>();

function noise(ctx: BaseAudioContext): AudioBuffer {
  let b = buffers.get(ctx);
  if (!b) {
    b = ctx.createBuffer(1, Math.round(ctx.sampleRate * 0.04), ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    buffers.set(ctx, b);
  }
  return b;
}

/** Gain of one tick: count-in loudest, bar starts next, other beats soft. */
export function clickGain(accent: boolean, countIn: boolean): number {
  if (countIn) return accent ? 0.55 : 0.4;
  return accent ? 0.3 : 0.18;
}

export function scheduleNoiseClick(ctx: AudioContext, time: number, accent: boolean, countIn: boolean): void {
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = accent || countIn ? 3500 : 5000;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(clickGain(accent, countIn), time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
  src.connect(hp).connect(gain).connect(ctx.destination);
  src.start(time);
  src.stop(time + 0.04);
}
