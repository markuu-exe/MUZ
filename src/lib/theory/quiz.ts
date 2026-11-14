import { NOTE_NAMES, midiToName } from "./notes";

export type QuestionType = "multiple-choice" | "note-id" | "chord-voicing";

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  hint?: string;
  notes?: number[]; 
  display?: "staff" | "keyboard";
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface QuizResult {
  correct: number;
  total: number;
  percent: number;
  allCorrect: boolean;    
  restoresHeart: boolean; 
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickOptions(correct: string, pool: string[], total: number = 4) {
  const wrong = shuffle(pool.filter((p) => p !== correct)).slice(0, total - 1);
  const options = shuffle([correct, ...wrong]);
  return { options, correctIndex: options.indexOf(correct) };
}

interface Fact {
  prompt: string;
  correct: string;
  wrong: string[];
  explanation: string;
}

const FACTS: Fact[] = [
  {
    prompt: "Which clef is usually read by the right hand on piano?",
    correct: "Treble clef",
    wrong: ["Bass clef", "Alto clef", "Tenor clef"],
    explanation: "The treble clef (top staff) is usually played with the right hand.",
  },
  {
    prompt: "Which letters are used to name the white keys on a piano?",
    correct: "A, B, C, D, E, F, G",
    wrong: ["A, B, C, D, E", "A to H", "C, D, E, F, G, H, I"],
    explanation: "Only 7 letters, A to G, are used. After G they start again at A.",
  },
  {
    prompt: "What is the distance between two neighboring piano keys called?",
    correct: "A half step",
    wrong: ["A whole step", "An octave", "A third"],
    explanation: "Neighboring keys, black or white, are one half step apart.",
  },
  {
    prompt: "How many notes are in a major or minor triad?",
    correct: "3",
    wrong: ["2", "4", "5"],
    explanation: "A triad is a three-note chord: a root, a third and a fifth.",
  },
  {
    prompt: "What does a flat sign do to a note?",
    correct: "Lowers it by one half step",
    wrong: ["Raises it by one half step", "Makes it louder", "Makes it shorter"],
    explanation: "A flat lowers a note by one half step, which is the next key to the left.",
  },
  {
    prompt: "Which staff is usually read by the left hand on piano?",
    correct: "Bass clef",
    wrong: ["Treble clef", "Alto clef", "Both staves"],
    explanation: "The bass clef (bottom staff) is usually played with the left hand.",
  },
  {
    prompt: "What does a sharp sign do to a note?",
    correct: "Raises it by one half step",
    wrong: ["Lowers it by one half step", "Makes it louder", "Makes it last longer"],
    explanation: "A sharp raises a note by one half step, which is the next key to the right.",
  },
  {
    prompt: "How many lines does one staff have?",
    correct: "5",
    wrong: ["3", "4", "6"],
    explanation: "A staff has 5 lines and 4 spaces.",
  },
  {
    prompt: "In 4/4 time, how many beats does a quarter note get?",
    correct: "1",
    wrong: ["2", "4", "1/2"],
    explanation: "In 4/4, a quarter note gets one beat.",
  },
  {
    prompt: "Where is middle C on the piano keyboard?",
    correct: "Just left of a group of two black keys",
    wrong: [
      "Just left of a group of three black keys",
      "Just right of a group of two black keys",
      "Between two black keys",
    ],
    explanation: "Every C sits just left of a group of two black keys.",
  },
];

function factQuestion(f: Fact): QuizQuestion {
  const { options, correctIndex } = pickOptions(f.correct, [f.correct, ...f.wrong]);
  return {
    id: "",
    type: "multiple-choice",
    prompt: f.prompt,
    options,
    correctIndex,
    explanation: f.explanation,
  };
}

const NATURAL_PITCH_CLASSES = [0, 2, 4, 5, 7, 9, 11];
const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];

