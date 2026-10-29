import { describe, it, expect } from 'vitest';
import { MOVABLE_SHAPES, OPEN_SHAPES, OPEN_PC } from '../src/guitar/shapes';
import { candidatesFor, fingersFor, voiceProgression, genericVoicings, voicingPcs } from '../src/guitar/voicings';
import { QUALITIES, chordPcs, type Chord, type QualityId } from '../src/theory/chords';
import { parseNote, pc, mod, spellPc } from '../src/theory/notes';
import { realizeAll, makeKey } from '../src/theory/roman';

function checkVoicing(frets: (number | null)[], chord: Chord) {
  const pcs = frets.flatMap((f, s) => (f === null ? [] : [(OPEN_PC[s] + f) % 12]));
  const allowed = new Set(chordPcs(chord));
  for (const p of pcs) expect(allowed.has(p), `nota estranea in ${frets} per ${JSON.stringify(chord)}`).toBe(true);
  const q = QUALITIES[chord.quality];
  const rootPc = pc(chord.root);
  for (const [s] of q.tones) {
    if (q.optional.includes(s)) continue;
    expect(pcs.includes(mod(rootPc + s, 12)), `manca intervallo ${s} in ${frets} (${chord.quality})`).toBe(true);
  }
  const bass = chord.bass ? pc(chord.bass) : rootPc;
  expect(pcs[0]).toBe(bass);
}

describe('forme aperte', () => {
  it('sono tutte corrette e eseguibili', () => {
    for (const o of OPEN_SHAPES) {
      const chord: Chord = { root: spellPc(o.root), quality: o.quality, bass: o.bass !== undefined ? spellPc(o.bass) : undefined };
      checkVoicing(o.frets, chord);
      expect(fingersFor(o.frets), `dita per ${o.name}`).not.toBeNull();
    }
  });
});

describe('forme mobili', () => {
  it('ogni forma contiene le note giuste in tutte le 12 tonalità', () => {
    for (const sh of MOVABLE_SHAPES) {
      for (let root = 0; root < 12; root++) {
        const base = mod(root - OPEN_PC[sh.rootString], 12);
        const f0 = base < 3 ? base + 12 : base;
        const frets = sh.pattern.map((o) => (o === null ? null : f0 + o));
        checkVoicing(frets, { root: spellPc(root), quality: sh.quality });
      }
    }
  });
});

describe('dita', () => {
  it('diteggiature standard', () => {
    expect(fingersFor([null, 3, 2, 0, 1, 0])!.fingers).toEqual([null, 3, 2, 0, 1, 0]);
    expect(fingersFor([0, 2, 2, 1, 0, 0])!.fingers).toEqual([0, 2, 3, 1, 0, 0]);
    const f = fingersFor([1, 3, 3, 2, 1, 1])!;
    expect(f.barre).toEqual({ fret: 1, from: 0, to: 5 });
    expect(f.fingers).toEqual([1, 3, 4, 2, 1, 1]);
    expect(fingersFor([1, 2, 3, 4, 5, 6])).toBeNull();
  });
});

describe('candidati', () => {
  const all = Object.keys(QUALITIES) as QualityId[];
  it('ogni qualità ha almeno un voicing in ogni tonalità', () => {
    for (const q of all) {
      for (let r = 0; r < 12; r++) {
        const chord = { root: spellPc(r), quality: q };
        const c = candidatesFor(chord, 'auto');
        expect(c.length, `${q} su ${r}`).toBeGreaterThan(0);
        checkVoicing(c[0].frets, chord);
      }
    }
  });
  it('preferisce gli aperti in stile "open"', () => {
    expect(candidatesFor({ root: parseNote('G'), quality: 'maj' }, 'open')[0].kind).toBe('open');
  });
  it('power chord in stile "power"', () => {
    const v = candidatesFor({ root: parseNote('E'), quality: 'min' }, 'power')[0];
    expect(v.kind).toBe('power');
    expect(new Set(voicingPcs(v))).toEqual(new Set([4, 11]));
  });
  it('slash chord con il basso giusto', () => {
    const chord: Chord = { root: parseNote('C'), quality: 'maj', bass: parseNote('E') };
    checkVoicing(candidatesFor(chord)[0].frets, chord);
    const g: Chord = { root: parseNote('F'), quality: 'm7', bass: parseNote('Eb') };
    expect(genericVoicings(g).length).toBeGreaterThan(0);
  });
});

describe('progressione', () => {
  it('in Do: accordi aperti per I–V–vi–IV', () => {
    const vs = voiceProgression(realizeAll(['I', 'V', 'vi', 'IV'], makeKey('C', 'major')), 'open');
    expect(vs.map((v) => v.kind)).toEqual(['open', 'open', 'open', 'open']);
  });
  it('in stile barré resta in una zona compatta', () => {
    const vs = voiceProgression(realizeAll(['i', 'bVI', 'bIII', 'bVII'], makeKey('F#', 'minor')), 'barre');
    const pos = vs.map((v) => v.position);
    expect(Math.max(...pos) - Math.min(...pos)).toBeLessThanOrEqual(5);
  });
});
