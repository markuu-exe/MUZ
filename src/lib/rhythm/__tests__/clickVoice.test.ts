import { describe, expect, it } from 'vitest';
import { clickVoice } from '../clickVoice';

describe('clickVoice', () => {
  it('gives the count-in a different sound from the beat clicks', () => {
    for (const accent of [true, false]) {
      const count = clickVoice(accent, true);
      const beat = clickVoice(accent, false);
      expect(count.type).not.toBe(beat.type);
      expect(count.freq).not.toBe(beat.freq);
    }
  });

  it('accents the first beat of each measure in both voices', () => {
    expect(clickVoice(true, true).freq).toBeGreaterThan(clickVoice(false, true).freq);
    expect(clickVoice(true, false).freq).toBeGreaterThan(clickVoice(false, false).freq);
  });
});
