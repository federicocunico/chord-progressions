import type { QualityId } from '../theory/chords';

/** Accordatura standard, dalla 6ª corda (Mi basso) alla 1ª (Mi cantino). */
export const OPEN_MIDI = [40, 45, 50, 55, 59, 64] as const;
export const OPEN_PC = OPEN_MIDI.map((m) => m % 12);
export const STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'e'];

export type ShapeKind = 'open' | 'barre' | 'movable' | 'power' | 'shell' | 'generic';

export interface MovableShape {
  quality: QualityId;
  /** Corda della fondamentale: 0 = 6ª, 1 = 5ª, 2 = 4ª. */
  rootString: 0 | 1 | 2;
  /** Offset dei tasti rispetto al tasto della fondamentale; null = corda muta. */
  pattern: (number | null)[];
  family: 'E' | 'A' | 'D' | 'C' | 'power' | 'shell';
  difficulty: number;
}

export interface OpenShape {
  name: string; // es. "C", "Am", "G/B" — solo per riferimento
  root: number; // pitch class della fondamentale
  quality: QualityId;
  bass?: number; // pitch class del basso se diverso
  frets: (number | null)[];
  difficulty: number;
}

const x = null;
const M = (
  quality: QualityId, rootString: 0 | 1 | 2, family: MovableShape['family'], difficulty: number,
  ...pattern: (number | null)[]
): MovableShape => ({ quality, rootString, family, difficulty, pattern });

