import { describe, expect, it } from 'vitest';
import { profileHudPresentation } from '../profileHud';

describe('profile HUD presentation', () => {
  it('shows placeholders while the profile is loading', () => {
    expect(profileHudPresentation('loading')).toEqual({
      showValues: false,
      message: null,
      canRetry: false,
    });
  });

  it('shows values only for a loaded profile', () => {
    expect(profileHudPresentation('loaded')).toEqual({
      showValues: true,
      message: null,
      canRetry: false,
    });
  });

  it('reports a missing profile without showing values', () => {
    expect(profileHudPresentation('not_found')).toMatchObject({
      showValues: false,
      message: expect.stringContaining('pending (U-37)'),
      canRetry: false,
    });
  });

  it('reports a failed load and allows retry without showing values', () => {
    expect(profileHudPresentation('failed')).toMatchObject({
      showValues: false,
      message: expect.stringContaining('pending (U-37)'),
      canRetry: true,
    });
  });
});
