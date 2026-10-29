import { describe, it, expect } from 'vitest';
import { plainText, marks } from '../src/ui/components/chordTip';
import { parseRoman, makeKey } from '../src/theory/roman';
import { PROGRESSIONS } from '../src/data/progressions';
import { GENRES } from '../src/data/genres';
import { SCALES } from '../src/theory/scales';
import { SUB_TEXT, MODE_TABLE } from '../src/ui/views/theory';

const C = makeKey('C', 'major');

describe('accordi marcati nei testi', () => {
  it('[…] mostra il numerale, {…} il simbolo nella tonalità', () => {
    expect(plainText('Il [V7/vi] porta al [vi]', C)).toBe('Il V7/vi porta al vi');
    expect(plainText('{V7} → {♭II7}', C)).toBe('G7 → D♭7');
    expect(plainText('{I/3}', makeKey('G', 'major'))).toBe('G/B');
  });
  it('un token non valido è un errore, non testo ignorato', () => {
    expect(() => plainText('[XYZ]', C)).toThrow();
  });
});

// Tutti i testi che possono citare accordi
const TEXTS: [string, string][] = [
  ...PROGRESSIONS.map((p) => [`progressione ${p.id}`, p.description] as [string, string]),
  ...GENRES.flatMap((g) => [[`genere ${g.id}`, g.description], ...g.tips.map((t, i) => [`genere ${g.id} tip ${i}`, t])] as [string, string][]),
  ...Object.entries(SCALES).map(([id, s]) => [`scala ${id}`, s.description] as [string, string]),
  ...Object.entries(SUB_TEXT).map(([id, t]) => [`teoria sostituzione ${id}`, t] as [string, string]),
  ...MODE_TABLE.map((m) => [`teoria modo ${m.scale}`, m.chord] as [string, string]),
];

// Numerali romani rimasti fuori marcatura. "I" e "i" da soli sono esclusi: in italiano sono anche articoli.
const NUM = '(?:VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)';
const BARE = new RegExp(`(?<![\\p{L}\\d/])[♭♯b]?${NUM}(?:°7?|ø7?|maj7|7|sus[24])?(?:/${NUM})?(?![\\p{L}\\d])`, 'gu');

describe('lint dei testi', () => {
  it('ogni accordo marcato è un numerale valido', () => {
    for (const [where, text] of TEXTS) {
      for (const m of marks(text)) expect(() => parseRoman(m), `${where}: [${m}]`).not.toThrow();
    }
  });
  it('nessun numerale romano fuori marcatura', () => {
    const bare = TEXTS.flatMap(([where, text]) => {
      const outside = text.replace(/\[[^\]]*\]|\{[^}]*\}/g, ' ');
      return [...outside.matchAll(BARE)].map((m) => m[0]).filter((t) => t !== 'I' && t !== 'i').map((t) => `${where}: "${t}"`);
    });
    expect(bare).toEqual([]);
  });
});
