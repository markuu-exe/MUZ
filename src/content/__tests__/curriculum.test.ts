/**
 * COURSE-1 content safety net. Every lesson in src/content is checked here,
 * so authoring mistakes fail `npm test` instead of reaching learners.
 */
import { describe, expect, it } from 'vitest';
import { parseChord } from '../../audio/chords/vocabulary';
import { GOOD_MS } from '../../lib/rhythm/timing';
import {
  EXERCISE_ENGINE,
  STAGE_EXERCISES,
  STAGE_ORDER,
  TIER_ORDER,
  isLessonPayload,
  type Exercise,
  type LessonPayload,
} from '../../types/lesson.types';
import { n, placeAnswer } from '../builders';
import { COURSE_LESSONS, COURSE_UNITS, exerciseBpm, lessonBadge } from '../index';
import { PATTERNS, getPattern } from '../patterns';
import { TIERS } from '../tiers';

const LETTERS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const PLAYABLE: [number, number] = [36, 84]; // C2–C6
const pc = (m: number) => ((m % 12) + 12) % 12;

function exercises(p: LessonPayload): Exercise[] {
  return p.stages.flatMap((s) => s.exercises);
}

describe('course structure', () => {
  it('has 12 contiguous units split 4/4/4 across the tiers', () => {
    expect(COURSE_UNITS.map((u) => u.index)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    for (const t of TIER_ORDER) {
      const [lo, hi] = TIERS[t].units;
      expect(COURSE_UNITS.filter((u) => u.tier === t).map((u) => u.index)).toEqual(
        Array.from({ length: hi - lo + 1 }, (_, i) => lo + i),
      );
    }
  });

  it('has unique ids and contiguous node indexes', () => {
    const ids = COURSE_LESSONS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const u of COURSE_UNITS) {
      const nodes = COURSE_LESSONS.filter((l) => l.module_index === u.index).map((l) => l.node_index);
      expect(nodes).toEqual(nodes.map((_, i) => i + 1));
    }
  });

  it('ends every unit with exactly one checkpoint', () => {
    for (const u of COURSE_UNITS) {
      const lessons = COURSE_LESSONS.filter((l) => l.module_index === u.index);
      const cps = lessons.filter((l) => l.payload.isCheckpoint);
      expect(cps, `unit ${u.index}`).toHaveLength(1);
      expect(lessons[lessons.length - 1].payload.isCheckpoint, `unit ${u.index}`).toBe(true);
    }
  });

  it('never lowers required_exp along the path and starts at 0', () => {
    expect(COURSE_LESSONS[0].required_exp).toBe(0);
    for (let i = 1; i < COURSE_LESSONS.length; i++) {
      expect(COURSE_LESSONS[i].required_exp).toBeGreaterThanOrEqual(COURSE_LESSONS[i - 1].required_exp);
    }
  });

  it('produces v2 payloads whose tier matches the unit', () => {
    for (const l of COURSE_LESSONS) {
      expect(isLessonPayload(l.payload), l.id).toBe(true);
      expect(l.payload.unit).toBe(l.module_index);
      expect(COURSE_UNITS.find((u) => u.index === l.module_index)?.tier).toBe(l.payload.tier);
    }
  });

  it('uses every engine in every tier', () => {
    for (const t of TIER_ORDER) {
      const engines = new Set(
        COURSE_LESSONS.filter((l) => l.payload.tier === t).flatMap((l) => exercises(l.payload).map((e) => EXERCISE_ENGINE[e.type])),
      );
      expect([...engines].sort(), t).toEqual(['practice', 'rhythm', 'theory']);
    }
  });
});

describe('stage rules', () => {
  for (const l of COURSE_LESSONS) {
    it(`${l.id} ${l.title}`, () => {
      const kinds = l.payload.stages.map((s) => s.kind);
      expect(kinds.length).toBeGreaterThan(0);
      for (const s of l.payload.stages) {
        expect(s.exercises.length, `${l.id} ${s.kind} is empty`).toBeGreaterThan(0);
        for (const e of s.exercises) {
          expect(STAGE_EXERCISES[s.kind], `${l.id}: ${e.type} not allowed in ${s.kind}`).toContain(e.type);
        }
      }
      if (l.payload.isCheckpoint) {
        expect(kinds).toEqual(['review']);
      } else {
        expect(kinds).not.toContain('review');
        // learn → check → rhythm → play, each at most once (SRS 3.1.3.3)
        const order = kinds.map((k) => STAGE_ORDER.indexOf(k));
        expect(order, `${l.id} stage order`).toEqual([...order].sort((a, b) => a - b));
        expect(new Set(kinds).size).toBe(kinds.length);
        expect(kinds.some((k) => k !== 'learn'), `${l.id} has nothing graded`).toBe(true);
      }
      expect(['theory', 'rhythm', 'practice']).toContain(lessonBadge(l.payload));
    });
  }
});

