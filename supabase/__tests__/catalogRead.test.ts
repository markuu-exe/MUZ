/**
 * Live finding 2026-11-27: a signed-in learner's app read 0 piano lessons with no
 * error ("Database returned 0 piano lessons" in Settings → Course data), so it fell
 * back to the built-in course and never showed placement (SRS 3.1.1.4). RLS was on
 * but the catalog read policy was missing. These tests reproduce that drift and
 * check that the repair migration restores read access to the two catalog tables.
 */
import { describe, expect, it } from 'vitest';
import { applyMigration, as, freshDb, U1 } from './harness';

const REPAIR = '20261127000000_catalog_read_policies.sql';

async function driftedDb() {
  const db = await freshDb((name) => name < REPAIR);
  await db.exec(`
    insert into public.lessons (id, instrument, module_index, node_index, title, required_exp, payload)
      values ('pno-mod1-node1', 'piano', 1, 1, 'The Musical Alphabet', 0, '{"schemaVersion":2}'::jsonb);
    insert into public.achievements (id, title) values ('first-lesson', 'First Note');
    drop policy lessons_select_authenticated on public.lessons;
    drop policy achievements_select_authenticated on public.achievements;
  `);
  return db;
}

const countLessons = (rows: Array<{ n: number | string }>) => Number(rows[0].n);

describe('catalog read policies (lessons, achievements)', { timeout: 60_000 }, () => {
  it('reproduces the live drift: RLS on, no read policy, so a learner sees 0 lessons and no error', async () => {
    const db = await driftedDb();
    const me = { role: 'authenticated', uid: U1 } as const;
    expect(countLessons(await as<{ n: number }>(db, me, `select count(*) as n from public.lessons where instrument = 'piano'`))).toBe(0);
    expect(countLessons(await as<{ n: number }>(db, me, `select count(*) as n from public.achievements`))).toBe(0);
  });

  it('the repair migration lets a signed-in learner read both catalogs', async () => {
    const db = await driftedDb();
    await applyMigration(db, REPAIR);
    const me = { role: 'authenticated', uid: U1 } as const;
    expect(countLessons(await as<{ n: number }>(db, me, `select count(*) as n from public.lessons where instrument = 'piano'`))).toBe(1);
    expect(countLessons(await as<{ n: number }>(db, me, `select count(*) as n from public.achievements`))).toBe(1);
  });

  it('gives anonymous callers nothing and stays idempotent', async () => {
    const db = await driftedDb();
    await applyMigration(db, REPAIR);
    await applyMigration(db, REPAIR);
    const rows = await as<{ n: number }>(db, { role: 'anon' }, `select count(*) as n from public.lessons`).catch((): Array<{ n: number }> => [{ n: 0 }]);
    expect(countLessons(rows)).toBe(0);
  });
});
