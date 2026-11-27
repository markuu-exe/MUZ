import { describe, expect, it } from 'vitest';
import { parseSheet } from '../sheet';
import { SONGS } from '../songs';

const ok = (text: string) => {
  const r = parseSheet(text);
  if (!r.ok) throw new Error(r.errors.map((e) => `${e.line}:${e.col} ${e.message}`).join('\n'));
  return r.song;
};
const compact = (text: string) => ok(text).events.map((e) => [e.beat, e.length, e.target.kind === 'note' ? e.target.note : e.target.chord]);
const HEAD = 'title: Test\nmeter: 4/4\nbpm: 80\n';

describe('sheet format', () => {
  it('reads notes, bars and the header', () => {
    const s = ok(`title: Twinkle\ncredit: Traditional\nmeter: 4/4\nbpm: 72\nlevel: novice\n\nC4 C4 G4 G4 | A4 A4 G4:h | F4 F4 E4 E4 | D4 D4 C4:h`);
    expect(s).toMatchObject({ title: 'Twinkle', credit: 'Traditional', bpm: 72, beatsPerMeasure: 4, meter: '4/4', kind: 'melody', level: 'novice' });
    expect(s.events).toHaveLength(14);
    expect(s.events[6]).toEqual({ beat: 6, length: 2, target: { kind: 'note', note: 67 } });
  });

  it('lengths: beats, note letters, dots; rests move the next note', () => {
    expect(compact(`${HEAD}C4:2 D4:h | E4:q E4:e E4:e r:2 | F#4:1.5 Bb3:0.5 r:h | G4:h. r`)).toEqual([
      [0, 2, 60],
      [2, 2, 62],
      [4, 1, 64],
      [5, 0.5, 64],
      [5.5, 0.5, 64],
      [8, 1.5, 66],
      [9.5, 0.5, 58],
      [12, 3, 67],
    ]);
  });

  it('chords go in brackets (so G7 the chord is not G in octave 7)', () => {
    const s = ok(`${HEAD}[C]:w | [G7]:2 [Am]:2`);
    expect(s.kind).toBe('chords');
    expect(s.events.map((e) => e.target)).toEqual([
      { kind: 'chord', chord: 'C' },
      { kind: 'chord', chord: 'G7' },
      { kind: 'chord', chord: 'Am' },
    ]);
  });

  it('comments and blank lines are ignored; lines continue the same piece', () => {
    expect(compact(`${HEAD}# verse\nC4:w\n\n# chorus\nD4:w  # held`)).toEqual([
      [0, 4, 60],
      [4, 4, 62],
    ]);
  });

  it('explains mistakes with line and column', () => {
    const bad = (text: string) => {
      const r = parseSheet(text);
      expect(r.ok).toBe(false);
      return r.ok ? [] : r.errors.map((e) => `${e.line}:${e.col} ${e.message}`);
    };
    expect(bad(`${HEAD}C4 C4 C4 C4 C4 | D4:w`)[0]).toMatch(/^4:1 Bar 1 has 5 beats; 4\/4 needs 4/);
    expect(bad(`${HEAD}C4 H4 C4 C4`)[0]).toMatch(/^4:4 .*H4/);
    expect(bad(`${HEAD}[Cxyz]:w`)[0]).toMatch(/^4:1 .*chord/i);
    expect(bad(`${HEAD}C4 C4 C4

`)[0]).toMatch(/^4:1 .*whole bars/); // the music line, not the trailing blank
    expect(bad(`meter: 4/4\nbpm: 80\nC4:w`)[0]).toMatch(/title/);
    expect(bad(`title: X\nmeter: 5/9\nbpm: 80\nC4:w`)[0]).toMatch(/meter/);
    expect(bad(`${HEAD}C9:w`)[0]).toMatch(/range/);
    expect(bad(`${HEAD}`)[0]).toMatch(/no notes/i);
  });

  it('the built-in songs are written in the format and are unchanged', () => {
    const reference: Record<string, Array<[number, number, number | string]>> = {
      twinkle: [[0,1,60],[1,1,60],[2,1,67],[3,1,67],[4,1,69],[5,1,69],[6,2,67],[8,1,65],[9,1,65],[10,1,64],[11,1,64],[12,1,62],[13,1,62],[14,2,60]],
      'ode-to-joy': [[0,1,64],[1,1,64],[2,1,65],[3,1,67],[4,1,67],[5,1,65],[6,1,64],[7,1,62],[8,1,60],[9,1,60],[10,1,62],[11,1,64],[12,1.5,64],[13.5,0.5,62],[14,2,62]],
      'four-chords': [[0,4,'C'],[4,4,'G'],[8,4,'Am'],[12,4,'F'],[16,4,'C'],[20,4,'G'],[24,4,'Am'],[28,4,'F']],
      'gentle-waltz': [[0,3,'C'],[3,3,'F'],[6,3,'G7'],[9,3,'C'],[12,3,'Am'],[15,3,'Dm'],[18,3,'G7'],[21,3,'C']],
      turnaround: [[0,2,'Dm7'],[2,2,'G7'],[4,4,'Cmaj7'],[8,2,'Dm7'],[10,2,'G7'],[12,4,'Cmaj7']],
    }; // prettier-ignore
    for (const s of SONGS) {
      expect(s.events.map((e) => [e.beat, e.length, e.target.kind === 'note' ? e.target.note : e.target.chord])).toEqual(reference[s.id]);
    }
  });
});
