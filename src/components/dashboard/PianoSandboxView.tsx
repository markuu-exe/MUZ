import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Eye,
  Keyboard,
  Minus,
  Music,
  Piano,
  Plus,
  RotateCcw,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { isBlackKey, midiToName } from '../../lib/theory/notes';
import {
  startSustainedNote,
  stopAllSustainedNotes,
  stopSustainedNote,
  type SandboxTone,
} from '../../lib/theory/playNote';
import {
  baseMidiForOctave,
  buildKeyToMidiMap,
  buildMidiToKeyLabelMap,
  DEFAULT_SANDBOX_OCTAVE,
  identifyChord,
  MAX_SANDBOX_OCTAVE,
  MIN_SANDBOX_OCTAVE,
  SANDBOX_SPAN_SEMITONES,
} from '../../lib/dashboard/sandboxKeyboard';
import GrandStaff from '../theory/GrandStaff';

const WHITE_W = 48;
const BLACK_W = 30;

const TONE_OPTIONS: ReadonlyArray<{ id: SandboxTone; label: string }> = [
  { id: 'piano', label: 'Grand Piano' },
  { id: 'electric', label: 'Electric Piano' },
  { id: 'synth', label: 'Warm Synth' },
  { id: 'organ', label: 'Organ' },
];

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

/**
 * Free-play piano studio. Supports polyphonic computer-keyboard play, pointer
 * clicks/glissando, Spacebar sustain pedal, octave shifting and live chord/staff readout.
 */
