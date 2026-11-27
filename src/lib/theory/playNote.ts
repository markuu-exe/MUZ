import { midiToFrequency } from "./notes";

export type SandboxTone = "piano" | "electric" | "synth" | "organ";

interface ActiveVoice {
  stop: (releaseSec?: number) => void;
}

let ctx: AudioContext | null = null;
const activeVoices = new Map<number, ActiveVoice>();

function getAudioContext(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function playNote(midi: number, duration: number = 0.8): void {
  const audio = getAudioContext();

  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "triangle";
  osc.frequency.value = midiToFrequency(midi);

  const t = audio.currentTime;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.4, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

/**
 * Starts a sustained polyphonic note for interactive sandbox play.
 * Calling again on the same MIDI key cleanly releases the previous voice first.
 */
export function startSustainedNote(
  midi: number,
  options: { tone?: SandboxTone; volume?: number } = {},
): void {
  stopSustainedNote(midi, 0.03);

  const audio = getAudioContext();
  const tone = options.tone ?? "piano";
  const level = Math.max(0.02, Math.min(1, options.volume ?? 0.65)) * 0.28;
  const freq = midiToFrequency(midi);
  const now = audio.currentTime;

  const master = audio.createGain();
  const filter = audio.createBiquadFilter();
  filter.type = "lowpass";
  master.connect(filter);
  filter.connect(audio.destination);

  const oscs: OscillatorNode[] = [];
  const addOsc = (type: OscillatorType, ratio: number, gainScale: number, detune = 0) => {
    const osc = audio.createOscillator();
    const g = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq * ratio, now);
    if (detune !== 0) osc.detune.setValueAtTime(detune, now);
    g.gain.setValueAtTime(gainScale, now);
    osc.connect(g);
    g.connect(master);
    osc.start(now);
    oscs.push(osc);
    return g;
  };

  if (tone === "piano") {
    filter.frequency.setValueAtTime(Math.min(5200, freq * 7), now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(420, freq * 2.1), now + 1.4);
    addOsc("triangle", 1, 1);
    addOsc("sine", 2, 0.26);
    addOsc("sine", 3, 0.08);
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(level, now + 0.012);
    master.gain.exponentialRampToValueAtTime(level * 0.32, now + 1.1);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 4.5);
  } else if (tone === "electric") {
    filter.frequency.setValueAtTime(Math.min(4400, freq * 5), now);
    addOsc("sine", 1, 0.9);
    const tine = addOsc("sine", 3, 0.24);
    tine.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(level, now + 0.01);
    master.gain.exponentialRampToValueAtTime(level * 0.35, now + 1.4);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 4.0);
  } else if (tone === "synth") {
    filter.frequency.setValueAtTime(2200, now);
    addOsc("sawtooth", 1, 0.45, -6);
    addOsc("sawtooth", 1, 0.45, 6);
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(level * 0.85, now + 0.03);
  } else {
    // organ: steady harmonic drawbars while held
    filter.frequency.setValueAtTime(3800, now);
    addOsc("sine", 1, 0.7);
    addOsc("sine", 2, 0.35);
    addOsc("sine", 4, 0.16);
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(level * 0.9, now + 0.02);
  }

  let stopped = false;
  const voice: ActiveVoice = {
    stop(releaseSec = 0.18) {
      if (stopped) return;
      stopped = true;
      const t = audio.currentTime;
      master.gain.cancelScheduledValues(t);
      const current = Math.max(0.0001, master.gain.value);
      master.gain.setValueAtTime(current, t);
      master.gain.exponentialRampToValueAtTime(0.0001, t + releaseSec);
      const stopAt = t + releaseSec + 0.04;
      for (const osc of oscs) {
        try {
          osc.stop(stopAt);
        } catch {
          // oscillator already stopped
        }
      }
    },
  };
  activeVoices.set(midi, voice);
}

export function stopSustainedNote(midi: number, releaseSec = 0.18): void {
  const voice = activeVoices.get(midi);
  if (!voice) return;
  activeVoices.delete(midi);
  voice.stop(releaseSec);
}

export function stopAllSustainedNotes(releaseSec = 0.08): void {
  for (const [midi, voice] of activeVoices.entries()) {
    activeVoices.delete(midi);
    voice.stop(releaseSec);
  }
}
