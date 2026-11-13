import type { QuizQuestion } from "./quiz";

export interface LessonCard {
  id: string;
  title: string;
  body: string;
  notes?: number[];                        
  display?: "staff" | "keyboard" | "both";
}

export interface Lesson {
  id: string;
  title: string;
  cards: LessonCard[];
  quiz?: QuizQuestion[]; 
}

export const SAMPLE_LESSON: Lesson = {
  id: "sample-note-reading",
  title: "Note Reading: The Musical Alphabet",
  cards: [
    {
      id: "c1",
      title: "The piano alphabet",
      body: "Piano keys use only seven letters: A B C D E F G. After G, the letters start again at A.",
      notes: [60, 62, 64, 65, 67, 69, 71],
      display: "keyboard",
    },
    {
      id: "c2",
      title: "Finding Middle C",
      body: "Middle C sits just left of a group of two black keys, near the center of the piano. On the staff it sits on a short line between the two staves.",
      notes: [60],
      display: "both",
    },
    {
      id: "c3",
      title: "Notes on the staff",
      body: "The treble clef (top) is usually read by the right hand. The bass clef (bottom) is usually read by the left hand. This G sits on the second line of the treble staff.",
      notes: [67],
      display: "staff",
    },
    {
      id: "c4",
      title: "Your first chord",
      body: "Playing C, E and G together makes a C major chord. Press Listen to hear it.",
      notes: [60, 64, 67],
      display: "both",
    },
  ],
};
