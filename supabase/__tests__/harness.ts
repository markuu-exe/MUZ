/**
 * Database test harness: the repo's migrations on PGlite (real Postgres in WASM),
 * with the parts of Supabase they rely on stubbed:
 *  - roles anon / authenticated / service_role (RLS is enforced under SET ROLE);
 *  - auth.users and auth.uid() (reads request.jwt.claim.sub / request.jwt.claims, as Supabase does);
 *  - Supabase's default privileges: every new public table is granted to anon,
 *    authenticated and service_role, so RLS and explicit revokes are the only gate
 *    (this is why the live `profiles` table could leak).
 * Known gap: PGlite has no pgcrypto; `create extension pgcrypto` is skipped
 * (the schema only needs gen_random_uuid(), which is core Postgres).
 * Nothing here talks to a real Supabase project.
 */
import { PGlite, type Transaction } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const SUPABASE_DIR = fileURLToPath(new URL('..', import.meta.url));
const MIGRATIONS_DIR = fileURLToPath(new URL('../migrations/', import.meta.url));

const BOOTSTRAP = `
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
create schema auth;
create table auth.users (
  id uuid primary key,
  email text,
  aud text,
  role text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  )::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`;

/** Migration file names in apply order. */
export function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

export function readMigration(name: string): string {
  return readFileSync(MIGRATIONS_DIR + name, 'utf8').replace(/create extension if not exists pgcrypto;/i, '');
}

/** A fresh database with the Supabase stubs and the migrations accepted by `include` applied in order. */
export async function freshDb(include: (name: string) => boolean = () => true): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(BOOTSTRAP);
  for (const name of migrationFiles()) if (include(name)) await db.exec(readMigration(name));
  return db;
}

export async function applyMigration(db: PGlite, name: string): Promise<void> {
  await db.exec(readMigration(name));
}

/** Create an auth user (the handle_new_user trigger creates the profile). */
export async function createUser(db: PGlite, id: string, username: string): Promise<void> {
  await db.query(`insert into auth.users (id, email, aud, role, raw_user_meta_data) values ($1, $2, 'authenticated', 'authenticated', $3)`, [
    id,
    `${username}@example.invalid`,
    JSON.stringify({ username }),
  ]);
}

export type Caller = { role: 'anon' } | { role: 'authenticated'; uid: string };

/** Run `sql` as a PostgREST caller would: SET ROLE plus the JWT claims, inside a transaction. */
export async function as<T = Record<string, unknown>>(db: PGlite, who: Caller, sql: string, params: unknown[] = []): Promise<T[]> {
  return db.transaction(async (tx: Transaction) => {
    const sub = who.role === 'authenticated' ? who.uid : '';
    await tx.query(`select set_config('request.jwt.claims', $1, true), set_config('request.jwt.claim.sub', $2, true)`, [
      JSON.stringify({ role: who.role, ...(sub ? { sub } : {}) }),
      sub,
    ]);
    await tx.exec(`set local role ${who.role}`);
    const res = await tx.query<T>(sql, params);
    return res.rows;
  });
}

export const U1 = '00000000-0000-4000-8000-000000000001';
export const U2 = '00000000-0000-4000-8000-000000000002';
