-- Piano curriculum and badge catalog.
-- Safe to re-run: existing lesson and achievement rows are updated in place.
-- The lesson block is GENERATED from src/content by `npm run seed:lessons`.

-- BEGIN GENERATED LESSONS (npm run seed:lessons — do not edit by hand)
-- 59 lessons generated from src/content.

-- Remove piano lessons that left the course, unless a learner already has history on them.
delete from public.lessons l
where l.instrument = 'piano'
  and l.id not in ('pno-mod1-node1', 'pno-mod1-node2', 'pno-mod1-node3', 'pno-mod1-node4', 'pno-mod1-node5', 'pno-mod2-node1', 'pno-mod2-node2', 'pno-mod2-node3', 'pno-mod2-node4', 'pno-mod2-node5', 'pno-mod3-node1', 'pno-mod3-node2', 'pno-mod3-node3', 'pno-mod3-node4', 'pno-mod3-node5', 'pno-mod4-node1', 'pno-mod4-node2', 'pno-mod4-node3', 'pno-mod4-node4', 'pno-mod4-node5', 'pno-mod5-node1', 'pno-mod5-node2', 'pno-mod5-node3', 'pno-mod5-node4', 'pno-mod5-node5', 'pno-mod6-node1', 'pno-mod6-node2', 'pno-mod6-node3', 'pno-mod6-node4', 'pno-mod6-node5', 'pno-mod7-node1', 'pno-mod7-node2', 'pno-mod7-node3', 'pno-mod7-node4', 'pno-mod7-node5', 'pno-mod8-node1', 'pno-mod8-node2', 'pno-mod8-node3', 'pno-mod8-node4', 'pno-mod8-node5', 'pno-mod9-node1', 'pno-mod9-node2', 'pno-mod9-node3', 'pno-mod9-node4', 'pno-mod9-node5', 'pno-mod10-node1', 'pno-mod10-node2', 'pno-mod10-node3', 'pno-mod10-node4', 'pno-mod10-node5', 'pno-mod11-node1', 'pno-mod11-node2', 'pno-mod11-node3', 'pno-mod11-node4', 'pno-mod11-node5', 'pno-mod12-node1', 'pno-mod12-node2', 'pno-mod12-node3', 'pno-mod12-node4')
  and not exists (select 1 from public.user_progress p where p.lesson_id = l.id)
  and not exists (select 1 from public.performance_records r where r.lesson_id = l.id);

