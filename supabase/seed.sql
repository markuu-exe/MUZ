-- Piano curriculum and badge catalog.
-- Safe to re-run: existing lesson and achievement rows are updated in place.
-- Chord targets are parsed by src/audio/chords/vocabulary.ts (any "C", "Am", "G_Maj" style name).
-- Note targets match src/lib/audio/noteFrequencies.ts.

insert into public.lessons (
  id,
  instrument,
  module_index,
  node_index,
  title,
  description,
  required_exp,
  payload
)
values
  (
    'pno-mod1-node1',
    'piano',
    1,
    1,
    'The Staff',
    'Name the notes on the staff and find middle C before touching the keys.',
    0,
    $json$
    {
      "steps": [
        {
          "kind": "theory",
          "cards": [
            {
              "title": "Lines and spaces",
              "body": "The treble staff has five lines. Notes sit on a line or in a space. Higher on the staff means a higher pitch.",
              "notationUrl": null,
              "diagramUrl": null,
              "audioSampleUrl": null,
              "quizOptions": [
                { "id": "a", "label": "Higher on the staff is a higher pitch", "correct": true },
                { "id": "b", "label": "Higher on the staff is a lower pitch", "correct": false },
                { "id": "c", "label": "Staff position does not change pitch", "correct": false }
              ]
            },
            {
              "title": "Middle C",
              "body": "Middle C sits just below the treble staff, on a ledger line. It is the home note for the first piano lessons.",
              "notationUrl": null,
              "diagramUrl": null,
              "audioSampleUrl": null,
              "quizOptions": [
                { "id": "a", "label": "On a ledger line below the treble staff", "correct": true },
                { "id": "b", "label": "On the top line of the treble staff", "correct": false },
                { "id": "c", "label": "In the first space of the bass staff only", "correct": false }
              ]
            }
          ]
        }
      ]
    }
    $json$::jsonb
  ),
  (
    'pno-mod1-node2',
    'piano',
    1,
    2,
    'Play E2',
    'Learn where E sits, then hold E2 until pitch and posture both lock.',
    40,
    $json$
    {
      "steps": [
        {
          "kind": "theory",
          "cards": [
            {
              "title": "The note E",
              "body": "E is the bottom line of the treble staff. In this drill you play the lower E, E2, so the microphone can check a single pitch.",
              "notationUrl": null,
              "diagramUrl": null,
              "audioSampleUrl": null,
              "quizOptions": [
                { "id": "a", "label": "E2, a single low E", "correct": true },
                { "id": "b", "label": "A full C major chord", "correct": false },
                { "id": "c", "label": "Any white key", "correct": false }
              ]
            }
          ]
        },
        {
          "kind": "practice",
          "mode": "note",
          "target": "E2",
          "timeoutSec": 15
        }
      ]
    }
    $json$::jsonb
  ),
  (
    'pno-mod1-node3',
    'piano',
    1,
    3,
    'Steady Pulse',
    'Tap quarter notes on the spacebar with the beat highway.',
    80,
    $json$
    {
      "steps": [
        {
          "kind": "rhythm",
          "bpm": 72,
          "subdivision": [1, 1, 1, 1],
          "beats": 8
        }
      ]
    }
    $json$::jsonb
  ),
  (
    'pno-mod1-node4',
    'piano',
    1,
    4,
    'C Major Chord',
    'A major triad stacks the root, a major third, and a perfect fifth. C major is C, E, and G.',
    120,
    $json$
    {
      "steps": [
        {
          "kind": "theory",
          "cards": [
            {
              "title": "C, E, and G",
              "body": "Play C, E, and G together. The app matches the chord with a chromagram, not a single pitch.",
              "notationUrl": null,
              "diagramUrl": null,
              "audioSampleUrl": null,
              "quizOptions": [
                { "id": "a", "label": "C, E, and G", "correct": true },
                { "id": "b", "label": "C, D, and E", "correct": false },
                { "id": "c", "label": "C, F, and G", "correct": false }
              ]
            }
          ]
        },
        {
          "kind": "practice",
          "mode": "chord",
          "target": "C",
          "timeoutSec": 15
        }
      ]
    }
    $json$::jsonb
  ),
  (
    'pno-mod2-node1',
    'piano',
    2,
    1,
    'G Major Chord',
    'G major uses G, B, and D. Module 2 opens once you have enough experience.',
    200,
    $json$
    {
      "steps": [
        {
          "kind": "theory",
          "cards": [
            {
              "title": "G, B, and D",
              "body": "G major is the same shape as C major, starting on G. Hold the chord so the match can stay stable.",
              "notationUrl": null,
              "diagramUrl": null,
              "audioSampleUrl": null,
              "quizOptions": [
                { "id": "a", "label": "G, B, and D", "correct": true },
                { "id": "b", "label": "G, A, and B", "correct": false },
                { "id": "c", "label": "G, C, and D", "correct": false }
              ]
            }
          ]
        },
        {
          "kind": "practice",
          "mode": "chord",
          "target": "G",
          "timeoutSec": 15
        }
      ]
    }
    $json$::jsonb
  ),
  (
    'pno-mod2-node2',
    'piano',
    2,
    2,
    'A Minor Chord',
    'A minor lowers the third. The notes are A, C, and E.',
    280,
    $json$
    {
      "steps": [
        {
          "kind": "theory",
          "cards": [
            {
              "title": "Minor third",
              "body": "A minor is A, C, and E. Compared with A major, the middle note is one semitone lower.",
              "notationUrl": null,
              "diagramUrl": null,
              "audioSampleUrl": null,
              "quizOptions": [
                { "id": "a", "label": "A, C, and E", "correct": true },
                { "id": "b", "label": "A, C#, and E", "correct": false },
                { "id": "c", "label": "A, B, and C", "correct": false }
              ]
            }
          ]
        },
        {
          "kind": "practice",
          "mode": "chord",
          "target": "Am",
          "timeoutSec": 15
        }
      ]
    }
    $json$::jsonb
  ),
  (
    'pno-mod2-node3',
    'piano',
    2,
    3,
    'Eighth Notes',
    'Tap a denser grid. Two eighth notes fit inside one quarter-note beat.',
    360,
    $json$
    {
      "steps": [
        {
          "kind": "rhythm",
          "bpm": 96,
          "subdivision": [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
          "beats": 8
        }
      ]
    }
    $json$::jsonb
  ),
  (
    'pno-mod2-node4',
    'piano',
    2,
    4,
    'F Major Chord',
    'F major is F, A, and C. This closes the first two piano modules.',
    440,
    $json$
    {
      "steps": [
        {
          "kind": "theory",
          "cards": [
            {
              "title": "F, A, and C",
              "body": "F major sits a fourth above C. The chord tones are F, A, and C.",
              "notationUrl": null,
              "diagramUrl": null,
              "audioSampleUrl": null,
              "quizOptions": [
                { "id": "a", "label": "F, A, and C", "correct": true },
                { "id": "b", "label": "F, G, and A", "correct": false },
                { "id": "c", "label": "F, A, and B", "correct": false }
              ]
            }
          ]
        },
        {
          "kind": "practice",
          "mode": "chord",
          "target": "F",
          "timeoutSec": 15
        }
      ]
    }
    $json$::jsonb
  )
on conflict (id) do update
set
  instrument = excluded.instrument,
  module_index = excluded.module_index,
  node_index = excluded.node_index,
  title = excluded.title,
  description = excluded.description,
  required_exp = excluded.required_exp,
  payload = excluded.payload;

insert into public.achievements (id, title, exp_reward)
values
  ('first-lesson', 'First Note', 50),
  ('streak-7-days', 'Week of Practice', 50),
  ('streak-30-days', 'Month of Practice', 100),
  ('exp-500', 'Rising Pianist', 50),
  ('posture-stable', 'Steady Hands', 50)
on conflict (id) do update
set
  title = excluded.title,
  exp_reward = excluded.exp_reward;
