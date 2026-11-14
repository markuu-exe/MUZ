export type Verdict = 'Perfect' | 'Good' | 'Miss';

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface PoseLandmark extends Vector3D {
  visibility?: number;
}

export interface ChordTemplate {
  name: string;
  tones: number[];
}
