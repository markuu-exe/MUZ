import { describe, expect, it } from 'vitest';
import { getCourseLesson } from '../../content';
import { buildLessonResult, createLessonRun, currentItem, lessonProgress, quitLesson, submitOutcome, type LessonRunState } from '../runner';
import { gradeBuildChord, gradeChoice, gradeFindKey } from '../grading';
import type { LessonPayload } from '../../types/lesson.types';

const PASS = { passed: true, score: 1 };
const FAIL = { passed: false, score: 0 };

function payloadOf(id: string): LessonPayload {
  const l = getCourseLesson(id);
  if (!l) throw new Error(id);
  return l.payload;
}

function runAll(state: LessonRunState, decide: (s: LessonRunState) => { passed: boolean; score: number; heartsLost?: number }) {
  let s = state;
  let t = 0;
  for (let guard = 0; s.status === 'running' && guard < 500; guard++) s = submitOutcome(s, decide(s), (t += 1000));
  return s;
}

describe('lesson runner', () => {
  it('runs every exercise in stage order and passes', () => {
    const payload = payloadOf('pno-mod1-node2'); // learn, check, play
    const s = runAll(createLessonRun('pno-mod1-node2', payload, 5, 0), () => PASS);
    expect(s.status).toBe('passed');
    expect(s.records.map((r) => r.stage)).toEqual(['learn', 'learn', 'check', 'check', 'play']);
    const r = buildLessonResult(s);
    expect(r.accuracy).toBe(100);
    expect(r.expAwarded).toBe(20);
    expect(r.durationSec).toBe(5);
  });

  it('re-queues a wrong check answer inside its stage before play unlocks', () => {
    const payload = payloadOf('pno-mod1-node2');
    let s = createLessonRun('pno-mod1-node2', payload, 5, 0);
    s = submitOutcome(s, PASS, 1); // card
    s = submitOutcome(s, PASS, 2); // card
    s = submitOutcome(s, FAIL, 3); // check #1 wrong
    expect(currentItem(s)?.stage).toBe('check');
    s = submitOutcome(s, PASS, 4); // check #2
    const retry = currentItem(s);
    expect(retry?.stage).toBe('check');
    expect(retry?.attempt).toBe(2);
    s = submitOutcome(s, PASS, 5);
    expect(currentItem(s)?.stage).toBe('play');
    s = submitOutcome(s, PASS, 6);
    const r = buildLessonResult(s);
    expect(r.passed).toBe(true);
    expect(r.accuracy).toBe(66.67); // 2 of 3 graded first tries
    expect(lessonProgress(s).fraction).toBe(1);
  });

  it('stops when hearts run out before a practice exercise', () => {
    const payload = payloadOf('pno-mod4-node3'); // learn, check, play(G), play(F)
    let s = createLessonRun('pno-mod4-node3', payload, 1, 0);
    while (currentItem(s)?.stage !== 'play') s = submitOutcome(s, PASS, 1);
    s = submitOutcome(s, { passed: false, score: 0, heartsLost: 1 }, 2);
    expect(s.status).toBe('out-of-hearts');
    const r = buildLessonResult(s);
    expect(r.passed).toBe(false);
    expect(r.heartsLost).toBe(1);
    expect(r.expAwarded).toBe(0);
  });

  it('refuses to start a practice lesson at 0 hearts but allows theory-only', () => {
    expect(createLessonRun('x', payloadOf('pno-mod1-node2'), 0, 0).status).toBe('out-of-hearts');
    expect(createLessonRun('x', payloadOf('pno-mod1-node1'), 0, 0).status).toBe('running');
  });

  it('grades checkpoints by pass mark with one try each', () => {
    const payload = payloadOf('pno-mod1-node5'); // 4 review exercises, passMark 0.7
    let n = 0;
    const oneWrong = runAll(createLessonRun('cp', payload, 5, 0), () => (n++ === 0 ? FAIL : PASS));
    expect(oneWrong.records).toHaveLength(4); // no re-queue in review
    expect(oneWrong.status).toBe('passed'); // 3/4 = 0.75 ≥ 0.7
    let m = 0;
    const twoWrong = runAll(createLessonRun('cp', payload, 5, 0), () => (m++ < 2 ? FAIL : PASS));
    expect(twoWrong.status).toBe('failed');
  });

  it('restores a heart for ≥ 80 % first-try theory', () => {
    const s = runAll(createLessonRun('t', payloadOf('pno-mod1-node1'), 3, 0), () => PASS);
    const r = buildLessonResult(s);
    expect(r.theoryScore).toBe(100);
    expect(r.heartRestored).toBe(true);
    expect(r.heartsEnd).toBe(4);
  });

  // T-06 (SRS 3.1.2.4): hearts lost inside a drill that has not reported its
  // outcome yet must stay lost when the learner quits.
  it('keeps hearts lost in an unfinished drill when the learner quits', () => {
    const payload = payloadOf('pno-mod1-node2'); // learn, check, play
    let s = createLessonRun('pno-mod1-node2', payload, 5, 0);
    while (currentItem(s)?.stage !== 'play') s = submitOutcome(s, PASS, 1);
    const r = buildLessonResult(quitLesson(s, 2, 2));
    expect(r.status).toBe('quit');
    expect(r.heartsEnd).toBe(3);
    expect(r.heartsLost).toBe(2);
  });

  it('adds in-drill losses on quit to hearts already spent on finished drills', () => {
    const payload = payloadOf('pno-mod4-node3'); // learn, check, play(G), play(F)
    let s = createLessonRun('pno-mod4-node3', payload, 5, 0);
    while (currentItem(s)?.stage !== 'play') s = submitOutcome(s, PASS, 1);
    s = submitOutcome(s, { passed: true, score: 1, heartsLost: 2 }, 2); // first drill finished: 3 left
    expect(currentItem(s)?.stage).toBe('play');
    const r = buildLessonResult(quitLesson(s, 3, 1)); // second drill lost 1 before quit
    expect(r.heartsEnd).toBe(2);
    expect(r.heartsLost).toBe(3);
  });

  it('never takes hearts below 0 on quit', () => {
    const payload = payloadOf('pno-mod1-node2');
    let s = createLessonRun('pno-mod1-node2', payload, 1, 0);
    while (currentItem(s)?.stage !== 'play') s = submitOutcome(s, PASS, 1);
    expect(buildLessonResult(quitLesson(s, 2, 3)).heartsEnd).toBe(0);
  });

  it('awards nothing on quit', () => {
    const r = buildLessonResult(quitLesson(createLessonRun('q', payloadOf('pno-mod1-node1'), 5, 0), 10_000));
    expect(r.status).toBe('quit');
    expect(r.expAwarded).toBe(0);
    expect(r.heartRestored).toBe(false);
  });
});

describe('graders', () => {
  it('choice', () => {
    expect(gradeChoice(2, 2)).toBe(true);
    expect(gradeChoice(2, null)).toBe(false);
  });

  it('find the key, exact and any octave', () => {
    expect(gradeFindKey({ target: 60, anyOctave: false }, 72)).toBe(false);
    expect(gradeFindKey({ target: 60, anyOctave: true }, 72)).toBe(true);
  });

  it('build the chord: any voicing, no missing or extra tones', () => {
    expect(gradeBuildChord({ chord: 'C' }, [60, 64, 67])).toBe(true);
    expect(gradeBuildChord({ chord: 'C' }, [64, 67, 72])).toBe(true);
    expect(gradeBuildChord({ chord: 'C' }, [60, 64])).toBe(false);
    expect(gradeBuildChord({ chord: 'C' }, [60, 64, 67, 71])).toBe(false);
    expect(gradeBuildChord({ chord: 'G7' }, [55, 59, 62, 65])).toBe(true);
  });
});
