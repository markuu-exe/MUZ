import type { FC } from 'react';
import SkillTreeView from '../dashboard/SkillTreeView';
import { toCurriculumNode, type CurriculumNode } from '../../lib/dashboard/curriculum';
import type { Database } from '../../types/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Lesson = Database['public']['Tables']['lessons']['Row'];
type UserProgress = Database['public']['Tables']['user_progress']['Row'];

interface SkillTreeProps {
  profile: Profile;
  lessons: Lesson[];
  userProgress: Record<string, UserProgress>;
  onSelectLesson: (lessonId: string) => void;
}

export const SkillTree: FC<SkillTreeProps> = ({
  profile,
  lessons,
  userProgress,
  onSelectLesson,
}) => {
  const nodes: CurriculumNode[] = lessons.map((lesson) => toCurriculumNode(lesson, userProgress[lesson.id]));

  return (
    <SkillTreeView
      lessons={nodes}
      progress={userProgress}
      exp={profile.exp}
      hearts={profile.hearts}
      profileLoaded
      shakingId={null}
      selectedId={null}
      onSelect={(lesson) => onSelectLesson(lesson.id)}
      // SkillTreeView reads the full catalog for module gating.
    />
  );
};
