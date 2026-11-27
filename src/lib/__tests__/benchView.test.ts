import { afterEach, describe, expect, it, vi } from 'vitest';
import { BENCH_VIEW_KEY, readBenchView, saveBenchView } from '../benchView';

describe('bench view setting (per device)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('is off by default and remembers the choice', () => {
    const m = new Map<string, string>();
    vi.stubGlobal('window', { localStorage: { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } });
    expect(readBenchView()).toBe(false);
    saveBenchView(true);
    expect(m.get(BENCH_VIEW_KEY)).toBe('on');
    expect(readBenchView()).toBe(true);
    saveBenchView(false);
    expect(readBenchView()).toBe(false);
  });

  it('works without storage', () => {
    vi.stubGlobal('window', {});
    expect(readBenchView()).toBe(false);
    expect(() => saveBenchView(true)).not.toThrow();
  });
});
