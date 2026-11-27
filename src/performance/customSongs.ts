/**
 * "Your pieces": sheets the learner writes in Performance mode (performance/sheet.ts), kept on
 * this device like best scores. Performance mode is practice, so nothing goes to the account.
 * The sheet text is stored, not the parsed song, so a piece can always be reopened and fixed.
 */
import { parseSheet } from './sheet';
import type { Song } from './songs';

export const CUSTOM_KEY = 'muz-perform-sheets';

interface Stored {
  id: string;
  text: string;
}

export interface CustomPiece {
  id: string;
  text: string;
  /** Null when the text no longer parses (it can still be opened in the editor). */
  song: Song | null;
}

function read(): Stored[] {
  try {
    const raw = window.localStorage.getItem(CUSTOM_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p): p is Stored => !!p && typeof p.id === 'string' && typeof p.text === 'string');
  } catch {
    return [];
  }
}

function write(items: Stored[]): void {
  try {
    window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(items));
  } catch {
    // Storage unavailable: the piece lasts for this page only.
  }
}

export function listCustomSongs(): CustomPiece[] {
  return read().map(({ id, text }) => {
    const r = parseSheet(text);
    return { id, text, song: r.ok ? { ...r.song, id } : null };
  });
}

/** Saves a new piece, or replaces the one with `id`. Returns its id. */
export function saveCustomSheet(text: string, id?: string): string {
  const items = read();
  const r = parseSheet(text);
  const newId = id ?? `custom-${r.ok ? r.song.id : 'piece'}-${Math.random().toString(36).slice(2, 7)}`;
  const at = items.findIndex((p) => p.id === newId);
  if (at >= 0) items[at] = { id: newId, text };
  else items.push({ id: newId, text });
  write(items);
  return newId;
}

export function deleteCustomSheet(id: string): void {
  write(read().filter((p) => p.id !== id));
}
