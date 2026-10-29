import { describe, it, expect } from 'vitest';
import { renderSequence, PATTERNS, type Pattern } from '../src/audio/sequencer';
import { buildMidiFile, normalizeEvents, PPQ } from '../src/audio/midi';

const C = [48, 52, 55, 60, 64]; // Do aperto
const G = [43, 47, 50, 55, 59, 67];

/** Mini parser SMF per verificare il file generato. */
function parseMidi(b: Uint8Array) {
  const str = (o: number, n: number) => String.fromCharCode(...b.slice(o, o + n));
  expect(str(0, 4)).toBe('MThd');
  const ppq = (b[12] << 8) | b[13];
  expect(str(14, 4)).toBe('MTrk');
  const len = (b[18] << 24) | (b[19] << 16) | (b[20] << 8) | b[21];
  let i = 22;
  const end = 22 + len;
  let tick = 0;
  const notes: { tick: number; on: boolean; note: number; vel: number }[] = [];
  let tempo = 0;
  let program = -1;
  const markers: string[] = [];
  let ended = false;
  while (i < end) {
    let d = 0;
    let c: number;
    do { c = b[i++]; d = (d << 7) | (c & 0x7f); } while (c & 0x80);
    tick += d;
    const st = b[i++];
    if (st === 0xff) {
      const type = b[i++];
      let l = 0;
      do { c = b[i++]; l = (l << 7) | (c & 0x7f); } while (c & 0x80);
      if (type === 0x51) tempo = (b[i] << 16) | (b[i + 1] << 8) | b[i + 2];
      if (type === 0x06) markers.push(new TextDecoder().decode(b.slice(i, i + l)));
      if (type === 0x2f) ended = true;
      i += l;
    } else if ((st & 0xf0) === 0xc0) {
      program = b[i++];
    } else {
      const note = b[i++];
      const vel = b[i++];
      notes.push({ tick, on: (st & 0xf0) === 0x90 && vel > 0, note, vel });
    }
  }
  return { ppq, tempo, program, notes, markers, ended, consumed: i === end };
}

describe('sequencer', () => {
  it('ogni ritmo produce note dentro la durata della progressione', () => {
    for (const p of Object.keys(PATTERNS) as Pattern[]) {
      const s = renderSequence([{ midis: C, bars: 1 }, { midis: G, bars: 0.5 }], p);
      expect(s.totalBeats).toBe(6);
      expect(s.chordStarts).toEqual([0, 4]);
      expect(s.events.length, p).toBeGreaterThan(0);
      for (const e of s.events) {
        expect(e.beat + e.length, p).toBeLessThanOrEqual(6.0001);
        expect(e.velocity).toBeGreaterThan(0);
        expect(e.velocity).toBeLessThanOrEqual(127);
        const notes = e.chord === 0 ? C : G;
        expect(notes).toContain(e.midi);
      }
    }
  });
  it('è deterministico', () => {
    const a = renderSequence([{ midis: C, bars: 1 }], 'strum');
    const b = renderSequence([{ midis: C, bars: 1 }], 'strum');
    expect(a).toEqual(b);
  });
  it('la pennata in giù va dal basso all\'acuto', () => {
    const s = renderSequence([{ midis: C, bars: 1 }], 'pad');
    const first = s.events.filter((e) => e.beat === 0).sort((x, y) => x.offset - y.offset).map((e) => e.midi);
    expect(first[0]).toBe(48);
  });
  it('gli ottavi rock sono stoppati sulle corde gravi', () => {
    const s = renderSequence([{ midis: [40, 47, 52], bars: 1 }], 'eighths');
    expect(s.events.every((e) => e.muted)).toBe(true);
    expect(s.events.length).toBe(24);
  });
});

describe('file MIDI', () => {
  it('scrive un SMF valido con tempo, programma, marker e note bilanciate', () => {
    const s = renderSequence([{ midis: C, bars: 1 }, { midis: G, bars: 1 }], 'strum');
    const bytes = buildMidiFile(s.events, { bpm: 120, program: 25, name: 'Test', markers: [[0, 'C'], [4, 'G']] });
    const m = parseMidi(bytes);
    expect(m.ppq).toBe(PPQ);
    expect(m.tempo).toBe(500000);
    expect(m.program).toBe(25);
    expect(m.markers).toEqual(['C', 'G']);
    expect(m.ended && m.consumed).toBe(true);
    const ons = m.notes.filter((n) => n.on).length;
    const offs = m.notes.filter((n) => !n.on).length;
    expect(ons).toBe(s.events.length);
    expect(offs).toBe(ons);
    // nessuna nota resta "appesa": ogni note-on ha il suo note-off dopo
    const open = new Map<number, number>();
    for (const n of m.notes) {
      if (n.on) {
        expect(open.has(n.note), `nota ${n.note} ribattuta prima del note-off`).toBe(false);
        open.set(n.note, n.tick);
      } else {
        expect(open.has(n.note)).toBe(true);
        open.delete(n.note);
      }
    }
    expect(open.size).toBe(0);
  });
  it('accorcia le note ribattute sulla stessa altezza', () => {
    const n = normalizeEvents([
      { beat: 0, offset: 0, midi: 60, velocity: 90, length: 4, muted: false, chord: 0 },
      { beat: 1, offset: 0, midi: 60, velocity: 90, length: 1, muted: false, chord: 0 },
    ], 120);
    expect(n[0].end).toBeLessThanOrEqual(1);
  });
});
