import { describe, expect, it } from 'vitest';
import { parseSheet } from '../sheet';
import { SONGS, type Song } from '../songs';
import { barAt, chooseClef, chordSymbol, itemSpace, layoutStaff, ledgerSteps, soundingEvent, spaceBar, spellMidi, spellTarget, splitDuration, staffStep, type StaffItem } from '../staff';

function sheet(body: string, meter = '4/4'): Song {
  const r = parseSheet(`title: T\nmeter: ${meter}\nbpm: 80\n${body}`);
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r.song;
}

const glyphs = (items: StaffItem[]) => items.map((i) => `${i.kind === 'rest' ? 'r' : ''}${i.glyph.value}${i.glyph.dots ? '.' : ''}${i.tieToNext ? '~' : ''}`);

describe('staff positions', () => {
  it('puts treble notes on the right lines and spaces', () => {
    const step = (midi: number) => staffStep(spellMidi(midi).diatonic, 'treble');
    expect(step(64)).toBe(0); // E4 bottom line
    expect(step(65)).toBe(1); // F4 first space
    expect(step(71)).toBe(4); // B4 middle line
    expect(step(77)).toBe(8); // F5 top line
    expect(step(60)).toBe(-2); // middle C on a ledger line
    expect(step(57)).toBe(-4); // A3 two ledger lines down
  });

  it('puts bass notes on the bass staff', () => {
    expect(staffStep(spellMidi(43).diatonic, 'bass')).toBe(0); // G2 bottom line
    expect(staffStep(spellMidi(53).diatonic, 'bass')).toBe(6); // F3 on the F line
    expect(staffStep(spellMidi(60).diatonic, 'bass')).toBe(10); // middle C, ledger line above
  });

  it('lists the ledger lines a head needs', () => {
    expect(ledgerSteps(4)).toEqual([]);
    expect(ledgerSteps(-2)).toEqual([-2]);
    expect(ledgerSteps(-5)).toEqual([-2, -4]);
    expect(ledgerSteps(9)).toEqual([]);
    expect(ledgerSteps(12)).toEqual([10, 12]);
  });

  it('spells single black keys as C# Eb F# Ab Bb', () => {
    expect([61, 63, 66, 68, 70].map((m) => [spellMidi(m).letter, spellMidi(m).alter])).toEqual([
      [0, 1],
      [2, -1],
      [3, 1],
      [5, -1],
      [6, -1],
    ]);
  });

  it('spells chord tones from the chord root', () => {
    const names = (chord: string) =>
      spellTarget({ kind: 'chord', chord }).map((s) => 'CDEFGAB'[s.letter] + (s.alter === 1 ? '#' : s.alter === -1 ? 'b' : ''));
    expect(names('C')).toEqual(['C', 'E', 'G']);
    expect(names('A')).toEqual(['A', 'C#', 'E']);
    expect(names('Bb')).toEqual(['Bb', 'D', 'F']);
    expect(names('F#m')).toEqual(['F#', 'A', 'C#']);
    expect(names('Cm')).toEqual(['C', 'Eb', 'G']);
    expect(names('G7')).toEqual(['G', 'B', 'D', 'F']);
    expect(names('Abm')).toEqual(['Ab', 'Cb', 'Eb']);
  });

  it('writes chord symbols from the written root', () => {
    expect(['C', 'Bb', 'F#m', 'Ebmaj7', 'G7', 'am', 'Dbdim'].map(chordSymbol)).toEqual(['C', 'B♭', 'F♯m', 'E♭maj7', 'G7', 'Am', 'D♭dim']);
  });

  it('uses the bass clef only when most notes are below middle C', () => {
    expect(chooseClef(SONGS[0])).toBe('treble');
    expect(chooseClef(sheet('C3 D3 E3 C4'))).toBe('bass');
    expect(chooseClef(sheet('C3 D3 C4 D4'))).toBe('treble');
  });
});

describe('note values', () => {
  it('spells lengths as plain and dotted values, longest first', () => {
    const v = (b: number) => splitDuration(b).map((g) => `${g.value}${g.dots ? '.' : ''}`);
    expect(v(4)).toEqual(['whole']);
    expect(v(3)).toEqual(['half.']);
    expect(v(1.5)).toEqual(['quarter.']);
    expect(v(0.5)).toEqual(['eighth']);
    expect(v(0.25)).toEqual(['sixteenth']);
    expect(v(2.5)).toEqual(['half', 'eighth']);
    expect(v(5)).toEqual(['whole', 'quarter']);
    expect(v(0.1)).toEqual(['sixteenth']);
  });
});

