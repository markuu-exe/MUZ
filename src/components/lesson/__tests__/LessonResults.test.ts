/**
 * D1: a developer test run must never look like learner progress on the results
 * screen, including while the save is in flight or after it fails.
 */
import { describe, expect, it } from 'vitest';
import type { LessonResult } from '../../../lesson/types';
import { resultSummary } from '../LessonResults';

const passed = { status: 'passed', expAwarded: 120 } as Pick<LessonResult, 'status' | 'expAwarded'>;

describe('resultSummary', () => {
  it('a learner run shows the EXP the runner computed and the usual headline', () => {
    expect(resultSummary(passed, { testRun: false })).toMatchObject({
      title: 'Lesson complete',
      expLabel: 'EXP earned',
      expValue: '+120',
    });
  });

  it('a developer test run never shows EXP and says it is test data', () => {
    const s = resultSummary(passed, { testRun: true });
    expect(s.title).toBe('Test run passed');
    expect(s.body).toMatch(/test data/i);
    expect(s.body).not.toMatch(/next lesson/i);
    expect(s.expLabel).toBe('EXP (test run)');
    expect(s.expValue).toBe('0');
  });

  it('a failed test run is labelled as a test run too', () => {
    expect(resultSummary({ status: 'failed', expAwarded: 0 }, { testRun: true }).title).toBe('Test run failed');
  });

  it('out-of-hearts keeps its message for test runs (hearts still apply)', () => {
    expect(resultSummary({ status: 'out-of-hearts', expAwarded: 0 }, { testRun: true }).title).toBe('Out of hearts');
  });
});
