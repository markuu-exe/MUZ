import { describe, expect, it } from 'vitest';
import {
  angleBetweenDeg,
  cross,
  elevationDeg,
  jointAngleDeg,
  normalize,
  planarLeanDeg,
  signedAngleAboutAxisDeg,
  vec3,
} from '../math/vec3';

describe('vec3 (KAN-254)', () => {
  it('computes the SRS dot-product angle', () => {
    expect(angleBetweenDeg(vec3(1, 0, 0), vec3(0, 1, 0))).toBeCloseTo(90, 10);
    expect(angleBetweenDeg(vec3(1, 0, 0), vec3(1, 1, 0))).toBeCloseTo(45, 10);
    expect(angleBetweenDeg(vec3(1, 0, 0), vec3(-1, 0, 0))).toBeCloseTo(180, 10);
  });

  it('matches arccos(u·v / |u||v|) on random vectors', () => {
    for (let k = 0; k < 500; k++) {
      const u = vec3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
      const v = vec3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
      const lu = Math.hypot(u.x, u.y, u.z);
      const lv = Math.hypot(v.x, v.y, v.z);
      if (lu < 0.05 || lv < 0.05) continue;
      const ref = (Math.acos((u.x * v.x + u.y * v.y + u.z * v.z) / (lu * lv)) * 180) / Math.PI;
      expect(angleBetweenDeg(u, v)).toBeCloseTo(ref, 8);
    }
  });

  it('stays accurate for nearly straight joints where arccos loses precision', () => {
    const tiny = 1e-7; // radians
    const deg = angleBetweenDeg(vec3(1, 0, 0), vec3(Math.cos(tiny), Math.sin(tiny), 0));
    expect(deg).toBeCloseTo((tiny * 180) / Math.PI, 12);
  });

  it('returns NaN for degenerate segments instead of a fake 90°', () => {
    expect(angleBetweenDeg(vec3(0, 0, 0), vec3(1, 0, 0))).toBeNaN();
    expect(jointAngleDeg(vec3(0, 0, 0), vec3(0, 0, 0), vec3(1, 0, 0))).toBeNaN();
    expect(angleBetweenDeg(vec3(0.005, 0, 0), vec3(1, 0, 0))).toBeNaN(); // < 1 cm
    expect(normalize(vec3(), vec3(0, 0, 0))).toBeNaN();
  });

  it('measures the interior angle at the vertex', () => {
    expect(jointAngleDeg(vec3(0, 1, 0), vec3(0, 0, 0), vec3(1, 0, 0))).toBeCloseTo(90, 10);
    expect(jointAngleDeg(vec3(-1, 0, 0), vec3(0, 0, 0), vec3(1, 0, 0))).toBeCloseTo(180, 10);
  });

  it('cross is alias-safe', () => {
    const a = vec3(1, 0, 0);
    cross(a, a, vec3(0, 1, 0));
    expect(a).toEqual({ x: 0, y: 0, z: 1 });
  });

  it('signed, elevation and planar angles', () => {
    const z = vec3(0, 0, 1);
    expect(signedAngleAboutAxisDeg(vec3(1, 0, 0), vec3(0, 1, 0), z)).toBeCloseTo(90, 10);
    expect(signedAngleAboutAxisDeg(vec3(1, 0, 0), vec3(0, -1, 0), z)).toBeCloseTo(-90, 10);
    expect(elevationDeg(vec3(1, 1, 0), vec3(0, 1, 0))).toBeCloseTo(45, 10);
    expect(elevationDeg(vec3(1, -1, 0), vec3(0, 1, 0))).toBeCloseTo(-45, 10);
    // lateral component (x) ignored
    expect(planarLeanDeg(vec3(5, 1, 1), vec3(0, 1, 0), vec3(0, 0, 1))).toBeCloseTo(45, 10);
  });
});
