import { useEffect, useMemo, useState } from 'react';
import { LogOut } from 'lucide-react';
import { SkillTree } from '../common/SkillTree';
import { supabase } from '../../lib/supabase/client';
import type { Lesson, Profile, UserProgress } from '../../types/database.types';

interface SkillTreeScreenProps {
  profile: Profile;
  onSignOut: () => Promise<void>;
}

export default function SkillTreeScreen({ profile, onSignOut }: SkillTreeScreenProps) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progressRows, setProgressRows] = useState<UserProgress[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const [{ data: lessonRows }, { data: progress }] = await Promise.all([
        supabase.from('lessons').select('*').eq('instrument', 'piano').order('module_index').order('node_index'),
        supabase.from('user_progress').select('*').eq('user_id', profile.id),
      ]);

      if (cancelled) return;
      setLessons(lessonRows ?? []);
      setProgressRows(progress ?? []);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [profile.id]);

  const userProgress = useMemo(
    () => Object.fromEntries(progressRows.map((row) => [row.lesson_id, row])),
    [progressRows],
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => void onSignOut()}
        className="absolute right-6 top-6 z-20 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/90 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
      <SkillTree profile={profile} lessons={lessons} userProgress={userProgress} onSelectLesson={() => undefined} />
    </div>
  );
}
