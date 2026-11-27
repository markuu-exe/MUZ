import {
  buildChord,
  card,
  check,
  checkpoint,
  choose,
  ear,
  learn,
  lesson,
  nameNote,
  ns,
  play,
  playChord,
  playChords,
  postureHold,
  review,
  rhythm,
  tapAlong,
  tapEcho,
  tapRead,
  unit,
} from '../builders';

const QUALITIES = ['Major', 'Minor', 'Diminished', 'Augmented'];
const SEVENTHS = ['Major 7th', 'Dominant 7th', 'Minor 7th'];
const others = (all: string[], correct: string) => all.filter((x) => x !== correct);

/** VIRTUOSO — Units 9–12. */
export const VIRTUOSO_UNITS = [
  unit({
    index: 9,
    title: 'Advanced Rhythm',
    blurb: 'Syncopation, sixteenths, triplets, swing and speed.',
    lessons: [
      lesson({
        title: 'Syncopation',
        description: 'Accents that land between the beats.',
        stages: [
          learn(card('Off the beat', 'Syncopation puts the strong sound on an "&" instead of a number. Keep the click steady in your head.', { illustration: 'syncopation' })),
          check(choose('A syncopated note usually starts…', 'Between the beats', ['Exactly on beat 1', 'Only on rests', 'After the measure ends'], 'Syncopation moves accents off the main beats.')),
          rhythm(tapRead('syncopation'), tapEcho('syncopation')),
        ],
      }),
      lesson({
        title: 'Sixteenth Notes',
        description: 'Four notes in every beat.',
        stages: [
          learn(card('Sixteenths', 'A sixteenth note lasts a quarter of a beat. Count "1 e & a 2 e & a".', { illustration: 'sixteenths' })),
          check(choose('How many sixteenth notes fit in one beat?', '4', ['2', '3', '8'], 'Four sixteenths make one quarter-note beat.')),
          rhythm(tapAlong('sixteenths'), tapRead('sixteenth-mix')),
        ],
      }),
      lesson({
        title: 'Triplets & Swing',
        description: 'Three in the space of two, and the long-short swing feel.',
        stages: [
          learn(
            card('Triplets', 'A triplet squeezes three equal notes into one beat. Count "1 trip-let 2 trip-let".', { illustration: 'triplets' }),
            card('Swing', 'Swing plays pairs of eighths long-short, using the first and third notes of a triplet.', { illustration: 'swing' }),
          ),
          check(choose('How many triplet eighths fit in one beat?', '3', ['2', '4', '6'], 'Three equal notes per beat.')),
          rhythm(tapAlong('triplets'), tapEcho('swing')),
        ],
      }),
      lesson({
        title: 'Speed Run',
        description: 'Straight eighths up to 140 BPM.',
        stages: [
          rhythm(
            tapAlong('eighths', { settings: { bpm: 120 } }),
            tapAlong('eighths', { settings: { bpm: 130 } }),
            tapAlong('eighths', { settings: { bpm: 140 } }),
          ),
        ],
      }),
      checkpoint({
        title: 'Checkpoint: Advanced Rhythm',
        description: 'Syncopation, sixteenths, triplets and speed.',
        stages: [
          review(
            choose('Swing eighths are played…', 'Long-short', ['Short-long', 'Exactly even', 'As sixteenths'], 'Swing uses the first and third notes of a triplet.'),
            tapRead('syncopation'),
            tapEcho('triplets'),
            tapAlong('sixteenth-mix'),
          ),
        ],
      }),
    ],
  }),

  unit({
    index: 10,
    title: 'Seventh Chords',
    blurb: 'Dominant, major and minor sevenths and the ii–V–I.',
    lessons: [
      lesson({
        title: 'Dominant 7th',
        description: 'A major triad plus a minor seventh.',
        stages: [
          learn(card('G7', 'G7 is G B D plus F. Its tension wants to resolve to C.', { notes: ns('G3 B3 D4 F4'), display: 'both', chord: true })),
          check(
            buildChord('G7', 'G7 is G, B, D and F.'),
            choose('Which note turns G major into G7?', 'F', ['F#', 'E', 'A'], 'A dominant 7th adds the note a minor 7th above the root: F.'),
          ),
          play(playChord('G7')),
        ],
      }),
      lesson({
        title: 'Major 7th & Minor 7th',
        description: 'Two more seventh-chord colours.',
        stages: [
          learn(
            card('Cmaj7', 'C E G B: dreamy and open.', { notes: ns('C4 E4 G4 B4'), display: 'both', chord: true }),
            card('Dm7', 'D F A C: soft and warm.', { notes: ns('D4 F4 A4 C5'), display: 'both', chord: true }),
          ),
          check(
            ear('Which seventh chord?', ['C4 E4 G4 B4'], 'Major 7th', others(SEVENTHS, 'Major 7th'), 'C E G B is Cmaj7.'),
            ear('Which seventh chord?', ['D4 F4 A4 C5'], 'Minor 7th', others(SEVENTHS, 'Minor 7th'), 'D F A C is Dm7.'),
            buildChord('Dm7', 'Dm7 is D, F, A and C.'),
          ),
          play(playChord('Cmaj7'), playChord('Dm7')),
        ],
      }),
      lesson({
        title: 'The ii–V–I',
        description: 'The core progression of jazz.',
        stages: [
          learn(card('ii–V–I in C', 'Dm7 → G7 → Cmaj7. Each chord pulls into the next.', { illustration: 'two-five-one' })),
          check(choose('In C major, the ii chord is…', 'Dm7', ['Em7', 'G7', 'Am7'], 'D is the 2nd note; ii is a minor 7th: Dm7.')),
          play(playChords('Dm7 G7 Cmaj7', { prompt: 'Play ii–V–I in C.' })),
        ],
      }),
      lesson({
        title: 'ii–V–I in Other Keys',
        description: 'Take the progression to G and F.',
        stages: [
          learn(card('New keys', 'In G: Am7 → D7 → Gmaj7. In F: Gm7 → C7 → Fmaj7.', { illustration: 'new-keys' })),
          check(choose('In F major, the ii chord is…', 'Gm7', ['Am7', 'C7', 'Dm7'], 'G is the 2nd note of F major.')),
          play(playChords('Am7 D7 Gmaj7', { prompt: 'ii–V–I in G.' }), playChords('Gm7 C7 Fmaj7', { prompt: 'ii–V–I in F.' })),
        ],
      }),
      checkpoint({
        title: 'Checkpoint: Seventh Chords',
        description: 'Seventh-chord colours and the ii–V–I.',
        stages: [
          review(
            buildChord('G7', 'G7 is G, B, D and F.'),
            ear('Which seventh chord?', ['A3 C4 E4 G4'], 'Minor 7th', others(SEVENTHS, 'Minor 7th'), 'A C E G is Am7.'),
            playChords('Dm7 G7 Cmaj7'),
          ),
        ],
      }),
    ],
  }),

  unit({
    index: 11,
    title: 'Colour & Keys',
    blurb: 'Diminished and augmented chords, the circle of fifths and borrowed chords.',
    lessons: [
      lesson({
        title: 'Diminished & Augmented',
        description: 'The two remaining triad qualities.',
        stages: [
          learn(
            card('Diminished', 'Two minor thirds: B D F. Tense and unstable.', { notes: ns('B3 D4 F4'), display: 'both', chord: true }),
            card('Augmented', 'Two major thirds: C E G#. Floating and unresolved.', { notes: ns('C4 E4 G#4'), display: 'both', chord: true }),
          ),
          check(
            ear('Which quality?', ['B3 D4 F4'], 'Diminished', others(QUALITIES, 'Diminished'), 'B D F is B diminished.'),
            ear('Which quality?', ['C4 E4 G#4'], 'Augmented', others(QUALITIES, 'Augmented'), 'C E G# is C augmented.'),
            buildChord('Bdim', 'B diminished is B, D and F.'),
          ),
          play(playChord('Bdim'), playChord('Caug')),
        ],
      }),
      lesson({
        title: 'Circle of Fifths',
        description: 'How all twelve keys connect.',
        stages: [
          learn(
            card('Sharps clockwise', 'Each step up a 5th adds one sharp: C (0), G (1), D (2), A (3), E (4), B (5).', { illustration: 'circle-of-fifths' }),
            card('Flats anticlockwise', 'Each step down a 5th adds one flat: F (1), Bb (2), Eb (3), Ab (4).', { illustration: 'circle-of-fifths' }),
          ),
          check(
            choose('Which major key has 2 sharps?', 'D', ['G', 'A', 'E'], 'C → G (1) → D (2).'),
            choose('Which major key has 3 flats?', 'Eb', ['Bb', 'Ab', 'F'], 'F (1) → Bb (2) → Eb (3).'),
            choose('Going clockwise, which key comes after D?', 'A', ['G', 'E', 'B'], 'A is a 5th above D.'),
          ),
        ],
      }),
      lesson({
        title: 'All 12 Major Chords',
        description: 'Play every major chord around the circle.',
        stages: [
          learn(card('Around the circle', 'C G D A E B F# Db Ab Eb Bb F, then back to C.', { illustration: 'circle-of-fifths' })),
          play(playChords('C G D A E B F# Db Ab Eb Bb F', { prompt: 'Play all twelve major chords around the circle.' })),
        ],
      }),
      lesson({
        title: 'Borrowed & Chromatic Chords',
        description: 'Colour chords taken from the parallel minor.',
        stages: [
          learn(
            card('Borrowed iv', 'In C major, F minor (iv) is borrowed from C minor. It gives a bittersweet turn.', {
              notes: ns('F3 Ab3 C4'),
              display: 'both',
              chord: true,
            }),
            card('Flat VII', 'Bb major (bVII) is borrowed too: C → Bb → F → C.', { illustration: 'flat-seven' }),
          ),
          check(
            choose('F minor in the key of C major is borrowed from…', 'C minor', ['F major', 'G major', 'A minor'], 'iv comes from the parallel minor key.'),
            buildChord('Fm', 'F minor is F, Ab and C.'),
          ),
          play(playChords('C Fm C', { prompt: 'I–iv–I.' }), playChords('C Bb F C', { prompt: 'I–bVII–IV–I.' })),
        ],
      }),
      checkpoint({
        title: 'Checkpoint: Colour & Keys',
        description: 'Triad qualities, the circle of fifths and borrowed chords.',
        stages: [
          review(
            ear('Which quality?', ['D4 F4 Ab4'], 'Diminished', others(QUALITIES, 'Diminished'), 'D F Ab is D diminished.'),
            choose('Which major key has 1 flat?', 'F', ['Bb', 'G', 'C'], 'F major has only Bb.'),
            playChords('D A E'),
          ),
        ],
      }),
    ],
  }),

  unit({
    index: 12,
    title: 'Performance',
    blurb: 'Sight-reading, long progressions and posture endurance.',
    lessons: [
      lesson({
        title: 'Sight-Reading Sprint',
        description: 'Read fast in both clefs, then read rhythms cold.',
        stages: [
          check(nameNote('G5'), nameNote('C3'), nameNote('A2'), nameNote('E5')),
          rhythm(tapRead('sixteenth-mix'), tapRead('swing')),
        ],
      }),
      lesson({
        title: 'Progression Medley',
        description: 'A long progression mixing every chord type you know.',
        stages: [play(playChords('C Am F G Em Am Dm7 G7 Cmaj7', { prompt: 'Play the whole medley.' }))],
      }),
      lesson({
        title: 'Endurance: Posture Lock',
        description: 'Keep perfect posture through a long run.',
        stages: [play(postureHold(30), playChords('C G Am F C G Am F', { prompt: 'Eight chords; posture must hold for every one.' }))],
      }),
      checkpoint({
        title: 'Virtuoso Exam',
        description: 'The final exam: reading, rhythm, harmony and performance.',
        stages: [
          review(
            nameNote('F5'),
            ear('Which quality?', ['C4 E4 G#4'], 'Augmented', others(QUALITIES, 'Augmented'), 'C E G# is C augmented.'),
            buildChord('Dm7', 'Dm7 is D, F, A and C.'),
            tapRead('syncopation'),
            tapAlong('triplets'),
            playChords('Am7 D7 Gmaj7'),
            playChord('F#'),
          ),
        ],
      }),
    ],
  }),
];
