import { afterEach, describe, expect, it } from 'vitest';
import { SFX, isSfxEnabled, setSfxEnabled } from '../sfx';

const store = new Map<string, string>();
(globalThis as unknown as { window: unknown }).window = {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  },
};

describe('feedback sounds', () => {
  afterEach(() => store.clear());

  it('are on by default and remember being switched off', () => {
    expect(isSfxEnabled()).toBe(true);
    setSfxEnabled(false);
    expect(isSfxEnabled()).toBe(false);
    setSfxEnabled(true);
    expect(isSfxEnabled()).toBe(true);
  });

  it('are short: every sound finishes within a second', () => {
    for (const notes of Object.values(SFX)) {
      expect(Math.max(...notes.map((n) => n.at + n.len))).toBeLessThan(1);
    }
  });
});
