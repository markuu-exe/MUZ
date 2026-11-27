/**
 * Geometry for the falling-notes view (owner request 2026-11-28, "a Synthesia view"): tiles
 * fall toward the keys you need to play. Pure, so it is tested without a canvas.
 */
import { parseChord } from '../audio/chords/vocabulary';
import type { SongTarget } from './songs';

const BLACK_PCS = new Set([1, 3, 6, 8, 10]);
export const isBlack = (midi: number): boolean => BLACK_PCS.has(((midi % 12) + 12) % 12);

/**
 * Keys to press for a target. A note is itself. A chord is drawn in root position around middle
 * C (roots C–F# from C4, G–B from G3), so the hand shape is a common one. The graders accept
 * any voicing; this is only what the view shows.
 */
export function targetKeys(target: SongTarget): number[] {
  if (target.kind === 'note') return [target.note];
  const { root, pcs } = parseChord(target.chord);
  const keys = [(root >= 7 ? 48 : 60) + root];
  for (const pc of pcs.slice(1)) {
    let m = keys[keys.length - 1] + 1;
    while (((m % 12) + 12) % 12 !== pc) m++;
    keys.push(m);
  }
  return keys;
}

/** First and last key drawn: whole octaves (C … B) around every key used, at least two octaves. */
export function keyboardRange(keys: readonly number[]): { lo: number; hi: number } {
  const min = keys.length ? Math.min(...keys) : 60;
  const max = keys.length ? Math.max(...keys) : 71;
  const lo = Math.floor(min / 12) * 12;
  let hi = Math.floor(max / 12) * 12 + 11;
  if (hi - lo < 23) hi = lo + 23;
  return { lo, hi };
}

export interface KeyRect {
  midi: number;
  x: number;
  w: number;
  black: boolean;
}

/** Key rectangles across `width`, white keys first (draw order), then black keys on top. */
export function keyboardLayout(lo: number, hi: number, width: number): KeyRect[] {
  const whites: number[] = [];
  for (let m = lo; m <= hi; m++) if (!isBlack(m)) whites.push(m);
  const ww = width / whites.length;
  const out: KeyRect[] = whites.map((midi, i) => ({ midi, x: i * ww, w: ww, black: false }));
  const bw = ww * 0.6;
  for (let m = lo; m <= hi; m++) {
    if (!isBlack(m)) continue;
    const leftWhite = whites.indexOf(m - 1);
    if (leftWhite < 0) continue;
    out.push({ midi: m, x: (leftWhite + 1) * ww - bw / 2, w: bw, black: true });
  }
  return out;
}
