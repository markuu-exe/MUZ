import { afterEach, describe, expect, it, vi } from 'vitest';
import { BEST_KEY, readBestScores, saveBestScore } from '../best';

describe('best performance score (per device)', () => {
  afterEach(() => vi.unstubAllGlobals());
  const stub = () => {
    const m = new Map<string, string>();
    vi.stubGlobal('window', { localStorage: { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } });
    return m;
  };

  it('keeps only a better score', () => {
    stub();
    expect(saveBestScore('twinkle', 70)).toBe(true);
    expect(saveBestScore('twinkle', 60)).toBe(false);
    expect(saveBestScore('twinkle', 85)).toBe(true);
    expect(readBestScores()).toEqual({ twinkle: 85 });
  });

  it('ignores corrupt or out-of-range data and works without storage', () => {
    const m = stub();
    m.set(BEST_KEY, '{"a": 101, "b": "x", "c": 50}');
    expect(readBestScores()).toEqual({ c: 50 });
    m.set(BEST_KEY, '{oops');
    expect(readBestScores()).toEqual({});
    vi.stubGlobal('window', {});
    expect(readBestScores()).toEqual({});
    expect(() => saveBestScore('x', 10)).not.toThrow();
  });
});
