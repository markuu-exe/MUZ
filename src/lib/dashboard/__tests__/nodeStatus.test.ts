import { describe, expect, it } from 'vitest';
import {
  blockingLesson,
  nodeStatus,
  type CurriculumNode,
  type ProgressMap,
} from '../curriculum';

function node(
  id: string,
  moduleIndex: number,
  nodeIndex: number,
  requiredExp = 0,
  title = id,
): CurriculumNode {
  return {
    id,
    instrument: 'piano',
    module_index: moduleIndex,
    node_index: nodeIndex,
    title,
    description: null,
    required_exp: requiredExp,
    payload: {} as CurriculumNode['payload'],
    kind: 'theory',
    tier: 'novice',
    isCheckpoint: false,
    expReward: 50,
  };
}

describe('dashboard node status', () => {
  it('marks a completed lesson as mastered', () => {
    const lesson = node('a', 1, 1);
    const progress: ProgressMap = { a: { lesson_id: 'a', completed: true } };
    expect(nodeStatus(lesson, 0, [lesson], progress, 0)).toBe('mastered');
  });

  it('marks the first lesson of module 1 with enough EXP as current', () => {
    const lesson = node('a', 1, 1);
    expect(nodeStatus(lesson, 0, [lesson], {}, 100)).toBe('current');
  });

  it('locks a lesson when its previous node is incomplete', () => {
    const first = node('a', 1, 1);
    const second = node('b', 1, 2);
    expect(nodeStatus(second, 1, [first, second], {}, 100)).toBe('locked');
  });

  it('locks a lesson when it requires more EXP', () => {
    const lesson = node('a', 1, 1, 200);
    expect(nodeStatus(lesson, 0, [lesson], {}, 100)).toBe('locked');
  });

  it('returns the previous node as the blocking lesson', () => {
    const first = node('a', 1, 1);
    const second = node('b', 1, 2);
    expect(blockingLesson(second, [first, second], {})).toBe(first);
  });

  it('returns null when only EXP is missing', () => {
    const lesson = node('a', 1, 1, 200);
    expect(blockingLesson(lesson, [lesson], {})).toBeNull();
  });
});
