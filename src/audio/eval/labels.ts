/**
 * AI-2 (dev-only): the labels CSV for `npm run eval:audio`.
 *
 *   file,target,expected[,notes][,strikes]
 *   c4/c4_laptop_01.wav,note:C4,correct,,
 *   chords/f_for_c_01.wav,chord:C,wrong,played F,
 *
 * `file` is relative to the CSV. `expected` is `correct` (the target was played)
 * or `wrong` (something else was). `strikes` (optional) is how many strikes the
 * clip contains, so strikes the detector never heard count as "no attempt".
 * Blank lines and lines starting with # are skipped. Fields may be "quoted".
 */
import { parseTarget, type EvalTarget } from './evaluateClip';

export type Expected = 'correct' | 'wrong';

export interface LabelRow {
  /** 1-based line in the CSV. */
  line: number;
  file: string;
  targetText: string;
  target: EvalTarget;
  expected: Expected;
  strikes: number | null;
  notes: string;
}

export class LabelsError extends Error {
  readonly errors: string[];
  constructor(errors: string[]) {
    super(errors.join('\n'));
    this.name = 'LabelsError';
    this.errors = errors;
  }
}

const REQUIRED = ['file', 'target', 'expected'] as const;
const OPTIONAL = ['notes', 'strikes'] as const;
type Column = (typeof REQUIRED)[number] | (typeof OPTIONAL)[number];

/** Split one CSV record (RFC 4180 quoting, no embedded newlines). Returns null on an unterminated quote. */
function splitCsvLine(line: string): string[] | null {
  const out: string[] = [];
  let field = '';
  let i = 0;
  let quoted = false;
  while (i < line.length) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        field += '"';
        i += 2;
        continue;
      }
      if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && field.trim() === '') {
      quoted = true;
      field = '';
    } else if (c === ',') {
      out.push(field.trim());
      field = '';
    } else {
      field += c;
    }
    i++;
  }
  if (quoted) return null;
  out.push(field.trim());
  return out;
}

export function parseLabels(text: string, source = 'labels.csv'): LabelRow[] {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  const errors: string[] = [];
  let header: Column[] | null = null;
  const rows: LabelRow[] = [];

  for (let idx = 0; idx < lines.length; idx++) {
    const lineNo = idx + 1;
    const raw = lines[idx];
    if (raw.trim() === '' || raw.trimStart().startsWith('#')) continue;
    const fail = (msg: string) => errors.push(`${source}:${lineNo}: ${msg}`);
    const cells = splitCsvLine(raw);
    if (!cells) {
      fail('unterminated quote');
      if (!header) throw new LabelsError(errors);
      continue;
    }

    if (!header) {
      const names = cells.map((c) => c.toLowerCase());
      const bad = names.filter((n) => !(REQUIRED as readonly string[]).includes(n) && !(OPTIONAL as readonly string[]).includes(n));
      for (const n of bad) fail(`unknown column "${n}" (columns: ${[...REQUIRED, ...OPTIONAL].join(', ')})`);
      for (const n of REQUIRED) if (!names.includes(n)) fail(`missing column "${n}"`);
      if (errors.length > 0) throw new LabelsError(errors);
      header = names as Column[];
      continue;
    }

    // Trailing optional columns may be left off ("a.wav,note:C4,correct" under a header with notes).
    const missing = header.slice(cells.length);
    if (cells.length > header.length || missing.some((c) => (REQUIRED as readonly string[]).includes(c))) {
      fail(`expected ${header.length} columns, found ${cells.length}`);
      continue;
    }
    while (cells.length < header.length) cells.push('');
    const get = (c: Column) => {
      const i = header!.indexOf(c);
      return i < 0 ? '' : cells[i];
    };

    const file = get('file');
    if (file === '') fail('file is empty');

    const targetText = get('target');
    let target: EvalTarget | null = null;
    try {
      target = parseTarget(targetText);
    } catch (e) {
      fail((e as Error).message);
    }

    const exp = get('expected').toLowerCase();
    if (exp !== 'correct' && exp !== 'wrong') fail(`expected must be "correct" or "wrong", got "${get('expected')}"`);

    let strikes: number | null = null;
    const s = get('strikes');
    if (s !== '') {
      if (/^\d+$/.test(s) && Number(s) >= 1) strikes = Number(s);
      else fail(`strikes must be a whole number ≥ 1, got "${s}"`);
    }

    if (file !== '' && target && (exp === 'correct' || exp === 'wrong') && (s === '' || strikes !== null)) {
      rows.push({ line: lineNo, file, targetText, target, expected: exp, strikes, notes: get('notes') });
    }
  }

  if (!header) throw new LabelsError([`${source}: no header line (want: file,target,expected[,notes][,strikes])`]);
  if (errors.length > 0) throw new LabelsError(errors);
  if (rows.length === 0) throw new LabelsError([`${source}: no clips listed`]);
  return rows;
}
