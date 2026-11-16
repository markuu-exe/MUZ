/**
 * COURSE-3/4/5: which component renders each exercise type.
 * To change how an exercise type looks or behaves, change its entry here.
 */
import type { ExerciseRegistry } from '../../lesson/registry';
import PostureHoldView from './practice/PostureHoldView';
import PracticeDrillView from './practice/PracticeDrillView';
import TapExerciseView from './rhythm/TapExerciseView';
import BuildTheChordView from './theory/BuildTheChordView';
import ChooseAnswerView from './theory/ChooseAnswerView';
import ConceptCardView from './theory/ConceptCardView';
import EarPickView from './theory/EarPickView';
import FindTheKeyView from './theory/FindTheKeyView';
import NameTheNoteView from './theory/NameTheNoteView';

export const EXERCISE_REGISTRY: ExerciseRegistry = {
  'concept-card': { View: ConceptCardView, feedback: 'activity', label: 'Learn' },
  'choose-answer': { View: ChooseAnswerView, feedback: 'answer', label: 'Choose the answer' },
  'name-the-note': { View: NameTheNoteView, feedback: 'answer', label: 'Name the note' },
  'find-the-key': { View: FindTheKeyView, feedback: 'answer', label: 'Find the key', wide: true },
  'build-the-chord': { View: BuildTheChordView, feedback: 'answer', label: 'Build the chord', wide: true },
  'ear-pick': { View: EarPickView, feedback: 'answer', label: 'Ear training' },
  // COURSE-4: one view, three modes.
  'tap-along': { View: TapExerciseView, feedback: 'activity', label: 'Tap along', wide: true },
  'tap-echo': { View: TapExerciseView, feedback: 'activity', label: 'Echo the rhythm', wide: true },
  'tap-read': { View: TapExerciseView, feedback: 'activity', label: 'Read and tap', wide: true },
  // COURSE-5: one drill view for notes, chords and sequences; posture-hold is camera only.
  'play-note': { View: PracticeDrillView, feedback: 'activity', label: 'Play the note', wide: true },
  'play-chord': { View: PracticeDrillView, feedback: 'activity', label: 'Play the chord', wide: true },
  'play-sequence': { View: PracticeDrillView, feedback: 'activity', label: 'Play in order', wide: true },
  'posture-hold': { View: PostureHoldView, feedback: 'activity', label: 'Posture check', wide: true },
};
