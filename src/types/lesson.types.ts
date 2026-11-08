export interface QuizOption {
  id: string;
  label: string;
  correct: boolean;
}

export interface TheoryCard {
  title: string;
  body: string;
  notationUrl: string | null;
  diagramUrl: string | null;
  audioSampleUrl: string | null;
  quizOptions: QuizOption[];
}

export interface TheoryStep {
  kind: 'theory';
  cards: TheoryCard[];
}

export interface RhythmStep {
  kind: 'rhythm';
  bpm: number;
  subdivision: number[];
  beats: number;
}

export interface PracticeStep {
  kind: 'practice';
  mode: 'note' | 'chord';
  target: string;
  timeoutSec: number;
}

export type LessonStep = TheoryStep | RhythmStep | PracticeStep;

export interface LessonPayload {
  steps: LessonStep[];
}
