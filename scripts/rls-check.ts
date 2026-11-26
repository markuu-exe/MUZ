/**
 * T-20: RLS verification (SRS 3.5.2). Run: npx tsx scripts/rls-check.ts
 *
 * Uses the publishable/anon key only. Never a service-role key.
 * Use THROWAWAY test accounts: if RLS is broken, the "attack" calls could touch
 * user A's rows. Update calls write a row's own current value back (a no-op).
 *
 * Env (set in your shell, never commit):
 *   SUPABASE_URL, SUPABASE_ANON_KEY,
 *   RLS_USER_A_EMAIL, RLS_USER_A_PASSWORD, RLS_USER_B_EMAIL, RLS_USER_B_PASSWORD
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type Verdict = 'PASS' | 'FAIL' | 'SKIP' | 'ACCEPTED RISK';
interface Line {
  check: string;
  expected: string;
  actual: string;
  verdict: Verdict;
}
const lines: Line[] = [];

function env(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing environment variable ${name}.`);
    process.exit(2);
  }
  return v;
}

const url = env('SUPABASE_URL');
const anonKey = env('SUPABASE_ANON_KEY');

function client(): SupabaseClient {
  return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function signIn(prefix: 'A' | 'B'): Promise<{ db: SupabaseClient; id: string }> {
  const db = client();
  const { data, error } = await db.auth.signInWithPassword({
    email: env(`RLS_USER_${prefix}_EMAIL`),
    password: env(`RLS_USER_${prefix}_PASSWORD`),
  });
  if (error || !data.user) {
    console.error(`Could not sign in test user ${prefix}: ${error?.message ?? 'no user'}`);
    process.exit(2);
  }
  return { db, id: data.user.id };
}

interface TableInfo {
  name: string;
  /** Column holding the owner id, or null for shared read-only tables. */
  owner: string | null;
  /** Columns that identify one row. */
  match: string[];
  /** A column whose own current value can be written back harmlessly. */
  noop: string;
}

const TABLES: TableInfo[] = [
  { name: 'profiles', owner: 'id', match: ['id'], noop: 'exp' },
  { name: 'lessons', owner: null, match: ['id'], noop: 'title' },
  { name: 'user_progress', owner: 'user_id', match: ['id'], noop: 'completed' },
  { name: 'performance_records', owner: 'user_id', match: ['id'], noop: 'pitch_accuracy' },
  { name: 'achievements', owner: null, match: ['id'], noop: 'title' },
  { name: 'user_achievements', owner: 'user_id', match: ['user_id', 'achievement_id'], noop: 'unlocked_at' },
  { name: 'dev_test_results', owner: 'user_id', match: ['id'], noop: 'accuracy' },
];

type Row = Record<string, unknown>;
interface Result {
  data: unknown;
  error: { code?: string; message: string } | null;
}

const count = (r: Result) => (Array.isArray(r.data) ? r.data.length : 0);
const describe = (r: Result) => (r.error ? `error ${r.error.code ?? ''} ${r.error.message}`.trim() : `${count(r)} row(s)`);
/** Denied = the call errored, or it touched no rows. */
const deniedRows = (r: Result) => r.error !== null || count(r) === 0;

function record(check: string, expected: string, r: Result, ok: boolean) {
  lines.push({ check, expected, actual: describe(r), verdict: ok ? 'PASS' : 'FAIL' });
}

function insertPayload(table: string, ownerId: string, lessonId: string, achievementId: string): Row {
  switch (table) {
    case 'profiles':
      return { id: ownerId, username: 'rls_probe' };
    case 'lessons':
      return { id: 'rls-probe', instrument: 'piano', module_index: 0, node_index: 0, title: 'rls probe', payload: {} };
    case 'user_progress':
      return { user_id: ownerId, lesson_id: lessonId, completed: false };
    case 'performance_records':
      return { user_id: ownerId, lesson_id: lessonId, pitch_accuracy: 0, rhythm_consistency: 0, posture_score: 0, drill_duration_sec: 0 };
    case 'achievements':
      return { id: 'rls-probe', title: 'rls probe' };
    case 'user_achievements':
      return { user_id: ownerId, achievement_id: achievementId };
    default:
      return { user_id: ownerId, lesson_id: lessonId, status: 'passed', passed: true, accuracy: 0 };
  }
}

function matchFilter<T extends { eq(c: string, v: unknown): T }>(q: T, t: TableInfo, sample: Row): T {
  return t.match.reduce((acc, col) => acc.eq(col, sample[col]), q);
}

