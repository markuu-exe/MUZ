import type { PoseLandmark } from '../../types/engine.types';

function subtract(a: PoseLandmark, b: PoseLandmark) {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  };
}

function dot(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function magnitude(v: { x: number; y: number; z: number }) {
  return Math.hypot(v.x, v.y, v.z) || 1;
}

export function calculateAngleAtVertex(vertex: PoseLandmark, left: PoseLandmark, right: PoseLandmark) {
  const v1 = subtract(left, vertex);
  const v2 = subtract(right, vertex);
  const cosine = dot(v1, v2) / (magnitude(v1) * magnitude(v2));
  const clamped = Math.max(-1, Math.min(1, cosine));
  return (Math.acos(clamped) * 180) / Math.PI;
}

export function getElbowFlexionAngle(shoulder: PoseLandmark, elbow: PoseLandmark, wrist: PoseLandmark) {
  return calculateAngleAtVertex(elbow, shoulder, wrist);
}

export function getWristNeutralityAngle(elbow: PoseLandmark, wrist: PoseLandmark, indexRoot: PoseLandmark) {
  return calculateAngleAtVertex(wrist, elbow, indexRoot);
}

export function isElbowInTargetRange(angle: number) {
  return angle >= 80 && angle <= 110;
}

export function isWristInTargetRange(angle: number) {
  return angle >= 150 && angle <= 180;
}
