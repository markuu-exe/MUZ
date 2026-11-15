/**
 * COURSE-2: writes the `lessons` rows from src/content into supabase/seed.sql.
 *
 *   npm run seed:lessons          rewrite the generated block in supabase/seed.sql
 *   npm run seed:lessons:check    exit 1 if seed.sql is out of date (use in CI)
 *
 * Apply the result with `supabase db reset` locally, or paste seed.sql into the
 * Supabase SQL editor for the hosted project. (The old scripts/seed-lessons.ts
 * used the publishable key, which RLS blocks from writing to `lessons`.)
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COURSE_LESSONS, type LessonRow } from '../src/content/index';

const BEGIN = '-- BEGIN GENERATED LESSONS (npm run seed:lessons — do not edit by hand)';
const END = '-- END GENERATED LESSONS';

const here = path.dirname(fileURLToPath(import.meta.url));
const seedPath = path.resolve(here, '../supabase/seed.sql');

const sqlText = (s: string) => `'${s.replace(/'/g, "''")}'`;

function rowSql(l: LessonRow): string {
  const json = JSON.stringify(l.payload);
  if (json.includes('$json$')) throw new Error(`${l.id}: payload contains the $json$ delimiter`);
  return [
    '  (',
    `    ${sqlText(l.id)}, 'piano', ${l.module_index}, ${l.node_index},`,
    `    ${sqlText(l.title)},`,
    `    ${sqlText(l.description)},`,
    `    ${l.required_exp},`,
    `    $json$${json}$json$::jsonb`,
    '  )',
  ].join('\n');
}

export function buildLessonBlock(lessons: readonly LessonRow[] = COURSE_LESSONS): string {
  const ids = lessons.map((l) => sqlText(l.id)).join(', ');
  return [
    BEGIN,
    `-- ${lessons.length} lessons generated from src/content.`,
    '',
    '-- Remove piano lessons that left the course, unless a learner already has history on them.',
    'delete from public.lessons l',
    `where l.instrument = 'piano'`,
    `  and l.id not in (${ids})`,
    '  and not exists (select 1 from public.user_progress p where p.lesson_id = l.id)',
    '  and not exists (select 1 from public.performance_records r where r.lesson_id = l.id);',
    '',
    'insert into public.lessons (id, instrument, module_index, node_index, title, description, required_exp, payload)',
    'values',
    lessons.map(rowSql).join(',\n'),
    'on conflict (id) do update',
    'set',
    '  instrument = excluded.instrument,',
    '  module_index = excluded.module_index,',
    '  node_index = excluded.node_index,',
    '  title = excluded.title,',
    '  description = excluded.description,',
    '  required_exp = excluded.required_exp,',
    '  payload = excluded.payload;',
    END,
  ].join('\n');
}

export function applyBlock(seedSql: string, block: string): string {
  const start = seedSql.indexOf(BEGIN);
  const end = seedSql.indexOf(END);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`supabase/seed.sql must contain the markers:\n${BEGIN}\n${END}`);
  }
  return seedSql.slice(0, start) + block + seedSql.slice(end + END.length);
}

function main() {
  const check = process.argv.includes('--check');
  const current = fs.readFileSync(seedPath, 'utf8');
  const next = applyBlock(current, buildLessonBlock());
  if (check) {
    if (current !== next) {
      console.error('supabase/seed.sql is out of date. Run: npm run seed:lessons');
      process.exit(1);
    }
    console.log(`supabase/seed.sql is up to date (${COURSE_LESSONS.length} lessons).`);
    return;
  }
  fs.writeFileSync(seedPath, next);
  console.log(`Wrote ${COURSE_LESSONS.length} lessons to supabase/seed.sql`);
}

main();