insert into public.lessons (id, instrument, module_index, node_index, title, description, required_exp, payload)
values
  (
    'pno-mod1-node1', 'piano', 1, 1,
    'The Musical Alphabet',
    'Piano keys use seven letters. Learn to find them with the black-key groups.',
    0,
    $json${"schemaVersion":2,"tier":"novice","unit":1,"isCheckpoint":false,"settings":{"passMark":0.7,"timeoutSec":15,"bpm":66,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":5,"rhythmFailHeartCost":0,"exp":20,"checkpointExp":50},"stages":[{"kind":"learn","exercises":[{"type":"concept-card","title":"Seven letters","body":"White keys are named A B C D E F G. After G the letters start again at A.","notes":[60,62,64,65,67,69,71],"display":"keyboard","id":"s1-e1"},{"type":"concept-card","title":"Groups of two and three","body":"Black keys come in groups of two and three. They are your map of the keyboard.","notes":[61,63,66,68,70],"display":"keyboard","id":"s1-e2"},{"type":"concept-card","title":"Finding C","body":"Every C sits just to the left of a group of two black keys.","notes":[48,60,72],"display":"keyboard","id":"s1-e3"}]},{"kind":"check","exercises":[{"type":"find-the-key","prompt":"Click any C.","target":60,"anyOctave":true,"range":[48,71],"explanation":"C is the white key just left of the two black keys.","id":"s2-e1"},{"type":"find-the-key","prompt":"Click any D.","target":62,"anyOctave":true,"range":[48,71],"explanation":"D sits between the two black keys.","id":"s2-e2"},{"type":"find-the-key","prompt":"Click any F.","target":65,"anyOctave":true,"range":[48,71],"explanation":"F is just left of the group of three black keys.","id":"s2-e3"},{"type":"choose-answer","prompt":"Which letter comes after G?","options":["H","C","A","F"],"correctIndex":2,"explanation":"The musical alphabet stops at G and starts again at A.","id":"s2-e4"}]}]}$json$::jsonb
  ),
  (
    'pno-mod1-node2', 'piano', 1, 2,
    'Finding Middle C',
    'Locate middle C on the keyboard and on the grand staff, then play it.',
    10,
    $json${"schemaVersion":2,"tier":"novice","unit":1,"isCheckpoint":false,"settings":{"passMark":0.7,"timeoutSec":15,"bpm":66,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":5,"rhythmFailHeartCost":0,"exp":20,"checkpointExp":50},"stages":[{"kind":"learn","exercises":[{"type":"concept-card","title":"Middle C","body":"Middle C is the C closest to the centre of the piano. It is the home note for your first lessons.","notes":[60],"display":"both","id":"s1-e1"},{"type":"concept-card","title":"Middle C on the staff","body":"On the grand staff, middle C sits on a short ledger line between the treble and bass staves.","notes":[60],"display":"staff","id":"s1-e2"}]},{"kind":"check","exercises":[{"type":"find-the-key","prompt":"Click middle C.","target":60,"anyOctave":false,"range":[48,72],"explanation":"Middle C is the C nearest the centre.","id":"s2-e1"},{"type":"choose-answer","prompt":"Where does middle C sit on the grand staff?","options":["On the top line of the treble staff","In the bottom space of the bass staff","On a ledger line between the two staves","It is not on the staff"],"correctIndex":2,"explanation":"Middle C needs its own short line between the treble and bass staves.","id":"s2-e2"}]},{"kind":"play","exercises":[{"type":"play-note","note":60,"id":"s3-e1"}]}]}$json$::jsonb
  ),
  (
    'pno-mod1-node3', 'piano', 1, 3,
    'Hand Shape & Posture',
    'Curved fingers, level forearms and a neutral wrist, checked by your camera.',
    30,
    $json${"schemaVersion":2,"tier":"novice","unit":1,"isCheckpoint":false,"settings":{"passMark":0.7,"timeoutSec":15,"bpm":66,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":5,"rhythmFailHeartCost":0,"exp":20,"checkpointExp":50},"stages":[{"kind":"learn","exercises":[{"type":"concept-card","title":"Curved fingers","body":"Rest your hand as if holding a small ball. Fingertips touch the keys, not the flat pads.","illustration":"curved-fingers","id":"s1-e1"},{"type":"concept-card","title":"Level forearm","body":"Sit so your elbow bends between 80° and 110°. Your forearm should be roughly level with the keys.","illustration":"elbow-angle","id":"s1-e2"},{"type":"concept-card","title":"Neutral wrist","body":"Keep your wrist close to in line with your forearm (140° or straighter). No big dip, no big bump.","illustration":"wrist-neutral","id":"s1-e3"},{"type":"concept-card","title":"Finger numbers","body":"Thumbs are finger 1, index 2, middle 3, ring 4, pinky 5, on both hands.","illustration":"finger-numbers","id":"s1-e4"}]},{"kind":"check","exercises":[{"type":"choose-answer","prompt":"Which finger is number 1?","options":["Index finger","Pinky","Thumb","Middle finger"],"correctIndex":2,"explanation":"Piano fingering counts from the thumb (1) to the pinky (5).","id":"s2-e1"},{"type":"choose-answer","prompt":"Your elbow angle should be about…","options":["30° to 50°","150° to 180°","80° to 110°","It does not matter"],"correctIndex":2,"explanation":"A near right angle keeps the forearm level with the keys.","id":"s2-e2"}]},{"kind":"play","exercises":[{"type":"posture-hold","prompt":"Hold a relaxed playing position until the ring fills.","id":"s3-e1"}]}]}$json$::jsonb
  ),
  (
    'pno-mod1-node4', 'piano', 1, 4,
    'Steady Pulse',
    'Tap quarter notes on the spacebar with the beat highway.',
    40,
    $json${"schemaVersion":2,"tier":"novice","unit":1,"isCheckpoint":false,"settings":{"passMark":0.7,"timeoutSec":15,"bpm":66,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":5,"rhythmFailHeartCost":0,"exp":20,"checkpointExp":50},"stages":[{"kind":"learn","exercises":[{"type":"concept-card","title":"The beat","body":"Music has a steady pulse, like a heartbeat. The metronome clicks it for you.","illustration":"pulse","id":"s1-e1"},{"type":"concept-card","title":"Quarter notes","body":"A quarter note (♩) lasts one beat. Tap once on every click.","illustration":"quarter-notes","id":"s1-e2"}]},{"kind":"rhythm","exercises":[{"type":"tap-along","pattern":"quarters","id":"s2-e1"},{"type":"tap-echo","pattern":"quarters","id":"s2-e2"}]}]}$json$::jsonb
  ),
  (
    'pno-mod1-node5', 'piano', 1, 5,
    'Checkpoint: Meet the Keyboard',
    'Show you can find the keys, keep a steady beat and play middle C.',
    60,
    $json${"schemaVersion":2,"tier":"novice","unit":1,"isCheckpoint":true,"settings":{"passMark":0.7,"timeoutSec":15,"bpm":66,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":5,"rhythmFailHeartCost":0,"exp":20,"checkpointExp":50},"stages":[{"kind":"review","exercises":[{"type":"find-the-key","prompt":"Click any E.","target":64,"anyOctave":true,"range":[48,71],"explanation":"E is the right-hand key of the two-black-key group.","id":"s1-e1"},{"type":"choose-answer","prompt":"Which black-key group sits just right of C?","options":["The group of three","The group of two","Neither","Both"],"correctIndex":1,"explanation":"C is just left of the group of two black keys.","id":"s1-e2"},{"type":"tap-along","pattern":"quarters","id":"s1-e3"},{"type":"play-note","note":60,"id":"s1-e4"}]}]}$json$::jsonb
  ),
  (
    'pno-mod2-node1', 'piano', 2, 1,
    'Treble Clef Lines & Spaces',
    'Name the notes on the treble staff.',
    100,
    $json${"schemaVersion":2,"tier":"novice","unit":2,"isCheckpoint":false,"settings":{"passMark":0.7,"timeoutSec":15,"bpm":66,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":5,"rhythmFailHeartCost":0,"exp":20,"checkpointExp":50},"stages":[{"kind":"learn","exercises":[{"type":"concept-card","title":"Treble lines","body":"From the bottom, the treble lines are E G B D F (\"Every Good Boy Does Fine\").","notes":[64,67,71,74,77],"display":"staff","id":"s1-e1"},{"type":"concept-card","title":"Treble spaces","body":"The treble spaces spell F A C E from the bottom.","notes":[65,69,72,76],"display":"staff","id":"s1-e2"}]},{"kind":"check","exercises":[{"type":"name-the-note","prompt":"Name this note.","note":64,"options":["F","D","G","E"],"correctIndex":3,"explanation":"This note is E (E4).","id":"s2-e1"},{"type":"name-the-note","prompt":"Name this note.","note":67,"options":["A","F","B","G"],"correctIndex":3,"explanation":"This note is G (G4).","id":"s2-e2"},{"type":"name-the-note","prompt":"Name this note.","note":69,"options":["B","G","C","A"],"correctIndex":3,"explanation":"This note is A (A4).","id":"s2-e3"},{"type":"name-the-note","prompt":"Name this note.","note":72,"options":["C","D","B","E"],"correctIndex":0,"explanation":"This note is C (C5).","id":"s2-e4"},{"type":"name-the-note","prompt":"Name this note.","note":77,"options":["G","E","F","A"],"correctIndex":2,"explanation":"This note is F (F5).","id":"s2-e5"}]}]}$json$::jsonb
  ),
  (
    'pno-mod2-node2', 'piano', 2, 2,
    'Bass Clef Basics',
    'Name the notes on the bass staff.',
    120,
    $json${"schemaVersion":2,"tier":"novice","unit":2,"isCheckpoint":false,"settings":{"passMark":0.7,"timeoutSec":15,"bpm":66,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":5,"rhythmFailHeartCost":0,"exp":20,"checkpointExp":50},"stages":[{"kind":"learn","exercises":[{"type":"concept-card","title":"Bass lines","body":"From the bottom, the bass lines are G B D F A (\"Good Boys Do Fine Always\").","notes":[43,47,50,53,57],"display":"staff","id":"s1-e1"},{"type":"concept-card","title":"Bass spaces","body":"The bass spaces are A C E G (\"All Cows Eat Grass\").","notes":[45,48,52,55],"display":"staff","id":"s1-e2"}]},{"kind":"check","exercises":[{"type":"name-the-note","prompt":"Name this note.","note":43,"options":["A","G","F","B"],"correctIndex":1,"explanation":"This note is G (G2).","id":"s2-e1"},{"type":"name-the-note","prompt":"Name this note.","note":50,"options":["D","E","C","F"],"correctIndex":0,"explanation":"This note is D (D3).","id":"s2-e2"},{"type":"name-the-note","prompt":"Name this note.","note":57,"options":["B","G","A","C"],"correctIndex":2,"explanation":"This note is A (A3).","id":"s2-e3"},{"type":"name-the-note","prompt":"Name this note.","note":48,"options":["D","B","C","E"],"correctIndex":2,"explanation":"This note is C (C3).","id":"s2-e4"},{"type":"name-the-note","prompt":"Name this note.","note":52,"options":["F","D","E","G"],"correctIndex":2,"explanation":"This note is E (E3).","id":"s2-e5"}]}]}$json$::jsonb
  ),
  (
    'pno-mod2-node3', 'piano', 2, 3,
    'Whole, Half & Quarter Notes',
    'Learn how long each note lasts, then tap them.',
    130,
    $json${"schemaVersion":2,"tier":"novice","unit":2,"isCheckpoint":false,"settings":{"passMark":0.7,"timeoutSec":15,"bpm":66,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":5,"rhythmFailHeartCost":0,"exp":20,"checkpointExp":50},"stages":[{"kind":"learn","exercises":[{"type":"concept-card","title":"Note values","body":"A whole note (𝅝) lasts 4 beats, a half note (𝅗𝅥) 2 beats and a quarter note (♩) 1 beat.","illustration":"note-values","id":"s1-e1"},{"type":"concept-card","title":"Hold, then move","body":"Tap when a note starts, then wait for its length before the next tap.","illustration":"hold-then-move","id":"s1-e2"}]},{"kind":"check","exercises":[{"type":"choose-answer","prompt":"How many beats does a half note last?","options":["1","2","3","4"],"correctIndex":1,"explanation":"A half note is half of a whole note: 2 beats.","id":"s2-e1"},{"type":"choose-answer","prompt":"How many quarter notes fill one whole note?","options":["4","2","3","8"],"correctIndex":0,"explanation":"A whole note lasts 4 beats, one per quarter note.","id":"s2-e2"}]},{"kind":"rhythm","exercises":[{"type":"tap-read","pattern":"half-quarters","id":"s3-e1"},{"type":"tap-along","pattern":"mixed-values","id":"s3-e2"}]}]}$json$::jsonb
  ),
  (
    'pno-mod2-node4', 'piano', 2, 4,
    'The Grand Staff & Middle C',
    'Connect the two staves through middle C.',
    150,
    $json${"schemaVersion":2,"tier":"novice","unit":2,"isCheckpoint":false,"settings":{"passMark":0.7,"timeoutSec":15,"bpm":66,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":5,"rhythmFailHeartCost":0,"exp":20,"checkpointExp":50},"stages":[{"kind":"learn","exercises":[{"type":"concept-card","title":"Two staves, one piano","body":"The grand staff joins treble and bass. Middle C belongs to both.","notes":[60],"display":"both","id":"s1-e1"},{"type":"concept-card","title":"Neighbours of middle C","body":"B3 sits just below middle C and D4 just above it.","notes":[59,60,62],"display":"both","id":"s1-e2"}]},{"kind":"check","exercises":[{"type":"name-the-note","prompt":"Name this note.","note":60,"options":["D","B","E","C"],"correctIndex":3,"explanation":"This note is C (C4).","id":"s2-e1"},{"type":"name-the-note","prompt":"Name this note.","note":62,"options":["E","D","C","F"],"correctIndex":1,"explanation":"This note is D (D4).","id":"s2-e2"},{"type":"name-the-note","prompt":"Name this note.","note":59,"options":["B","C","A","D"],"correctIndex":0,"explanation":"This note is B (B3).","id":"s2-e3"}]},{"kind":"play","exercises":[{"type":"play-note","note":62,"id":"s3-e1"}]}]}$json$::jsonb
  ),
  (
    'pno-mod2-node5', 'piano', 2, 5,
    'Checkpoint: Reading the Staff',
    'Read notes in both clefs and tap note values.',
    160,
    $json${"schemaVersion":2,"tier":"novice","unit":2,"isCheckpoint":true,"settings":{"passMark":0.7,"timeoutSec":15,"bpm":66,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":5,"rhythmFailHeartCost":0,"exp":20,"checkpointExp":50},"stages":[{"kind":"review","exercises":[{"type":"name-the-note","prompt":"Name this note.","note":71,"options":["C","B","A","D"],"correctIndex":1,"explanation":"This note is B (B4).","id":"s1-e1"},{"type":"name-the-note","prompt":"Name this note.","note":53,"options":["F","G","E","A"],"correctIndex":0,"explanation":"This note is F (F3).","id":"s1-e2"},{"type":"name-the-note","prompt":"Name this note.","note":74,"options":["E","C","D","F"],"correctIndex":2,"explanation":"This note is D (D5).","id":"s1-e3"},{"type":"choose-answer","prompt":"Which note lasts 4 beats?","options":["Whole note","Half note","Quarter note","Eighth note"],"correctIndex":0,"explanation":"A whole note fills a 4/4 measure.","id":"s1-e4"},{"type":"tap-read","pattern":"mixed-values","id":"s1-e5"},{"type":"play-note","note":64,"id":"s1-e6"}]}]}$json$::jsonb
  ),
  (
    'pno-mod3-node1', 'piano', 3, 1,
    'C Position: C to G',
    'Put one finger on each key from C to G.',
    200,
    $json${"schemaVersion":2,"tier":"novice","unit":3,"isCheckpoint":false,"settings":{"passMark":0.7,"timeoutSec":15,"bpm":66,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":5,"rhythmFailHeartCost":0,"exp":20,"checkpointExp":50},"stages":[{"kind":"learn","exercises":[{"type":"concept-card","title":"C position","body":"Right thumb on middle C, then fingers 2 3 4 5 on D E F G.","notes":[60,62,64,65,67],"display":"both","id":"s1-e1"}]},{"kind":"check","exercises":[{"type":"find-the-key","prompt":"In C position, which key does finger 5 play?","target":67,"anyOctave":false,"range":[60,71],"explanation":"Finger 5 (pinky) rests on G.","id":"s2-e1"},{"type":"find-the-key","prompt":"Which key does finger 3 play?","target":64,"anyOctave":false,"range":[60,71],"explanation":"Finger 3 (middle) rests on E.","id":"s2-e2"}]},{"kind":"play","exercises":[{"type":"play-sequence","steps":[{"kind":"note","note":60},{"kind":"note","note":62},{"kind":"note","note":64},{"kind":"note","note":65},{"kind":"note","note":67}],"prompt":"Play up the five-finger position, one key at a time.","id":"s3-e1"}]}]}$json$::jsonb
  ),
  (
    'pno-mod3-node2', 'piano', 3, 2,
    'Steps & Skips',
    'Hear and play moves to the next key and over a key.',
    220,
    $json${"schemaVersion":2,"tier":"novice","unit":3,"isCheckpoint":false,"settings":{"passMark":0.7,"timeoutSec":15,"bpm":66,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":5,"rhythmFailHeartCost":0,"exp":20,"checkpointExp":50},"stages":[{"kind":"learn","exercises":[{"type":"concept-card","title":"Steps","body":"A step moves to the very next letter: C to D. On the staff, line to space.","notes":[60,62],"display":"both","id":"s1-e1"},{"type":"concept-card","title":"Skips","body":"A skip jumps over one letter: C to E. On the staff, line to line.","notes":[60,64],"display":"both","id":"s1-e2"}]},{"kind":"check","exercises":[{"type":"ear-pick","prompt":"Step or skip?","play":[[60],[62]],"options":["Step","Skip"],"correctIndex":0,"explanation":"C to D is the very next key: a step.","id":"s2-e1"},{"type":"ear-pick","prompt":"Step or skip?","play":[[64],[67]],"options":["Skip","Step"],"correctIndex":0,"explanation":"E to G jumps over F: a skip.","id":"s2-e2"},{"type":"choose-answer","prompt":"Moving from a line to the next line is a…","options":["Step","Repeat","Skip"],"correctIndex":2,"explanation":"Line to line skips the space between them.","id":"s2-e3"}]},{"kind":"play","exercises":[{"type":"play-sequence","steps":[{"kind":"note","note":60},{"kind":"note","note":64},{"kind":"note","note":67}],"prompt":"Play C, E and G one at a time: two skips.","id":"s3-e1"}]}]}$json$::jsonb
  ),
  (
    'pno-mod3-node3', 'piano', 3, 3,
    'Rests & 3/4 Time',
    'Count silent beats and feel three beats in a measure.',
    240,
    $json${"schemaVersion":2,"tier":"novice","unit":3,"isCheckpoint":false,"settings":{"passMark":0.7,"timeoutSec":15,"bpm":66,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":5,"rhythmFailHeartCost":0,"exp":20,"checkpointExp":50},"stages":[{"kind":"learn","exercises":[{"type":"concept-card","title":"Rests","body":"A rest is a silent beat. Keep counting, but do not tap.","illustration":"rests","id":"s1-e1"},{"type":"concept-card","title":"3/4 time","body":"In 3/4 each measure has three beats. It is the waltz pulse: ONE two three.","illustration":"three-four","id":"s1-e2"}]},{"kind":"rhythm","exercises":[{"type":"tap-along","pattern":"waltz","id":"s2-e1"},{"type":"tap-read","pattern":"waltz-rest","id":"s2-e2"},{"type":"tap-read","pattern":"quarters-rest","id":"s2-e3"}]}]}$json$::jsonb
  ),
  (
    'pno-mod3-node4', 'piano', 3, 4,
    'First Melody',
    'Tap and then play the opening of Ode to Joy.',
    250,
    $json${"schemaVersion":2,"tier":"novice","unit":3,"isCheckpoint":false,"settings":{"passMark":0.7,"timeoutSec":15,"bpm":66,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":5,"rhythmFailHeartCost":0,"exp":20,"checkpointExp":50},"stages":[{"kind":"learn","exercises":[{"type":"concept-card","title":"Ode to Joy","body":"Beethoven’s melody starts E E F G G F E D, all in C position.","notes":[64,64,65,67,67,65,64,62],"display":"staff","id":"s1-e1"}]},{"kind":"rhythm","exercises":[{"type":"tap-echo","pattern":"first-melody","id":"s2-e1"}]},{"kind":"play","exercises":[{"type":"play-sequence","steps":[{"kind":"note","note":64},{"kind":"note","note":64},{"kind":"note","note":65},{"kind":"note","note":67},{"kind":"note","note":67},{"kind":"note","note":65},{"kind":"note","note":64},{"kind":"note","note":62}],"prompt":"Play the opening of Ode to Joy.","id":"s3-e1"}]}]}$json$::jsonb
  ),
  (
    'pno-mod3-node5', 'piano', 3, 5,
    'Checkpoint: Five-Finger Position',
    'Steps, skips, rests and C position.',
    270,
    $json${"schemaVersion":2,"tier":"novice","unit":3,"isCheckpoint":true,"settings":{"passMark":0.7,"timeoutSec":15,"bpm":66,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":5,"rhythmFailHeartCost":0,"exp":20,"checkpointExp":50},"stages":[{"kind":"review","exercises":[{"type":"ear-pick","prompt":"Step or skip?","play":[[65],[69]],"options":["Step","Skip"],"correctIndex":1,"explanation":"F to A jumps over G: a skip.","id":"s1-e1"},{"type":"name-the-note","prompt":"Name this note.","note":65,"options":["G","F","E","A"],"correctIndex":1,"explanation":"This note is F (F4).","id":"s1-e2"},{"type":"tap-read","pattern":"waltz-rest","id":"s1-e3"},{"type":"play-sequence","steps":[{"kind":"note","note":60},{"kind":"note","note":62},{"kind":"note","note":64}],"id":"s1-e4"}]}]}$json$::jsonb
  ),
  (
    'pno-mod4-node1', 'piano', 4, 1,
    'What Is a Triad?',
    'Stack a root, a third and a fifth.',
    310,
    $json${"schemaVersion":2,"tier":"novice","unit":4,"isCheckpoint":false,"settings":{"passMark":0.7,"timeoutSec":15,"bpm":66,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":5,"rhythmFailHeartCost":0,"exp":20,"checkpointExp":50},"stages":[{"kind":"learn","exercises":[{"type":"concept-card","title":"Root, third, fifth","body":"A triad is three notes stacked in skips: a root, the note a third above, and the note a fifth above.","notes":[60,64,67],"display":"both","chord":true,"id":"s1-e1"},{"type":"concept-card","title":"C major","body":"Start on C, skip to E, skip to G. Play them together.","notes":[60,64,67],"display":"both","chord":true,"id":"s1-e2"}]},{"kind":"check","exercises":[{"type":"build-the-chord","prompt":"Build a C chord on the keyboard.","chord":"C","range":[48,83],"explanation":"C major is C, E and G.","id":"s2-e1"},{"type":"choose-answer","prompt":"Triads are built by stacking…","options":["Steps","Octaves","Thirds (skips)","Half steps"],"correctIndex":2,"explanation":"Each note of a triad is a skip above the last.","id":"s2-e2"}]}]}$json$::jsonb
  ),
  (
    'pno-mod4-node2', 'piano', 4, 2,
    'C Major',
    'Hear and play your first chord.',
    320,
    $json${"schemaVersion":2,"tier":"novice","unit":4,"isCheckpoint":false,"settings":{"passMark":0.7,"timeoutSec":15,"bpm":66,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":5,"rhythmFailHeartCost":0,"exp":20,"checkpointExp":50},"stages":[{"kind":"learn","exercises":[{"type":"concept-card","title":"Three keys at once","body":"Press C, E and G together with fingers 1, 3 and 5.","notes":[60,64,67],"display":"both","chord":true,"id":"s1-e1"}]},{"kind":"check","exercises":[{"type":"ear-pick","prompt":"What did you hear?","play":[[60,64,67]],"options":["A chord (three notes)","A single note","Two notes"],"correctIndex":0,"explanation":"Three notes sounded together.","id":"s2-e1"},{"type":"build-the-chord","prompt":"Build a C chord on the keyboard.","chord":"C","range":[48,83],"explanation":"C major is C, E and G.","id":"s2-e2"}]},{"kind":"play","exercises":[{"type":"play-chord","chord":"C","id":"s3-e1"}]}]}$json$::jsonb
  ),
  (
    'pno-mod4-node3', 'piano', 4, 3,
    'G Major & F Major',
    'Two more major triads with the same shape.',
    340,
    $json${"schemaVersion":2,"tier":"novice","unit":4,"isCheckpoint":false,"settings":{"passMark":0.7,"timeoutSec":15,"bpm":66,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":5,"rhythmFailHeartCost":0,"exp":20,"checkpointExp":50},"stages":[{"kind":"learn","exercises":[{"type":"concept-card","title":"G major","body":"G major is G, B and D: the same skip-skip shape starting on G.","notes":[55,59,62],"display":"both","chord":true,"id":"s1-e1"},{"type":"concept-card","title":"F major","body":"F major is F, A and C.","notes":[53,57,60],"display":"both","chord":true,"id":"s1-e2"}]},{"kind":"check","exercises":[{"type":"build-the-chord","prompt":"Build a G chord on the keyboard.","chord":"G","range":[48,83],"explanation":"G major is G, B and D.","id":"s2-e1"},{"type":"build-the-chord","prompt":"Build a F chord on the keyboard.","chord":"F","range":[48,83],"explanation":"F major is F, A and C.","id":"s2-e2"}]},{"kind":"play","exercises":[{"type":"play-chord","chord":"G","id":"s3-e1"},{"type":"play-chord","chord":"F","id":"s3-e2"}]}]}$json$::jsonb
  ),
  (
    'pno-mod4-node4', 'piano', 4, 4,
    'Chord Changes: C, F, G',
    'Move between chords in time.',
    360,
    $json${"schemaVersion":2,"tier":"novice","unit":4,"isCheckpoint":false,"settings":{"passMark":0.7,"timeoutSec":15,"bpm":66,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":5,"rhythmFailHeartCost":0,"exp":20,"checkpointExp":50},"stages":[{"kind":"learn","exercises":[{"type":"concept-card","title":"Changing chords","body":"Keep your hand shape and slide it: C to F to G and back to C. Change on the beat.","illustration":"changing-chords","id":"s1-e1"}]},{"kind":"rhythm","exercises":[{"type":"tap-along","pattern":"chord-changes","prompt":"Tap where each chord changes.","id":"s2-e1"}]},{"kind":"play","exercises":[{"type":"play-sequence","steps":[{"kind":"chord","chord":"C"},{"kind":"chord","chord":"F"},{"kind":"chord","chord":"G"},{"kind":"chord","chord":"C"}],"prompt":"Play C, F, G, then C.","id":"s3-e1"}]}]}$json$::jsonb
  ),
  (
    'pno-mod4-node5', 'piano', 4, 5,
    'Novice Exam',
    'Everything from the Novice tier. Passing it also places new learners at Proficient.',
    370,
    $json${"schemaVersion":2,"tier":"novice","unit":4,"isCheckpoint":true,"settings":{"passMark":0.7,"timeoutSec":15,"bpm":66,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":5,"rhythmFailHeartCost":0,"exp":20,"checkpointExp":50},"stages":[{"kind":"review","exercises":[{"type":"name-the-note","prompt":"Name this note.","note":69,"options":["B","G","C","A"],"correctIndex":3,"explanation":"This note is A (A4).","id":"s1-e1"},{"type":"name-the-note","prompt":"Name this note.","note":47,"options":["C","A","D","B"],"correctIndex":3,"explanation":"This note is B (B2).","id":"s1-e2"},{"type":"find-the-key","prompt":"Click any F.","target":65,"anyOctave":true,"range":[48,71],"explanation":"F is left of the three black keys.","id":"s1-e3"},{"type":"build-the-chord","prompt":"Build a G chord on the keyboard.","chord":"G","range":[48,83],"explanation":"G major is G, B and D.","id":"s1-e4"},{"type":"ear-pick","prompt":"Step or skip?","play":[[62],[64]],"options":["Step","Skip"],"correctIndex":0,"explanation":"D to E is the next key: a step.","id":"s1-e5"},{"type":"tap-read","pattern":"mixed-values","id":"s1-e6"},{"type":"play-chord","chord":"F","id":"s1-e7"},{"type":"play-sequence","steps":[{"kind":"chord","chord":"C"},{"kind":"chord","chord":"G"},{"kind":"chord","chord":"C"}],"id":"s1-e8"}]}]}$json$::jsonb
  ),
  (
    'pno-mod5-node1', 'piano', 5, 1,
    'Eighth Notes',
    'Two notes in every beat.',
    410,
    $json${"schemaVersion":2,"tier":"proficient","unit":5,"isCheckpoint":false,"settings":{"passMark":0.8,"timeoutSec":15,"bpm":84,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":10,"rhythmFailHeartCost":0,"exp":30,"checkpointExp":75},"stages":[{"kind":"learn","exercises":[{"type":"concept-card","title":"Eighth notes","body":"An eighth note (♪) lasts half a beat. Count \"1 & 2 & 3 & 4 &\" and tap on every number and every \"&\".","id":"s1-e1"}]},{"kind":"check","exercises":[{"type":"choose-answer","prompt":"How many eighth notes fit in one beat?","options":["1","2","3","4"],"correctIndex":1,"explanation":"Two eighths make one quarter-note beat.","id":"s2-e1"}]},{"kind":"rhythm","exercises":[{"type":"tap-along","pattern":"eighths","id":"s3-e1"},{"type":"tap-read","pattern":"eighth-mix","id":"s3-e2"}]}]}$json$::jsonb
  ),
  (
    'pno-mod5-node2', 'piano', 5, 2,
    'Dotted Quarters & Ties',
    'Notes that last longer than one beat.',
    440,
    $json${"schemaVersion":2,"tier":"proficient","unit":5,"isCheckpoint":false,"settings":{"passMark":0.8,"timeoutSec":15,"bpm":84,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":10,"rhythmFailHeartCost":0,"exp":30,"checkpointExp":75},"stages":[{"kind":"learn","exercises":[{"type":"concept-card","title":"The dot","body":"A dot adds half the note’s value. A dotted quarter (♩.) lasts 1½ beats.","id":"s1-e1"},{"type":"concept-card","title":"Ties","body":"A tie joins two notes of the same pitch. Play the first, then hold through the second.","id":"s1-e2"}]},{"kind":"check","exercises":[{"type":"choose-answer","prompt":"How long is a dotted quarter note?","options":["1½ beats","1 beat","2 beats","3 beats"],"correctIndex":0,"explanation":"Quarter (1) + half of it (½) = 1½.","id":"s2-e1"},{"type":"choose-answer","prompt":"What does a tie tell you to do?","options":["Hold the first note through the second","Play both notes","Skip the second note and rest","Play louder"],"correctIndex":0,"explanation":"Tied notes sound as one longer note.","id":"s2-e2"}]},{"kind":"rhythm","exercises":[{"type":"tap-read","pattern":"dotted","id":"s3-e1"},{"type":"tap-read","pattern":"tie","id":"s3-e2"}]}]}$json$::jsonb
  ),
  (
    'pno-mod5-node3', 'piano', 5, 3,
    '6/8 Time',
    'Six eighth-note pulses, felt in two big beats.',
    460,
    $json${"schemaVersion":2,"tier":"proficient","unit":5,"isCheckpoint":false,"settings":{"passMark":0.8,"timeoutSec":15,"bpm":84,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":10,"rhythmFailHeartCost":0,"exp":30,"checkpointExp":75},"stages":[{"kind":"learn","exercises":[{"type":"concept-card","title":"6/8","body":"In 6/8 the metronome clicks six eighth notes per measure, grouped 1 2 3 | 4 5 6. It feels like two big beats.","id":"s1-e1"}]},{"kind":"check","exercises":[{"type":"choose-answer","prompt":"How many big beats does a 6/8 measure feel like?","options":["2","3","6","4"],"correctIndex":0,"explanation":"The six eighths group into two sets of three.","id":"s2-e1"}]},{"kind":"rhythm","exercises":[{"type":"tap-echo","pattern":"six-eight","id":"s3-e1"},{"type":"tap-along","pattern":"six-eight-dotted","id":"s3-e2"}]}]}$json$::jsonb
  ),
  (
    'pno-mod5-node4', 'piano', 5, 4,
    'Tempo Ladder',
    'Same pattern, faster each time.',
    480,
    $json${"schemaVersion":2,"tier":"proficient","unit":5,"isCheckpoint":false,"settings":{"passMark":0.8,"timeoutSec":15,"bpm":84,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":10,"rhythmFailHeartCost":0,"exp":30,"checkpointExp":75},"stages":[{"kind":"rhythm","exercises":[{"type":"tap-along","pattern":"eighth-mix","settings":{"bpm":72},"id":"s1-e1"},{"type":"tap-along","pattern":"eighth-mix","settings":{"bpm":96},"id":"s1-e2"},{"type":"tap-along","pattern":"eighth-mix","settings":{"bpm":120},"id":"s1-e3"}]}]}$json$::jsonb
  ),
  (
    'pno-mod5-node5', 'piano', 5, 5,
    'Checkpoint: Rhythm Expansion',
    'Eighths, dots, ties and 6/8.',
    510,
    $json${"schemaVersion":2,"tier":"proficient","unit":5,"isCheckpoint":true,"settings":{"passMark":0.8,"timeoutSec":15,"bpm":84,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":10,"rhythmFailHeartCost":0,"exp":30,"checkpointExp":75},"stages":[{"kind":"review","exercises":[{"type":"choose-answer","prompt":"How many eighth notes in a 4/4 measure?","options":["8","4","6","16"],"correctIndex":0,"explanation":"Four beats with two eighths each.","id":"s1-e1"},{"type":"tap-read","pattern":"dotted","id":"s1-e2"},{"type":"tap-echo","pattern":"eighth-mix","id":"s1-e3"},{"type":"tap-along","pattern":"six-eight","id":"s1-e4"}]}]}$json$::jsonb
  ),
  (
    'pno-mod6-node1', 'piano', 6, 1,
    'Whole & Half Steps',
    'The two building blocks of every scale.',
    570,
    $json${"schemaVersion":2,"tier":"proficient","unit":6,"isCheckpoint":false,"settings":{"passMark":0.8,"timeoutSec":15,"bpm":84,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":10,"rhythmFailHeartCost":0,"exp":30,"checkpointExp":75},"stages":[{"kind":"learn","exercises":[{"type":"concept-card","title":"Half step","body":"A half step goes to the very next key, black or white. E–F and B–C are half steps with no black key between.","notes":[64,65],"display":"keyboard","id":"s1-e1"},{"type":"concept-card","title":"Whole step","body":"A whole step is two half steps, like C to D.","notes":[60,62],"display":"keyboard","id":"s1-e2"}]},{"kind":"check","exercises":[{"type":"find-the-key","prompt":"Click the key a half step above E.","target":65,"anyOctave":false,"range":[60,71],"explanation":"There is no black key between E and F.","id":"s2-e1"},{"type":"choose-answer","prompt":"Which pair is a half step?","options":["C and D","F and G","A and B","B and C"],"correctIndex":3,"explanation":"B–C has no black key between: a half step.","id":"s2-e2"}]}]}$json$::jsonb
  ),
  (
    'pno-mod6-node2', 'piano', 6, 2,
    'The Major Scale Formula',
    'W W H W W W H, starting on C.',
    590,
    $json${"schemaVersion":2,"tier":"proficient","unit":6,"isCheckpoint":false,"settings":{"passMark":0.8,"timeoutSec":15,"bpm":84,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":10,"rhythmFailHeartCost":0,"exp":30,"checkpointExp":75},"stages":[{"kind":"learn","exercises":[{"type":"concept-card","title":"The formula","body":"Every major scale follows whole, whole, half, whole, whole, whole, half.","id":"s1-e1"},{"type":"concept-card","title":"C major scale","body":"From C, the formula uses only white keys: C D E F G A B C.","notes":[60,62,64,65,67,69,71,72],"display":"both","id":"s1-e2"}]},{"kind":"check","exercises":[{"type":"choose-answer","prompt":"What is the major scale formula?","options":["W H W W H W W","W W H W W W H","H W W W H W W","W W W H W W H"],"correctIndex":1,"explanation":"Two wholes, a half, three wholes, a half.","id":"s2-e1"},{"type":"find-the-key","prompt":"Click the 7th note of the C major scale.","target":71,"anyOctave":false,"range":[60,72],"explanation":"C D E F G A B: the 7th is B.","id":"s2-e2"}]},{"kind":"play","exercises":[{"type":"play-sequence","steps":[{"kind":"note","note":60},{"kind":"note","note":62},{"kind":"note","note":64},{"kind":"note","note":65},{"kind":"note","note":67},{"kind":"note","note":69},{"kind":"note","note":71},{"kind":"note","note":72}],"prompt":"Play the C major scale up one octave.","id":"s3-e1"}]}]}$json$::jsonb
  ),
  (
    'pno-mod6-node3', 'piano', 6, 3,
    'G Major (One Sharp)',
    'The formula from G needs F#.',
    620,
    $json${"schemaVersion":2,"tier":"proficient","unit":6,"isCheckpoint":false,"settings":{"passMark":0.8,"timeoutSec":15,"bpm":84,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":10,"rhythmFailHeartCost":0,"exp":30,"checkpointExp":75},"stages":[{"kind":"learn","exercises":[{"type":"concept-card","title":"G major scale","body":"From G the formula needs F# instead of F: G A B C D E F# G.","notes":[67,69,71,72,74,76,78,79],"display":"both","id":"s1-e1"},{"type":"concept-card","title":"Key signature","body":"One sharp (F#) at the start of the staff means the key of G major.","id":"s1-e2"}]},{"kind":"check","exercises":[{"type":"find-the-key","prompt":"Click the sharp note used in G major.","target":66,"anyOctave":true,"range":[60,72],"explanation":"G major uses F#.","id":"s2-e1"},{"type":"choose-answer","prompt":"One sharp in the key signature means…","options":["G major","F major","D major","C major"],"correctIndex":0,"explanation":"G major has exactly one sharp: F#.","id":"s2-e2"}]},{"kind":"play","exercises":[{"type":"play-sequence","steps":[{"kind":"note","note":55},{"kind":"note","note":57},{"kind":"note","note":59},{"kind":"note","note":60},{"kind":"note","note":62},{"kind":"note","note":64},{"kind":"note","note":66},{"kind":"note","note":67}],"prompt":"Play the G major scale.","id":"s3-e1"}]}]}$json$::jsonb
  ),
  (
    'pno-mod6-node4', 'piano', 6, 4,
    'F Major (One Flat)',
    'The formula from F needs Bb.',
    640,
    $json${"schemaVersion":2,"tier":"proficient","unit":6,"isCheckpoint":false,"settings":{"passMark":0.8,"timeoutSec":15,"bpm":84,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":10,"rhythmFailHeartCost":0,"exp":30,"checkpointExp":75},"stages":[{"kind":"learn","exercises":[{"type":"concept-card","title":"F major scale","body":"From F the formula needs B flat: F G A Bb C D E F.","notes":[65,67,69,70,72,74,76,77],"display":"both","id":"s1-e1"},{"type":"concept-card","title":"Key signature","body":"One flat (Bb) at the start of the staff means the key of F major.","id":"s1-e2"}]},{"kind":"check","exercises":[{"type":"find-the-key","prompt":"Click the flat note used in F major.","target":70,"anyOctave":true,"range":[60,72],"explanation":"F major uses B flat.","id":"s2-e1"},{"type":"choose-answer","prompt":"One flat in the key signature means…","options":["G major","Bb major","F major","C major"],"correctIndex":2,"explanation":"F major has exactly one flat: Bb.","id":"s2-e2"}]},{"kind":"play","exercises":[{"type":"play-sequence","steps":[{"kind":"note","note":53},{"kind":"note","note":55},{"kind":"note","note":57},{"kind":"note","note":58},{"kind":"note","note":60},{"kind":"note","note":62},{"kind":"note","note":64},{"kind":"note","note":65}],"prompt":"Play the F major scale.","id":"s3-e1"}]}]}$json$::jsonb
  ),
  (
    'pno-mod6-node5', 'piano', 6, 5,
    'Checkpoint: Scales & Keys',
    'Steps, the scale formula and the keys of G and F.',
    660,
    $json${"schemaVersion":2,"tier":"proficient","unit":6,"isCheckpoint":true,"settings":{"passMark":0.8,"timeoutSec":15,"bpm":84,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":10,"rhythmFailHeartCost":0,"exp":30,"checkpointExp":75},"stages":[{"kind":"review","exercises":[{"type":"choose-answer","prompt":"E to F is a…","options":["Whole step","Half step","Skip","Octave"],"correctIndex":1,"explanation":"No key between E and F.","id":"s1-e1"},{"type":"find-the-key","prompt":"Click the sharp note used in G major.","target":66,"anyOctave":true,"range":[60,72],"explanation":"G major uses F#.","id":"s1-e2"},{"type":"name-the-note","prompt":"Name this note.","note":71,"options":["C","B","A","D"],"correctIndex":1,"explanation":"This note is B (B4).","id":"s1-e3"},{"type":"play-sequence","steps":[{"kind":"note","note":55},{"kind":"note","note":57},{"kind":"note","note":59},{"kind":"note","note":60},{"kind":"note","note":62}],"id":"s1-e4"}]}]}$json$::jsonb
  ),
  (
    'pno-mod7-node1', 'piano', 7, 1,
    'Major vs Minor by Ear',
    'Bright or dark: tell the two chord colours apart.',
    720,
    $json${"schemaVersion":2,"tier":"proficient","unit":7,"isCheckpoint":false,"settings":{"passMark":0.8,"timeoutSec":15,"bpm":84,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":10,"rhythmFailHeartCost":0,"exp":30,"checkpointExp":75},"stages":[{"kind":"learn","exercises":[{"type":"concept-card","title":"Major","body":"Major chords sound bright. C major: C E G.","notes":[60,64,67],"display":"both","chord":true,"id":"s1-e1"},{"type":"concept-card","title":"Minor","body":"Lower the middle note by a half step for a darker minor chord. C minor: C Eb G.","notes":[60,63,67],"display":"both","chord":true,"id":"s1-e2"}]},{"kind":"check","exercises":[{"type":"ear-pick","prompt":"Major or minor?","play":[[60,64,67]],"options":["Minor","Major"],"correctIndex":1,"explanation":"C E G is C major.","id":"s2-e1"},{"type":"ear-pick","prompt":"Major or minor?","play":[[57,60,64]],"options":["Minor","Major"],"correctIndex":0,"explanation":"A C E is A minor.","id":"s2-e2"},{"type":"ear-pick","prompt":"Major or minor?","play":[[62,65,69]],"options":["Major","Minor"],"correctIndex":1,"explanation":"D F A is D minor.","id":"s2-e3"},{"type":"ear-pick","prompt":"Major or minor?","play":[[53,57,60]],"options":["Major","Minor"],"correctIndex":0,"explanation":"F A C is F major.","id":"s2-e4"}]}]}$json$::jsonb
  ),
  (
    'pno-mod7-node2', 'piano', 7, 2,
    'A Minor, D Minor, E Minor',
    'The three minor chords of C major.',
    750,
    $json${"schemaVersion":2,"tier":"proficient","unit":7,"isCheckpoint":false,"settings":{"passMark":0.8,"timeoutSec":15,"bpm":84,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":10,"rhythmFailHeartCost":0,"exp":30,"checkpointExp":75},"stages":[{"kind":"learn","exercises":[{"type":"concept-card","title":"A minor","body":"A C E","notes":[57,60,64],"display":"both","chord":true,"id":"s1-e1"},{"type":"concept-card","title":"D minor","body":"D F A","notes":[62,65,69],"display":"both","chord":true,"id":"s1-e2"},{"type":"concept-card","title":"E minor","body":"E G B","notes":[64,67,71],"display":"both","chord":true,"id":"s1-e3"}]},{"kind":"check","exercises":[{"type":"build-the-chord","prompt":"Build a Am chord on the keyboard.","chord":"Am","range":[48,83],"explanation":"A minor is A, C and E.","id":"s2-e1"},{"type":"build-the-chord","prompt":"Build a Dm chord on the keyboard.","chord":"Dm","range":[48,83],"explanation":"D minor is D, F and A.","id":"s2-e2"},{"type":"build-the-chord","prompt":"Build a Em chord on the keyboard.","chord":"Em","range":[48,83],"explanation":"E minor is E, G and B.","id":"s2-e3"}]},{"kind":"play","exercises":[{"type":"play-chord","chord":"Am","id":"s3-e1"},{"type":"play-chord","chord":"Dm","id":"s3-e2"},{"type":"play-chord","chord":"Em","id":"s3-e3"}]}]}$json$::jsonb
  ),
  (
    'pno-mod7-node3', 'piano', 7, 3,
    'Intervals: 2nds to Octaves',
    'Measure the distance between two notes.',
    770,
    $json${"schemaVersion":2,"tier":"proficient","unit":7,"isCheckpoint":false,"settings":{"passMark":0.8,"timeoutSec":15,"bpm":84,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":10,"rhythmFailHeartCost":0,"exp":30,"checkpointExp":75},"stages":[{"kind":"learn","exercises":[{"type":"concept-card","title":"Seconds and thirds","body":"C to D is a 2nd. C to E is a major 3rd.","notes":[60,62,64],"display":"both","id":"s1-e1"},{"type":"concept-card","title":"Fifths and octaves","body":"C to G is a perfect 5th. C to the next C is an octave.","notes":[60,67,72],"display":"both","id":"s1-e2"}]},{"kind":"check","exercises":[{"type":"ear-pick","prompt":"Which interval?","play":[[60],[67]],"options":["Major 3rd","Perfect 5th","Octave","Major 2nd"],"correctIndex":1,"explanation":"C up to G is a perfect 5th.","id":"s2-e1"},{"type":"ear-pick","prompt":"Which interval?","play":[[60],[72]],"options":["Octave","Perfect 5th","Major 3rd","Major 2nd"],"correctIndex":0,"explanation":"C to the next C is an octave.","id":"s2-e2"},{"type":"ear-pick","prompt":"Which interval?","play":[[60],[64]],"options":["Perfect 5th","Octave","Major 2nd","Major 3rd"],"correctIndex":3,"explanation":"C to E is a major 3rd.","id":"s2-e3"},{"type":"choose-answer","prompt":"C up to G is a…","options":["Perfect 5th","Major 3rd","Perfect 4th","Octave"],"correctIndex":0,"explanation":"C D E F G: five letters, a 5th.","id":"s2-e4"}]}]}$json$::jsonb
  ),
  (
    'pno-mod7-node4', 'piano', 7, 4,
    'Inversions',
    'The same chord with a different note on the bottom.',
    800,
    $json${"schemaVersion":2,"tier":"proficient","unit":7,"isCheckpoint":false,"settings":{"passMark":0.8,"timeoutSec":15,"bpm":84,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":10,"rhythmFailHeartCost":0,"exp":30,"checkpointExp":75},"stages":[{"kind":"learn","exercises":[{"type":"concept-card","title":"Root position","body":"C E G: the root (C) is on the bottom.","notes":[60,64,67],"display":"both","chord":true,"id":"s1-e1"},{"type":"concept-card","title":"First inversion","body":"E G C: the third is on the bottom.","notes":[64,67,72],"display":"both","chord":true,"id":"s1-e2"},{"type":"concept-card","title":"Second inversion","body":"G C E: the fifth is on the bottom. It is still a C major chord.","notes":[67,72,76],"display":"both","chord":true,"id":"s1-e3"}]},{"kind":"check","exercises":[{"type":"choose-answer","prompt":"E G C is which inversion of C major?","options":["Root position","First inversion","Second inversion","Not a C chord"],"correctIndex":1,"explanation":"The third (E) is on the bottom.","id":"s2-e1"},{"type":"build-the-chord","prompt":"Build C major in any inversion.","chord":"C","range":[48,83],"explanation":"Any order of C, E and G is C major.","id":"s2-e2"}]},{"kind":"play","exercises":[{"type":"play-chord","chord":"C","id":"s3-e1"},{"type":"play-chord","chord":"G","id":"s3-e2"}]}]}$json$::jsonb
  ),
  (
    'pno-mod7-node5', 'piano', 7, 5,
    'Checkpoint: Minor & Harmony',
    'Chord colours, minor triads, intervals and inversions.',
    820,
    $json${"schemaVersion":2,"tier":"proficient","unit":7,"isCheckpoint":true,"settings":{"passMark":0.8,"timeoutSec":15,"bpm":84,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":10,"rhythmFailHeartCost":0,"exp":30,"checkpointExp":75},"stages":[{"kind":"review","exercises":[{"type":"ear-pick","prompt":"Major or minor?","play":[[64,67,71]],"options":["Minor","Major"],"correctIndex":0,"explanation":"E G B is E minor.","id":"s1-e1"},{"type":"build-the-chord","prompt":"Build a Em chord on the keyboard.","chord":"Em","range":[48,83],"explanation":"E minor is E, G and B.","id":"s1-e2"},{"type":"ear-pick","prompt":"Which interval?","play":[[62],[69]],"options":["Major 3rd","Octave","Perfect 5th","Major 2nd"],"correctIndex":2,"explanation":"D up to A is a perfect 5th.","id":"s1-e3"},{"type":"play-chord","chord":"Dm","id":"s1-e4"}]}]}$json$::jsonb
  ),
  (
    'pno-mod8-node1', 'piano', 8, 1,
    'I–IV–V in C',
    'The three most important chords of a key.',
    880,
    $json${"schemaVersion":2,"tier":"proficient","unit":8,"isCheckpoint":false,"settings":{"passMark":0.8,"timeoutSec":15,"bpm":84,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":10,"rhythmFailHeartCost":0,"exp":30,"checkpointExp":75},"stages":[{"kind":"learn","exercises":[{"type":"concept-card","title":"Roman numerals","body":"Number chords by their scale step. In C major: I = C, IV = F, V = G.","id":"s1-e1"}]},{"kind":"check","exercises":[{"type":"choose-answer","prompt":"In C major, the V chord is…","options":["F","D","G","A"],"correctIndex":2,"explanation":"G is the 5th note of C major.","id":"s2-e1"},{"type":"choose-answer","prompt":"In C major, the IV chord is…","options":["G","E","F","A"],"correctIndex":2,"explanation":"F is the 4th note of C major.","id":"s2-e2"}]},{"kind":"play","exercises":[{"type":"play-sequence","steps":[{"kind":"chord","chord":"C"},{"kind":"chord","chord":"F"},{"kind":"chord","chord":"G"},{"kind":"chord","chord":"C"}],"prompt":"Play I–IV–V–I in C.","id":"s3-e1"}]}]}$json$::jsonb
  ),
  (
    'pno-mod8-node2', 'piano', 8, 2,
    'The Pop Progression',
    'I–V–vi–IV: C, G, Am, F.',
    900,
    $json${"schemaVersion":2,"tier":"proficient","unit":8,"isCheckpoint":false,"settings":{"passMark":0.8,"timeoutSec":15,"bpm":84,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":10,"rhythmFailHeartCost":0,"exp":30,"checkpointExp":75},"stages":[{"kind":"learn","exercises":[{"type":"concept-card","title":"I–V–vi–IV","body":"Countless songs use C, G, Am, F. Lower-case vi means a minor chord.","id":"s1-e1"}]},{"kind":"check","exercises":[{"type":"choose-answer","prompt":"In C major, vi is…","options":["A","Am","Em","F"],"correctIndex":1,"explanation":"The 6th note is A, and vi is minor: A minor.","id":"s2-e1"},{"type":"ear-pick","prompt":"Major or minor?","play":[[57,60,64]],"options":["Minor","Major"],"correctIndex":0,"explanation":"vi is a minor chord.","id":"s2-e2"}]},{"kind":"rhythm","exercises":[{"type":"tap-along","pattern":"pop-rhythm","id":"s3-e1"}]},{"kind":"play","exercises":[{"type":"play-sequence","steps":[{"kind":"chord","chord":"C"},{"kind":"chord","chord":"G"},{"kind":"chord","chord":"Am"},{"kind":"chord","chord":"F"}],"prompt":"Play I–V–vi–IV.","id":"s4-e1"}]}]}$json$::jsonb
  ),
  (
    'pno-mod8-node3', 'piano', 8, 3,
    'Progressions in G & F',
    'Move I–IV–V to new keys.',
    930,
    $json${"schemaVersion":2,"tier":"proficient","unit":8,"isCheckpoint":false,"settings":{"passMark":0.8,"timeoutSec":15,"bpm":84,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":10,"rhythmFailHeartCost":0,"exp":30,"checkpointExp":75},"stages":[{"kind":"learn","exercises":[{"type":"concept-card","title":"Same numbers, new letters","body":"In G major: I = G, IV = C, V = D. In F major: I = F, IV = Bb, V = C.","id":"s1-e1"}]},{"kind":"check","exercises":[{"type":"choose-answer","prompt":"In G major, IV is…","options":["D","A","C","F"],"correctIndex":2,"explanation":"C is the 4th note of G major.","id":"s2-e1"},{"type":"choose-answer","prompt":"In F major, V is…","options":["Bb","G","C","D"],"correctIndex":2,"explanation":"C is the 5th note of F major.","id":"s2-e2"}]},{"kind":"play","exercises":[{"type":"play-sequence","steps":[{"kind":"chord","chord":"G"},{"kind":"chord","chord":"C"},{"kind":"chord","chord":"D"},{"kind":"chord","chord":"G"}],"prompt":"I–IV–V–I in G.","id":"s3-e1"},{"type":"play-sequence","steps":[{"kind":"chord","chord":"F"},{"kind":"chord","chord":"Bb"},{"kind":"chord","chord":"C"},{"kind":"chord","chord":"F"}],"prompt":"I–IV–V–I in F.","id":"s3-e2"}]}]}$json$::jsonb
  ),
  (
    'pno-mod8-node4', 'piano', 8, 4,
    'Rhythm + Chords',
    'Lock the pop progression to a groove.',
    950,
    $json${"schemaVersion":2,"tier":"proficient","unit":8,"isCheckpoint":false,"settings":{"passMark":0.8,"timeoutSec":15,"bpm":84,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":10,"rhythmFailHeartCost":0,"exp":30,"checkpointExp":75},"stages":[{"kind":"rhythm","exercises":[{"type":"tap-along","pattern":"pop-rhythm","settings":{"bpm":90},"id":"s1-e1"}]},{"kind":"play","exercises":[{"type":"play-sequence","steps":[{"kind":"chord","chord":"C"},{"kind":"chord","chord":"G"},{"kind":"chord","chord":"Am"},{"kind":"chord","chord":"F"}],"prompt":"Play it again, changing chords a little faster.","id":"s2-e1"}]}]}$json$::jsonb
  ),
  (
    'pno-mod8-node5', 'piano', 8, 5,
    'Proficient Exam',
    'Everything from the Proficient tier. Passing it also places new learners at Virtuoso.',
    980,
    $json${"schemaVersion":2,"tier":"proficient","unit":8,"isCheckpoint":true,"settings":{"passMark":0.8,"timeoutSec":15,"bpm":84,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":10,"rhythmFailHeartCost":0,"exp":30,"checkpointExp":75},"stages":[{"kind":"review","exercises":[{"type":"ear-pick","prompt":"Major or minor?","play":[[62,65,69]],"options":["Major","Minor"],"correctIndex":1,"explanation":"D F A is D minor.","id":"s1-e1"},{"type":"build-the-chord","prompt":"Build a Dm chord on the keyboard.","chord":"Dm","range":[48,83],"explanation":"D minor is D, F and A.","id":"s1-e2"},{"type":"choose-answer","prompt":"In G major, V is…","options":["C","A","D","E"],"correctIndex":2,"explanation":"D is the 5th note of G major.","id":"s1-e3"},{"type":"tap-read","pattern":"dotted","id":"s1-e4"},{"type":"tap-along","pattern":"eighth-mix","id":"s1-e5"},{"type":"play-chord","chord":"Am","id":"s1-e6"},{"type":"play-sequence","steps":[{"kind":"chord","chord":"G"},{"kind":"chord","chord":"C"},{"kind":"chord","chord":"D"},{"kind":"chord","chord":"G"}],"id":"s1-e7"}]}]}$json$::jsonb
  ),
  (
    'pno-mod9-node1', 'piano', 9, 1,
    'Syncopation',
    'Accents that land between the beats.',
    1040,
    $json${"schemaVersion":2,"tier":"virtuoso","unit":9,"isCheckpoint":false,"settings":{"passMark":0.85,"timeoutSec":15,"bpm":100,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":20,"rhythmFailHeartCost":0,"exp":45,"checkpointExp":120},"stages":[{"kind":"learn","exercises":[{"type":"concept-card","title":"Off the beat","body":"Syncopation puts the strong sound on an \"&\" instead of a number. Keep the click steady in your head.","id":"s1-e1"}]},{"kind":"check","exercises":[{"type":"choose-answer","prompt":"A syncopated note usually starts…","options":["Exactly on beat 1","Only on rests","Between the beats","After the measure ends"],"correctIndex":2,"explanation":"Syncopation moves accents off the main beats.","id":"s2-e1"}]},{"kind":"rhythm","exercises":[{"type":"tap-read","pattern":"syncopation","id":"s3-e1"},{"type":"tap-echo","pattern":"syncopation","id":"s3-e2"}]}]}$json$::jsonb
  ),
  (
    'pno-mod9-node2', 'piano', 9, 2,
    'Sixteenth Notes',
    'Four notes in every beat.',
    1070,
    $json${"schemaVersion":2,"tier":"virtuoso","unit":9,"isCheckpoint":false,"settings":{"passMark":0.85,"timeoutSec":15,"bpm":100,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":20,"rhythmFailHeartCost":0,"exp":45,"checkpointExp":120},"stages":[{"kind":"learn","exercises":[{"type":"concept-card","title":"Sixteenths","body":"A sixteenth note lasts a quarter of a beat. Count \"1 e & a 2 e & a\".","id":"s1-e1"}]},{"kind":"check","exercises":[{"type":"choose-answer","prompt":"How many sixteenth notes fit in one beat?","options":["4","2","3","8"],"correctIndex":0,"explanation":"Four sixteenths make one quarter-note beat.","id":"s2-e1"}]},{"kind":"rhythm","exercises":[{"type":"tap-along","pattern":"sixteenths","id":"s3-e1"},{"type":"tap-read","pattern":"sixteenth-mix","id":"s3-e2"}]}]}$json$::jsonb
  ),
  (
    'pno-mod9-node3', 'piano', 9, 3,
    'Triplets & Swing',
    'Three in the space of two, and the long-short swing feel.',
    1110,
    $json${"schemaVersion":2,"tier":"virtuoso","unit":9,"isCheckpoint":false,"settings":{"passMark":0.85,"timeoutSec":15,"bpm":100,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":20,"rhythmFailHeartCost":0,"exp":45,"checkpointExp":120},"stages":[{"kind":"learn","exercises":[{"type":"concept-card","title":"Triplets","body":"A triplet squeezes three equal notes into one beat. Count \"1 trip-let 2 trip-let\".","id":"s1-e1"},{"type":"concept-card","title":"Swing","body":"Swing plays pairs of eighths long-short, using the first and third notes of a triplet.","id":"s1-e2"}]},{"kind":"check","exercises":[{"type":"choose-answer","prompt":"How many triplet eighths fit in one beat?","options":["3","2","4","6"],"correctIndex":0,"explanation":"Three equal notes per beat.","id":"s2-e1"}]},{"kind":"rhythm","exercises":[{"type":"tap-along","pattern":"triplets","id":"s3-e1"},{"type":"tap-echo","pattern":"swing","id":"s3-e2"}]}]}$json$::jsonb
  ),
  (
    'pno-mod9-node4', 'piano', 9, 4,
    'Speed Run',
    'Straight eighths up to 140 BPM.',
    1140,
    $json${"schemaVersion":2,"tier":"virtuoso","unit":9,"isCheckpoint":false,"settings":{"passMark":0.85,"timeoutSec":15,"bpm":100,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":20,"rhythmFailHeartCost":0,"exp":45,"checkpointExp":120},"stages":[{"kind":"rhythm","exercises":[{"type":"tap-along","pattern":"eighths","settings":{"bpm":120},"id":"s1-e1"},{"type":"tap-along","pattern":"eighths","settings":{"bpm":130},"id":"s1-e2"},{"type":"tap-along","pattern":"eighths","settings":{"bpm":140},"id":"s1-e3"}]}]}$json$::jsonb
  ),
  (
    'pno-mod9-node5', 'piano', 9, 5,
    'Checkpoint: Advanced Rhythm',
    'Syncopation, sixteenths, triplets and speed.',
    1180,
    $json${"schemaVersion":2,"tier":"virtuoso","unit":9,"isCheckpoint":true,"settings":{"passMark":0.85,"timeoutSec":15,"bpm":100,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":20,"rhythmFailHeartCost":0,"exp":45,"checkpointExp":120},"stages":[{"kind":"review","exercises":[{"type":"choose-answer","prompt":"Swing eighths are played…","options":["Short-long","Exactly even","As sixteenths","Long-short"],"correctIndex":3,"explanation":"Swing uses the first and third notes of a triplet.","id":"s1-e1"},{"type":"tap-read","pattern":"syncopation","id":"s1-e2"},{"type":"tap-echo","pattern":"triplets","id":"s1-e3"},{"type":"tap-along","pattern":"sixteenth-mix","id":"s1-e4"}]}]}$json$::jsonb
  ),
  (
    'pno-mod10-node1', 'piano', 10, 1,
    'Dominant 7th',
    'A major triad plus a minor seventh.',
    1280,
    $json${"schemaVersion":2,"tier":"virtuoso","unit":10,"isCheckpoint":false,"settings":{"passMark":0.85,"timeoutSec":15,"bpm":100,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":20,"rhythmFailHeartCost":0,"exp":45,"checkpointExp":120},"stages":[{"kind":"learn","exercises":[{"type":"concept-card","title":"G7","body":"G7 is G B D plus F. Its tension wants to resolve to C.","notes":[55,59,62,65],"display":"both","chord":true,"id":"s1-e1"}]},{"kind":"check","exercises":[{"type":"build-the-chord","prompt":"Build a G7 chord on the keyboard.","chord":"G7","range":[48,83],"explanation":"G7 is G, B, D and F.","id":"s2-e1"},{"type":"choose-answer","prompt":"Which note turns G major into G7?","options":["F#","F","E","A"],"correctIndex":1,"explanation":"A dominant 7th adds the note a minor 7th above the root: F.","id":"s2-e2"}]},{"kind":"play","exercises":[{"type":"play-chord","chord":"G7","id":"s3-e1"}]}]}$json$::jsonb
  ),
  (
    'pno-mod10-node2', 'piano', 10, 2,
    'Major 7th & Minor 7th',
    'Two more seventh-chord colours.',
    1310,
    $json${"schemaVersion":2,"tier":"virtuoso","unit":10,"isCheckpoint":false,"settings":{"passMark":0.85,"timeoutSec":15,"bpm":100,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":20,"rhythmFailHeartCost":0,"exp":45,"checkpointExp":120},"stages":[{"kind":"learn","exercises":[{"type":"concept-card","title":"Cmaj7","body":"C E G B: dreamy and open.","notes":[60,64,67,71],"display":"both","chord":true,"id":"s1-e1"},{"type":"concept-card","title":"Dm7","body":"D F A C: soft and warm.","notes":[62,65,69,72],"display":"both","chord":true,"id":"s1-e2"}]},{"kind":"check","exercises":[{"type":"ear-pick","prompt":"Which seventh chord?","play":[[60,64,67,71]],"options":["Major 7th","Dominant 7th","Minor 7th"],"correctIndex":0,"explanation":"C E G B is Cmaj7.","id":"s2-e1"},{"type":"ear-pick","prompt":"Which seventh chord?","play":[[62,65,69,72]],"options":["Minor 7th","Major 7th","Dominant 7th"],"correctIndex":0,"explanation":"D F A C is Dm7.","id":"s2-e2"},{"type":"build-the-chord","prompt":"Build a Dm7 chord on the keyboard.","chord":"Dm7","range":[48,83],"explanation":"Dm7 is D, F, A and C.","id":"s2-e3"}]},{"kind":"play","exercises":[{"type":"play-chord","chord":"Cmaj7","id":"s3-e1"},{"type":"play-chord","chord":"Dm7","id":"s3-e2"}]}]}$json$::jsonb
  ),
  (
    'pno-mod10-node3', 'piano', 10, 3,
    'The ii–V–I',
    'The core progression of jazz.',
    1350,
    $json${"schemaVersion":2,"tier":"virtuoso","unit":10,"isCheckpoint":false,"settings":{"passMark":0.85,"timeoutSec":15,"bpm":100,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":20,"rhythmFailHeartCost":0,"exp":45,"checkpointExp":120},"stages":[{"kind":"learn","exercises":[{"type":"concept-card","title":"ii–V–I in C","body":"Dm7 → G7 → Cmaj7. Each chord pulls into the next.","id":"s1-e1"}]},{"kind":"check","exercises":[{"type":"choose-answer","prompt":"In C major, the ii chord is…","options":["Em7","Dm7","G7","Am7"],"correctIndex":1,"explanation":"D is the 2nd note; ii is a minor 7th: Dm7.","id":"s2-e1"}]},{"kind":"play","exercises":[{"type":"play-sequence","steps":[{"kind":"chord","chord":"Dm7"},{"kind":"chord","chord":"G7"},{"kind":"chord","chord":"Cmaj7"}],"prompt":"Play ii–V–I in C.","id":"s3-e1"}]}]}$json$::jsonb
  ),
  (
    'pno-mod10-node4', 'piano', 10, 4,
    'ii–V–I in Other Keys',
    'Take the progression to G and F.',
    1380,
    $json${"schemaVersion":2,"tier":"virtuoso","unit":10,"isCheckpoint":false,"settings":{"passMark":0.85,"timeoutSec":15,"bpm":100,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":20,"rhythmFailHeartCost":0,"exp":45,"checkpointExp":120},"stages":[{"kind":"learn","exercises":[{"type":"concept-card","title":"New keys","body":"In G: Am7 → D7 → Gmaj7. In F: Gm7 → C7 → Fmaj7.","id":"s1-e1"}]},{"kind":"check","exercises":[{"type":"choose-answer","prompt":"In F major, the ii chord is…","options":["Am7","C7","Dm7","Gm7"],"correctIndex":3,"explanation":"G is the 2nd note of F major.","id":"s2-e1"}]},{"kind":"play","exercises":[{"type":"play-sequence","steps":[{"kind":"chord","chord":"Am7"},{"kind":"chord","chord":"D7"},{"kind":"chord","chord":"Gmaj7"}],"prompt":"ii–V–I in G.","id":"s3-e1"},{"type":"play-sequence","steps":[{"kind":"chord","chord":"Gm7"},{"kind":"chord","chord":"C7"},{"kind":"chord","chord":"Fmaj7"}],"prompt":"ii–V–I in F.","id":"s3-e2"}]}]}$json$::jsonb
  ),
  (
    'pno-mod10-node5', 'piano', 10, 5,
    'Checkpoint: Seventh Chords',
    'Seventh-chord colours and the ii–V–I.',
    1420,
    $json${"schemaVersion":2,"tier":"virtuoso","unit":10,"isCheckpoint":true,"settings":{"passMark":0.85,"timeoutSec":15,"bpm":100,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":20,"rhythmFailHeartCost":0,"exp":45,"checkpointExp":120},"stages":[{"kind":"review","exercises":[{"type":"build-the-chord","prompt":"Build a G7 chord on the keyboard.","chord":"G7","range":[48,83],"explanation":"G7 is G, B, D and F.","id":"s1-e1"},{"type":"ear-pick","prompt":"Which seventh chord?","play":[[57,60,64,67]],"options":["Major 7th","Minor 7th","Dominant 7th"],"correctIndex":1,"explanation":"A C E G is Am7.","id":"s1-e2"},{"type":"play-sequence","steps":[{"kind":"chord","chord":"Dm7"},{"kind":"chord","chord":"G7"},{"kind":"chord","chord":"Cmaj7"}],"id":"s1-e3"}]}]}$json$::jsonb
  ),
  (
    'pno-mod11-node1', 'piano', 11, 1,
    'Diminished & Augmented',
    'The two remaining triad qualities.',
    1520,
    $json${"schemaVersion":2,"tier":"virtuoso","unit":11,"isCheckpoint":false,"settings":{"passMark":0.85,"timeoutSec":15,"bpm":100,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":20,"rhythmFailHeartCost":0,"exp":45,"checkpointExp":120},"stages":[{"kind":"learn","exercises":[{"type":"concept-card","title":"Diminished","body":"Two minor thirds: B D F. Tense and unstable.","notes":[59,62,65],"display":"both","chord":true,"id":"s1-e1"},{"type":"concept-card","title":"Augmented","body":"Two major thirds: C E G#. Floating and unresolved.","notes":[60,64,68],"display":"both","chord":true,"id":"s1-e2"}]},{"kind":"check","exercises":[{"type":"ear-pick","prompt":"Which quality?","play":[[59,62,65]],"options":["Major","Diminished","Minor","Augmented"],"correctIndex":1,"explanation":"B D F is B diminished.","id":"s2-e1"},{"type":"ear-pick","prompt":"Which quality?","play":[[60,64,68]],"options":["Augmented","Major","Minor","Diminished"],"correctIndex":0,"explanation":"C E G# is C augmented.","id":"s2-e2"},{"type":"build-the-chord","prompt":"Build a Bdim chord on the keyboard.","chord":"Bdim","range":[48,83],"explanation":"B diminished is B, D and F.","id":"s2-e3"}]},{"kind":"play","exercises":[{"type":"play-chord","chord":"Bdim","id":"s3-e1"},{"type":"play-chord","chord":"Caug","id":"s3-e2"}]}]}$json$::jsonb
  ),
  (
    'pno-mod11-node2', 'piano', 11, 2,
    'Circle of Fifths',
    'How all twelve keys connect.',
    1550,
    $json${"schemaVersion":2,"tier":"virtuoso","unit":11,"isCheckpoint":false,"settings":{"passMark":0.85,"timeoutSec":15,"bpm":100,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":20,"rhythmFailHeartCost":0,"exp":45,"checkpointExp":120},"stages":[{"kind":"learn","exercises":[{"type":"concept-card","title":"Sharps clockwise","body":"Each step up a 5th adds one sharp: C (0), G (1), D (2), A (3), E (4), B (5).","id":"s1-e1"},{"type":"concept-card","title":"Flats anticlockwise","body":"Each step down a 5th adds one flat: F (1), Bb (2), Eb (3), Ab (4).","id":"s1-e2"}]},{"kind":"check","exercises":[{"type":"choose-answer","prompt":"Which major key has 2 sharps?","options":["D","G","A","E"],"correctIndex":0,"explanation":"C → G (1) → D (2).","id":"s2-e1"},{"type":"choose-answer","prompt":"Which major key has 3 flats?","options":["Bb","Eb","Ab","F"],"correctIndex":1,"explanation":"F (1) → Bb (2) → Eb (3).","id":"s2-e2"},{"type":"choose-answer","prompt":"Going clockwise, which key comes after D?","options":["G","E","A","B"],"correctIndex":2,"explanation":"A is a 5th above D.","id":"s2-e3"}]}]}$json$::jsonb
  ),
  (
    'pno-mod11-node3', 'piano', 11, 3,
    'All 12 Major Chords',
    'Play every major chord around the circle.',
    1590,
    $json${"schemaVersion":2,"tier":"virtuoso","unit":11,"isCheckpoint":false,"settings":{"passMark":0.85,"timeoutSec":15,"bpm":100,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":20,"rhythmFailHeartCost":0,"exp":45,"checkpointExp":120},"stages":[{"kind":"learn","exercises":[{"type":"concept-card","title":"Around the circle","body":"C G D A E B F# Db Ab Eb Bb F, then back to C.","id":"s1-e1"}]},{"kind":"play","exercises":[{"type":"play-sequence","steps":[{"kind":"chord","chord":"C"},{"kind":"chord","chord":"G"},{"kind":"chord","chord":"D"},{"kind":"chord","chord":"A"},{"kind":"chord","chord":"E"},{"kind":"chord","chord":"B"},{"kind":"chord","chord":"F#"},{"kind":"chord","chord":"Db"},{"kind":"chord","chord":"Ab"},{"kind":"chord","chord":"Eb"},{"kind":"chord","chord":"Bb"},{"kind":"chord","chord":"F"}],"prompt":"Play all twelve major chords around the circle.","id":"s2-e1"}]}]}$json$::jsonb
  ),
  (
    'pno-mod11-node4', 'piano', 11, 4,
    'Borrowed & Chromatic Chords',
    'Colour chords taken from the parallel minor.',
    1620,
    $json${"schemaVersion":2,"tier":"virtuoso","unit":11,"isCheckpoint":false,"settings":{"passMark":0.85,"timeoutSec":15,"bpm":100,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":20,"rhythmFailHeartCost":0,"exp":45,"checkpointExp":120},"stages":[{"kind":"learn","exercises":[{"type":"concept-card","title":"Borrowed iv","body":"In C major, F minor (iv) is borrowed from C minor. It gives a bittersweet turn.","notes":[53,56,60],"display":"both","chord":true,"id":"s1-e1"},{"type":"concept-card","title":"Flat VII","body":"Bb major (bVII) is borrowed too: C → Bb → F → C.","id":"s1-e2"}]},{"kind":"check","exercises":[{"type":"choose-answer","prompt":"F minor in the key of C major is borrowed from…","options":["F major","G major","C minor","A minor"],"correctIndex":2,"explanation":"iv comes from the parallel minor key.","id":"s2-e1"},{"type":"build-the-chord","prompt":"Build a Fm chord on the keyboard.","chord":"Fm","range":[48,83],"explanation":"F minor is F, Ab and C.","id":"s2-e2"}]},{"kind":"play","exercises":[{"type":"play-sequence","steps":[{"kind":"chord","chord":"C"},{"kind":"chord","chord":"Fm"},{"kind":"chord","chord":"C"}],"prompt":"I–iv–I.","id":"s3-e1"},{"type":"play-sequence","steps":[{"kind":"chord","chord":"C"},{"kind":"chord","chord":"Bb"},{"kind":"chord","chord":"F"},{"kind":"chord","chord":"C"}],"prompt":"I–bVII–IV–I.","id":"s3-e2"}]}]}$json$::jsonb
  ),
  (
    'pno-mod11-node5', 'piano', 11, 5,
    'Checkpoint: Colour & Keys',
    'Triad qualities, the circle of fifths and borrowed chords.',
    1660,
    $json${"schemaVersion":2,"tier":"virtuoso","unit":11,"isCheckpoint":true,"settings":{"passMark":0.85,"timeoutSec":15,"bpm":100,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":20,"rhythmFailHeartCost":0,"exp":45,"checkpointExp":120},"stages":[{"kind":"review","exercises":[{"type":"ear-pick","prompt":"Which quality?","play":[[62,65,68]],"options":["Major","Minor","Augmented","Diminished"],"correctIndex":3,"explanation":"D F Ab is D diminished.","id":"s1-e1"},{"type":"choose-answer","prompt":"Which major key has 1 flat?","options":["Bb","F","G","C"],"correctIndex":1,"explanation":"F major has only Bb.","id":"s1-e2"},{"type":"play-sequence","steps":[{"kind":"chord","chord":"D"},{"kind":"chord","chord":"A"},{"kind":"chord","chord":"E"}],"id":"s1-e3"}]}]}$json$::jsonb
  ),
  (
    'pno-mod12-node1', 'piano', 12, 1,
    'Sight-Reading Sprint',
    'Read fast in both clefs, then read rhythms cold.',
    1760,
    $json${"schemaVersion":2,"tier":"virtuoso","unit":12,"isCheckpoint":false,"settings":{"passMark":0.85,"timeoutSec":15,"bpm":100,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":20,"rhythmFailHeartCost":0,"exp":45,"checkpointExp":120},"stages":[{"kind":"check","exercises":[{"type":"name-the-note","prompt":"Name this note.","note":79,"options":["G","A","F","B"],"correctIndex":0,"explanation":"This note is G (G5).","id":"s1-e1"},{"type":"name-the-note","prompt":"Name this note.","note":48,"options":["D","B","C","E"],"correctIndex":2,"explanation":"This note is C (C3).","id":"s1-e2"},{"type":"name-the-note","prompt":"Name this note.","note":45,"options":["B","A","G","C"],"correctIndex":1,"explanation":"This note is A (A2).","id":"s1-e3"},{"type":"name-the-note","prompt":"Name this note.","note":76,"options":["E","F","D","G"],"correctIndex":0,"explanation":"This note is E (E5).","id":"s1-e4"}]},{"kind":"rhythm","exercises":[{"type":"tap-read","pattern":"sixteenth-mix","id":"s2-e1"},{"type":"tap-read","pattern":"swing","id":"s2-e2"}]}]}$json$::jsonb
  ),
  (
    'pno-mod12-node2', 'piano', 12, 2,
    'Progression Medley',
    'A long progression mixing every chord type you know.',
    1790,
    $json${"schemaVersion":2,"tier":"virtuoso","unit":12,"isCheckpoint":false,"settings":{"passMark":0.85,"timeoutSec":15,"bpm":100,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":20,"rhythmFailHeartCost":0,"exp":45,"checkpointExp":120},"stages":[{"kind":"play","exercises":[{"type":"play-sequence","steps":[{"kind":"chord","chord":"C"},{"kind":"chord","chord":"Am"},{"kind":"chord","chord":"F"},{"kind":"chord","chord":"G"},{"kind":"chord","chord":"Em"},{"kind":"chord","chord":"Am"},{"kind":"chord","chord":"Dm7"},{"kind":"chord","chord":"G7"},{"kind":"chord","chord":"Cmaj7"}],"prompt":"Play the whole medley.","id":"s1-e1"}]}]}$json$::jsonb
  ),
  (
    'pno-mod12-node3', 'piano', 12, 3,
    'Endurance: Posture Lock',
    'Keep perfect posture through a long run.',
    1830,
    $json${"schemaVersion":2,"tier":"virtuoso","unit":12,"isCheckpoint":false,"settings":{"passMark":0.85,"timeoutSec":15,"bpm":100,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":20,"rhythmFailHeartCost":0,"exp":45,"checkpointExp":120},"stages":[{"kind":"play","exercises":[{"type":"posture-hold","settings":{"postureHoldSec":30},"id":"s1-e1"},{"type":"play-sequence","steps":[{"kind":"chord","chord":"C"},{"kind":"chord","chord":"G"},{"kind":"chord","chord":"Am"},{"kind":"chord","chord":"F"},{"kind":"chord","chord":"C"},{"kind":"chord","chord":"G"},{"kind":"chord","chord":"Am"},{"kind":"chord","chord":"F"}],"prompt":"Eight chords; posture must hold for every one.","id":"s1-e2"}]}]}$json$::jsonb
  ),
  (
    'pno-mod12-node4', 'piano', 12, 4,
    'Virtuoso Exam',
    'The final exam: reading, rhythm, harmony and performance.',
    1860,
    $json${"schemaVersion":2,"tier":"virtuoso","unit":12,"isCheckpoint":true,"settings":{"passMark":0.85,"timeoutSec":15,"bpm":100,"countInBeats":4,"rhythmRepeats":2,"postureHoldSec":20,"rhythmFailHeartCost":0,"exp":45,"checkpointExp":120},"stages":[{"kind":"review","exercises":[{"type":"name-the-note","prompt":"Name this note.","note":77,"options":["G","E","F","A"],"correctIndex":2,"explanation":"This note is F (F5).","id":"s1-e1"},{"type":"ear-pick","prompt":"Which quality?","play":[[60,64,68]],"options":["Augmented","Major","Minor","Diminished"],"correctIndex":0,"explanation":"C E G# is C augmented.","id":"s1-e2"},{"type":"build-the-chord","prompt":"Build a Dm7 chord on the keyboard.","chord":"Dm7","range":[48,83],"explanation":"Dm7 is D, F, A and C.","id":"s1-e3"},{"type":"tap-read","pattern":"syncopation","id":"s1-e4"},{"type":"tap-along","pattern":"triplets","id":"s1-e5"},{"type":"play-sequence","steps":[{"kind":"chord","chord":"Am7"},{"kind":"chord","chord":"D7"},{"kind":"chord","chord":"Gmaj7"}],"id":"s1-e6"},{"type":"play-chord","chord":"F#","id":"s1-e7"}]}]}$json$::jsonb
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
-- END GENERATED LESSONS

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
