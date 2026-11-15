import { describe, expect, it } from 'vitest';
import { meetsMasteryGate } from '../gate';

describe('meetsMasteryGate (SRS 3.1.2.5)', () => {
  it('needs a pass and first-try accuracy at or above the pass mark', () => {
    expect(meetsMasteryGate({ passed: true, accuracy: 85 }, 0.8)).toBe(true);
    expect(meetsMasteryGate({ passed: true, accuracy: 79.99 }, 0.8)).toBe(false);
  });

  it('accepts accuracy exactly on the pass mark (0.55 × 100 is 55.00000000000001 in floating point)', () => {
    expect(meetsMasteryGate({ passed: true, accuracy: 70 }, 0.7)).toBe(true);
    expect(meetsMasteryGate({ passed: true, accuracy: 55 }, 0.55)).toBe(true);
  });

  it('a run that did not pass never meets the gate, whatever its accuracy', () => {
    expect(meetsMasteryGate({ passed: false, accuracy: 100 }, 0.7)).toBe(false);
  });
});
