import { describe, expect, it } from 'vitest';
import { COURSE_LESSONS, exerciseBpm, exerciseSettings, getPattern } from '../../../content';
import { EXERCISE_ENGINE, type TapExercise } from '../../../types/lesson.types';
import { acceptsTap, buildRhythmPlan, rhythmCue, rhythmCueText, scoreRhythm, segmentAt } from '../plan';
import { summarize, type JudgedTap } from '../timing';

const perfect = (i: number): JudgedTap => ({ rating: 'Perfect', deltaMs: 0, beatIndex: i });
const good = (i: number): JudgedTap => ({ rating: 'Good', deltaMs: 40, beatIndex: i });
const extra = (): JudgedTap => ({ rating: 'Miss', deltaMs: 120, beatIndex: null });

describe('buildRhythmPlan', () => {
  it('tap-along: count-in, then every note is both sounded and expected', () => {
    const p = buildRhythmPlan(getPattern('quarters'), { mode: 'tap-along', bpm: 60, countInBeats: 4, repeats: 2 });
    expect(p.beatSec).toBe(1);
    expect(p.targets).toEqual([4, 5, 6, 7, 8, 9, 10, 11]);
    expect(p.tones).toEqual(p.targets);
    expect(p.endSec).toBe(12);
    expect(p.clicks).toHaveLength(12);
    expect(p.clicks.filter((c) => c.countIn)).toHaveLength(4);
    expect(p.clicks.filter((c) => c.accent).map((c) => c.time)).toEqual([0, 4, 8]);
    expect(p.segments).toEqual([
      { kind: 'count-in', start: 0, end: 4 },
      { kind: 'play', start: 4, end: 12 },
    ]);
  });

  it('tap-echo alternates listen and play; only the play passes expect taps', () => {
    const p = buildRhythmPlan(getPattern('half-quarters'), { mode: 'tap-echo', bpm: 120, countInBeats: 4, repeats: 2 });
    expect(p.segments.map((s) => s.kind)).toEqual(['count-in', 'listen', 'play', 'listen', 'play']);
    expect(p.tones).toEqual([2, 3, 3.5, 6, 7, 7.5]);
    expect(p.targets).toEqual([4, 5, 5.5, 8, 9, 9.5]);
    expect(acceptsTap(p, 2.1)).toBe(false); // during the listen pass
    expect(acceptsTap(p, 3.9)).toBe(true); // a slightly early first tap is judged
    expect(acceptsTap(p, 5.5)).toBe(true);
    expect(acceptsTap(p, 6.5)).toBe(false);
    expect(segmentAt(p, 6.5)?.kind).toBe('listen');
  });

  it('tap-read sounds nothing', () => {
    const p = buildRhythmPlan(getPattern('quarters-rest'), { mode: 'tap-read', bpm: 60, countInBeats: 4, repeats: 1 });
    expect(p.tones).toEqual([]);
    expect(p.targets).toEqual([4, 5, 7]);
  });

  it('rounds the count-in up to whole measures and handles 6/8 clicks', () => {
    const waltz = buildRhythmPlan(getPattern('waltz'), { mode: 'tap-along', bpm: 60, countInBeats: 4, repeats: 1 });
    expect(waltz.clicks.filter((c) => c.countIn)).toHaveLength(6);
    const six = buildRhythmPlan(getPattern('six-eight'), { mode: 'tap-along', bpm: 120, countInBeats: 4, repeats: 1 });
    expect(six.clicks.filter((c) => c.countIn)).toHaveLength(6);
    expect(six.targets).toEqual([3, 4, 4.5, 5.5]); // q e q e with one click per eighth
  });

  it('triplets land on exact thirds of a beat', () => {
    const p = buildRhythmPlan(getPattern('triplets'), { mode: 'tap-along', bpm: 60, countInBeats: 4, repeats: 1 });
    expect(p.targets.slice(0, 4).map((t) => Number((t - 4).toFixed(4)))).toEqual([0, 0.3333, 0.6667, 1]);
  });

  it('builds a valid plan for every tap exercise in the course', () => {
    let count = 0;
    for (const lesson of COURSE_LESSONS) {
      for (const stage of lesson.payload.stages) {
        for (const ex of stage.exercises) {
          if (EXERCISE_ENGINE[ex.type] !== 'rhythm') continue;
          const tap = ex as TapExercise;
          const settings = exerciseSettings(lesson.payload, tap);
          const plan = buildRhythmPlan(getPattern(tap.pattern), {
            mode: tap.type,
            bpm: exerciseBpm(lesson.payload, tap),
            countInBeats: settings.countInBeats,
            repeats: settings.rhythmRepeats,
          });
          count++;
          expect(plan.targets.length, `${lesson.id} ${tap.id}`).toBeGreaterThan(0);
          expect(plan.endSec, `${lesson.id} ${tap.id}`).toBeLessThan(60);
          for (let i = 1; i < plan.targets.length; i++) {
            // Notes must be further apart than the Good window on both sides, or one tap could match two.
            expect(plan.targets[i] - plan.targets[i - 1], `${lesson.id} ${tap.id}`).toBeGreaterThan(0.1);
          }
        }
      }
    }
    expect(count).toBe(45);
  });
});

