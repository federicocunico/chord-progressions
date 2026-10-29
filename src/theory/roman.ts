import { type Note, transpose, MAJOR_STEPS, simplify, parseNote, pc, mod } from './notes';
import { type Chord, type QualityId, QUALITIES } from './chords';
import { type ModeId, MODES, scalePcs } from './scales';

export interface Degree {
  acc: number; // -1 bemolle, +1 diesis (rispetto alla scala maggiore)
  degree: number; // 1..7
  /** Solo per i bersagli dei secondari: scrivere il numerale minuscolo (V/vi). */
  lower?: boolean;
}

export interface RomanChord extends Degree {
  quality: QualityId;
  /** Accordo secondario: `V7/vi` → target = vi. */
  target?: Degree;
  /** Basso come grado della tonalità: `I/3`. */
  bass?: Degree;
}

export interface Key {
  tonic: Note;
  mode: ModeId;
}

export function makeKey(tonic: string, mode: ModeId): Key {
  return { tonic: parseNote(tonic), mode };
}

const UPPER = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const LOWER = UPPER.map((s) => s.toLowerCase());

const UPPER_SUFFIX: Record<string, QualityId> = {
  '': 'maj', '7': '7', maj7: 'maj7', M7: 'maj7', 'Δ': 'maj7', '6': '6', '69': '69', add9: 'add9',
  '9': '9', maj9: 'maj9', '13': '13', '7b9': '7b9', '7#9': '7#9', sus2: 'sus2', sus4: 'sus4',
  sus: 'sus4', '7sus4': '7sus4', '+': 'aug', aug: 'aug', '7#5': '7#5', 'maj7#11': 'maj7#11', '5': '5',
};
const LOWER_SUFFIX: Record<string, QualityId> = {
  '': 'min', '7': 'm7', '9': 'm9', '11': 'm11', '6': 'm6', add9: 'madd9', maj7: 'mMaj7',
  '°': 'dim', o: 'dim', dim: 'dim', '°7': 'dim7', o7: 'dim7', dim7: 'dim7',
  'ø7': 'm7b5', 'ø': 'm7b5', h7: 'm7b5', m7b5: 'm7b5', '5': '5',
};

