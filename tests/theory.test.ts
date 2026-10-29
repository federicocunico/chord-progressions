import { describe, it, expect } from 'vitest';
import { parseNote, noteName, transpose, pc } from '../src/theory/notes';
import { chordSymbol, chordTones, QUALITIES } from '../src/theory/chords';
import { harmonize, scaleNotes } from '../src/theory/scales';
import {
  parseRoman, formatRoman, realize, makeKey, isDiatonic, skeletonToken, flattenSecondary, rootOffset,
} from '../src/theory/roman';
import { analyzeChord, describeMove, scaleForChord } from '../src/theory/analysis';

const sym = (num: string, tonic: string, mode: Parameters<typeof makeKey>[1] = 'major') =>
  chordSymbol(realize(parseRoman(num), makeKey(tonic, mode)), 'english', true);

describe('note', () => {
  it('parsifica e nomina', () => {
    expect(noteName(parseNote('F#'), 'english', true)).toBe('F#');
    expect(noteName(parseNote('Bb'), 'latin', false)).toBe('Si♭');
    expect(pc(parseNote('Cb'))).toBe(11);
  });
  it('traspone con ortografia corretta', () => {
    expect(noteName(transpose(parseNote('E'), 6, 10), 'english', true)).toBe('D');
    expect(noteName(transpose(parseNote('Eb'), 2, 4), 'english', true)).toBe('G');
  });
});

describe('accordi', () => {
  it('note dell\'accordo', () => {
    const tones = chordTones({ root: parseNote('A'), quality: 'm7' }).map((n) => noteName(n, 'english', true));
    expect(tones).toEqual(['A', 'C', 'E', 'G']);
  });
  it('ogni qualità ha una fondamentale', () => {
    for (const q of Object.values(QUALITIES)) expect(q.tones[0][0]).toBe(0);
  });
});

describe('scale', () => {
  it('armonizza la maggiore', () => {
    expect(harmonize('major').map((d) => d.triad)).toEqual(['maj', 'min', 'min', 'maj', 'maj', 'min', 'dim']);
    expect(harmonize('major').map((d) => d.seventh)).toEqual(['maj7', 'm7', 'm7', 'maj7', '7', 'm7', 'm7b5']);
  });
  it('alterazioni dei gradi in minore', () => {
    expect(harmonize('minor').map((d) => d.acc)).toEqual([0, 0, -1, 0, 0, -1, -1]);
  });
  it('scrive la scala', () => {
    expect(scaleNotes(parseNote('E'), 'phrygian').map((n) => noteName(n, 'english', true))).toEqual(['E', 'F', 'G', 'A', 'B', 'C', 'D']);
    expect(scaleNotes(parseNote('A'), 'minorPentatonic').map((n) => noteName(n, 'english', true))).toEqual(['A', 'C', 'D', 'E', 'G']);
  });
});

describe('numeri romani', () => {
  it('parsifica e riformatta', () => {
    for (const s of ['I', 'bVII', 'iv', 'V7/vi', 'iiø7', 'vii°7', 'IVmaj7', 'I/3', 'V/7', 'bII7', 'i/b7', 'V7sus4', 'I69', 'IV5']) {
      expect(formatRoman(parseRoman(s))).toBe(s);
    }
  });
  it('realizza in tonalità', () => {
    expect(['I', 'V', 'vi', 'IV'].map((n) => sym(n, 'C'))).toEqual(['C', 'G', 'Am', 'F']);
    expect(['i', 'bVI', 'bIII', 'bVII'].map((n) => sym(n, 'E', 'minor'))).toEqual(['Em', 'C', 'G', 'D']);
    expect(sym('V7/vi', 'C')).toBe('E7');
    expect(sym('V7/V', 'G')).toBe('A7');
    expect(sym('bVII', 'E')).toBe('D');
    expect(sym('I/3', 'C')).toBe('C/E');
    expect(sym('V/7', 'G')).toBe('D/F#');
    expect(sym('iiø7', 'A', 'minor')).toBe('Bm7b5');
    expect(sym('bII', 'E', 'phrygian')).toBe('F');
    expect(sym('IVmaj7', 'Bb')).toBe('Ebmaj7');
  });
  it('semplifica le alterazioni scomode', () => {
    expect(sym('vii°', 'F#')).toBe('F°'); // E#° → F°
    expect(sym('V7', 'G#', 'harmonicMinor')).toBe('D#7');
  });
  it('diatonicità', () => {
    const C = makeKey('C', 'major');
    expect(isDiatonic(parseRoman('vi'), C)).toBe(true);
    expect(isDiatonic(parseRoman('iv'), C)).toBe(false);
    expect(isDiatonic(parseRoman('bVII'), makeKey('A', 'minor'))).toBe(true);
  });
  it('scheletro e secondari', () => {
    expect(skeletonToken('V7')).toBe('V');
    expect(skeletonToken('iiø7')).toBe('ii°');
    expect(formatRoman(flattenSecondary(parseRoman('V7/vi')))).toBe('III7');
    expect(rootOffset(parseRoman('V/V'))).toBe(2);
  });
});

describe('analisi', () => {
  const C = makeKey('C', 'major');
  it('funzioni', () => {
    expect(analyzeChord('I', C).fn).toBe('T');
    expect(analyzeChord('IV', C).fn).toBe('S');
    expect(analyzeChord('V7', C).fn).toBe('D');
    expect(analyzeChord('V7/vi', C).secondary).toBe(true);
    expect(analyzeChord('iv', C).borrowed).toBe(true);
  });
  it('cadenze', () => {
    expect(describeMove('V7', 'I', C).title).toContain('perfetta');
    expect(describeMove('V', 'vi', C).title).toContain('inganno');
    expect(describeMove('bVII', 'i', makeKey('A', 'minor')).title).toContain('sottotonica');
    expect(describeMove('IV', 'iv', C).title).toContain('cambio di modo');
  });
  it('scala per accordo in prestito', () => {
    const s = scaleForChord('bVII', C);
    expect(s.scale).toBe('mixolydian');
    expect(s.changes.length).toBe(1);
    expect(scaleForChord('V7', makeKey('A', 'minor')).scale).toBe('harmonicMinor');
  });
});
