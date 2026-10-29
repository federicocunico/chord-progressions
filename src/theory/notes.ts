/**
 * Note, altezze e ortografia.
 * Una nota è una lettera (0=C … 6=B) più un'alterazione (−2…+2).
 */

export interface Note {
  letter: number; // 0..6 → C D E F G A B
  acc: number; // -2..2 (bemolli negativi, diesis positivi)
}

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
export const LATIN_LETTERS = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'] as const;
export const LETTER_PC = [0, 2, 4, 5, 7, 9, 11] as const;
/** Scala maggiore: semitoni dalla tonica per i gradi 1..7 (indice 0..6). */
export const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11] as const;

export type Notation = 'english' | 'latin';

let currentNotation: Notation = 'english';
export function setNotation(n: Notation): void {
  currentNotation = n;
}
export function getNotation(): Notation {
  return currentNotation;
}

export const mod = (n: number, m: number): number => ((n % m) + m) % m;

export function pc(note: Note): number {
  return mod(LETTER_PC[note.letter] + note.acc, 12);
}

export function accidentalString(acc: number, ascii = false): string {
  if (acc === 0) return '';
  const sharp = ascii ? '#' : '♯';
  const flat = ascii ? 'b' : '♭';
  return acc > 0 ? sharp.repeat(acc) : flat.repeat(-acc);
}

export function noteName(note: Note, notation: Notation = currentNotation, ascii = false): string {
  const base = notation === 'latin' ? LATIN_LETTERS[note.letter] : LETTERS[note.letter];
  return base + accidentalString(note.acc, ascii);
}

const NOTE_RE = /^([A-Ga-g])(#{1,2}|b{1,2}|♯|♭)?$/;

export function parseNote(s: string): Note {
  const m = NOTE_RE.exec(s.trim());
  if (!m) throw new Error(`Nota non valida: ${s}`);
  const letter = LETTERS.indexOf(m[1].toUpperCase() as (typeof LETTERS)[number]);
  const a = m[2] ?? '';
  let acc = 0;
  if (a.startsWith('#') || a === '♯') acc = a === '♯' ? 1 : a.length;
  else if (a.startsWith('b') || a === '♭') acc = a === '♭' ? -1 : -a.length;
  return { letter, acc };
}

/** Trasla una nota di `steps` lettere e `semis` semitoni mantenendo l'ortografia corretta. */
export function transpose(note: Note, steps: number, semis: number): Note {
  const letter = mod(note.letter + steps, 7);
  const targetPc = mod(pc(note) + semis, 12);
  let acc = targetPc - LETTER_PC[letter];
  if (acc > 6) acc -= 12;
  if (acc < -6) acc += 12;
  return { letter, acc };
}

/**
 * Semplifica doppie alterazioni e casi scomodi (E#, B#, Fb, Cb) per la lettura chitarristica.
 * Mantiene l'ortografia "di tonalità" quando è leggibile.
 */
export function simplify(note: Note, preferFlats = false): Note {
  const awkward =
    Math.abs(note.acc) >= 2 ||
    (note.acc === 1 && (note.letter === 2 || note.letter === 6)) || // E#, B#
    (note.acc === -1 && (note.letter === 3 || note.letter === 0)); // Fb, Cb
  if (!awkward) return note;
  return spellPc(pc(note), preferFlats);
}

const SHARP_SPELLING: Note[] = [
  { letter: 0, acc: 0 }, { letter: 0, acc: 1 }, { letter: 1, acc: 0 }, { letter: 1, acc: 1 },
  { letter: 2, acc: 0 }, { letter: 3, acc: 0 }, { letter: 3, acc: 1 }, { letter: 4, acc: 0 },
  { letter: 4, acc: 1 }, { letter: 5, acc: 0 }, { letter: 5, acc: 1 }, { letter: 6, acc: 0 },
];
const FLAT_SPELLING: Note[] = [
  { letter: 0, acc: 0 }, { letter: 1, acc: -1 }, { letter: 1, acc: 0 }, { letter: 2, acc: -1 },
  { letter: 2, acc: 0 }, { letter: 3, acc: 0 }, { letter: 4, acc: -1 }, { letter: 4, acc: 0 },
  { letter: 5, acc: -1 }, { letter: 5, acc: 0 }, { letter: 6, acc: -1 }, { letter: 6, acc: 0 },
];

export function spellPc(p: number, preferFlats = false): Note {
  return (preferFlats ? FLAT_SPELLING : SHARP_SPELLING)[mod(p, 12)];
}

/** Toniche proposte nell'interfaccia, con l'ortografia più comune per modo. */
export const TONICS_MAJOR = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
export const TONICS_MINOR = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

export function sameNote(a: Note, b: Note): boolean {
  return a.letter === b.letter && a.acc === b.acc;
}
