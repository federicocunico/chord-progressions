import { describe, it, expect } from 'vitest';
import { makeKey } from '../src/theory/roman';
import { noteName, setNotation } from '../src/theory/notes';
import { scaleContext } from '../src/theory/scaleTrack';
import { analyzeChord, describeMove } from '../src/theory/analysis';
import { suggestNext } from '../src/theory/generator';

setNotation('english');
const C = makeKey('C', 'major');
const Am = makeKey('A', 'minor');
const changes = (n: string, k = C) => scaleContext(n, k).changes.map((c) => `${noteName(c.from)}>${noteName(c.to)}`);

describe('corsia della scala', () => {
  it('gli accordi della tonalità non cambiano la scala', () => {
    for (const n of ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']) expect(scaleContext(n, C).changes).toEqual([]);
    expect(scaleContext('I', C).named).toBe('C maggiore');
  });
  it('cambia solo le note alterate (regola della minima modifica)', () => {
    expect(changes('iv')).toEqual(['A>A♭']);
    expect(scaleContext('iv', C).named).toBe('C maggiore armonica');
    expect(scaleContext('iv', C).reason).toBe('borrowed');
    expect(changes('bVII')).toEqual(['B>B♭']);
    expect(scaleContext('bVII', C).named).toBe('C misolidio');
    expect(changes('V7/vi')).toEqual(['G>G♯']);
    expect(scaleContext('V7/vi', C).reason).toBe('secondary');
  });
  it('in minore il V maggiore porta la sensibile', () => {
    expect(changes('V', Am)).toEqual(['G>G♯']);
    expect(scaleContext('V', Am).reason).toBe('leading');
    expect(scaleContext('V', Am).named).toBe('A minore armonica');
  });
});

describe('prestito o cromatismo', () => {
  it('distingue interscambio modale e accordi cromatici', () => {
    expect(analyzeChord('iv', C).borrowed).toBe(true);
    expect(analyzeChord('bVII', C).borrowed).toBe(true);
    const III = analyzeChord('III', C);
    expect(III.borrowed).toBe(false);
    expect(III.chromatic).toBe(true);
  });
  it('le cadenze in minore citano gli accordi giusti', () => {
    expect(describeMove('V', 'i', Am).title).toContain('[i]');
    expect(describeMove('iv', 'i', Am).title).not.toContain('minore');
  });
});

describe('probabilità del prossimo accordo', () => {
  it('dopo il V la tonica è in testa e il iii è raro', () => {
    const s = suggestNext('V', 'pop', 'major', 12);
    expect(s[0].token).toBe('I');
    const iii = s.find((x) => x.token === 'iii')?.prob ?? 0;
    const vi = s.find((x) => x.token === 'vi')?.prob ?? 0;
    expect(iii).toBeLessThan(vi);
  });
});

describe('nomi delle scale su altre toniche', () => {
  it('riconosce la scala anche se non parte dalla tonica', () => {
    expect(scaleContext('V7/vi', C).named).toBe('A minore armonica');
    expect(scaleContext('V/V', C).named).toBe('G maggiore');
  });
});
