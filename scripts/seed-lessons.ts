import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

function loadLocalEnv() {
  const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env.local');

  if (!fs.existsSync(envPath)) {
    return;
  }

  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
    if (!match || match[1] in process.env) {
      continue;
    }

    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

loadLocalEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    'Missing Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.',
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

interface LessonSeed {
  id: string;
  instrument: string;
  module_index: number;
  node_index: number;
  title: string;
  description: string;
  required_exp: number;
  payload: Record<string, unknown>;
}

async function seedLessons() {
  console.log('Starting MUZ lesson data ingestion...');

  const filePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../supabase/seed_lessons.json');
  const rawData = fs.readFileSync(filePath, 'utf-8');
  const lessons: LessonSeed[] = JSON.parse(rawData);

  for (const lesson of lessons) {
    if (lesson.instrument !== 'piano') {
      throw new Error(`Lesson ${lesson.id} violates the piano-only scope constraint.`);
    }

    const { error } = await supabase
      .from('lessons')
      .upsert(lesson, { onConflict: 'id' });

    if (error) {
      throw new Error(`Failed to seed ${lesson.id}: ${error.message}`);
    }

    console.log(`Successfully seeded/upserted node: ${lesson.id} (${lesson.title})`);
  }

  console.log('Lesson ingestion complete.');
}

seedLessons().catch((err) => {
  console.error('Fatal error during lesson seeding:', err instanceof Error ? err.message : err);
  process.exit(1);
});