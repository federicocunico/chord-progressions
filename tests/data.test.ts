import { describe, it, expect } from 'vitest';
import { PROGRESSIONS, PROGRESSION_MAP } from '../src/data/progressions';
import { GENRES, GENRE_MAP } from '../src/data/genres';
import { parseRoman, realizeAll, makeKey } from '../src/theory/roman';
import { MODES, SCALES } from '../src/theory/scales';
import { voiceProgression } from '../src/guitar/voicings';

describe('base di conoscenza', () => {
  it('ha almeno 100 progressioni con id unici', () => {
    expect(PROGRESSIONS.length).toBeGreaterThanOrEqual(100);
    expect(new Set(PROGRESSIONS.map((p) => p.id)).size).toBe(PROGRESSIONS.length);
  });
  it('ogni numerale si analizza e ogni genere esiste', () => {
    for (const p of PROGRESSIONS) {
      for (const c of p.chords) expect(() => parseRoman(c), `${p.id}: ${c}`).not.toThrow();
      for (const g of p.genres) expect(GENRE_MAP[g], `${p.id}: genere ${g}`).toBeDefined();
      expect(MODES[p.mode], p.id).toBeDefined();
      if (p.bars) expect(p.bars.length, p.id).toBe(p.chords.length);
      for (const r of p.related ?? []) expect(PROGRESSION_MAP[r], `${p.id} → ${r}`).toBeDefined();
    }
  });
  it('ogni progressione è suonabile in ogni tonalità', () => {
    for (const p of PROGRESSIONS) {
      for (const t of ['C', 'E', 'F#', 'Bb']) {
        const vs = voiceProgression(realizeAll(p.chords, makeKey(t, p.mode)), 'auto');
        expect(vs.every(Boolean), `${p.id} in ${t}`).toBe(true);
      }
    }
  });
  it('generi coerenti', () => {
    for (const g of GENRES) {
      if (g.parent) expect(GENRE_MAP[g.parent]).toBeDefined();
      for (const s of g.scales) expect(SCALES[s], `${g.id}: ${s}`).toBeDefined();
      expect(g.tips.length).toBeGreaterThan(0);
    }
  });
  it('ogni genere ha almeno una progressione', () => {
    for (const g of GENRES) {
      const fam = [g.id, ...GENRES.filter((x) => x.parent === g.id).map((x) => x.id)];
      expect(PROGRESSIONS.some((p) => p.genres.some((x) => fam.includes(x))), g.id).toBe(true);
    }
  });
});
