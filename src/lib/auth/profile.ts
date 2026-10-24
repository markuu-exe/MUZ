import type { User } from '@supabase/supabase-js';
import { supabase } from '../supabase/client';
import type { Lesson, Profile, UserProgress } from '../../types/database.types';

export const PIANO_FOCUS = 'piano';
export const DEFAULT_HEARTS = 5;

export type SkillLevel = 'absolute_beginner' | 'some_experience' | 'early_intermediate';

export function isOnboarded(user: User | null): boolean {
  return Boolean(user?.user_metadata?.onboarded);
}

function usernameFromUser(user: User): string {
  const raw = user.email?.split('@')[0] ?? 'pianist';
  const cleaned = raw.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 18);
  return cleaned || 'pianist';
}

async function uniqueUsername(user: User): Promise<string> {
  const base = usernameFromUser(user);

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate =
      attempt === 0 ? base : `${base}${Math.floor(100 + Math.random() * 900)}`;
    const { data, error } = await supabase.from('profiles').select('id').eq('username', candidate).maybeSingle();

    if (error || !data) {
      return candidate;
    }
  }

  return `${base}${user.id.replace(/-/g, '').slice(0, 6)}`;
}

export async function ensureProfile(user: User): Promise<Profile> {
  const { data: existing, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (existing) {
    if (existing.instrument_focus !== PIANO_FOCUS) {
      const { data: locked, error: lockError } = await supabase
        .from('profiles')
        .update({ instrument_focus: PIANO_FOCUS })
        .eq('id', user.id)
        .select()
        .single();

      if (lockError) {
        throw lockError;
      }

      return locked;
    }

    return existing;
  }

  const username = await uniqueUsername(user);
  const { data: created, error: insertError } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      username,
      instrument_focus: PIANO_FOCUS,
      hearts: DEFAULT_HEARTS,
      exp: 0,
      current_streak: 0,
    })
    .select()
    .single();

  if (insertError) {
    const { data: raced, error: raceError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (raced) {
      return raced;
    }

    throw raceError ?? insertError;
  }

  return created;
}

function moduleLessons(lessons: Lesson[], moduleIndex: number): Lesson[] {
  return lessons
    .filter((lesson) => lesson.module_index === moduleIndex)
    .sort((a, b) => a.node_index - b.node_index);
}

function firstNode(lessons: Lesson[], moduleIndex: number): Lesson | undefined {
  return moduleLessons(lessons, moduleIndex)[0];
}

/**
 * Self-assessment → baseline skill-tree nodes (SDD C-01 / AUTH FLOW):
 * - Absolute Beginner → unlock Module 1
 * - Some Experience → complete early Module 1 nodes, unlock mid-module
 * - Early Intermediate → complete Module 1, unlock Module 2
 */
export async function applySelfAssessment(userId: string, level: SkillLevel): Promise<void> {
  const { data: lessons, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('instrument', PIANO_FOCUS)
    .order('module_index', { ascending: true })
    .order('node_index', { ascending: true });

  if (error) {
    throw error;
  }

  const catalog = lessons ?? [];
  const now = new Date().toISOString();
  const rows: Array<Pick<UserProgress, 'user_id' | 'lesson_id' | 'completed' | 'completed_at'>> = [];

  if (level === 'absolute_beginner') {
    const start = firstNode(catalog, 1);
    if (start) {
      rows.push({ user_id: userId, lesson_id: start.id, completed: false, completed_at: null });
    }
  } else if (level === 'some_experience') {
    const moduleOne = moduleLessons(catalog, 1);
    const completedCount = Math.max(1, Math.floor(moduleOne.length / 2));

    moduleOne.forEach((lesson, index) => {
      if (index < completedCount) {
        rows.push({
          user_id: userId,
          lesson_id: lesson.id,
          completed: true,
          completed_at: now,
        });
      } else if (index === completedCount) {
        rows.push({
          user_id: userId,
          lesson_id: lesson.id,
          completed: false,
          completed_at: null,
        });
      }
    });

    if (moduleOne.length === 0) {
      const start = firstNode(catalog, 1);
      if (start) {
        rows.push({ user_id: userId, lesson_id: start.id, completed: false, completed_at: null });
      }
    }
  } else {
    moduleLessons(catalog, 1).forEach((lesson) => {
      rows.push({
        user_id: userId,
        lesson_id: lesson.id,
        completed: true,
        completed_at: now,
      });
    });

    const moduleTwo = firstNode(catalog, 2);
    if (moduleTwo) {
      rows.push({ user_id: userId, lesson_id: moduleTwo.id, completed: false, completed_at: null });
    }
  }

  if (rows.length > 0) {
    const { error: progressError } = await supabase.from('user_progress').upsert(rows, {
      onConflict: 'user_id,lesson_id',
    });

    if (progressError) {
      throw progressError;
    }
  }

  const { error: metaError } = await supabase.auth.updateUser({
    data: {
      onboarded: true,
      skill_level: level,
      instrument_focus: PIANO_FOCUS,
    },
  });

  if (metaError) {
    throw metaError;
  }
}
