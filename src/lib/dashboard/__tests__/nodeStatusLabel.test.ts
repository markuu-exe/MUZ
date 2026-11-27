import { describe, expect, it } from 'vitest';
import { DEMO_CURRICULUM, nodeStatusLabel } from '../curriculum';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import LessonResults from '../../../components/lesson/LessonResults';
import type { LessonResult } from '../../../lesson/types';

describe('Skill Tree node labels (UX 2026-11-27)', () => {
  const [first, second] = DEMO_CURRICULUM;

  it('shows the real reward on available and mastered nodes', () => {
    expect(nodeStatusLabel(first, 'current', 0, DEMO_CURRICULUM, {})).toBe(`Up next · +${first.expReward} XP`);
    expect(nodeStatusLabel(first, 'mastered', 0, DEMO_CURRICULUM, {})).toBe(`Mastered · +${first.expReward} XP`);
  });

  it('a locked node names the lesson to finish first, on the node itself', () => {
    expect(nodeStatusLabel(second, 'locked', 0, DEMO_CURRICULUM, {})).toBe(`Locked · finish "${first.title}" first`);
  });

  it('a locked node blocked only by EXP says how much is needed and how much you have', () => {
    const progress = { [first.id]: { completed: true } } as never;
    const needy = { ...second, required_exp: 500 };
    expect(nodeStatusLabel(needy, 'locked', 120, DEMO_CURRICULUM, progress)).toBe('Locked · needs 500 XP (you have 120)');
  });
});

describe('results screen: a failed save is not silently dropped', () => {
  const result = {
    lessonId: 'x',
    status: 'passed',
    passed: true,
    accuracy: 100,
    theoryScore: 100,
    heartsStart: 5,
    heartsEnd: 5,
    heartsLost: 0,
    heartRestored: false,
    expAwarded: 20,
    durationSec: 60,
    metrics: { pitchAccuracy: 0, rhythmConsistency: 0, postureScore: 0 },
    records: [],
  } as unknown as LessonResult;
  const render = (props: Record<string, unknown>) =>
    renderToStaticMarkup(createElement(LessonResults, { title: 'T', result, onRetry: () => {}, onClose: () => {}, ...props }));

  it('shows a "not saved" alert with a retry button when the save failed', () => {
    const html = render({ unsaved: true, onRetrySave: () => {} });
    expect(html).toContain('role="alert"');
    expect(html).toContain('This result was not saved yet');
    expect(html).toContain('Try saving again');
  });

  it('shows progress while saving again, and nothing when the save worked', () => {
    expect(render({ unsaved: true, savingAgain: true, onRetrySave: () => {} })).toContain('Saving your result…');
    expect(render({ unsaved: false, onRetrySave: () => {} })).not.toContain('Try saving again');
  });
});
