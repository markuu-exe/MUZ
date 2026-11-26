import { describe, expect, it } from 'vitest';
import { PATH_AMPLITUDE, PATH_ROW, PATH_WIDTH, pathHeight, pathPoints, segmentPath } from '../pathLayout';

describe('pathPoints', () => {
  it('starts on the centre line and stays inside the column', () => {
    const points = pathPoints(16);
    expect(points[0].x).toBe(PATH_WIDTH / 2);
    for (const p of points) {
      expect(p.x).toBeGreaterThanOrEqual(PATH_WIDTH / 2 - PATH_AMPLITUDE);
      expect(p.x).toBeLessThanOrEqual(PATH_WIDTH / 2 + PATH_AMPLITUDE);
    }
  });

  it('spaces rows evenly and fits the reported height', () => {
    const points = pathPoints(5);
    expect(points[1].y - points[0].y).toBe(PATH_ROW);
    expect(points[4].y).toBeLessThan(pathHeight(5));
  });

  it('puts the label on the side away from the swing', () => {
    for (const p of pathPoints(8)) {
      expect(p.labelSide).toBe(p.x > PATH_WIDTH / 2 ? 'left' : 'right');
    }
  });

  it('continues the wave from the given course position', () => {
    expect(pathPoints(1, 5)[0].x).toBe(pathPoints(6)[5].x);
  });
});

describe('segmentPath', () => {
  it('runs from the first point to the second', () => {
    const [a, b] = pathPoints(2);
    const d = segmentPath(a, b);
    expect(d.startsWith(`M ${a.x} ${a.y}`)).toBe(true);
    expect(d.endsWith(`${b.x} ${b.y}`)).toBe(true);
  });
});