describe('scoreRhythm', () => {
  it('all Perfect is 1.0; all Good is 0.7', () => {
    const p = [0, 1, 2, 3].map(perfect);
    expect(scoreRhythm(summarize(p, 4), p, 4, 0.7)).toEqual({ score: 1, passed: true, extraTaps: 0 });
    const g = [0, 1, 2, 3].map(good);
    const s = scoreRhythm(summarize(g, 4), g, 4, 0.7);
    expect(s.score).toBeCloseTo(0.7);
    expect(s.passed).toBe(true);
    expect(scoreRhythm(summarize(g, 4), g, 4, 0.8).passed).toBe(false);
  });

  it('missed notes and extra taps lower the score', () => {
    const taps = [perfect(0), perfect(1), extra(), extra()];
    const s = scoreRhythm(summarize(taps, 4), taps, 4, 0.7);
    expect(s.extraTaps).toBe(2);
    expect(s.score).toBeCloseTo((200 - 70) / 400);
    expect(s.passed).toBe(false);
  });

  it('mashing the spacebar cannot pass', () => {
    // 4 notes hit as Good, plus 16 stray taps.
    const taps = [...[0, 1, 2, 3].map(good), ...Array.from({ length: 16 }, extra)];
    expect(scoreRhythm(summarize(taps, 4), taps, 4, 0.7)).toMatchObject({ score: 0, passed: false });
  });

  it('no taps at all fails', () => {
    expect(scoreRhythm(summarize([], 8), [], 8, 0.7)).toMatchObject({ score: 0, passed: false });
  });
});

describe('rhythmCue: the count-in follows the time signature', () => {
  const opts = { mode: 'tap-along' as const, bpm: 60, countInBeats: 4, repeats: 1 };

  it('4/4: one bar of 4, counted 1-4, then tap', () => {
    const p = buildRhythmPlan(getPattern('quarters'), opts);
    expect(rhythmCue(p, -0.1)).toEqual({ kind: 'wait' });
    expect(rhythmCue(p, 0)).toMatchObject({ kind: 'count', beat: 1, of: 4, measureBeat: 1, beatsPerMeasure: 4 });
    expect(rhythmCue(p, 3.5)).toMatchObject({ kind: 'count', beat: 4, measureBeat: 4 });
    expect(rhythmCue(p, 4)).toEqual({ kind: 'play' });
    expect(rhythmCueText(rhythmCue(p, 1))).toBe("Count-in 2 of 4. Listen, don't tap yet.");
  });

  it('3/4: two bars of 3 (6 clicks), counted 1-2-3 | 1-2-3', () => {
    const p = buildRhythmPlan(getPattern('waltz'), opts);
    const counts = [0, 1, 2, 3, 4, 5].map((t) => rhythmCue(p, t));
    expect(counts.map((c) => (c.kind === 'count' ? c.measureBeat : null))).toEqual([1, 2, 3, 1, 2, 3]);
    expect(counts[5]).toMatchObject({ of: 6, beatsPerMeasure: 3 });
    expect(rhythmCueText(counts[4])).toBe("Count-in 2 of 3 (bar 2 of 2). Listen, don't tap yet.");
    expect(rhythmCue(p, 6)).toEqual({ kind: 'play' });
  });

  it('6/8: one bar of 6 eighth-note clicks', () => {
    const p = buildRhythmPlan(getPattern('six-eight'), opts);
    expect(rhythmCue(p, 0)).toMatchObject({ kind: 'count', of: 6, beatsPerMeasure: 6 });
    expect(rhythmCueText(rhythmCue(p, 5))).toBe("Count-in 6 of 6. Listen, don't tap yet.");
  });

  it('tap-echo: listen pass after the count-in, then your turn', () => {
    const p = buildRhythmPlan(getPattern('quarters'), { ...opts, mode: 'tap-echo' });
    expect(rhythmCue(p, 4.5)).toEqual({ kind: 'listen' });
    expect(rhythmCue(p, 8.5)).toEqual({ kind: 'play' });
    expect(rhythmCueText({ kind: 'play' }, 'tap-echo')).toBe('Your turn: tap it back.');
    expect(rhythmCue(p, p.endSec)).toEqual({ kind: 'done' });
  });
});
