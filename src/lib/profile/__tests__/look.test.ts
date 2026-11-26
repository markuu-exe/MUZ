import { describe, expect, it } from 'vitest';
import { AVATARS, FRAMES, frameUnlocked, normalizeDisplayName, readLook, validateDisplayName } from '../look';

describe('display name rules', () => {
  it('trims and collapses spaces', () => {
    expect(normalizeDisplayName('  Chopin   Fan ')).toBe('Chopin Fan');
  });

  it('accepts 3-24 letters, numbers, spaces, dot, dash and underscore', () => {
    expect(validateDisplayName('Mark_L')).toBeNull();
    expect(validateDisplayName('Ana María')).toBeNull();
    expect(validateDisplayName('ab')).toMatch(/at least 3/);
    expect(validateDisplayName('x'.repeat(25))).toMatch(/at most 24/);
    expect(validateDisplayName('bad<name>')).toMatch(/letters, numbers/);
  });
});

describe('frames', () => {
  it('unlock with the learner tiers', () => {
    const by = (id: string) => FRAMES.find((f) => f.id === id)!;
    expect(frameUnlocked(by('none'), 0)).toBe(true);
    expect(frameUnlocked(by('bronze'), 0)).toBe(true);
    expect(frameUnlocked(by('silver'), 999)).toBe(false);
    expect(frameUnlocked(by('silver'), 1000)).toBe(true);
    expect(frameUnlocked(by('platinum'), 4000)).toBe(true);
  });
});

describe('readLook', () => {
  it('reads known avatar and frame ids from user metadata and ignores anything else', () => {
    expect(readLook({ avatar: AVATARS[0].id, frame: 'gold' })).toEqual({ avatar: AVATARS[0].id, frame: 'gold' });
    expect(readLook({ avatar: 'hacker', frame: 42 })).toEqual({ avatar: null, frame: 'none' });
    expect(readLook(undefined)).toEqual({ avatar: null, frame: 'none' });
  });
});
