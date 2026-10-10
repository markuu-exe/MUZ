export type Phase = 'Listening' | 'Latching' | 'Success' | 'Timeout' | 'Penalize';
export type Verdict = 'Perfect' | 'Good' | 'Miss';

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface PoseLandmark extends Vector3D {
  visibility?: number;
}

export interface PostureMeasurement {
  elbowAngle: number;
  wristAngle: number;
  elbowValid: boolean;
  wristValid: boolean;
  shoulder: PoseLandmark;
  elbow: PoseLandmark;
  wrist: PoseLandmark;
  indexRoot: PoseLandmark;
}

export interface ChordTemplate {
  name: string;
  tones: number[];
}

export interface PracticeEvaluation {
  posturePassed: boolean;
  audioPassed: boolean;
  deltaMs?: number;
  verdict?: Verdict;
  confidence?: number;
  similarity?: number;
}

export interface PracticeState {
  phase: Phase;
  isListening: boolean;
  isLatching: boolean;
  hasSucceeded: boolean;
  hasTimedOut: boolean;
  score: number;
  hearts: number;
}
