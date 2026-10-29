import { describe, it, expect } from 'vitest';
import { generate, suggestNext, findMatch, colorize, libraryFor, functionalPrior } from '../src/theory/generator';
import { substitutionsFor } from '../src/theory/substitutions';
import { makeKey, parseRoman } from '../src/theory/roman';

describe('generatore', () => {
  it('è deterministico con lo stesso seed', () => {
    const a = generate({ genre: 'pop', mode: 'major', length: 4, popularity: 5, seed: 1 });
    const b = generate({ genre: 'pop', mode: 'major', length: 4, popularity: 5, seed: 1 });
    expect(a.map((x) => x.chords.join(' '))).toEqual(b.map((x) => x.chords.join(' ')));
  });
  it('rispetta la lunghezza e contiene la tonica', () => {
    for (const length of [2, 3, 4, 5, 6, 8]) {
      for (const [genre, mode] of [['pop', 'major'], ['metal', 'minor'], ['jazz', 'major'], ['folkmetal', 'dorian'], ['jrock', 'minor']] as const) {
        const res = generate({ genre, mode, length, popularity: 3, seed: 42 });
        expect(res.length, `${genre} ${length}`).toBeGreaterThan(0);
        for (const r of res) {
          expect(r.chords.length).toBe(length);
          expect(r.tokens.some((t) => t === 'I' || t === 'i')).toBe(true);
          r.chords.forEach((c) => expect(() => parseRoman(c)).not.toThrow());
        }
      }
    }
  });
  it('le più famose del pop includono l\'asse I–V–vi–IV', () => {
    const res = generate({ genre: 'pop', mode: 'major', length: 4, popularity: 5, seed: 3, count: 8 });
    expect(res.some((r) => r.match)).toBe(true);
  });
  it('riconosce le rotazioni della libreria', () => {
    expect(findMatch(['vi', 'IV', 'I', 'V'], 'major')).toBeDefined();
    expect(findMatch(['IV', 'vi', 'V', 'I'], 'major')?.id).toBeDefined();
  });
  it('dopo V suggerisce I', () => {
    const s = suggestNext('V7', 'pop', 'major');
    expect(s.slice(0, 3).map((x) => x.token)).toContain('I');
    expect(functionalPrior('V', 'I', 'major')).toBeGreaterThan(functionalPrior('V', 'IV', 'major'));
  });
  it('colora per genere', () => {
    expect(colorize(['ii', 'V', 'I'], 'sevenths', 'major')).toEqual(['ii7', 'V7', 'Imaj7']);
    expect(colorize(['I', 'IV', 'V'], 'triads', 'blues')).toEqual(['I7', 'IV7', 'V7']);
  });
  it('libreria per contesto', () => {
    const lib = libraryFor('folkmetal', 'minor');
    expect(lib.length).toBeGreaterThan(3);
    expect(libraryFor('jazz', 'major', 3).every((p) => p.chords.length === 3)).toBe(true);
  });
});

describe('sostituzioni', () => {
  const C = makeKey('C', 'major');
  const subs = (chords: string[], i: number) => substitutionsFor(chords, i, C);
  it('propone molte varianti per il IV', () => {
    const s = subs(['I', 'V', 'vi', 'IV'], 3);
    const types = new Set(s.map((x) => x.type));
    for (const t of ['diatonica', 'colore', 'prestito', 'secondaria']) expect(types.has(t as never), t).toBe(true);
    expect(s.find((x) => x.chords[3] === 'iv')).toBeDefined();
    expect(s.find((x) => x.chords[3] === 'ii')).toBeDefined();
  });
  it('tritono sul V7', () => {
    const s = subs(['ii7', 'V7', 'Imaj7'], 1);
    expect(s.find((x) => x.type === 'tritono')?.chords[1]).toBe('bII7');
    expect(s.find((x) => x.type === 'backdoor')?.chords.slice(1, 3)).toEqual(['iv7', 'bVII7']);
  });
  it('diminuito di passaggio I → ii', () => {
    const s = subs(['I', 'ii', 'V', 'I'], 0);
    expect(s.find((x) => x.type === 'diminuito')?.chords.slice(0, 3)).toEqual(['I', '#i°7', 'ii']);
  });
  it('dominante secondaria verso vi', () => {
    const s = subs(['I', 'V', 'vi', 'IV'], 1);
    expect(s.find((x) => x.type === 'secondaria')?.chords[1]).toBe('V7/vi');
  });
  it('inversione per basso fluido', () => {
    const s = subs(['I', 'V', 'vi', 'IV'], 1);
    expect(s.find((x) => x.type === 'inversione')?.chords[1]).toBe('V/7');
  });
  it('tutte le sostituzioni producono numerali validi', () => {
    for (const prog of [['I', 'V', 'vi', 'IV'], ['i', 'bVI', 'bIII', 'bVII'], ['ii7', 'V7', 'Imaj7'], ['I7', 'IV7', 'V7'], ['IVmaj7', 'V7', 'iii7', 'vi']]) {
      for (let i = 0; i < prog.length; i++) {
        for (const s of substitutionsFor(prog, i, makeKey('A', 'minor'))) {
          s.chords.forEach((c) => expect(() => parseRoman(c), `${s.title}: ${c}`).not.toThrow());
          expect(s.bars.length).toBe(s.chords.length);
        }
      }
    }
  });
});