describe('layoutStaff', () => {
  it('lays out Twinkle as four bars of quarters ending in halves', () => {
    const l = layoutStaff(SONGS.find((s) => s.id === 'twinkle')!);
    expect(l.clef).toBe('treble');
    expect([l.meterTop, l.meterBottom, l.beatsPerBar]).toEqual([4, 4, 4]);
    expect(l.bars.map((b) => glyphs(b.items))).toEqual([
      ['quarter', 'quarter', 'quarter', 'quarter'],
      ['quarter', 'quarter', 'half'],
      ['quarter', 'quarter', 'quarter', 'quarter'],
      ['quarter', 'quarter', 'half'],
    ]);
    expect(l.minStep).toBe(-2); // C4
    expect(l.maxStep).toBe(3); // A4, second space
    expect(l.bars[0].items[0].stemUp).toBe(true);
  });

  it('keeps the dotted rhythm of Ode to Joy', () => {
    const l = layoutStaff(SONGS.find((s) => s.id === 'ode-to-joy')!);
    expect(glyphs(l.bars[3].items)).toEqual(['quarter.', 'eighth', 'half']);
  });

  it('draws chords as stacked heads with chord-root spelling', () => {
    const waltz = layoutStaff(SONGS.find((s) => s.id === 'gentle-waltz')!);
    expect(waltz.meterTop).toBe(3);
    expect(waltz.bars).toHaveLength(8);
    expect(glyphs(waltz.bars[0].items)).toEqual(['half.']);
    const g7 = waltz.bars[2].items[0];
    expect(g7.heads.map((h) => h.midi)).toEqual([55, 59, 62, 65]);
    expect(g7.heads.map((h) => h.step)).toEqual([-5, -3, -1, 1]);
    expect(g7.heads.every((h) => h.accidental === null)).toBe(true);
  });

  it('renders every built-in song with one item per event and full bars', () => {
    for (const song of SONGS) {
      const l = layoutStaff(song);
      const firstPieces = l.bars.flatMap((b) => b.items).filter((i, k, all) => i.kind === 'note' && all[k - 1]?.tieToNext !== true);
      expect(firstPieces.map((i) => i.event)).toEqual(song.events.map((_, k) => k));
      for (const bar of l.bars) {
        const sum = bar.items.reduce((s, i) => s + i.glyph.beats, 0);
        expect(sum).toBeCloseTo(l.beatsPerBar);
      }
    }
  });

  it('fills gaps with rests and an empty bar with one whole rest', () => {
    const l = layoutStaff(sheet('C4 r D4:h | r:w | r:h. E4:e r:e', '4/4'));
    expect(glyphs(l.bars[0].items)).toEqual(['quarter', 'rquarter', 'half']);
    expect(glyphs(l.bars[1].items)).toEqual(['rwhole']);
    expect(l.bars[1].items[0].wholeBarRest).toBe(true);
    expect(glyphs(l.bars[2].items)).toEqual(['rhalf.', 'eighth', 'reighth']);
    const waltz = layoutStaff(sheet('r:h. | C4:h.', '3/4'));
    expect(waltz.bars[0].items[0]).toMatchObject({ kind: 'rest', wholeBarRest: true, glyph: { beats: 3 } });
  });

  it('ties notes across bar lines and through lengths one value cannot spell', () => {
    const l = layoutStaff(sheet('C4:h. D4:h. E4:h', '4/4'));
    expect(glyphs(l.bars[0].items)).toEqual(['half.', 'quarter~']);
    expect(glyphs(l.bars[1].items)).toEqual(['half', 'half']);
    expect(l.bars[1].items[0].event).toBe(1);
    const odd = layoutStaff(sheet('C4:2.5 D4:1.5'));
    expect(glyphs(odd.bars[0].items)).toEqual(['half~', 'eighth', 'quarter.']);
  });

  it('marks accidentals once per bar and naturals after them', () => {
    const l = layoutStaff(sheet('F#4 F#4 F4 F#4 | F#4 Bb4 B4 C5'));
    const acc = (bar: number) => l.bars[bar].items.map((i) => i.heads[0].accidental);
    expect(acc(0)).toEqual(['sharp', null, 'natural', 'sharp']);
    expect(acc(1)).toEqual(['sharp', 'flat', 'natural', null]);
  });

  it('repeats no accidental at the far end of a tie', () => {
    const l = layoutStaff(sheet('C4:h. F#4:h. C4:h'));
    expect(l.bars[0].items[1].heads[0].accidental).toBe('sharp');
    expect(l.bars[1].items[0].heads[0].accidental).toBeNull();
  });

  it('turns stems down for notes on or above the middle line', () => {
    const l = layoutStaff(sheet('B4 C5 A4 [C]'));
    expect(l.bars[0].items.map((i) => i.stemUp)).toEqual([false, false, true, true]);
  });

  it('staggers accidentals that would collide', () => {
    const song: Song = { ...sheet('C4:w'), events: [{ beat: 0, length: 4, target: { kind: 'chord', chord: 'Ebm' } }] };
    // Ebm voiced Eb4 Gb4 Bb4: three flats a third apart need staggered columns.
    const heads = layoutStaff(song).bars[0].items[0].heads;
    expect(heads.map((h) => h.accidental)).toEqual(['flat', 'flat', 'flat']);
    expect(new Set(heads.map((h) => h.accidentalColumn)).size).toBeGreaterThan(1);
  });

  it('finds the sounding event and its bar', () => {
    const song = sheet('C4 r D4:h | E4:w');
    expect(soundingEvent(song, 0.5)).toBe(0);
    expect(soundingEvent(song, 1.5)).toBe(-1);
    expect(soundingEvent(song, 3.9)).toBe(1);
    expect(soundingEvent(song, 8)).toBe(-1);
    const l = layoutStaff(song);
    expect(barAt(l, -1)).toBe(0);
    expect(barAt(l, 4)).toBe(1);
    expect(barAt(l, 99)).toBe(1);
  });

  it('spaces items by length and leaves room for the next accidentals', () => {
    const bar = layoutStaff(sheet('F#4 r Bb4:e C5:e B4')).bars[0];
    const { offsets, width } = spaceBar(bar);
    expect(offsets[0]).toBeGreaterThan(1.2); // room for the first sharp
    for (let i = 1; i < offsets.length; i++) expect(offsets[i] - offsets[i - 1]).toBeGreaterThanOrEqual(2.5);
    // C5 (eighth) is followed by a natural B4: it gets more room than the plain eighth before it.
    expect(itemSpace(bar.items[3], bar.items[4])).toBeGreaterThan(itemSpace(bar.items[3]));
    expect(width).toBeGreaterThan(offsets[offsets.length - 1]);
    const half = layoutStaff(sheet('C4:h C4:h')).bars[0];
    expect(itemSpace(half.items[0])).toBeGreaterThan(itemSpace(bar.items[0]));
  });
});