/** Forme mobili (sistema CAGED + power chord + shell jazz). */
export const MOVABLE_SHAPES: MovableShape[] = [
  // ── Forma di Mi (fondamentale sulla 6ª corda)
  M('maj', 0, 'E', 2.2, 0, 2, 2, 1, 0, 0),
  M('min', 0, 'E', 2.2, 0, 2, 2, 0, 0, 0),
  M('7', 0, 'E', 2.2, 0, 2, 0, 1, 0, 0),
  M('m7', 0, 'E', 2.0, 0, 2, 0, 0, 0, 0),
  M('maj7', 0, 'E', 1.8, 0, x, 1, 1, 0, x),
  M('m7b5', 0, 'E', 1.8, 0, x, 0, 0, -1, x),
  M('dim7', 0, 'E', 1.8, 0, x, -1, 0, -1, x),
  M('sus4', 0, 'E', 2.4, 0, 2, 2, 2, 0, 0),
  M('7sus4', 0, 'E', 2.4, 0, 2, 0, 2, 0, 0),
  M('6', 0, 'E', 1.9, 0, x, -1, 1, 0, x),
  M('m6', 0, 'E', 1.9, 0, x, -1, 0, 0, x),
  M('13', 0, 'E', 1.9, 0, x, 0, 1, 2, x),
  M('mMaj7', 0, 'E', 1.9, 0, x, 1, 0, 0, x),
  M('dim', 0, 'E', 1.8, 0, x, 2, 0, -1, x),
  M('aug', 0, 'E', 1.9, 0, x, 2, 1, 1, x),
  M('7#5', 0, 'E', 1.9, 0, x, 0, 1, 1, x),
  M('9', 0, 'E', 2.4, 0, x, 0, 1, 0, 2),
  // ── Forma di La (fondamentale sulla 5ª corda)
  M('maj', 1, 'A', 2.1, x, 0, 2, 2, 2, 0),
  M('min', 1, 'A', 2.1, x, 0, 2, 2, 1, 0),
  M('7', 1, 'A', 2.1, x, 0, 2, 0, 2, 0),
  M('m7', 1, 'A', 1.9, x, 0, 2, 0, 1, 0),
  M('maj7', 1, 'A', 2.0, x, 0, 2, 1, 2, 0),
  M('m7b5', 1, 'A', 1.7, x, 0, 1, 0, 1, x),
  M('dim7', 1, 'A', 1.8, x, 0, 1, -1, 1, x),
  M('dim', 1, 'A', 1.8, x, 0, 1, 2, 1, x),
  M('sus4', 1, 'A', 2.2, x, 0, 2, 2, 3, 0),
  M('sus2', 1, 'A', 2.0, x, 0, 2, 2, 0, 0),
  M('7sus4', 1, 'A', 2.2, x, 0, 2, 0, 3, 0),
  M('6', 1, 'A', 2.2, x, 0, 2, 2, 2, 2),
  M('9', 1, 'A', 1.7, x, 0, -1, 0, 0, 0),
  M('m9', 1, 'A', 1.8, x, 0, -2, 0, 0, x),
  M('maj9', 1, 'A', 1.8, x, 0, -1, 1, 0, x),
  M('7#9', 1, 'A', 1.8, x, 0, -1, 0, 1, x),
  M('7b9', 1, 'A', 1.8, x, 0, -1, 0, -1, x),
  M('69', 1, 'A', 1.9, x, 0, -1, -1, 0, 0),
  M('aug', 1, 'A', 1.8, x, 0, -1, -2, -2, x),
  M('add9', 1, 'A', 2.6, x, 0, 2, 4, 2, x),
  M('madd9', 1, 'A', 2.6, x, 0, 2, 4, 1, x),
  M('mMaj7', 1, 'A', 2.0, x, 0, 2, 1, 1, 0),
  M('m6', 1, 'A', 2.1, x, 0, x, -1, 1, 0),
  M('13', 1, 'A', 2.2, x, 0, x, 0, 2, 2),
  M('m11', 1, 'A', 1.9, x, 0, 0, 0, 1, x),
  M('maj7#11', 1, 'A', 2.2, x, 0, 1, 1, 2, x),
  // ── Forma di Re (fondamentale sulla 4ª corda)
  M('maj', 2, 'D', 1.6, x, x, 0, 2, 3, 2),
  M('min', 2, 'D', 1.6, x, x, 0, 2, 3, 1),
  M('7', 2, 'D', 1.6, x, x, 0, 2, 1, 2),
  M('maj7', 2, 'D', 1.5, x, x, 0, 2, 2, 2),
  M('m7', 2, 'D', 1.5, x, x, 0, 2, 1, 1),
  M('m7b5', 2, 'D', 1.4, x, x, 0, 1, 1, 1),
  M('dim7', 2, 'D', 1.5, x, x, 0, 1, 0, 1),
  M('dim', 2, 'D', 1.6, x, x, 0, 1, 3, 1),
  M('sus4', 2, 'D', 1.6, x, x, 0, 2, 3, 3),
  M('sus2', 2, 'D', 1.6, x, x, 0, 2, 3, 0),
  M('6', 2, 'D', 1.6, x, x, 0, 2, 0, 2),
  M('m6', 2, 'D', 1.6, x, x, 0, 2, 0, 1),
  M('aug', 2, 'D', 1.6, x, x, 0, 3, 3, 2),
  // ── Power chord
  M('5', 0, 'power', 0.5, 0, 2, 2, x, x, x),
  M('5', 0, 'power', 0.55, 0, 2, x, x, x, x),
  M('5', 1, 'power', 0.5, x, 0, 2, 2, x, x),
  M('5', 1, 'power', 0.55, x, 0, 2, x, x, x),
  M('5', 2, 'power', 0.8, x, x, 0, 2, 3, x),
  // ── Shell jazz (fondamentale, terza, settima)
  M('maj7', 0, 'shell', 1.1, 0, x, 1, 1, x, x),
  M('7', 0, 'shell', 1.1, 0, x, 0, 1, x, x),
  M('m7', 0, 'shell', 1.1, 0, x, 0, 0, x, x),
  M('6', 0, 'shell', 1.2, 0, x, -1, 1, x, x),
  M('m6', 0, 'shell', 1.2, 0, x, -1, 0, x, x),
  M('maj7', 1, 'shell', 1.1, x, 0, x, 1, 2, x),
  M('7', 1, 'shell', 1.1, x, 0, x, 0, 2, x),
  M('m7', 1, 'shell', 1.1, x, 0, x, 0, 1, x),
];

const O = (name: string, root: number, quality: QualityId, difficulty: number, frets: (number | null)[], bass?: number): OpenShape =>
  ({ name, root, quality, difficulty, frets, bass });

