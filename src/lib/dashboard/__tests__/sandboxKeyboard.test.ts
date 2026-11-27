import { describe, expect, it } from 'vitest';
import {
  baseMidiForOctave,
  buildKeyToMidiMap,
  buildMidiToKeyLabelMap,
  identifyChord,
} from '../sandboxKeyboard';

describe('sandboxKeyboard', () => {
  it('computes base MIDI and clamps octave range', () => {
    expect(baseMidiForOctave(4)).toBe(60); // C4
    expect(baseMidiForOctave(1)).toBe(36); // clamped to C2
    expect(baseMidiForOctave(9)).toBe(72); // clamped to C5
  });

  it('maps home row and sharp keys across 1.5 octaves', () => {
    const keyMap = buildKeyToMidiMap(4);
    expect(keyMap.get('a')).toBe(60); // C4
    expect(keyMap.get('w')).toBe(61); // C#4
    expect(keyMap.get('d')).toBe(64); // E4
    expect(keyMap.get('g')).toBe(67); // G4
    expect(keyMap.get('k')).toBe(72); // C5
    expect(keyMap.get("'")).toBe(77); // F5

    const labels = buildMidiToKeyLabelMap(4);
    expect(labels.get(60)).toBe('A');
    expect(labels.get(61)).toBe('W');
    expect(labels.get(78)).toBeUndefined();
  });

  it('identifies root-position and inverted chords', () => {
    expect(identifyChord([60, 64])).toBeNull();
    expect(identifyChord([60, 64, 67])).toBe('C');
    expect(identifyChord([64, 67, 72])).toBe('C/E');
    expect(identifyChord([57, 60, 64])).toBe('Am');
    expect(identifyChord([67, 71, 74, 77])).toBe('G7');
  });
});
