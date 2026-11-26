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
  n,
  nameNote,
  ns,
  play,
  playChord,
  playChords,
  playNote,
  playNotes,
  postureHold,
  RANGE_ONE_OCTAVE,
  review,
  rhythm,
  tapAlong,
  tapEcho,
  tapRead,
  unit,
} from '../builders';

/** NOVICE — Units 1–4. */
export const NOVICE_UNITS = [
  unit({
    index: 1,
    title: 'Meet the Keyboard',
    blurb: 'Letter names, black-key groups, middle C, hand shape and a steady beat.',
    lessons: [
      lesson({
        title: 'The Musical Alphabet',
        description: 'Piano keys use seven letters. Learn to find them with the black-key groups.',
        stages: [
          learn(
            card('Seven letters', 'White keys are named A B C D E F G. After G the letters start again at A.', {
              notes: ns('C4 D4 E4 F4 G4 A4 B4'),
              display: 'keyboard',
            }),
            card('Groups of two and three', 'Black keys come in groups of two and three. They are your map of the keyboard.', {
              notes: ns('C#4 D#4 F#4 G#4 A#4'),
              display: 'keyboard',
            }),
            card('Finding C', 'Every C sits just to the left of a group of two black keys.', {
              notes: ns('C3 C4 C5'),
              display: 'keyboard',
            }),
          ),
          check(
            findKey('Click any C.', 'C4', 'C is the white key just left of the two black keys.', { anyOctave: true }),
            findKey('Click any D.', 'D4', 'D sits between the two black keys.', { anyOctave: true }),
            findKey('Click any F.', 'F4', 'F is just left of the group of three black keys.', { anyOctave: true }),
            choose('Which letter comes after G?', 'A', ['H', 'C', 'F'], 'The musical alphabet stops at G and starts again at A.'),
          ),
        ],
      }),
      lesson({
        title: 'Finding Middle C',
        description: 'Locate middle C on the keyboard and on the grand staff, then play it.',
        stages: [
          learn(
            card('Middle C', 'Middle C is the C closest to the centre of the piano. It is the home note for your first lessons.', {
              notes: [n('C4')],
              display: 'both',
            }),
            card('Middle C on the staff', 'On the grand staff, middle C sits on a short ledger line between the treble and bass staves.', {
              notes: [n('C4')],
              display: 'staff',
            }),
          ),
          check(
            findKey('Click middle C.', 'C4', 'Middle C is the C nearest the centre.', { range: [48, 72] }),
            choose(
              'Where does middle C sit on the grand staff?',
              'On a ledger line between the two staves',
              ['On the top line of the treble staff', 'In the bottom space of the bass staff', 'It is not on the staff'],
              'Middle C needs its own short line between the treble and bass staves.',
            ),
          ),
          play(playNote('C4')),
        ],
      }),
      lesson({
        title: 'Hand Shape & Posture',
        description: 'Curved fingers, level forearms and a neutral wrist, checked by your camera.',
        stages: [
          learn(
            card('Curved fingers', 'Rest your hand as if holding a small ball. Fingertips touch the keys, not the flat pads.'),
            card('Level forearm', 'Sit so your elbow bends between 80° and 110°. Your forearm should be roughly level with the keys.'),
            card('Neutral wrist', 'Keep your wrist close to in line with your forearm (140° or straighter). No big dip, no big bump.'),
            card('Finger numbers', 'Thumbs are finger 1, index 2, middle 3, ring 4, pinky 5, on both hands.'),
          ),
          check(
            choose('Which finger is number 1?', 'Thumb', ['Index finger', 'Pinky', 'Middle finger'], 'Piano fingering counts from the thumb (1) to the pinky (5).'),
            choose('Your elbow angle should be about…', '80° to 110°', ['30° to 50°', '150° to 180°', 'It does not matter'], 'A near right angle keeps the forearm level with the keys.'),
          ),
          play(postureHold(undefined, 'Hold a relaxed playing position until the ring fills.')),
        ],
      }),
      lesson({
        title: 'Steady Pulse',
        description: 'Tap quarter notes on the spacebar with the beat highway.',
        stages: [
          learn(
            card('The beat', 'Music has a steady pulse, like a heartbeat. The metronome clicks it for you.'),
            card('Quarter notes', 'A quarter note (♩) lasts one beat. Tap once on every click.'),
          ),
          rhythm(tapAlong('quarters'), tapEcho('quarters')),
        ],
      }),
      checkpoint({
        title: 'Checkpoint: Meet the Keyboard',
        description: 'Show you can find the keys, keep a steady beat and play middle C.',
        stages: [
          review(
            findKey('Click any E.', 'E4', 'E is the right-hand key of the two-black-key group.', { anyOctave: true }),
            choose('Which black-key group sits just right of C?', 'The group of two', ['The group of three', 'Neither', 'Both'], 'C is just left of the group of two black keys.'),
            tapAlong('quarters'),
            playNote('C4'),
          ),
        ],
      }),
    ],
  }),

  unit({
    index: 2,
    title: 'Reading the Staff',
    blurb: 'Treble and bass clef notes, note values and the grand staff.',
    lessons: [
      lesson({
        title: 'Treble Clef Lines & Spaces',
        description: 'Name the notes on the treble staff.',
        stages: [
          learn(
            card('Treble lines', 'From the bottom, the treble lines are E G B D F ("Every Good Boy Does Fine").', {
              notes: ns('E4 G4 B4 D5 F5'),
              display: 'staff',
            }),
            card('Treble spaces', 'The treble spaces spell F A C E from the bottom.', {
              notes: ns('F4 A4 C5 E5'),
              display: 'staff',
            }),
          ),
          check(nameNote('E4'), nameNote('G4'), nameNote('A4'), nameNote('C5'), nameNote('F5')),
        ],
      }),
      lesson({
        title: 'Bass Clef Basics',
        description: 'Name the notes on the bass staff.',
        stages: [
          learn(
            card('Bass lines', 'From the bottom, the bass lines are G B D F A ("Good Boys Do Fine Always").', {
              notes: ns('G2 B2 D3 F3 A3'),
              display: 'staff',
            }),
            card('Bass spaces', 'The bass spaces are A C E G ("All Cows Eat Grass").', {
              notes: ns('A2 C3 E3 G3'),
              display: 'staff',
            }),
          ),
          check(nameNote('G2'), nameNote('D3'), nameNote('A3'), nameNote('C3'), nameNote('E3')),
        ],
      }),
      lesson({
        title: 'Whole, Half & Quarter Notes',
        description: 'Learn how long each note lasts, then tap them.',
        stages: [
          learn(
            card('Note values', 'A whole note (𝅝) lasts 4 beats, a half note (𝅗𝅥) 2 beats and a quarter note (♩) 1 beat.'),
            card('Hold, then move', 'Tap when a note starts, then wait for its length before the next tap.'),
          ),
          check(
            choose('How many beats does a half note last?', '2', ['1', '3', '4'], 'A half note is half of a whole note: 2 beats.'),
            choose('How many quarter notes fill one whole note?', '4', ['2', '3', '8'], 'A whole note lasts 4 beats, one per quarter note.'),
          ),
          rhythm(tapRead('half-quarters'), tapAlong('mixed-values')),
        ],
      }),
      lesson({
        title: 'The Grand Staff & Middle C',
        description: 'Connect the two staves through middle C.',
        stages: [
          learn(
            card('Two staves, one piano', 'The grand staff joins treble and bass. Middle C belongs to both.', {
              notes: [n('C4')],
              display: 'both',
            }),
            card('Neighbours of middle C', 'B3 sits just below middle C and D4 just above it.', {
              notes: ns('B3 C4 D4'),
              display: 'both',
            }),
          ),
          check(nameNote('C4'), nameNote('D4'), nameNote('B3')),
          play(playNote('D4')),
        ],
      }),
      checkpoint({
        title: 'Checkpoint: Reading the Staff',
        description: 'Read notes in both clefs and tap note values.',
        stages: [
          review(
            nameNote('B4'),
            nameNote('F3'),
            nameNote('D5'),
            choose('Which note lasts 4 beats?', 'Whole note', ['Half note', 'Quarter note', 'Eighth note'], 'A whole note fills a 4/4 measure.'),
            tapRead('mixed-values'),
            playNote('E4'),
          ),
        ],
      }),
    ],
  }),

  unit({
    index: 3,
    title: 'Five-Finger Position',
    blurb: 'C position, steps and skips, rests, 3/4 time and a first melody.',
    lessons: [
      lesson({
        title: 'C Position: C to G',
        description: 'Put one finger on each key from C to G.',
        stages: [
          learn(
            card('C position', 'Right thumb on middle C, then fingers 2 3 4 5 on D E F G.', {
              notes: ns('C4 D4 E4 F4 G4'),
              display: 'both',
            }),
          ),
          check(
            findKey('In C position, which key does finger 5 play?', 'G4', 'Finger 5 (pinky) rests on G.', { range: RANGE_ONE_OCTAVE }),
            findKey('Which key does finger 3 play?', 'E4', 'Finger 3 (middle) rests on E.', { range: RANGE_ONE_OCTAVE }),
          ),
          play(playNotes('C4 D4 E4 F4 G4', { prompt: 'Play up the five-finger position, one key at a time.' })),
        ],
      }),
      lesson({
        title: 'Steps & Skips',
        description: 'Hear and play moves to the next key and over a key.',
        stages: [
          learn(
            card('Steps', 'A step moves to the very next letter: C to D. On the staff, line to space.', {
              notes: ns('C4 D4'),
              display: 'both',
            }),
            card('Skips', 'A skip jumps over one letter: C to E. On the staff, line to line.', {
              notes: ns('C4 E4'),
              display: 'both',
            }),
          ),
          check(
            ear('Step or skip?', ['C4', 'D4'], 'Step', ['Skip'], 'C to D is the very next key: a step.'),
            ear('Step or skip?', ['E4', 'G4'], 'Skip', ['Step'], 'E to G jumps over F: a skip.'),
            choose('Moving from a line to the next line is a…', 'Skip', ['Step', 'Repeat'], 'Line to line skips the space between them.'),
          ),
          play(playNotes('C4 E4 G4', { prompt: 'Play C, E and G one at a time: two skips.' })),
        ],
      }),
      lesson({
        title: 'Rests & 3/4 Time',
        description: 'Count silent beats and feel three beats in a measure.',
        stages: [
          learn(
            card('Rests', 'A rest is a silent beat. Keep counting, but do not tap.'),
            card('3/4 time', 'In 3/4 each measure has three beats. It is the waltz pulse: ONE two three.'),
          ),
          rhythm(tapAlong('waltz'), tapRead('waltz-rest'), tapRead('quarters-rest')),
        ],
      }),
      lesson({
        title: 'First Melody',
        description: 'Tap and then play the opening of Ode to Joy.',
        stages: [
          learn(
            card('Ode to Joy', 'Beethoven’s melody starts E E F G G F E D, all in C position.', {
              notes: ns('E4 E4 F4 G4 G4 F4 E4 D4'),
              display: 'staff',
            }),
          ),
          rhythm(tapEcho('first-melody')),
          play(playNotes('E4 E4 F4 G4 G4 F4 E4 D4', { prompt: 'Play the opening of Ode to Joy.' })),
        ],
      }),
      checkpoint({
        title: 'Checkpoint: Five-Finger Position',
        description: 'Steps, skips, rests and C position.',
        stages: [
          review(
            ear('Step or skip?', ['F4', 'A4'], 'Skip', ['Step'], 'F to A jumps over G: a skip.'),
            nameNote('F4'),
            tapRead('waltz-rest'),
            playNotes('C4 D4 E4'),
          ),
        ],
      }),
    ],
  }),

  unit({
    index: 4,
    title: 'First Chords',
    blurb: 'Build and play the C, G and F major triads and change between them.',
    lessons: [
      lesson({
        title: 'What Is a Triad?',
        description: 'Stack a root, a third and a fifth.',
        stages: [
          learn(
            card('Root, third, fifth', 'A triad is three notes stacked in skips: a root, the note a third above, and the note a fifth above.'),
            card('C major', 'Start on C, skip to E, skip to G. Play them together.', {
              notes: ns('C4 E4 G4'),
              display: 'both',
              chord: true,
            }),
          ),
          check(
            buildChord('C', 'C major is C, E and G.'),
            choose('Triads are built by stacking…', 'Thirds (skips)', ['Steps', 'Octaves', 'Half steps'], 'Each note of a triad is a skip above the last.'),
          ),
        ],
      }),
      lesson({
        title: 'C Major',
        description: 'Hear and play your first chord.',
        stages: [
          learn(
            card('Three keys at once', 'Press C, E and G together with fingers 1, 3 and 5.', {
              notes: ns('C4 E4 G4'),
              display: 'both',
              chord: true,
            }),
          ),
          check(
            ear('What did you hear?', ['C4 E4 G4'], 'A chord (three notes)', ['A single note', 'Two notes'], 'Three notes sounded together.'),
            buildChord('C', 'C major is C, E and G.'),
          ),
          play(playChord('C')),
        ],
      }),
      lesson({
        title: 'G Major & F Major',
        description: 'Two more major triads with the same shape.',
        stages: [
          learn(
            card('G major', 'G major is G, B and D: the same skip-skip shape starting on G.', {
              notes: ns('G3 B3 D4'),
              display: 'both',
              chord: true,
            }),
            card('F major', 'F major is F, A and C.', { notes: ns('F3 A3 C4'), display: 'both', chord: true }),
          ),
          check(buildChord('G', 'G major is G, B and D.'), buildChord('F', 'F major is F, A and C.')),
          play(playChord('G'), playChord('F')),
        ],
      }),
      lesson({
        title: 'Chord Changes: C, F, G',
        description: 'Move between chords in time.',
        stages: [
          learn(card('Changing chords', 'Keep your hand shape and slide it: C to F to G and back to C. Change on the beat.')),
          rhythm(tapAlong('chord-changes', { prompt: 'Tap where each chord changes.' })),
          play(playChords('C F G C', { prompt: 'Play C, F, G, then C.' })),
        ],
      }),
      checkpoint({
        title: 'Novice Exam',
        description: 'Everything from the Novice tier. Passing it also places new learners at Proficient.',
        stages: [
          review(
            nameNote('A4'),
            nameNote('B2'),
            findKey('Click any F.', 'F4', 'F is left of the three black keys.', { anyOctave: true }),
            buildChord('G', 'G major is G, B and D.'),
            ear('Step or skip?', ['D4', 'E4'], 'Step', ['Skip'], 'D to E is the next key: a step.'),
            tapRead('mixed-values'),
            playChord('F'),
            playChords('C G C'),
          ),
        ],
      }),
    ],
  }),
];