// pitch class: C0 C#1 D2 D#3 E4 F5 F#6 G7 G#8 A9 A#10 B11
/** Accordi aperti "da falò" e le loro varianti più comuni. */
export const OPEN_SHAPES: OpenShape[] = [
  O('C', 0, 'maj', 0.6, [x, 3, 2, 0, 1, 0]),
  O('A', 9, 'maj', 0.5, [x, 0, 2, 2, 2, 0]),
  O('G', 7, 'maj', 0.6, [3, 2, 0, 0, 0, 3]),
  O('G', 7, 'maj', 0.7, [3, 2, 0, 0, 3, 3]),
  O('E', 4, 'maj', 0.4, [0, 2, 2, 1, 0, 0]),
  O('D', 2, 'maj', 0.5, [x, x, 0, 2, 3, 2]),
  O('F', 5, 'maj', 1.2, [x, x, 3, 2, 1, 1]),
  O('Am', 9, 'min', 0.4, [x, 0, 2, 2, 1, 0]),
  O('Em', 4, 'min', 0.3, [0, 2, 2, 0, 0, 0]),
  O('Dm', 2, 'min', 0.5, [x, x, 0, 2, 3, 1]),
  O('A7', 9, '7', 0.4, [x, 0, 2, 0, 2, 0]),
  O('E7', 4, '7', 0.4, [0, 2, 0, 1, 0, 0]),
  O('D7', 2, '7', 0.5, [x, x, 0, 2, 1, 2]),
  O('G7', 7, '7', 0.6, [3, 2, 0, 0, 0, 1]),
  O('C7', 0, '7', 0.8, [x, 3, 2, 3, 1, 0]),
  O('B7', 11, '7', 0.9, [x, 2, 1, 2, 0, 2]),
  O('Cmaj7', 0, 'maj7', 0.4, [x, 3, 2, 0, 0, 0]),
  O('Amaj7', 9, 'maj7', 0.6, [x, 0, 2, 1, 2, 0]),
  O('Dmaj7', 2, 'maj7', 0.5, [x, x, 0, 2, 2, 2]),
  O('Emaj7', 4, 'maj7', 0.6, [0, 2, 1, 1, 0, 0]),
  O('Fmaj7', 5, 'maj7', 0.6, [x, x, 3, 2, 1, 0]),
  O('Gmaj7', 7, 'maj7', 0.7, [3, 2, 0, 0, 0, 2]),
  O('Am7', 9, 'm7', 0.3, [x, 0, 2, 0, 1, 0]),
  O('Em7', 4, 'm7', 0.2, [0, 2, 0, 0, 0, 0]),
  O('Em7', 4, 'm7', 0.4, [0, 2, 2, 0, 3, 0]),
  O('Dm7', 2, 'm7', 0.5, [x, x, 0, 2, 1, 1]),
  O('Bm7', 11, 'm7', 0.8, [x, 2, 0, 2, 0, 2]),
  O('Asus2', 9, 'sus2', 0.4, [x, 0, 2, 2, 0, 0]),
  O('Asus4', 9, 'sus4', 0.5, [x, 0, 2, 2, 3, 0]),
  O('Dsus2', 2, 'sus2', 0.4, [x, x, 0, 2, 3, 0]),
  O('Dsus4', 2, 'sus4', 0.5, [x, x, 0, 2, 3, 3]),
  O('Esus4', 4, 'sus4', 0.5, [0, 2, 2, 2, 0, 0]),
  O('Csus2', 0, 'sus2', 0.7, [x, 3, 0, 0, 3, 3]),
  O('Gsus4', 7, 'sus4', 0.8, [3, x, 0, 0, 1, 3]),
  O('A7sus4', 9, '7sus4', 0.4, [x, 0, 2, 0, 3, 0]),
  O('E7sus4', 4, '7sus4', 0.5, [0, 2, 0, 2, 0, 0]),
  O('D7sus4', 2, '7sus4', 0.6, [x, x, 0, 2, 1, 3]),
  O('Cadd9', 0, 'add9', 0.5, [x, 3, 2, 0, 3, 0]),
  O('Gadd9', 7, 'add9', 0.8, [3, 0, 0, 2, 0, 3]),
  O('Eadd9', 4, 'add9', 0.8, [0, 2, 2, 1, 0, 2]),
  O('Aadd9', 9, 'add9', 0.9, [x, 0, 2, 4, 2, 0]),
  O('Dadd9', 2, 'add9', 0.9, [x, 5, 4, 2, 3, 0]),
  O('Emadd9', 4, 'madd9', 0.6, [0, 2, 4, 0, 0, 0]),
  O('Amadd9', 9, 'madd9', 0.9, [x, 0, 2, 4, 1, 0]),
  O('C6', 0, '6', 0.8, [x, 3, 2, 2, 1, 0]),
  O('G6', 7, '6', 0.4, [3, 2, 0, 0, 0, 0]),
  O('A6', 9, '6', 0.6, [x, 0, 2, 2, 2, 2]),
  O('D6', 2, '6', 0.6, [x, x, 0, 2, 0, 2]),
  O('E6', 4, '6', 0.6, [0, 2, 2, 1, 2, 0]),
  O('Am6', 9, 'm6', 0.7, [x, 0, 2, 2, 1, 2]),
  O('Em6', 4, 'm6', 0.6, [0, 2, 2, 0, 2, 0]),
  O('Dm6', 2, 'm6', 0.6, [x, x, 0, 2, 0, 1]),
  O('E9', 4, '9', 0.8, [0, 2, 0, 1, 0, 2]),
  O('A9', 9, '9', 0.9, [x, 0, 2, 4, 2, 3]),
  O('E7#9', 4, '7#9', 1.0, [0, 7, 6, 7, 8, x]),
  O('Am9', 9, 'm9', 0.9, [x, 0, 5, 5, 5, 7]),
  O('Em9', 4, 'm9', 0.6, [0, 2, 0, 0, 0, 2]),
  O('Fmaj7#11', 5, 'maj7#11', 0.5, [x, x, 3, 2, 0, 0]),
  O('Cmaj9', 0, 'maj9', 0.7, [x, 3, 2, 4, 3, 0]),
  O('Bdim', 11, 'dim', 1.0, [x, 2, 3, 4, 3, x]),
  O('Bm7b5', 11, 'm7b5', 0.9, [x, 2, 3, 2, 3, x]),
  // Slash chord comuni (inversioni e bassi di passaggio)
  O('C/E', 0, 'maj', 0.8, [0, 3, 2, 0, 1, 0], 4),
  O('C/G', 0, 'maj', 0.9, [3, 3, 2, 0, 1, 0], 7),
  O('C/B', 0, 'maj', 1.0, [x, 2, 2, 0, 1, 0], 11),
  O('G/B', 7, 'maj', 0.6, [x, 2, 0, 0, 0, 3], 11),
  O('G/D', 7, 'maj', 0.7, [x, x, 0, 0, 0, 3], 2),
  O('G/F#', 7, 'maj', 0.9, [2, x, 0, 0, 0, 3], 6),
  O('D/F#', 2, 'maj', 1.0, [2, x, 0, 2, 3, 2], 6),
  O('D/A', 2, 'maj', 0.6, [x, 0, 0, 2, 3, 2], 9),
  O('D/C', 2, 'maj', 0.8, [x, 3, 0, 2, 3, 2], 0),
  O('A/E', 9, 'maj', 0.6, [0, 0, 2, 2, 2, 0], 4),
  O('A/C#', 9, 'maj', 1.1, [x, 4, 2, 2, 2, 0], 1),
  O('A/G', 9, 'maj', 0.9, [3, 0, 2, 2, 2, 0], 7),
  O('E/G#', 4, 'maj', 1.1, [4, x, 2, 1, 0, 0], 8),
  O('F/C', 5, 'maj', 1.3, [x, 3, 3, 2, 1, 1], 0),
  O('F/A', 5, 'maj', 1.0, [x, 0, 3, 2, 1, 1], 9),
  O('Am/G', 9, 'min', 0.8, [3, 0, 2, 2, 1, 0], 7),
  O('Am/C', 9, 'min', 0.8, [x, 3, 2, 2, 1, 0], 0),
  O('Am/E', 9, 'min', 0.5, [0, 0, 2, 2, 1, 0], 4),
  O('Am/F#', 9, 'min', 1.0, [2, 0, 2, 2, 1, 0], 6),
  O('Em/B', 4, 'min', 0.5, [x, 2, 2, 0, 0, 0], 11),
  O('Em/D', 4, 'min', 0.6, [x, x, 0, 0, 0, 0], 2),
  O('Em/G', 4, 'min', 0.8, [3, 2, 2, 0, 0, 0], 7),
  O('Dm/F', 2, 'min', 1.0, [1, x, 0, 2, 3, 1], 5),
  O('Dm/C', 2, 'min', 0.8, [x, 3, 0, 2, 3, 1], 0),
  O('E7/G#', 4, '7', 1.1, [4, x, 0, 1, 0, 0], 8),
  O('G7/B', 7, '7', 0.9, [x, 2, 0, 0, 0, 1], 11),
  O('C7/E', 0, '7', 1.0, [0, 3, 2, 3, 1, 0], 4),
  O('A7/C#', 9, '7', 1.3, [x, 4, 2, 2, 2, 3], 1),
];