function noteIdQuestion(exclude: number[] = []): QuizQuestion {
  const candidates: number[] = [];
  for (let m = 52; m <= 79; m++) {
    if (NATURAL_PITCH_CLASSES.includes(m % 12) && !exclude.includes(m)) candidates.push(m);
  }
  const midi = pick(candidates);
  const letter = NOTE_NAMES[midi % 12];
  const { options, correctIndex } = pickOptions(letter, LETTERS);
  return {
    id: "",
    type: "note-id",
    prompt: "Which note is this?",
    hint: "Count the lines and spaces up from the clef.",
    notes: [midi],
    display: "staff",
    options,
    correctIndex,
    explanation: `This note is ${letter} (${midiToName(midi)}). It is written ${
      midi >= 60 ? "on or above" : "below"
    } middle C.`,
  };
}

const ROOTS = [
  { name: "C", midi: 60 },
  { name: "D", midi: 62 },
  { name: "E", midi: 64 },
  { name: "F", midi: 65 },
  { name: "G", midi: 67 },
  { name: "A", midi: 69 },
];
const QUALITIES = [
  { label: "major", steps: [0, 4, 7] },
  { label: "minor", steps: [0, 3, 7] },
];
const POSITIONS = ["Root position", "1st inversion", "2nd inversion"];

function voicing(root: number, steps: number[], inversion: number): number[] {
  const notes = steps.map((s) => root + s);
  for (let i = 0; i < inversion; i++) notes.push(notes.shift()! + 12);
  return notes;
}

function randomChord() {
  const root = pick(ROOTS);
  const quality = pick(QUALITIES);
  const inversion = Math.floor(Math.random() * 3);
  return {
    name: `${root.name} ${quality.label}`,
    inversion,
    notes: voicing(root.midi, quality.steps, inversion),
  };
}

const ALL_CHORD_NAMES = ROOTS.flatMap((r) => QUALITIES.map((q) => `${r.name} ${q.label}`));

function chordNameQuestion(): QuizQuestion {
  const chord = randomChord();
  const { options, correctIndex } = pickOptions(chord.name, ALL_CHORD_NAMES);
  return {
    id: "",
    type: "chord-voicing",
    prompt: "Which chord is highlighted on the keyboard?",
    hint: "The chord may be turned upside down (an inversion).",
    notes: chord.notes,
    display: "keyboard",
    options,
    correctIndex,
    explanation: `These keys make ${chord.name}${
      chord.inversion > 0 ? `, played as ${POSITIONS[chord.inversion].toLowerCase()}` : ""
    }.`,
  };
}

function chordPositionQuestion(): QuizQuestion {
  const chord = randomChord();
  const { options, correctIndex } = pickOptions(POSITIONS[chord.inversion], POSITIONS, 3);
  const lowest = NOTE_NAMES[chord.notes[0] % 12];
  return {
    id: "",
    type: "chord-voicing",
    prompt: `This is ${chord.name}. Which position is it in?`,
    hint: "Look at the lowest highlighted key.",
    notes: chord.notes,
    display: "keyboard",
    options,
    correctIndex,
    explanation: `The lowest note is ${lowest}, so it is in ${POSITIONS[chord.inversion].toLowerCase()}.`,
  };
}

let lastFactPrompts: string[] = [];

export function buildQuiz(): QuizQuestion[] {
  const fresh = FACTS.filter((f) => !lastFactPrompts.includes(f.prompt));
  const pool = fresh.length >= 2 ? fresh : FACTS;
  const chosenFacts = shuffle(pool).slice(0, 2);
  lastFactPrompts = chosenFacts.map((f) => f.prompt);

  const firstNote = noteIdQuestion();
  const secondNote = noteIdQuestion(firstNote.notes ?? []);

  const questions = [
    ...chosenFacts.map(factQuestion),
    firstNote,
    secondNote,
    chordNameQuestion(),
    chordPositionQuestion(),
  ];
  return shuffle(questions).map((q, i) => ({ ...q, id: `q${i + 1}` }));
}

export function scoreQuiz(answers: boolean[]): QuizResult {
  const correct = answers.filter(Boolean).length;
  const total = answers.length;
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
  return {
    correct,
    total,
    percent,
    allCorrect: total > 0 && correct === total,
    restoresHeart: percent >= 80,
  };
}
