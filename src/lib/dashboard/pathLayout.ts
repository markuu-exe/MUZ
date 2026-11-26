/**
 * Skill Tree path geometry. Pure so it can be unit-tested; the view only
 * renders what this returns. Nodes wind left and right down the page, and
 * consecutive nodes are joined by smooth vertical S-curves.
 */

/** Width of the path column in px (fits the dashboard main area at 1024 px). */
export const PATH_WIDTH = 560;
/** Vertical distance between node centres in px. */
export const PATH_ROW = 124;
/** Horizontal swing of the path either side of the centre line in px. */
export const PATH_AMPLITUDE = 120;

/** One full left-right wave; continues across units so the path never restarts. */
const WAVE = [0, 0.6, 1, 0.6, 0, -0.6, -1, -0.6] as const;

export interface PathPoint {
  x: number;
  y: number;
  /** Which side the text label sits on, away from the swing. */
  labelSide: 'left' | 'right';
}

/**
 * Centres for `count` nodes. `startIndex` is the node's position in the whole
 * course, so each unit picks up the wave where the previous one ended.
 */
export function pathPoints(count: number, startIndex = 0): PathPoint[] {
  const centre = PATH_WIDTH / 2;
  return Array.from({ length: count }, (_, i) => {
    const swing = WAVE[(startIndex + i) % WAVE.length];
    return {
      x: Math.round(centre + swing * PATH_AMPLITUDE),
      y: Math.round(PATH_ROW / 2 + i * PATH_ROW),
      labelSide: swing > 0 ? 'left' : 'right',
    };
  });
}

/** SVG path data for the curve from `a` to `b`. */
export function segmentPath(a: PathPoint, b: PathPoint): string {
  const mid = (b.y - a.y) / 2;
  return `M ${a.x} ${a.y} C ${a.x} ${a.y + mid}, ${b.x} ${b.y - mid}, ${b.x} ${b.y}`;
}

/** Total height of a unit's path area. */
export function pathHeight(count: number): number {
  return count * PATH_ROW;
}
