/**
 * KAN-254 — Allocation-free 3D vector maths for real-time joint angles.
 *
 * Conventions
 * - All functions that produce a vector write into a caller-owned `out` and return it.
 *   `out` may alias any input.
 * - Scalar results that cannot be computed (degenerate / near-zero vectors) are `NaN`.
 *   Never substitute a fallback length (e.g. `|| 1`): that silently turns "no data" into 90°.
 * - Angles are computed with atan2(|u×v|, u·v). This is mathematically identical to
 *   arccos((u·v)/(‖u‖‖v‖)) (SRS 3.1.5.2) but numerically stable near 0° and 180°, where
 *   arccos loses precision, and it needs no clamp.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Segments shorter than this (metres) are treated as degenerate. 1 cm. */
export const MIN_SEGMENT_M = 0.01;

const RAD_TO_DEG = 180 / Math.PI;

export function vec3(x = 0, y = 0, z = 0): Vec3 {
  return { x, y, z };
}

export function set(out: Vec3, x: number, y: number, z: number): Vec3 {
  out.x = x;
  out.y = y;
  out.z = z;
  return out;
}

export function copy(out: Vec3, a: Vec3): Vec3 {
  out.x = a.x;
  out.y = a.y;
  out.z = a.z;
  return out;
}

export function setNaN(out: Vec3): Vec3 {
  out.x = NaN;
  out.y = NaN;
  out.z = NaN;
  return out;
}

export function isFiniteVec(a: Vec3): boolean {
  return Number.isFinite(a.x) && Number.isFinite(a.y) && Number.isFinite(a.z);
}

export function sub(out: Vec3, a: Vec3, b: Vec3): Vec3 {
  out.x = a.x - b.x;
  out.y = a.y - b.y;
  out.z = a.z - b.z;
  return out;
}

export function add(out: Vec3, a: Vec3, b: Vec3): Vec3 {
  out.x = a.x + b.x;
  out.y = a.y + b.y;
  out.z = a.z + b.z;
  return out;
}

export function scale(out: Vec3, a: Vec3, s: number): Vec3 {
  out.x = a.x * s;
  out.y = a.y * s;
  out.z = a.z * s;
  return out;
}

export function negate(out: Vec3, a: Vec3): Vec3 {
  return scale(out, a, -1);
}

export function midpoint(out: Vec3, a: Vec3, b: Vec3): Vec3 {
  out.x = (a.x + b.x) * 0.5;
  out.y = (a.y + b.y) * 0.5;
  out.z = (a.z + b.z) * 0.5;
  return out;
}

export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/** out = a × b. Safe when `out` aliases `a` or `b`. */
export function cross(out: Vec3, a: Vec3, b: Vec3): Vec3 {
  const x = a.y * b.z - a.z * b.y;
  const y = a.z * b.x - a.x * b.z;
  const z = a.x * b.y - a.y * b.x;
  out.x = x;
  out.y = y;
  out.z = z;
  return out;
}

export function length(a: Vec3): number {
  return Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
}

/**
 * Writes the unit vector of `a` into `out` and returns the original length.
 * If ‖a‖ < minLen, `out` becomes NaN and the return value is NaN.
 */
export function normalize(out: Vec3, a: Vec3, minLen = 1e-9): number {
  const len = length(a);
  if (!(len >= minLen)) {
    setNaN(out);
    return NaN;
  }
  const inv = 1 / len;
  out.x = a.x * inv;
  out.y = a.y * inv;
  out.z = a.z * inv;
  return len;
}

/** out = v − (v·n)n, the component of v perpendicular to unit vector n. */
export function rejectFrom(out: Vec3, v: Vec3, nUnit: Vec3): Vec3 {
  const d = dot(v, nUnit);
  out.x = v.x - d * nUnit.x;
  out.y = v.y - d * nUnit.y;
  out.z = v.z - d * nUnit.z;
  return out;
}

/**
 * Unsigned angle between u and v in radians, [0, π]. NaN if either is shorter than minLen.
 */
export function angleBetweenRad(u: Vec3, v: Vec3, minLen = MIN_SEGMENT_M): number {
  const lu = length(u);
  const lv = length(v);
  if (!(lu >= minLen) || !(lv >= minLen)) return NaN;
  const cx = u.y * v.z - u.z * v.y;
  const cy = u.z * v.x - u.x * v.z;
  const cz = u.x * v.y - u.y * v.x;
  return Math.atan2(Math.sqrt(cx * cx + cy * cy + cz * cz), dot(u, v));
}

export function angleBetweenDeg(u: Vec3, v: Vec3, minLen = MIN_SEGMENT_M): number {
  return angleBetweenRad(u, v, minLen) * RAD_TO_DEG;
}

// Module-level scratch. Safe: JS is single-threaded per realm and these helpers do not re-enter.
const _ba = vec3();
const _bc = vec3();
const _pf = vec3();
const _pt = vec3();
const _c = vec3();

/**
 * Interior angle at vertex B for the chain A → B → C, in degrees [0, 180].
 * 180° = straight chain. SRS 3.1.5.2: elbow = (shoulder, elbow, wrist), wrist = (elbow, wrist, index root).
 */
export function jointAngleDeg(a: Vec3, b: Vec3, c: Vec3, minLen = MIN_SEGMENT_M): number {
  sub(_ba, a, b);
  sub(_bc, c, b);
  return angleBetweenDeg(_ba, _bc, minLen);
}

/**
 * Signed angle (degrees, (−180, 180]) that rotates `from` onto `to` about unit `axis`,
 * after projecting both onto the plane perpendicular to `axis`. Right-hand rule: positive
 * is counter-clockwise looking down `axis`. NaN if either projection is degenerate.
 */
export function signedAngleAboutAxisDeg(from: Vec3, to: Vec3, axisUnit: Vec3, minLen = MIN_SEGMENT_M): number {
  rejectFrom(_pf, from, axisUnit);
  rejectFrom(_pt, to, axisUnit);
  if (!(length(_pf) >= minLen) || !(length(_pt) >= minLen)) return NaN;
  cross(_c, _pf, _pt);
  return Math.atan2(dot(_c, axisUnit), dot(_pf, _pt)) * RAD_TO_DEG;
}

/**
 * Elevation of v above the plane perpendicular to unit `up`, in degrees [−90, 90].
 * Positive = v points "up". NaN if v is degenerate.
 */
export function elevationDeg(v: Vec3, upUnit: Vec3, minLen = MIN_SEGMENT_M): number {
  if (!(length(v) >= minLen)) return NaN;
  const vertical = dot(v, upUnit);
  rejectFrom(_pf, v, upUnit);
  return Math.atan2(vertical, length(_pf)) * RAD_TO_DEG;
}

/**
 * Angle of v measured in the (up, forward) plane, from `up` toward `forward`, in degrees.
 * Any component along the third (lateral) axis is ignored. Used for sagittal-plane lean:
 * 0° = upright, positive = leaning forward. NaN if the in-plane component is degenerate.
 */
export function planarLeanDeg(v: Vec3, upUnit: Vec3, forwardUnit: Vec3, minLen = MIN_SEGMENT_M): number {
  const u = dot(v, upUnit);
  const f = dot(v, forwardUnit);
  if (!(Math.sqrt(u * u + f * f) >= minLen)) return NaN;
  return Math.atan2(f, u) * RAD_TO_DEG;
}
