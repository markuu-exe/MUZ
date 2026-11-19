import { describe, expect, it } from 'vitest';
import { canOpenLesson, isDevAccount } from '../devAccess';

describe('canOpenLesson (AUX-TEST-ACCESS-01)', () => {
  it('keeps a locked lesson closed for a normal account', () => {
    expect(canOpenLesson('locked', false)).toBe(false);
  });

  it('opens current and mastered lessons for a normal account, as before', () => {
    expect(canOpenLesson('current', false)).toBe(true);
    expect(canOpenLesson('mastered', false)).toBe(true);
  });

  it('opens a locked lesson for a developer account', () => {
    expect(canOpenLesson('locked', true)).toBe(true);
  });

  it('opens current and mastered lessons for a developer account', () => {
    expect(canOpenLesson('current', true)).toBe(true);
    expect(canOpenLesson('mastered', true)).toBe(true);
  });
});

describe('isDevAccount (AUX-TEST-ACCESS-01)', () => {
  it('is true only when the profile row says is_dev = true', () => {
    expect(isDevAccount({ is_dev: true }, false)).toBe(true);
  });

  it('is false when is_dev is false', () => {
    expect(isDevAccount({ is_dev: false }, false)).toBe(false);
  });

  it('is false when the column is missing (migration not applied yet)', () => {
    expect(isDevAccount({}, false)).toBe(false);
  });

  it('is false without a profile (signed out, still loading)', () => {
    expect(isDevAccount(null, false)).toBe(false);
    expect(isDevAccount(undefined, false)).toBe(false);
  });

  it('is never true in guest / demo mode', () => {
    expect(isDevAccount({ is_dev: true }, true)).toBe(false);
  });

  it('rejects truthy non-boolean values (fails closed)', () => {
    expect(isDevAccount({ is_dev: 'true' as unknown as boolean }, false)).toBe(false);
    expect(isDevAccount({ is_dev: 1 as unknown as boolean }, false)).toBe(false);
  });
});
