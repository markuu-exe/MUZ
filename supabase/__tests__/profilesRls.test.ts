/**
 * F2 / DEF-001: the live `profiles` table answered an anonymous REST caller with
 * every row and column. The repo's initial schema is already correct, so the live
 * database has drifted (an extra permissive policy, RLS off, or both).
 * 20261119120000_profiles_rls_hardening.sql must close that whatever the drift is,
 * keep the app's own-row reads and writes working, and be safe to run twice.
 */
import type { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { applyMigration, as, createUser, freshDb, SUPABASE_DIR, U1, U2 } from './harness';

const HARDENING = '20261119120000_profiles_rls_hardening.sql';
const beforeHardening = (name: string) => name < HARDENING;

/** Two learners, then the kinds of drift that would explain the live leak. */
async function driftedDb(drift: 'public-policy' | 'rls-off'): Promise<PGlite> {
  const db = await freshDb(beforeHardening);
  await createUser(db, U1, 'learner-one');
  await createUser(db, U2, 'learner-two');
  if (drift === 'public-policy') {
    await db.exec(`create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);`);
  } else {
    await db.exec(`alter table public.profiles disable row level security;`);
  }
  return db;
}

const count = (rows: Array<{ n: number | string }>) => Number(rows[0].n);

describe('profiles RLS hardening (F2 / DEF-001)', { timeout: 60_000 }, () => {
  for (const drift of ['public-policy', 'rls-off'] as const) {
    it(`reproduces the leak (${drift}) and closes it`, async () => {
      const db = await driftedDb(drift);
      // The leak as seen live: an anonymous caller reads every profile.
      expect(count(await as(db, { role: 'anon' }, 'select count(*) as n from public.profiles'))).toBe(2);
      // Under the drift a signed-in learner also sees other learners.
      expect(count(await as(db, { role: 'authenticated', uid: U1 }, 'select count(*) as n from public.profiles'))).toBe(2);

      await applyMigration(db, HARDENING);

      await expect(as(db, { role: 'anon' }, 'select count(*) as n from public.profiles')).rejects.toThrow(/permission denied/);
      const own = await as<{ id: string }>(db, { role: 'authenticated', uid: U1 }, 'select id from public.profiles');
      expect(own.map((r) => r.id)).toEqual([U1]);
    });
  }

  it('keeps the app working: own-row select(*), update and upsert', async () => {
    const db = await driftedDb('public-policy');
    await applyMigration(db, HARDENING);
    const me = { role: 'authenticated', uid: U1 } as const;
    const rows = await as<{ username: string }>(db, me, 'select * from public.profiles where id = $1', [U1]);
    expect(rows[0].username).toBe('learner-one');
    const updated = await as<{ hearts: number }>(db, me, 'update public.profiles set hearts = 3 where id = $1 returning hearts', [U1]);
    expect(updated).toEqual([{ hearts: 3 }]);
    // Another learner's row is invisible to update, so nothing changes.
    expect(await as(db, me, 'update public.profiles set hearts = 0 where id = $1 returning id', [U2])).toEqual([]);
    const upserted = await as<{ exp: number }>(
      db,
      me,
      `insert into public.profiles (id, username) values ($1, 'learner-one') on conflict (id) do update set exp = 7 returning exp`,
      [U1],
    );
    expect(upserted).toEqual([{ exp: 7 }]);
  });

  it('keeps exactly the three repo policies on profiles and RLS on', async () => {
    const db = await driftedDb('public-policy');
    await db.exec(`create policy sneaky_update on public.profiles for update using (true);`);
    await applyMigration(db, HARDENING);
    const policies = await db.query<{ policyname: string }>(
      `select policyname from pg_policies where schemaname = 'public' and tablename = 'profiles' order by policyname`,
    );
    expect(policies.rows.map((r) => r.policyname)).toEqual(['profiles_insert_own', 'profiles_select_own', 'profiles_update_own']);
    const rls = await db.query<{ relrowsecurity: boolean }>(`select relrowsecurity from pg_class where oid = 'public.profiles'::regclass`);
    expect(rls.rows[0].relrowsecurity).toBe(true);
  });

  it('is idempotent and a no-op on a database that never drifted', async () => {
    const db = await freshDb(beforeHardening);
    await createUser(db, U1, 'learner-one');
    await applyMigration(db, HARDENING);
    await applyMigration(db, HARDENING);
    expect(count(await as(db, { role: 'authenticated', uid: U1 }, 'select count(*) as n from public.profiles'))).toBe(1);
  });

  it('sorts before the is_dev migration, so the rollout order is visible in the folder', () => {
    expect(HARDENING < '20261120000000_profiles_is_dev.sql').toBe(true);
  });

  it('leaves the is_dev guard passing its own check script after all migrations', async () => {
    const db = await freshDb();
    const script = readFileSync(SUPABASE_DIR + '../docs/auxiliary/sql/is_dev_guard_check.sql', 'utf8');
    const results = await db.exec(script);
    const last = results.flatMap((r) => r.rows).pop() as { result?: string } | undefined;
    expect(last?.result).toBe('AUX-TEST-ACCESS-01 is_dev guard: all checks passed');
  });
});