export default function PianoSandboxView() {
  const [octave, setOctave] = useState(DEFAULT_SANDBOX_OCTAVE);
  const [tone, setTone] = useState<SandboxTone>('piano');
  const [volume, setVolume] = useState(0.75);
  const [sustainLocked, setSustainLocked] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [showKeycaps, setShowKeycaps] = useState(true);
  const [showNoteNames, setShowNoteNames] = useState(true);
  const [pressedMidis, setPressedMidis] = useState<number[]>([]);
  const [sustainedMidis, setSustainedMidis] = useState<number[]>([]);
  const [lastPlayedLabel, setLastPlayedLabel] = useState<string>('Press any key or type A S D F…');

  const sustainActive = sustainLocked || spaceHeld;

  const pressedRef = useRef<Set<number>>(new Set());
  const sustainedRef = useRef<Set<number>>(new Set());
  const heldByKeyRef = useRef<Map<string, number>>(new Map());
  const pointerMidiRef = useRef<number | null>(null);
  const pointerDownRef = useRef(false);

  const toneRef = useRef(tone);
  toneRef.current = tone;
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const sustainRef = useRef(sustainActive);
  sustainRef.current = sustainActive;

  const baseMidi = baseMidiForOctave(octave);
  const endMidi = baseMidi + SANDBOX_SPAN_SEMITONES;

  const keyToMidi = useMemo(() => buildKeyToMidiMap(octave), [octave]);
  const keyToMidiRef = useRef(keyToMidi);
  keyToMidiRef.current = keyToMidi;

  const midiToKeyLabel = useMemo(() => buildMidiToKeyLabelMap(octave), [octave]);

  const { whites, blacks } = useMemo(() => {
    const w: number[] = [];
    const b: Array<{ midi: number; left: number }> = [];
    for (let m = baseMidi; m <= endMidi; m++) {
      if (isBlackKey(m)) b.push({ midi: m, left: w.length * WHITE_W - BLACK_W / 2 });
      else w.push(m);
    }
    return { whites: w, blacks: b };
  }, [baseMidi, endMidi]);

  const syncVisualSets = useCallback(() => {
    setPressedMidis([...pressedRef.current].sort((a, b) => a - b));
    setSustainedMidis([...sustainedRef.current].sort((a, b) => a - b));
  }, []);

  const triggerNoteOn = useCallback(
    (midi: number) => {
      sustainedRef.current.delete(midi);
      pressedRef.current.add(midi);
      startSustainedNote(midi, { tone: toneRef.current, volume: volumeRef.current });
      setLastPlayedLabel(midiToName(midi));
      syncVisualSets();
    },
    [syncVisualSets],
  );

  const triggerNoteOff = useCallback(
    (midi: number) => {
      if (!pressedRef.current.has(midi)) return;
      pressedRef.current.delete(midi);
      if (sustainRef.current) {
        sustainedRef.current.add(midi);
      } else {
        stopSustainedNote(midi);
      }
      syncVisualSets();
    },
    [syncVisualSets],
  );

  const silenceAll = useCallback(() => {
    stopAllSustainedNotes();
    pressedRef.current.clear();
    sustainedRef.current.clear();
    heldByKeyRef.current.clear();
    pointerMidiRef.current = null;
    pointerDownRef.current = false;
    setSpaceHeld(false);
    setSustainLocked(false);
    syncVisualSets();
  }, [syncVisualSets]);

  // Release sustained notes as soon as the sustain pedal is lifted.
  useEffect(() => {
    if (sustainActive) return;
    let changed = false;
    for (const midi of [...sustainedRef.current]) {
      sustainedRef.current.delete(midi);
      if (!pressedRef.current.has(midi)) {
        stopSustainedNote(midi);
      }
      changed = true;
    }
    if (changed) syncVisualSets();
  }, [sustainActive, syncVisualSets]);

  // Computer keyboard listener (polyphonic hold + Z/X octave + Space sustain + Esc silence).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat) setSpaceHeld(true);
        return;
      }
      if (e.repeat) return;

      const lower = e.key.toLowerCase();
      if (lower === 'escape') {
        silenceAll();
        return;
      }
      if (lower === 'z') {
        setOctave((o) => Math.max(MIN_SANDBOX_OCTAVE, o - 1));
        return;
      }
      if (lower === 'x') {
        setOctave((o) => Math.min(MAX_SANDBOX_OCTAVE, o + 1));
        return;
      }

      const midi = keyToMidiRef.current.get(lower);
      if (midi === undefined) return;
      if (lower === "'" || lower === ';') e.preventDefault();
      if (heldByKeyRef.current.has(lower)) return;

      heldByKeyRef.current.set(lower, midi);
      triggerNoteOn(midi);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpaceHeld(false);
        return;
      }
      const lower = e.key.toLowerCase();
      const midi = heldByKeyRef.current.get(lower);
      if (midi === undefined) return;
      heldByKeyRef.current.delete(lower);
      triggerNoteOff(midi);
    };

    const onBlur = () => {
      silenceAll();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [silenceAll, triggerNoteOff, triggerNoteOn]);

  // Stop any held pointer note if pointerup occurs outside the keyboard.
  useEffect(() => {
    const onPointerUp = () => {
      pointerDownRef.current = false;
      if (pointerMidiRef.current !== null) {
        triggerNoteOff(pointerMidiRef.current);
        pointerMidiRef.current = null;
      }
    };
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [triggerNoteOff]);

  // Silence voices when leaving Sandbox view.
  useEffect(() => () => stopAllSustainedNotes(0.05), []);

  const activeMidis = useMemo(() => {
    const set = new Set<number>([...pressedMidis, ...sustainedMidis]);
    return [...set].sort((a, b) => a - b);
  }, [pressedMidis, sustainedMidis]);

  const detectedChord = useMemo(() => identifyChord(activeMidis), [activeMidis]);

  const handleKeyPointerDown = (midi: number, e: React.PointerEvent) => {
    e.preventDefault();
    pointerDownRef.current = true;
    if (pointerMidiRef.current !== null && pointerMidiRef.current !== midi) {
      triggerNoteOff(pointerMidiRef.current);
    }
    pointerMidiRef.current = midi;
    triggerNoteOn(midi);
  };

  const handleKeyPointerEnter = (midi: number) => {
    if (!pointerDownRef.current) return;
    if (pointerMidiRef.current === midi) return;
    if (pointerMidiRef.current !== null) {
      triggerNoteOff(pointerMidiRef.current);
    }
    pointerMidiRef.current = midi;
    triggerNoteOn(midi);
  };

  const handleKeyPointerLeave = (midi: number) => {
    if (!pointerDownRef.current) return;
    if (pointerMidiRef.current === midi) {
      triggerNoteOff(midi);
      pointerMidiRef.current = null;
    }
  };

  const pressedSet = useMemo(() => new Set(pressedMidis), [pressedMidis]);
  const sustainedSet = useMemo(() => new Set(sustainedMidis), [sustainedMidis]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20">
      {/* Header & Live Readout + Grand Staff */}
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="flex flex-col justify-between rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                <Piano className="h-3.5 w-3.5" aria-hidden="true" /> Free Play · No Hearts Used
              </div>
              <h2 className="mt-3 text-2xl font-black text-white">Piano Sandbox</h2>
              <p className="mt-1 text-sm text-slate-400">
                Play chords, melodies, and scales freely with your computer keyboard or mouse.
              </p>
            </div>
            <button
              type="button"
              onClick={silenceAll}
              title="Silence all notes (Esc)"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-950/70 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-violet-500/50 hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Silence
            </button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 rounded-2xl border border-slate-800/90 bg-slate-950/70 p-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Active Notes
              </p>
              <div className="mt-2 flex min-h-[32px] flex-wrap items-center gap-1.5">
                {activeMidis.length > 0 ? (
                  activeMidis.map((midi) => (
                    <span
                      key={midi}
                      className={cn(
                        'rounded-lg px-2.5 py-1 text-xs font-bold',
                        pressedSet.has(midi)
                          ? 'bg-violet-600 text-white'
                          : 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40',
                      )}
                    >
                      {midiToName(midi)}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500">{lastPlayedLabel}</span>
                )}
              </div>
            </div>

            <div className="border-l border-slate-800/90 pl-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Detected Chord
              </p>
              <div className="mt-2 flex min-h-[32px] items-center gap-2">
                {detectedChord ? (
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-base font-black text-emerald-300">
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    {detectedChord}
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">
                    {activeMidis.length === 0
                      ? 'Play 3+ keys for chord detection'
                      : activeMidis.length < 3
                        ? 'Add more notes for a triad'
                        : 'Custom cluster'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Live Grand Staff */}
        <div className="flex flex-col justify-between rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-300">
              <Music className="h-4 w-4" aria-hidden="true" /> Live Staff
            </span>
            <span className="text-[11px] font-medium text-slate-400">
              {midiToName(baseMidi)} – {midiToName(endMidi)}
            </span>
          </div>
          <div className="mt-3 flex flex-1 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-2 text-slate-200">
            <GrandStaff
              notes={activeMidis}
              chord
              color={detectedChord ? '#6ee7b7' : '#a78bfa'}
            />
          </div>
        </div>
      </div>

      {/* Instrument Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-900/90 px-6 py-4 shadow-xl">
        {/* Tone Presets */}
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Sound preset">
          {TONE_OPTIONS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTone(t.id)}
              className={cn(
                'rounded-xl px-3 py-1.5 text-xs font-bold transition',
                tone === t.id
                  ? 'bg-violet-600 text-white shadow-[0_0_12px_rgba(139,92,246,0.4)]'
                  : 'border border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Octave, Sustain, Volume & View Toggles */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Octave Shift */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/70 p-1">
            <button
              type="button"
              onClick={() => setOctave((o) => Math.max(MIN_SANDBOX_OCTAVE, o - 1))}
              disabled={octave <= MIN_SANDBOX_OCTAVE}
              aria-label="Octave down (Z)"
              title="Octave down (Z)"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 transition hover:bg-slate-800 disabled:opacity-30"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="px-2 text-xs font-bold text-white">
              Octave {octave}
            </span>
            <button
              type="button"
              onClick={() => setOctave((o) => Math.min(MAX_SANDBOX_OCTAVE, o + 1))}
              disabled={octave >= MAX_SANDBOX_OCTAVE}
              aria-label="Octave up (X)"
              title="Octave up (X)"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 transition hover:bg-slate-800 disabled:opacity-30"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Sustain Pedal */}
          <button
            type="button"
            onClick={() => setSustainLocked((s) => !s)}
            aria-pressed={sustainActive}
            title="Sustain pedal (or hold Space)"
            className={cn(
              'inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold transition',
              sustainActive
                ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.25)]'
                : 'border-slate-800 bg-slate-950/70 text-slate-400 hover:text-white',
            )}
          >
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                sustainActive ? 'bg-emerald-400' : 'bg-slate-600',
              )}
            />
            Sustain {spaceHeld ? '(Space)' : sustainLocked ? 'On' : 'Off'}
          </button>

          {/* Keycap & Label Toggles */}
          <button
            type="button"
            onClick={() => setShowKeycaps((v) => !v)}
            aria-pressed={showKeycaps}
            title="Toggle computer key hints"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition',
              showKeycaps
                ? 'border-violet-500/50 bg-violet-500/15 text-violet-200'
                : 'border-slate-800 bg-slate-950/70 text-slate-400 hover:text-white',
            )}
          >
            <Keyboard className="h-3.5 w-3.5" aria-hidden="true" />
            Keys
          </button>

          <button
            type="button"
            onClick={() => setShowNoteNames((v) => !v)}
            aria-pressed={showNoteNames}
            title="Toggle note names"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition',
              showNoteNames
                ? 'border-violet-500/50 bg-violet-500/15 text-violet-200'
                : 'border-slate-800 bg-slate-950/70 text-slate-400 hover:text-white',
            )}
          >
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            Notes
          </button>

          {/* Volume */}
          <label className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-1.5 text-xs text-slate-300">
            <Volume2 className="h-3.5 w-3.5 text-violet-400" aria-hidden="true" />
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label="Sandbox volume"
              className="w-20 accent-violet-500"
            />
          </label>
        </div>
      </div>

      {/* Playable 2-Octave Keyboard */}
      <div className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-2xl">
        <div className="overflow-x-auto pb-2">
          <div
            className="relative mx-auto select-none"
            style={{ width: whites.length * WHITE_W, height: 196 }}
          >
            <div className="flex">
              {whites.map((midi) => {
                const isPressed = pressedSet.has(midi);
                const isSustained = !isPressed && sustainedSet.has(midi);
                const keycap = midiToKeyLabel.get(midi);
                return (
                  <button
                    key={midi}
                    type="button"
                    aria-label={`Play ${midiToName(midi)}`}
                    onPointerDown={(e) => handleKeyPointerDown(midi, e)}
                    onPointerEnter={() => handleKeyPointerEnter(midi)}
                    onPointerLeave={() => handleKeyPointerLeave(midi)}
                    style={{ width: WHITE_W, height: 192 }}
                    className={cn(
                      'relative flex flex-col items-center justify-end gap-1.5 rounded-b-xl border border-[#475569] pb-3 transition-transform duration-75 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400',
                      isPressed
                        ? 'translate-y-1 bg-gradient-to-b from-[#ddd6fe] to-[#a78bfa] text-[#1e1b4b] shadow-[0_2px_0_#6d28d9,0_0_20px_rgba(167,139,250,0.65)]'
                        : isSustained
                          ? 'translate-y-0.5 bg-gradient-to-b from-[#d1fae5] to-[#6ee7b7] text-[#064e3b] shadow-[0_3px_0_#059669,0_0_18px_rgba(110,231,183,0.5)]'
                          : 'bg-gradient-to-b from-[#ffffff] to-[#e2e8f0] text-[#475569] shadow-[0_6px_0_#94a3b8] hover:from-[#f8fafc] hover:to-[#cbd5e1]',
                    )}
                  >
                    {showKeycaps && keycap && (
                      <span
                        className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-md border text-[11px] font-extrabold uppercase',
                          isPressed
                            ? 'border-[#6d28d9] bg-[#7c3aed] text-[#ffffff]'
                            : isSustained
                              ? 'border-[#059669] bg-[#10b981] text-[#ffffff]'
                              : 'border-[#cbd5e1] bg-[#f1f5f9] text-[#334155]',
                        )}
                      >
                        {keycap}
                      </span>
                    )}
                    {showNoteNames && (
                      <span className="text-[11px] font-bold tracking-tight opacity-85">
                        {midiToName(midi)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {blacks.map(({ midi, left }) => {
              const isPressed = pressedSet.has(midi);
              const isSustained = !isPressed && sustainedSet.has(midi);
              const keycap = midiToKeyLabel.get(midi);
              return (
                <button
                  key={midi}
                  type="button"
                  aria-label={`Play ${midiToName(midi)}`}
                  onPointerDown={(e) => handleKeyPointerDown(midi, e)}
                  onPointerEnter={() => handleKeyPointerEnter(midi)}
                  onPointerLeave={() => handleKeyPointerLeave(midi)}
                  style={{ left, width: BLACK_W, height: 118 }}
                  className={cn(
                    'absolute top-0 z-10 flex flex-col items-center justify-end gap-1 rounded-b-lg border border-[#334155] pb-2.5 transition-transform duration-75 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400',
                    isPressed
                      ? 'translate-y-0.5 bg-gradient-to-b from-[#8b5cf6] to-[#6d28d9] text-[#ffffff] shadow-[0_2px_0_#4c1d95,0_0_18px_rgba(139,92,246,0.75)]'
                      : isSustained
                        ? 'bg-gradient-to-b from-[#34d399] to-[#059669] text-[#ffffff] shadow-[0_3px_0_#064e3b,0_0_16px_rgba(52,211,153,0.6)]'
                        : 'bg-gradient-to-b from-[#1e293b] to-[#020617] text-[#cbd5e1] shadow-[0_5px_0_#020617] hover:from-[#334155] hover:to-[#0f172a]',
                  )}
                >
                  {showKeycaps && keycap && (
                    <span className="text-[10px] font-extrabold uppercase">{keycap}</span>
                  )}
                  {showNoteNames && (
                    <span className="text-[9px] font-semibold opacity-75">
                      {midiToName(midi).replace(/\d+$/, '')}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Shortcut Legend */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-slate-800/80 pt-4 text-xs text-slate-400">
          <span>
            <strong className="text-slate-200">A – &apos;</strong> White keys
          </span>
          <span>
            <strong className="text-slate-200">W E · T Y U · O P</strong> Black keys
          </span>
          <span>
            <strong className="text-slate-200">Z / X</strong> Shift octave
          </span>
          <span>
            <strong className="text-slate-200">Hold Space</strong> Sustain pedal
          </span>
          <span>
            <strong className="text-slate-200">Esc</strong> Silence all
          </span>
        </div>
      </div>
    </div>
  );
}
