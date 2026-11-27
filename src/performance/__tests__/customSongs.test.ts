import { afterEach, describe, expect, it, vi } from 'vitest';
import { CUSTOM_KEY, deleteCustomSheet, listCustomSongs, saveCustomSheet } from '../customSongs';

const SHEET = 'title: My Tune\nmeter: 4/4\nbpm: 90\nC4 D4 E4 F4 | G4:w';

describe('your pieces (saved on this device)', () => {
  afterEach(() => vi.unstubAllGlobals());
  const stub = () => {
    const m = new Map<string, string>();
    vi.stubGlobal('window', { localStorage: { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } });
    return m;
  };

  it('saves, lists, updates and deletes a piece', () => {
    stub();
    const id = saveCustomSheet(SHEET);
    expect(id).toMatch(/^custom-my-tune-/);
    expect(listCustomSongs()).toMatchObject([{ id, text: SHEET, song: { id, title: 'My Tune', bpm: 90 } }]);

    saveCustomSheet(SHEET.replace('bpm: 90', 'bpm: 100'), id);
    expect(listCustomSongs()).toHaveLength(1);
    expect(listCustomSongs()[0].song?.bpm).toBe(100);

    deleteCustomSheet(id);
    expect(listCustomSongs()).toEqual([]);
  });

  it('survives damaged storage, and keeps a piece that no longer parses (to fix it)', () => {
    const m = stub();
    m.set(CUSTOM_KEY, 'not json');
    expect(listCustomSongs()).toEqual([]);
    m.set(CUSTOM_KEY, JSON.stringify([{ id: 'custom-x', text: 'title: X\nmeter: 4/4\nbpm: 80\nH4' }, { nope: 1 }]));
    expect(listCustomSongs()).toMatchObject([{ id: 'custom-x', song: null }]);
  });
});
