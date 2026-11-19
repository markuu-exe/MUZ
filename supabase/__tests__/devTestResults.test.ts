/**
 * Decision D1 (A, 2026-11-19): results of lessons a developer opens through the lock
 * override are test data. They go to public.dev_test_results, which only a developer
 * can write, and never to the learner tables (user_progress, performance_records,
 * user_achievements) or the profile's EXP / streak.
 */
import type { PGlite } from '@electric-sql/pglite';
import { beforeEach, describe, expect, it } from 'vitest';
import { as, createUser, freshDb, U1, U2 } from './harness';

const LESSON = 'lesson-test-1';
const ROW = `(user_id, lesson_id, status, passed, accuracy, hearts_lost, metrics)`;
const insertFor = (uid: string) =>
  `insert into public.dev_test_results ${ROW} values ('${uid}', '${LESSON}', 'passed', true, 92.5, 1, '{"postureScore":80}') returning id`;

let db: PGlite;

beforeEach(async () => {
  db = await freshDb();
  await db.exec(
    `insert into public.lessons (id, instrument, module_index, node_index, title, payload) values ('${LESSON}', 'piano', 1, 1, 'Test', '{}')`,
  );
  await createUser(db, U1, 'developer-one');
  await createUser(db, U2, 'learner-two');
  // Granting is an owner action (SQL editor), never something the client can do.
  await db.exec(`update public.profiles set is_dev = true where id = '${U1}'`);
});

const dev = { role: 'authenticated', uid: U1 } as const;
const learner = { role: 'authenticated', uid: U2 } as const;

describe('dev_test_results (decision D1)', { timeout: 60_000 }, () => {
  it('a developer records a test result and reads it back', async () => {
    expect(await as(db, dev, insertFor(U1))).toHaveLength(1);
    const rows = await as<{ lesson_id: string; status: string; passed: boolean; hearts_lost: number }>(
      db,
      dev,
      'select lesson_id, status, passed, hearts_lost from public.dev_test_results',
    );
    expect(rows).toEqual([{ lesson_id: LESSON, status: 'passed', passed: true, hearts_lost: 1 }]);
  });

  it('a learner (is_dev = false) cannot write test results', async () => {
    await expect(as(db, learner, insertFor(U2))).rejects.toThrow(/row-level security/);
  });

  it('nobody can write a test result for another account', async () => {
    await expect(as(db, dev, insertFor(U2))).rejects.toThrow(/row-level security/);
  });

  it('test results are private to their owner and closed to anonymous callers', async () => {
    await as(db, dev, insertFor(U1));
    expect(await as(db, learner, 'select id from public.dev_test_results')).toEqual([]);
    await expect(as(db, { role: 'anon' }, 'select id from public.dev_test_results')).rejects.toThrow(/permission denied/);
  });

  it('test results cannot be edited or deleted from the client', async () => {
    await as(db, dev, insertFor(U1));
    await expect(as(db, dev, `update public.dev_test_results set passed = false`)).rejects.toThrow(/permission denied/);
    await expect(as(db, dev, `delete from public.dev_test_results`)).rejects.toThrow(/permission denied/);
  });

  it('rejects unknown statuses and out-of-range values', async () => {
    await expect(
      as(db, dev, `insert into public.dev_test_results ${ROW} values ('${U1}', '${LESSON}', 'mastered', true, 50, 0, '{}')`),
    ).rejects.toThrow(/check constraint/);
    await expect(
      as(db, dev, `insert into public.dev_test_results ${ROW} values ('${U1}', '${LESSON}', 'passed', true, 101, 0, '{}')`),
    ).rejects.toThrow(/check constraint/);
  });

  it('a test result never appears in the learner tables or changes the profile', async () => {
    const before = await db.query(`select exp, current_streak, last_activity_date, hearts from public.profiles where id = '${U1}'`);
    await as(db, dev, insertFor(U1));
    for (const table of ['user_progress', 'performance_records', 'user_achievements']) {
      const r = await db.query<{ n: number }>(`select count(*)::int as n from public.${table}`);
      expect(r.rows[0].n, table).toBe(0);
    }
    const after = await db.query(`select exp, current_streak, last_activity_date, hearts from public.profiles where id = '${U1}'`);
    expect(after.rows).toEqual(before.rows);
  });

  it('a revoked developer can no longer write test results', async () => {
    await db.exec(`update public.profiles set is_dev = false where id = '${U1}'`);
    await expect(as(db, dev, insertFor(U1))).rejects.toThrow(/row-level security/);
  });
});