async function main() {
  const anon = client();
  const A = await signIn('A');
  const B = await signIn('B');

  // Positive controls: A must have something to protect, or "0 rows" proves nothing.
  const samples = new Map<string, Row | null>();
  for (const t of TABLES) {
    const q = A.db.from(t.name).select('*');
    const { data } = await (t.owner ? q.eq(t.owner, A.id) : q).limit(1);
    samples.set(t.name, (data?.[0] as Row | undefined) ?? null);
  }
  const lessonId = String(samples.get('lessons')?.id ?? '');
  const achievementId = String(samples.get('achievements')?.id ?? '');
  if (!lessonId || !achievementId) {
    console.error('Staging has no lessons or achievements. Run the seed first.');
    process.exit(2);
  }

  for (const t of TABLES) {
    const sample = samples.get(t.name) ?? null;
    const label = (who: string, what: string) => `${who}: ${what} ${t.name}`;

    // 1. Anonymous
    {
      const r = (await anon.from(t.name).select('*').limit(5)) as Result;
      record(label('anon', 'select'), 'denied (0 rows or error)', r, deniedRows(r));
    }
    {
      const r = (await anon.from(t.name).insert(insertPayload(t.name, A.id, lessonId, achievementId))) as Result;
      record(label('anon', 'insert'), 'denied (error)', r, r.error !== null);
    }
    if (sample) {
      const upd = (await matchFilter(anon.from(t.name).update({ [t.noop]: sample[t.noop] }), t, sample).select()) as Result;
      record(label('anon', 'update'), 'denied (0 rows or error)', upd, deniedRows(upd));
      const del = (await matchFilter(anon.from(t.name).delete(), t, sample).select()) as Result;
      record(label('anon', 'delete'), 'denied (0 rows or error)', del, deniedRows(del));
    } else {
      lines.push({ check: label('anon', 'update/delete'), expected: 'denied', actual: 'A has no row here', verdict: 'SKIP' });
    }

    // 2. User B against user A's data
    if (t.owner) {
      if (!sample) {
        lines.push({ check: label('B', 'select/update/delete A rows in'), expected: 'denied', actual: 'A has no row here; create one as A', verdict: 'SKIP' });
      } else {
        const sel = (await B.db.from(t.name).select('*').eq(t.owner, A.id)) as Result;
        record(label('B', "select A's rows in"), '0 rows or error', sel, deniedRows(sel));
        const upd = (await matchFilter(B.db.from(t.name).update({ [t.noop]: sample[t.noop] }), t, sample).select()) as Result;
        record(label('B', "update A's row in"), '0 rows or error', upd, deniedRows(upd));
        const del = (await matchFilter(B.db.from(t.name).delete(), t, sample).select()) as Result;
        record(label('B', "delete A's row in"), '0 rows or error', del, deniedRows(del));
      }
      const ins = (await B.db.from(t.name).insert(insertPayload(t.name, A.id, lessonId, achievementId))) as Result;
      record(label('B', 'insert as A into'), 'denied (error)', ins, ins.error !== null);
    } else {
      // 3. lessons / achievements: read-only for authenticated users
      const read = (await B.db.from(t.name).select('*').limit(1)) as Result;
      record(label('B', 'select'), 'allowed (>= 1 row)', read, read.error === null && count(read) > 0);
      const ins = (await B.db.from(t.name).insert(insertPayload(t.name, B.id, lessonId, achievementId))) as Result;
      record(label('B', 'insert'), 'denied (error)', ins, ins.error !== null);
      if (sample) {
        const upd = (await matchFilter(B.db.from(t.name).update({ [t.noop]: sample[t.noop] }), t, sample).select()) as Result;
        record(label('B', 'update'), 'denied (0 rows or error)', upd, deniedRows(upd));
        const del = (await matchFilter(B.db.from(t.name).delete(), t, sample).select()) as Result;
        record(label('B', 'delete'), 'denied (0 rows or error)', del, deniedRows(del));
      }
    }
  }

  // 4. Known accepted risk (ruling D14): a user can update their OWN profile, including exp.
  const mine = (await B.db.from('profiles').select('exp').eq('id', B.id).maybeSingle()) as { data: Row | null };
  if (mine.data) {
    const r = (await B.db.from('profiles').update({ exp: mine.data.exp }).eq('id', B.id).select()) as Result;
    lines.push({
      check: 'B: update OWN profiles.exp (same value)',
      expected: 'allowed by design',
      actual: describe(r),
      verdict: !r.error && count(r) > 0 ? 'ACCEPTED RISK' : 'FAIL',
    });
  }

  console.table(lines);
  const failed = lines.filter((l) => l.verdict === 'FAIL').length;
  const skipped = lines.filter((l) => l.verdict === 'SKIP').length;
  console.log(`${lines.length} checks: ${failed} failed, ${skipped} skipped.`);
  if (failed > 0) console.error('FAILED: any denial failure is a P0. Tell A immediately.');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