describe('exercise content', () => {
  for (const l of COURSE_LESSONS) {
    it(`${l.id} exercises are valid`, () => {
      const ids = exercises(l.payload).map((e) => e.id);
      expect(new Set(ids).size).toBe(ids.length);

      for (const e of exercises(l.payload)) {
        const where = `${l.id}/${e.id} (${e.type})`;
        switch (e.type) {
          case 'concept-card':
            expect(e.title && e.body, where).toBeTruthy();
            for (const m of e.notes ?? []) expect(m >= PLAYABLE[0] && m <= PLAYABLE[1], where).toBe(true);
            break;
          case 'choose-answer':
          case 'ear-pick':
            expect(e.options.length, where).toBeGreaterThanOrEqual(2);
            expect(new Set(e.options).size, where).toBe(e.options.length);
            expect(e.correctIndex >= 0 && e.correctIndex < e.options.length, where).toBe(true);
            expect(e.explanation, where).toBeTruthy();
            if (e.type === 'ear-pick') {
              expect(e.play.length, where).toBeGreaterThan(0);
              for (const g of e.play) expect(g.length, where).toBeGreaterThan(0);
            }
            break;
          case 'name-the-note': {
            expect(LETTERS[pc(e.note)].length, `${where}: only natural notes`).toBe(1);
            expect(e.options[e.correctIndex], where).toBe(LETTERS[pc(e.note)]);
            expect(new Set(e.options).size, where).toBe(e.options.length);
            break;
          }
          case 'find-the-key': {
            const [lo, hi] = e.range;
            expect(lo < hi, where).toBe(true);
            const inRange = e.anyOctave
              ? Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).some((m) => pc(m) === pc(e.target))
              : e.target >= lo && e.target <= hi;
            expect(inRange, `${where}: target not on the keyboard shown`).toBe(true);
            break;
          }
          case 'build-the-chord': {
            const spec = parseChord(e.chord);
            const [lo, hi] = e.range;
            for (const p of spec.pcs) {
              expect(
                Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).some((m) => pc(m) === p),
                where,
              ).toBe(true);
            }
            break;
          }
          case 'tap-along':
          case 'tap-echo':
          case 'tap-read': {
            const pattern = getPattern(e.pattern);
            const bpm = exerciseBpm(l.payload, e);
            expect(bpm >= 40 && bpm <= 200, `${where}: bpm ${bpm}`).toBe(true);
            // Hits closer than two Good windows would make taps ambiguous.
            const beatMs = 60000 / bpm;
            for (let i = 1; i < pattern.hits.length; i++) {
              const gap = (pattern.hits[i] - pattern.hits[i - 1]) * beatMs;
              expect(gap, `${where}: hits ${gap.toFixed(0)} ms apart`).toBeGreaterThanOrEqual(2 * GOOD_MS);
            }
            break;
          }
          case 'play-note':
            expect(e.note >= PLAYABLE[0] && e.note <= PLAYABLE[1], where).toBe(true);
            break;
          case 'play-chord':
            expect(() => parseChord(e.chord), where).not.toThrow();
            break;
          case 'play-sequence':
            expect(e.steps.length, where).toBeGreaterThan(1);
            for (const s of e.steps) {
              if (s.kind === 'chord') expect(() => parseChord(s.chord), where).not.toThrow();
              else expect(s.note >= PLAYABLE[0] && s.note <= PLAYABLE[1], where).toBe(true);
            }
            break;
          case 'posture-hold':
            break;
        }
      }
    });
  }
});

describe('patterns', () => {
  for (const p of Object.values(PATTERNS)) {
    it(`${p.id} fills whole measures`, () => {
      expect(p.hits.length).toBeGreaterThan(0);
      expect(Number.isInteger(p.measures), `${p.id} is ${p.lengthBeats} clicks`).toBe(true);
      expect(p.hits[0]).toBe(0);
    });
  }

  it('every pattern is used by at least one lesson', () => {
    const used = new Set(
      COURSE_LESSONS.flatMap((l) => exercises(l.payload)).flatMap((e) =>
        e.type === 'tap-along' || e.type === 'tap-echo' || e.type === 'tap-read' ? [e.pattern] : [],
      ),
    );
    expect(Object.keys(PATTERNS).filter((id) => !used.has(id))).toEqual([]);
  });
});

describe('builders', () => {
  it('parses note names to MIDI', () => {
    expect(n('C4')).toBe(60);
    expect(n('A4')).toBe(69);
    expect(n('F#3')).toBe(54);
    expect(n('Bb4')).toBe(70);
    expect(() => n('H2')).toThrow();
  });

  it('places answers deterministically', () => {
    const a = placeAnswer('q', 'right', ['x', 'y', 'z']);
    expect(a).toEqual(placeAnswer('q', 'right', ['x', 'y', 'z']));
    expect(a.options[a.correctIndex]).toBe('right');
  });
});
