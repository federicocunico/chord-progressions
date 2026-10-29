import { type Note, transpose, pc, noteName, simplify, type Notation } from './notes';

/** [semitoni, passi di lettera] — es. terza maggiore = [4, 2]. */
export type Interval = readonly [number, number];

export type QualityId =
  | 'maj' | 'min' | 'dim' | 'aug' | '5' | 'sus2' | 'sus4'
  | 'add9' | 'madd9' | '6' | 'm6' | '69'
  | '7' | 'maj7' | 'm7' | 'mMaj7' | 'm7b5' | 'dim7' | '7sus4' | '7#5'
  | '9' | 'maj9' | 'm9' | '7b9' | '7#9' | '13' | 'm11' | 'maj7#11';

export type Family = 'major' | 'minor' | 'diminished' | 'augmented' | 'dominant' | 'suspended' | 'power';

export interface Quality {
  id: QualityId;
  /** Suffisso del simbolo (es. "m7"). */
  symbol: string;
  /** Nome italiano. */
  name: string;
  tones: readonly Interval[];
  family: Family;
  /** Il numerale romano si scrive minuscolo? */
  lower: boolean;
  /** Suffisso nel numerale romano. */
  roman: string;
  /** Semitoni che possono essere omessi nel voicing (di solito la quinta giusta, la nona negli accordi di 13ª). */
  optional: readonly number[];
}

const R: Interval = [0, 0];
const m3: Interval = [3, 2];
const M3: Interval = [4, 2];
const P5: Interval = [7, 4];
const d5: Interval = [6, 4];
const A5: Interval = [8, 4];
const M2: Interval = [2, 1];
const P4: Interval = [5, 3];
const M6: Interval = [9, 5];
const d7: Interval = [9, 6];
const m7: Interval = [10, 6];
const M7: Interval = [11, 6];
const M9: Interval = [14, 1];
const m9: Interval = [13, 1];
const A9: Interval = [15, 1];
const P11: Interval = [17, 3];
const A11: Interval = [18, 3];
const M13: Interval = [21, 5];

const Q = (
  id: QualityId, symbol: string, name: string, tones: Interval[], family: Family,
  lower: boolean, roman: string, optional: number[] = [7],
): Quality => ({ id, symbol, name, tones, family, lower, roman, optional });

export const QUALITIES: Record<QualityId, Quality> = {
  maj: Q('maj', '', 'maggiore', [R, M3, P5], 'major', false, '', []),
  min: Q('min', 'm', 'minore', [R, m3, P5], 'minor', true, '', []),
  dim: Q('dim', '°', 'diminuito', [R, m3, d5], 'diminished', true, '°', []),
  aug: Q('aug', '+', 'aumentato', [R, M3, A5], 'augmented', false, '+', []),
  '5': Q('5', '5', 'power chord (bicordo)', [R, P5], 'power', false, '5', []),
  sus2: Q('sus2', 'sus2', 'sospeso di seconda', [R, M2, P5], 'suspended', false, 'sus2', []),
  sus4: Q('sus4', 'sus4', 'sospeso di quarta', [R, P4, P5], 'suspended', false, 'sus4', []),
  add9: Q('add9', 'add9', 'maggiore con nona aggiunta', [R, M3, P5, M9], 'major', false, 'add9'),
  madd9: Q('madd9', 'm(add9)', 'minore con nona aggiunta', [R, m3, P5, M9], 'minor', true, 'add9'),
  '6': Q('6', '6', 'maggiore con sesta', [R, M3, P5, M6], 'major', false, '6'),
  m6: Q('m6', 'm6', 'minore con sesta', [R, m3, P5, M6], 'minor', true, '6'),
  '69': Q('69', '6/9', 'sei-nove', [R, M3, P5, M6, M9], 'major', false, '69'),
  '7': Q('7', '7', 'settima di dominante', [R, M3, P5, m7], 'dominant', false, '7'),
  maj7: Q('maj7', 'maj7', 'settima maggiore', [R, M3, P5, M7], 'major', false, 'maj7'),
  m7: Q('m7', 'm7', 'minore settima', [R, m3, P5, m7], 'minor', true, '7'),
  mMaj7: Q('mMaj7', 'm(maj7)', 'minore con settima maggiore', [R, m3, P5, M7], 'minor', true, 'maj7'),
  m7b5: Q('m7b5', 'm7♭5', 'semidiminuito', [R, m3, d5, m7], 'diminished', true, 'ø7', []),
  dim7: Q('dim7', '°7', 'diminuito settima', [R, m3, d5, d7], 'diminished', true, '°7', []),
  '7sus4': Q('7sus4', '7sus4', 'settima sospesa', [R, P4, P5, m7], 'dominant', false, '7sus4'),
  '7#5': Q('7#5', '7♯5', 'settima aumentata', [R, M3, A5, m7], 'dominant', false, '7#5', []),
  '9': Q('9', '9', 'nona di dominante', [R, M3, P5, m7, M9], 'dominant', false, '9'),
  maj9: Q('maj9', 'maj9', 'nona maggiore', [R, M3, P5, M7, M9], 'major', false, 'maj9'),
  m9: Q('m9', 'm9', 'minore nona', [R, m3, P5, m7, M9], 'minor', true, '9'),
  '7b9': Q('7b9', '7♭9', 'settima con nona bemolle', [R, M3, P5, m7, m9], 'dominant', false, '7b9'),
  '7#9': Q('7#9', '7♯9', 'settima con nona diesis ("accordo di Hendrix")', [R, M3, P5, m7, A9], 'dominant', false, '7#9'),
  '13': Q('13', '13', 'tredicesima di dominante', [R, M3, P5, m7, M9, M13], 'dominant', false, '13', [7, 14]),
  m11: Q('m11', 'm11', 'minore undicesima', [R, m3, P5, m7, M9, P11], 'minor', true, '11', [7, 14]),
  'maj7#11': Q('maj7#11', 'maj7♯11', 'settima maggiore con undicesima aumentata (lidio)', [R, M3, P5, M7, A11], 'major', false, 'maj7#11'),
};

export interface Chord {
  root: Note;
  quality: QualityId;
  bass?: Note;
}

export function chordTones(ch: Chord): Note[] {
  return QUALITIES[ch.quality].tones.map(([s, l]) => simplify(transpose(ch.root, l, s), ch.root.acc < 0));
}

export function chordPcs(ch: Chord): number[] {
  const set = new Set(chordTones(ch).map(pc));
  if (ch.bass) set.add(pc(ch.bass));
  return [...set];
}

export function chordSymbol(ch: Chord, notation?: Notation, ascii = false): string {
  let sym = QUALITIES[ch.quality].symbol;
  if (ascii) sym = sym.replace(/♭/g, 'b').replace(/♯/g, '#');
  // In notazione latina il minore si scrive spesso "m" (Lam): manteniamo lo stesso suffisso.
  let s = noteName(ch.root, notation, ascii) + sym;
  if (ch.bass) s += '/' + noteName(ch.bass, notation, ascii);
  return s;
}

export function isDominantLike(q: QualityId): boolean {
  return QUALITIES[q].family === 'dominant';
}

/** Note in comune tra due accordi (pitch class). */
export function commonTones(a: Chord, b: Chord): number {
  const sa = new Set(chordPcs(a));
  return chordPcs(b).filter((p) => sa.has(p)).length;
}
