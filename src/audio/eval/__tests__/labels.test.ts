import { describe, expect, it } from 'vitest';
import { LabelsError, parseLabels } from '../labels';

describe('parseLabels', () => {
  it('reads file,target,expected with optional notes and strikes; skips blanks and # comments', () => {
    const csv = [
      '﻿file,target,expected,notes,strikes',
      '# laptop mic, 1 m',
      'c4/c4_01.wav,note:C4,correct,,',
      '',
      '"chords/am, take 2.wav",chord:Am,wrong,"played F, ""by mistake""",3',
    ].join('\r\n');
    const rows = parseLabels(csv, 'labels.csv');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ line: 3, file: 'c4/c4_01.wav', targetText: 'note:C4', expected: 'correct', strikes: null, notes: '' });
    expect(rows[0].target).toMatchObject({ kind: 'note', midi: 60 });
    expect(rows[1]).toMatchObject({ line: 5, file: 'chords/am, take 2.wav', expected: 'wrong', strikes: 3, notes: 'played F, "by mistake"' });
    expect(rows[1].target.label).toBe('Am');
  });

  it('accepts columns in any order and any case', () => {
    const rows = parseLabels('Expected,FILE,Target\ncorrect,a.wav,chord:C\n');
    expect(rows[0]).toMatchObject({ file: 'a.wav', expected: 'correct', line: 2 });
  });

  it('reports every bad row with its line number', () => {
    const csv = [
      'file,target,expected,strikes',
      'a.wav,note:C4,corect,',
      ',note:C4,correct,',
      'b.wav,C4,correct,',
      'c.wav,chord:Xq,wrong,',
      'd.wav,note:C4,correct,0',
      'e.wav,note:C4',
    ].join('\n');
    let err: unknown;
    try {
      parseLabels(csv, 'my.csv');
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(LabelsError);
    const msgs = (err as LabelsError).errors;
    expect(msgs).toHaveLength(6);
    expect(msgs[0]).toMatch(/^my\.csv:2: expected must be "correct" or "wrong"/);
    expect(msgs[1]).toMatch(/^my\.csv:3: file is empty/);
    expect(msgs[2]).toMatch(/^my\.csv:4: .*note:/);
    expect(msgs[3]).toMatch(/^my\.csv:5: .*chord/);
    expect(msgs[4]).toMatch(/^my\.csv:6: strikes must be a whole number ≥ 1/);
    expect(msgs[5]).toMatch(/^my\.csv:7: expected 4 columns, found 2/);
    expect((err as Error).message).toContain('my.csv:7');
  });

  it('rejects a missing or unknown header column, an unterminated quote, and an empty list', () => {
    expect(() => parseLabels('file,target\na.wav,note:C4\n', 'x.csv')).toThrow(/x\.csv:1: missing column "expected"/);
    expect(() => parseLabels('file,target,expected,expcted\n', 'x.csv')).toThrow(/x\.csv:1: unknown column "expcted"/);
    expect(() => parseLabels('file,target,expected\n"a.wav,note:C4,correct\n', 'x.csv')).toThrow(/x\.csv:2: unterminated quote/);
    expect(() => parseLabels('file,target,expected\n', 'x.csv')).toThrow(/x\.csv: no clips listed/);
    expect(() => parseLabels('', 'x.csv')).toThrow(/x\.csv: no header/);
  });
});
