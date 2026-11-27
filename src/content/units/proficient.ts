import {
  buildChord,
  card,
  check,
  checkpoint,
  choose,
  ear,
  findKey,
  learn,
  lesson,
  nameNote,
  ns,
  play,
  playChord,
  playChords,
  playNotes,
  review,
  rhythm,
  tapAlong,
  tapEcho,
  tapRead,
  unit,
} from '../builders';

/** PROFICIENT — Units 5–8. */
export const PROFICIENT_UNITS = [
  unit({
    index: 5,
    title: 'Rhythm Expansion',
    blurb: 'Eighth notes, dotted rhythms, ties, 6/8 time and faster tempos.',
    lessons: [
      lesson({
        title: 'Eighth Notes',
        description: 'Two notes in every beat.',
        stages: [
          learn(card('Eighth notes', 'An eighth note (♪) lasts half a beat. Count "1 & 2 & 3 & 4 &" and tap on every number and every "&".', { illustration: 'eighths' })),
          check(choose('How many eighth notes fit in one beat?', '2', ['1', '3', '4'], 'Two eighths make one quarter-note beat.')),
          rhythm(tapAlong('eighths'), tapRead('eighth-mix')),
        ],
      }),
      lesson({
        title: 'Dotted Quarters & Ties',
        description: 'Notes that last longer than one beat.',
        stages: [
          learn(
            card('The dot', 'A dot adds half the note’s value. A dotted quarter (♩.) lasts 1½ beats.', { illustration: 'dotted-quarter' }),
            card('Ties', 'A tie joins two notes of the same pitch. Play the first, then hold through the second.', { illustration: 'tie' }),
          ),
          check(
            choose('How long is a dotted quarter note?', '1½ beats', ['1 beat', '2 beats', '3 beats'], 'Quarter (1) + half of it (½) = 1½.'),
            choose('What does a tie tell you to do?', 'Hold the first note through the second', ['Play both notes', 'Skip the second note and rest', 'Play louder'], 'Tied notes sound as one longer note.'),
          ),
          rhythm(tapRead('dotted'), tapRead('tie')),
        ],
      }),
      lesson({
        title: '6/8 Time',
        description: 'Six eighth-note pulses, felt in two big beats.',
        stages: [
          learn(card('6/8', 'In 6/8 the metronome clicks six eighth notes per measure, grouped 1 2 3 | 4 5 6. It feels like two big beats.', { illustration: 'six-eight' })),
          check(choose('How many big beats does a 6/8 measure feel like?', '2', ['3', '6', '4'], 'The six eighths group into two sets of three.')),
          rhythm(tapEcho('six-eight'), tapAlong('six-eight-dotted')),
        ],
      }),
      lesson({
        title: 'Tempo Ladder',
        description: 'Same pattern, faster each time.',
        stages: [
          rhythm(
            tapAlong('eighth-mix', { settings: { bpm: 72 } }),
            tapAlong('eighth-mix', { settings: { bpm: 96 } }),
            tapAlong('eighth-mix', { settings: { bpm: 120 } }),
          ),
        ],
      }),
      checkpoint({
        title: 'Checkpoint: Rhythm Expansion',
        description: 'Eighths, dots, ties and 6/8.',
        stages: [
          review(
            choose('How many eighth notes in a 4/4 measure?', '8', ['4', '6', '16'], 'Four beats with two eighths each.'),
            tapRead('dotted'),
            tapEcho('eighth-mix'),
            tapAlong('six-eight'),
          ),
        ],
      }),
    ],
  }),

  unit({
    index: 6,
    title: 'Scales & Keys',
    blurb: 'Whole and half steps, the major scale formula, and the keys of G and F.',
    lessons: [
      lesson({
        title: 'Whole & Half Steps',
        description: 'The two building blocks of every scale.',
        stages: [
          learn(
            card('Half step', 'A half step goes to the very next key, black or white. E–F and B–C are half steps with no black key between.', {
              notes: ns('E4 F4'),
              display: 'keyboard',
            }),
            card('Whole step', 'A whole step is two half steps, like C to D.', { notes: ns('C4 D4'), display: 'keyboard' }),
          ),
          check(
            findKey('Click the key a half step above E.', 'F4', 'There is no black key between E and F.', { range: [60, 71] }),
            choose('Which pair is a half step?', 'B and C', ['C and D', 'F and G', 'A and B'], 'B–C has no black key between: a half step.'),
          ),
        ],
      }),
      lesson({
        title: 'The Major Scale Formula',
        description: 'W W H W W W H, starting on C.',
        stages: [
          learn(
            card('The formula', 'Every major scale follows whole, whole, half, whole, whole, whole, half.', { illustration: 'scale-formula' }),
            card('C major scale', 'From C, the formula uses only white keys: C D E F G A B C.', {
              notes: ns('C4 D4 E4 F4 G4 A4 B4 C5'),
              display: 'both',
            }),
          ),
          check(
            choose('What is the major scale formula?', 'W W H W W W H', ['W H W W H W W', 'H W W W H W W', 'W W W H W W H'], 'Two wholes, a half, three wholes, a half.'),
            findKey('Click the 7th note of the C major scale.', 'B4', 'C D E F G A B: the 7th is B.', { range: [60, 72] }),
          ),
          play(playNotes('C4 D4 E4 F4 G4 A4 B4 C5', { prompt: 'Play the C major scale up one octave.' })),
        ],
      }),
      lesson({
        title: 'G Major (One Sharp)',
        description: 'The formula from G needs F#.',
        stages: [
          learn(
            card('G major scale', 'From G the formula needs F# instead of F: G A B C D E F# G.', {
              notes: ns('G4 A4 B4 C5 D5 E5 F#5 G5'),
              display: 'both',
            }),
            card('Key signature', 'One sharp (F#) at the start of the staff means the key of G major.', { illustration: 'key-signature-sharp' }),
          ),
          check(
            findKey('Click the sharp note used in G major.', 'F#4', 'G major uses F#.', { anyOctave: true, range: [60, 72] }),
            choose('One sharp in the key signature means…', 'G major', ['F major', 'D major', 'C major'], 'G major has exactly one sharp: F#.'),
          ),
          play(playNotes('G3 A3 B3 C4 D4 E4 F#4 G4', { prompt: 'Play the G major scale.' })),
        ],
      }),
      lesson({
        title: 'F Major (One Flat)',
        description: 'The formula from F needs Bb.',
        stages: [
          learn(
            card('F major scale', 'From F the formula needs B flat: F G A Bb C D E F.', {
              notes: ns('F4 G4 A4 Bb4 C5 D5 E5 F5'),
              display: 'both',
            }),
            card('Key signature', 'One flat (Bb) at the start of the staff means the key of F major.', { illustration: 'key-signature-flat' }),
          ),
          check(
            findKey('Click the flat note used in F major.', 'Bb4', 'F major uses B flat.', { anyOctave: true, range: [60, 72] }),
            choose('One flat in the key signature means…', 'F major', ['G major', 'Bb major', 'C major'], 'F major has exactly one flat: Bb.'),
          ),
          play(playNotes('F3 G3 A3 Bb3 C4 D4 E4 F4', { prompt: 'Play the F major scale.' })),
        ],
      }),
      checkpoint({
        title: 'Checkpoint: Scales & Keys',
        description: 'Steps, the scale formula and the keys of G and F.',
        stages: [
          review(
            choose('E to F is a…', 'Half step', ['Whole step', 'Skip', 'Octave'], 'No key between E and F.'),
            findKey('Click the sharp note used in G major.', 'F#4', 'G major uses F#.', { anyOctave: true, range: [60, 72] }),
            nameNote('B4'),
            playNotes('G3 A3 B3 C4 D4'),
          ),
        ],
      }),
    ],
  }),

  unit({
    index: 7,
    title: 'Minor & Harmony',
    blurb: 'Hear major against minor, play minor triads, intervals and inversions.',
    lessons: [
      lesson({
        title: 'Major vs Minor by Ear',
        description: 'Bright or dark: tell the two chord colours apart.',
        stages: [
          learn(
            card('Major', 'Major chords sound bright. C major: C E G.', { notes: ns('C4 E4 G4'), display: 'both', chord: true }),
            card('Minor', 'Lower the middle note by a half step for a darker minor chord. C minor: C Eb G.', {
              notes: ns('C4 Eb4 G4'),
              display: 'both',
              chord: true,
            }),
          ),
          check(
            ear('Major or minor?', ['C4 E4 G4'], 'Major', ['Minor'], 'C E G is C major.'),
            ear('Major or minor?', ['A3 C4 E4'], 'Minor', ['Major'], 'A C E is A minor.'),
            ear('Major or minor?', ['D4 F4 A4'], 'Minor', ['Major'], 'D F A is D minor.'),
            ear('Major or minor?', ['F3 A3 C4'], 'Major', ['Minor'], 'F A C is F major.'),
          ),
        ],
      }),
      lesson({
        title: 'A Minor, D Minor, E Minor',
        description: 'The three minor chords of C major.',
        stages: [
          learn(
            card('A minor', 'A C E', { notes: ns('A3 C4 E4'), display: 'both', chord: true }),
            card('D minor', 'D F A', { notes: ns('D4 F4 A4'), display: 'both', chord: true }),
            card('E minor', 'E G B', { notes: ns('E4 G4 B4'), display: 'both', chord: true }),
          ),
          check(buildChord('Am', 'A minor is A, C and E.'), buildChord('Dm', 'D minor is D, F and A.'), buildChord('Em', 'E minor is E, G and B.')),
          play(playChord('Am'), playChord('Dm'), playChord('Em')),
        ],
      }),
      lesson({
        title: 'Intervals: 2nds to Octaves',
        description: 'Measure the distance between two notes.',
        stages: [
          learn(
            card('Seconds and thirds', 'C to D is a 2nd. C to E is a major 3rd.', { notes: ns('C4 D4 E4'), display: 'both' }),
            card('Fifths and octaves', 'C to G is a perfect 5th. C to the next C is an octave.', { notes: ns('C4 G4 C5'), display: 'both' }),
          ),
          check(
            ear('Which interval?', ['C4', 'G4'], 'Perfect 5th', ['Major 3rd', 'Octave', 'Major 2nd'], 'C up to G is a perfect 5th.'),
            ear('Which interval?', ['C4', 'C5'], 'Octave', ['Perfect 5th', 'Major 3rd', 'Major 2nd'], 'C to the next C is an octave.'),
            ear('Which interval?', ['C4', 'E4'], 'Major 3rd', ['Perfect 5th', 'Octave', 'Major 2nd'], 'C to E is a major 3rd.'),
            choose('C up to G is a…', 'Perfect 5th', ['Major 3rd', 'Perfect 4th', 'Octave'], 'C D E F G: five letters, a 5th.'),
          ),
        ],
      }),
      lesson({
        title: 'Inversions',
        description: 'The same chord with a different note on the bottom.',
        stages: [
          learn(
            card('Root position', 'C E G: the root (C) is on the bottom.', { notes: ns('C4 E4 G4'), display: 'both', chord: true }),
            card('First inversion', 'E G C: the third is on the bottom.', { notes: ns('E4 G4 C5'), display: 'both', chord: true }),
            card('Second inversion', 'G C E: the fifth is on the bottom. It is still a C major chord.', {
              notes: ns('G4 C5 E5'),
              display: 'both',
              chord: true,
            }),
          ),
          check(
            choose('E G C is which inversion of C major?', 'First inversion', ['Root position', 'Second inversion', 'Not a C chord'], 'The third (E) is on the bottom.'),
            buildChord('C', 'Any order of C, E and G is C major.', 'Build C major in any inversion.'),
          ),
          play(playChord('C'), playChord('G')),
        ],
      }),
      checkpoint({
        title: 'Checkpoint: Minor & Harmony',
        description: 'Chord colours, minor triads, intervals and inversions.',
        stages: [
          review(
            ear('Major or minor?', ['E4 G4 B4'], 'Minor', ['Major'], 'E G B is E minor.'),
            buildChord('Em', 'E minor is E, G and B.'),
            ear('Which interval?', ['D4', 'A4'], 'Perfect 5th', ['Major 3rd', 'Octave', 'Major 2nd'], 'D up to A is a perfect 5th.'),
            playChord('Dm'),
          ),
        ],
      }),
    ],
  }),

  unit({
    index: 8,
    title: 'Progressions',
    blurb: 'Roman numerals, I–IV–V, the pop progression and progressions in G and F.',
    lessons: [
      lesson({
        title: 'I–IV–V in C',
        description: 'The three most important chords of a key.',
        stages: [
          learn(card('Roman numerals', 'Number chords by their scale step. In C major: I = C, IV = F, V = G.', { illustration: 'roman-numerals' })),
          check(
            choose('In C major, the V chord is…', 'G', ['F', 'D', 'A'], 'G is the 5th note of C major.'),
            choose('In C major, the IV chord is…', 'F', ['G', 'E', 'A'], 'F is the 4th note of C major.'),
          ),
          play(playChords('C F G C', { prompt: 'Play I–IV–V–I in C.' })),
        ],
      }),
      lesson({
        title: 'The Pop Progression',
        description: 'I–V–vi–IV: C, G, Am, F.',
        stages: [
          learn(card('I–V–vi–IV', 'Countless songs use C, G, Am, F. Lower-case vi means a minor chord.', { illustration: 'roman-numerals' })),
          check(
            choose('In C major, vi is…', 'Am', ['A', 'Em', 'F'], 'The 6th note is A, and vi is minor: A minor.'),
            ear('Major or minor?', ['A3 C4 E4'], 'Minor', ['Major'], 'vi is a minor chord.'),
          ),
          rhythm(tapAlong('pop-rhythm')),
          play(playChords('C G Am F', { prompt: 'Play I–V–vi–IV.' })),
        ],
      }),
      lesson({
        title: 'Progressions in G & F',
        description: 'Move I–IV–V to new keys.',
        stages: [
          learn(card('Same numbers, new letters', 'In G major: I = G, IV = C, V = D. In F major: I = F, IV = Bb, V = C.', { illustration: 'roman-numerals' })),
          check(
            choose('In G major, IV is…', 'C', ['D', 'A', 'F'], 'C is the 4th note of G major.'),
            choose('In F major, V is…', 'C', ['Bb', 'G', 'D'], 'C is the 5th note of F major.'),
          ),
          play(playChords('G C D G', { prompt: 'I–IV–V–I in G.' }), playChords('F Bb C F', { prompt: 'I–IV–V–I in F.' })),
        ],
      }),
      lesson({
        title: 'Rhythm + Chords',
        description: 'Lock the pop progression to a groove.',
        stages: [
          rhythm(tapAlong('pop-rhythm', { settings: { bpm: 90 } })),
          play(playChords('C G Am F', { prompt: 'Play it again, changing chords a little faster.' })),
        ],
      }),
      checkpoint({
        title: 'Proficient Exam',
        description: 'Everything from the Proficient tier. Passing it also places new learners at Virtuoso.',
        stages: [
          review(
            ear('Major or minor?', ['D4 F4 A4'], 'Minor', ['Major'], 'D F A is D minor.'),
            buildChord('Dm', 'D minor is D, F and A.'),
            choose('In G major, V is…', 'D', ['C', 'A', 'E'], 'D is the 5th note of G major.'),
            tapRead('dotted'),
            tapAlong('eighth-mix'),
            playChord('Am'),
            playChords('G C D G'),
          ),
        ],
      }),
    ],
  }),
];
