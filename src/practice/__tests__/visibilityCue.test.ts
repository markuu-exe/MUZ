import { describe, expect, it } from 'vitest';
import { NOT_VISIBLE_AFTER_MS, NotVisibleTimer } from '../visibilityCue';

describe('NotVisibleTimer', () => {
  it('waits 1500 ms of unevaluable posture before showing the cue', () => {
    expect(NOT_VISIBLE_AFTER_MS).toBe(1500);
    const timer = new NotVisibleTimer();
    expect(timer.push(0, null)).toBe(false);
    expect(timer.push(1499, null)).toBe(false);
    expect(timer.push(1500, null)).toBe(true);
  });

  it('clears as soon as posture can be evaluated again, good or bad', () => {
    const timer = new NotVisibleTimer();
    timer.push(0, null);
    expect(timer.push(1500, null)).toBe(true);
    expect(timer.push(1600, false)).toBe(false);
    expect(timer.push(1700, null)).toBe(false);
    expect(timer.push(3199, null)).toBe(false);
    expect(timer.push(3200, null)).toBe(true);
    expect(timer.push(3300, true)).toBe(false);
  });

  it('never shows the cue while the learner stays in view', () => {
    const timer = new NotVisibleTimer();
    for (let t = 0; t <= 5000; t += 40) expect(timer.push(t, t % 80 === 0)).toBe(false);
  });

  it('takes a custom delay', () => {
    const timer = new NotVisibleTimer(200);
    timer.push(1000, null);
    expect(timer.push(1199, null)).toBe(false);
    expect(timer.push(1200, null)).toBe(true);
  });

  it('starts again after reset()', () => {
    const timer = new NotVisibleTimer();
    timer.push(0, null);
    expect(timer.push(2000, null)).toBe(true);
    timer.reset();
    expect(timer.push(2100, null)).toBe(false);
    expect(timer.push(3600, null)).toBe(true);
  });
});