const NUM_RE = /^([b#♭♯]?)(VII|VI|V|IV|III|II|I|vii|vi|v|iv|iii|ii|i)(.*)$/;
const BASS_RE = /^([b#♭♯]?)([1-7])$/;

function parseAcc(a: string): number {
  if (a === 'b' || a === '♭') return -1;
  if (a === '#' || a === '♯') return 1;
  return 0;
}

function parseDegreeOnly(s: string): Degree | null {
  const m = NUM_RE.exec(s);
  if (!m || m[3] !== '') return null;
  const upperIdx = UPPER.indexOf(m[2]);
  const idx = upperIdx >= 0 ? upperIdx : LOWER.indexOf(m[2]);
  return { acc: parseAcc(m[1]), degree: idx + 1, lower: upperIdx < 0 };
}

export function parseRoman(input: string): RomanChord {
  const s = input.trim();
  // separa al primo "/" che non fa parte di "6/9"
  const slash = s.indexOf('/');
  const head = slash >= 0 ? s.slice(0, slash) : s;
  const tail = slash >= 0 ? s.slice(slash + 1) : undefined;
  const m = NUM_RE.exec(head);
  if (!m) throw new Error(`Numerale non valido: "${input}"`);
  const isUpper = UPPER.includes(m[2]);
  const degree = (isUpper ? UPPER.indexOf(m[2]) : LOWER.indexOf(m[2])) + 1;
  const table = isUpper ? UPPER_SUFFIX : LOWER_SUFFIX;
  const quality = table[m[3]];
  if (!quality) throw new Error(`Qualità non valida "${m[3]}" in "${input}"`);
  const rc: RomanChord = { acc: parseAcc(m[1]), degree, quality };
  if (tail !== undefined) {
    const bm = BASS_RE.exec(tail);
    if (bm) rc.bass = { acc: parseAcc(bm[1]), degree: Number(bm[2]) };
    else {
      const t = parseDegreeOnly(tail);
      if (!t) throw new Error(`Bersaglio non valido "${tail}" in "${input}"`);
      rc.target = t;
    }
  }
  return rc;
}

export function formatDegree(d: Degree, lower: boolean, ascii = true): string {
  const acc = d.acc === 0 ? '' : d.acc < 0 ? (ascii ? 'b' : '♭') : ascii ? '#' : '♯';
  return acc + (lower ? LOWER : UPPER)[d.degree - 1];
}

export function formatRoman(rc: RomanChord, ascii = true): string {
  const q = QUALITIES[rc.quality];
  let suffix = q.roman;
  if (!ascii) suffix = suffix.replace('b', '♭').replace('#', '♯');
  let s = formatDegree(rc, q.lower, ascii) + suffix;
  if (rc.target) s += '/' + formatDegree(rc.target, !!rc.target.lower, ascii);
  if (rc.bass) s += '/' + (rc.bass.acc ? (rc.bass.acc < 0 ? (ascii ? 'b' : '♭') : ascii ? '#' : '♯') : '') + rc.bass.degree;
  return s;
}

/** Display "bello" per l'interfaccia (♭, ♯, numerali secondari con il bersaglio adattato al caso). */
export function prettyRoman(s: string | RomanChord): string {
  const rc = typeof s === 'string' ? parseRoman(s) : s;
  return formatRoman(rc, false);
}

export function degreeRoot(key: Key, d: Degree): Note {
  return transpose(key.tonic, d.degree - 1, MAJOR_STEPS[d.degree - 1] + d.acc);
}

function prefersFlats(key: Key): boolean {
  if (key.tonic.acc < 0) return true;
  if (key.tonic.acc > 0) return false;
  // F maggiore e le minori con bemolli in chiave
  const flatMinors = [1, 3, 4, 0]; // D, F, G, C
  if (key.tonic.letter === 3) return true;
  return MODES[key.mode].tonality === 'minor' && flatMinors.includes(key.tonic.letter);
}

export function realize(rc: RomanChord, key: Key): Chord {
  const flats = prefersFlats(key);
  let root: Note;
  if (rc.target) {
    const t = degreeRoot(key, rc.target);
    root = transpose(t, rc.degree - 1, MAJOR_STEPS[rc.degree - 1] + rc.acc);
  } else {
    root = degreeRoot(key, rc);
  }
  const chord: Chord = { root: simplify(root, flats), quality: rc.quality };
  if (rc.bass) chord.bass = simplify(degreeRoot(key, rc.bass), flats);
  return chord;
}

export function realizeAll(numerals: (string | RomanChord)[], key: Key): Chord[] {
  return numerals.map((n) => realize(typeof n === 'string' ? parseRoman(n) : n, key));
}

/** Semitoni della fondamentale dalla tonica. */
export function rootOffset(rc: RomanChord): number {
  const base = MAJOR_STEPS[rc.degree - 1] + rc.acc;
  if (!rc.target) return mod(base, 12);
  return mod(MAJOR_STEPS[rc.target.degree - 1] + rc.target.acc + base, 12);
}

/** Tutte le note dell'accordo appartengono alla scala della modalità? */
export function isDiatonic(rc: RomanChord, key: Key): boolean {
  const scale = new Set(scalePcs(pc(key.tonic), MODES[key.mode].scale));
  const ch = realize(rc, key);
  return QUALITIES[ch.quality].tones.every(([s]) => scale.has(mod(pc(ch.root) + s, 12)));
}

/** Riduce un accordo alla sua triade "scheletro" (per statistiche e generatore). */
export function skeleton(rc: RomanChord): RomanChord {
  const fam = QUALITIES[rc.quality].family;
  let quality: QualityId;
  if (fam === 'minor') quality = 'min';
  else if (fam === 'diminished') quality = 'dim';
  else if (rc.quality === 'aug') quality = 'aug';
  else quality = 'maj';
  const out: RomanChord = { acc: rc.acc, degree: rc.degree, quality };
  if (rc.target) out.target = { ...rc.target };
  return out;
}

export function skeletonToken(n: string | RomanChord): string {
  return formatRoman(skeleton(typeof n === 'string' ? parseRoman(n) : n));
}

export function sameRoman(a: RomanChord, b: RomanChord): boolean {
  return formatRoman(a) === formatRoman(b);
}

/** Converte un secondario (V/vi) in un numerale diretto (III), utile per confronti. */
export function flattenSecondary(rc: RomanChord): RomanChord {
  if (!rc.target) return rc;
  const off = rootOffset(rc);
  const letterDeg = mod(rc.target.degree - 1 + rc.degree - 1, 7) + 1;
  const acc = off - MAJOR_STEPS[letterDeg - 1];
  const norm = acc > 6 ? acc - 12 : acc < -6 ? acc + 12 : acc;
  return { acc: norm, degree: letterDeg, quality: rc.quality, bass: rc.bass };
}
