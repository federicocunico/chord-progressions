/**
 * Sequencer: trasforma diteggiature + ritmo in eventi nota (stile MIDI).
 * È puro (nessuna Web Audio API), così lo usano sia il player audio sia l'export MIDI.
 */

export type Pattern =
  | 'strum' | 'ballad' | 'arpeggio' | 'pad' | 'eighths' | 'gallop' | 'reggae' | 'bossa' | 'shuffle' | 'funk';

export const PATTERNS: Record<Pattern, string> = {
  strum: 'Strumming pop',
  ballad: 'Ballata',
  arpeggio: 'Arpeggio',
  pad: 'Un colpo per accordo',
  eighths: 'Ottavi stoppati (rock/punk)',
  gallop: 'Galoppata (metal)',
  reggae: 'Skank in levare (reggae)',
  bossa: 'Bossa nova',
  shuffle: 'Shuffle (blues)',
  funk: 'Funk (sedicesimi)',
};

export interface PlayChord {
  /** Note MIDI dalla corda più grave alla più acuta. */
  midis: number[];
  bars: number;
}

export interface NoteEvent {
  /** Inizio in beat (dall'inizio della sequenza). */
  beat: number;
  /** Ritardo aggiuntivo in secondi (pennata: le corde non suonano tutte insieme). */
  offset: number;
  midi: number;
  velocity: number; // 1..127
  /** Durata in beat. */
  length: number;
  /** Nota stoppata con il palmo (palm mute). */
  muted: boolean;
  chord: number;
}

export interface Sequence {
  events: NoteEvent[];
  /** Beat di inizio di ciascun accordo. */
  chordStarts: number[];
  totalBeats: number;
}

type Kind = 'down' | 'up' | 'bass' | 'treble' | 'low' | 'string';
interface Stroke {
  t: number; // beat nella battuta
  kind: Kind;
  vel: number;
  len: number; // beat
  muted?: boolean;
  string?: number; // per 'string': indice nella lista delle note
}

const S = (t: number, kind: Kind, vel: number, len: number, muted = false, string?: number): Stroke => ({ t, kind, vel, len, muted, string });

/** Colpi di una battuta da 4/4 per ciascun ritmo. */
function barStrokes(pattern: Pattern, n: number): Stroke[] {
  switch (pattern) {
    case 'pad':
      return [S(0, 'down', 96, 4)];
    case 'ballad':
      return [S(0, 'down', 100, 2), S(2, 'down', 80, 1), S(2.5, 'up', 62, 1), S(3.5, 'up', 58, 0.5)];
    case 'arpeggio': {
      const order = n >= 6 ? [0, 2, 3, 4, 5, 4, 3, 2] : n >= 4 ? [0, 1, 2, 3, n - 1, 2, 1, 2] : [0, 1, 2, 1, 0, 1, 2, 1];
      return order.map((s, e) => S(e / 2, 'string', e === 0 ? 92 : 72, 2.5, false, Math.min(s, n - 1)));
    }
    case 'eighths':
      return [0, 1, 2, 3, 4, 5, 6, 7].map((e) => S(e / 2, 'low', e % 2 ? 78 : 100, 0.4, true));
    case 'gallop':
      return [0, 1, 2, 3].flatMap((b) => [S(b, 'low', 108, 0.45, true), S(b + 0.5, 'low', 82, 0.22, true), S(b + 0.75, 'low', 86, 0.22, true)]);
    case 'reggae':
      return [S(0, 'bass', 90, 1.5), S(1, 'treble', 88, 0.28), S(3, 'treble', 88, 0.28), S(2.5, 'bass', 70, 0.5)];
    case 'bossa':
      return [S(0, 'bass', 92, 1), S(2, 'bass', 82, 1), S(0, 'treble', 70, 1), S(1.5, 'treble', 66, 0.9), S(2.5, 'treble', 64, 0.9), S(3.5, 'treble', 62, 0.5)];
    case 'shuffle':
      return [0, 1, 2, 3].flatMap((b) => [S(b, 'low', 100, 0.6), S(b + 2 / 3, 'low', 72, 0.3)]);
    case 'funk': {
      const acc = [1, 0, 0.6, 1, 0, 0.6, 1, 0.5, 1, 0, 0.6, 1, 0.5, 0.6, 1, 0];
      return acc.flatMap((a, i) => (a ? [S(i / 4, i % 2 ? 'up' : 'treble', Math.round(60 + a * 40), 0.18, a < 0.7)] : []));
    }
    default:
      return [S(0, 'down', 100, 1), S(1, 'down', 78, 0.5), S(1.5, 'up', 62, 1), S(2.5, 'up', 62, 0.5), S(3, 'down', 80, 0.5), S(3.5, 'up', 60, 0.5)];
  }
}

function stringsFor(kind: Kind, n: number, string?: number): number[] {
  const all = [...Array(n).keys()];
  switch (kind) {
    case 'up': return all.slice(-Math.max(3, Math.ceil(n / 2))).reverse();
    case 'bass': return [0];
    case 'treble': return n > 3 ? all.slice(-Math.min(4, n - 1)) : all;
    case 'low': return all.slice(0, Math.min(3, n));
    case 'string': return [string ?? 0];
    default: return all;
  }
}

/** Generatore pseudo-casuale deterministico per l'"umanizzazione". */
function rand(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function renderSequence(seq: PlayChord[], pattern: Pattern, seed = 7): Sequence {
  const r = rand(seed);
  const events: NoteEvent[] = [];
  const chordStarts: number[] = [];
  let beat = 0;
  seq.forEach((ch, ci) => {
    chordStarts.push(beat);
    const beats = Math.max(1, Math.round(ch.bars * 4));
    const n = ch.midis.length;
    for (let bar = 0; bar < beats; bar += 4) {
      for (const st of barStrokes(pattern, n)) {
        if (bar + st.t >= beats) continue;
        const strings = stringsFor(st.kind, n, st.string);
        const spread = st.kind === 'string' || st.kind === 'bass' ? 0 : st.kind === 'up' ? 0.009 : 0.012;
        const len = Math.min(st.len, beats - (bar + st.t)); // non oltre il cambio d'accordo
        strings.forEach((s, j) => {
          const midi = ch.midis[s];
          if (midi === undefined) return;
          const accent = j === 0 ? 0 : -3 * Math.min(j, 3); // le ultime corde della pennata suonano più piano
          events.push({
            beat: beat + bar + st.t,
            offset: j * spread + (r() - 0.5) * 0.008,
            midi,
            velocity: Math.max(1, Math.min(127, Math.round(st.vel + accent + (r() - 0.5) * 10))),
            length: len,
            muted: !!st.muted,
            chord: ci,
          });
        });
      }
    }
    beat += beats;
  });
  return { events, chordStarts, totalBeats: beat };
}
