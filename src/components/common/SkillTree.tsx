import React from 'react';
import { Lock, CheckCircle, Play, Heart, Flame, Award } from 'lucide-react';
import { Database } from '../../types/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Lesson = Database['public']['Tables']['lessons']['Row'];
type UserProgress = Database['public']['Tables']['user_progress']['Row'];

interface SkillTreeProps {
  profile: Profile;
  lessons: Lesson[];
  userProgress: Record<string, UserProgress>;
  onSelectLesson: (lessonId: string) => void;
}

export const SkillTree: React.FC<SkillTreeProps> = ({
  profile,
  lessons,
  userProgress,
  onSelectLesson,
}) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-6">
      {/* Top Gamification Bar */}
      <header className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl p-4 flex justify-between items-center mb-8 shadow-xl">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2 text-rose-500 font-bold">
            <Heart className="fill-rose-500 w-5 h-5" />
            <span>{profile.hearts}/5</span>
          </div>
          <div className="flex items-center space-x-2 text-amber-500 font-bold">
            <Flame className="fill-amber-500 w-5 h-5" />
            <span>{profile.current_streak} Days</span>
          </div>
        </div>
        <div className="flex items-center space-x-3 bg-indigo-950/60 border border-indigo-800/50 px-4 py-2 rounded-xl">
          <Award className="text-indigo-400 w-5 h-5" />
          <span className="font-mono text-indigo-200 font-semibold">{profile.exp} EXP</span>
        </div>
      </header>

      {/* Lesson Tree Pathway */}
      <main className="w-full max-w-xl flex flex-col items-center space-y-8 relative">
        <div className="absolute top-0 bottom-0 w-1 bg-slate-800 -z-0" />
        {lessons.map((lesson, idx) => {
          const progress = userProgress[lesson.id];
          const isCompleted = progress?.completed ?? false;
          const isUnlocked = idx === 0 || userProgress[lessons[idx - 1]?.id]?.completed;

          return (
            <div key={lesson.id} className="relative z-10 flex flex-col items-center">
              <button
                disabled={!isUnlocked || profile.hearts === 0}
                onClick={() => onSelectLesson(lesson.id)}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 border-4 shadow-lg ${
                  isCompleted
                    ? 'bg-emerald-600 border-emerald-400 text-white hover:scale-105'
                    : isUnlocked
                    ? 'bg-indigo-600 border-indigo-400 text-white hover:scale-110 animate-pulse'
                    : 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle className="w-8 h-8" />
                ) : isUnlocked ? (
                  <Play className="w-8 h-8 fill-current ml-1" />
                ) : (
                  <Lock className="w-8 h-8" />
                )}
              </button>
              <span className="mt-2 text-sm font-medium text-slate-300 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                {lesson.title}
              </span>
            </div>
          );
        })}
      </main>
    </div>
  );
};
