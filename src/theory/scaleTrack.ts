import { type Note, pc, mod, noteName } from './notes';
import { chordTones } from './chords';
import { MODES, scaleNotes, scalePcs, type ScaleId } from './scales';
import { type Key, type RomanChord, parseRoman, realize } from './roman';

/**
 * "Corsia della scala": per ogni accordo, la scala in vigore mentre suona.
 * Si parte dalla scala della tonalità e si cambiano solo le note che l'accordo altera
 * (la regola della minima modifica): così si vede subito quale nota cambia e perché.
 */

export type ScaleReason = 'key' | 'borrowed' | 'secondary' | 'leading' | 'chromatic';

export interface ScaleChange {
  index: number;
  from: Note;
  to: Note;
}

export interface ScaleContext {
  /** Le sette note in vigore, a partire dalla tonica. */
  notes: Note[];
  /** Indici (in `notes`) delle note che appartengono all'accordo. */
  chordIdx: number[];
  changes: ScaleChange[];
  reason: ScaleReason;
  /** Nome della scala risultante se è una scala nota ("La minore armonica"), altrimenti null. */
  named: string | null;
  /** Identità per riconoscere accordi consecutivi nella stessa scala. */
  id: string;
}

/** Nomi brevi al femminile/maschile come si dicono in italiano dopo la tonica. */
const SHORT: Partial<Record<ScaleId, string>> = {
  major: 'maggiore', minor: 'minore', dorian: 'dorico', phrygian: 'frigio', lydian: 'lidio',
  mixolydian: 'misolidio', locrian: 'locrio', harmonicMinor: 'minore armonica', melodicMinor: 'minore melodica',
  phrygianDominant: 'frigio dominante',
};
/** Scale a 7 note che sanno dare un nome a un insieme alterato. */
const EXTRA: { name: string; steps: number[] }[] = [
  { name: 'maggiore armonica', steps: [0, 2, 4, 5, 7, 8, 11] },
];

/** Nome della scala formata da `notes`: prima sulla tonica della tonalità, poi su ogni altra nota (es. "La minore armonica"). */
function nameFor(tonic: Note, notes: Note[], target?: Note): string | null {
  const key = notes.map(pc).sort((a, b) => a - b).join();
  const first = target ?? tonic;
  const tonics = [first, ...notes.filter((n) => pc(n) !== pc(first))];
  const order: ScaleId[] = ['major', 'minor', 'harmonicMinor', 'melodicMinor', 'mixolydian', 'dorian', 'lydian', 'phrygian', 'phrygianDominant', 'locrian'];
  const matches = (t: number, id: ScaleId) => scalePcs(t, id).sort((a, b) => a - b).join() === key;
  // prima un modo della stessa tonica ("Do misolidio"), poi altre toniche col tipo di scala più comune
  // (per una dominante secondaria conta invece la tonalità verso cui punta: [V/V] → "Sol maggiore")
  if (!target) for (const id of order) if (matches(pc(tonic), id)) return `${noteName(tonic)} ${SHORT[id]}`;
  // Sol♯ in Do dà "La minore armonica", non "Mi frigio dominante"
  for (const id of order) {
    const tn = tonics.find((x) => scalePcs(pc(x), id).sort((a, b) => a - b).join() === key);
    if (tn) return `${noteName(tn)} ${SHORT[id]}`;
  }
  for (const e of EXTRA) {
    const tn = tonics.find((x) => e.steps.map((st) => mod(pc(x) + st, 12)).sort((a, b) => a - b).join() === key);
    if (tn) return `${noteName(tn)} ${e.name}`;
  }
  return null;
}

export function keyScaleName(key: Key): string {
  const mode = MODES[key.mode];
  return `${noteName(key.tonic)} ${SHORT[mode.scale] ?? mode.name.toLowerCase()}`;
}

export function scaleContext(input: string | RomanChord, key: Key): ScaleContext {
  const rc = typeof input === 'string' ? parseRoman(input) : input;
  const chord = realize(rc, key);
  const mode = MODES[key.mode];
  const base = scaleNotes(key.tonic, mode.scale);
  const notes = base.slice();
  const changes: ScaleChange[] = [];
  const chordIdx = new Set<number>();

  for (const t of chordTones(chord)) {
    const same = notes.findIndex((n) => pc(n) === pc(t));
    if (same >= 0) { chordIdx.add(same); continue; }
    const i = notes.findIndex((n) => n.letter === t.letter);
    // nessuna nota con la stessa lettera, o già alterata da un'altra nota dell'accordo: la scala non la rappresenta
    if (i < 0 || changes.some((c) => c.index === i)) continue;
    changes.push({ index: i, from: base[i], to: t });
    notes[i] = t;
    chordIdx.add(i);
  }

  let reason: ScaleReason = 'key';
  if (changes.length) {
    const tpc = pc(key.tonic);
    const parallel = scalePcs(tpc, mode.tonality === 'major' ? 'minor' : 'major');
    const raisedSeventh = changes.length === 1 && changes[0].index === 6 && mod(pc(changes[0].to) - pc(changes[0].from), 12) === 1;
    if (rc.target) reason = 'secondary';
    else if (mode.tonality === 'minor' && raisedSeventh) reason = 'leading';
    else if (changes.every((c) => parallel.includes(pc(c.to)))) reason = 'borrowed';
    else reason = 'chromatic';
  }
  const set = notes.map(pc);
  return {
    notes,
    chordIdx: [...chordIdx].sort((a, b) => a - b),
    changes,
    reason,
    named: changes.length ? nameFor(key.tonic, notes, rc.target ? realize({ ...rc.target, quality: 'maj' }, key).root : undefined) : keyScaleName(key),
    id: set.join(','),
  };
}

/** Testo breve per spiegare il cambio di scala a chi non conosce la teoria. */
export function scaleChangeText(ctx: ScaleContext, key: Key): string {
  const list = ctx.changes.map((c) => `${noteName(c.from)} → ${noteName(c.to)}`).join(', ');
  const parallel = `${noteName(key.tonic)} ${MODES[key.mode].tonality === 'major' ? 'minore' : 'maggiore'}`;
  switch (ctx.reason) {
    case 'key': return 'Tutte le note della tonalità: nessun cambio.';
    case 'borrowed': return `Prestito: ${list}, nota presa da ${parallel}. Poi si torna alla scala di partenza.`;
    case 'secondary': return `Dominante secondaria: ${list} è una nota "sensibile" che spinge verso l'accordo successivo.`;
    case 'leading': return `Sensibile: ${list} rende la tensione più forte e chiede di tornare alla tonica (scala minore armonica).`;
    default: return `Cromatismo: ${list}, una nota fuori dalla tonalità per dare colore.`;
  }
}

/**
 * Unisce due accordi in prestito consecutivi in un'unica regione (♭VI–♭VII → "Do minore"),
 * così la corsia non "sfarfalla" tra due scale. Restituisce null se le alterazioni sono in conflitto.
 */
export function mergeBorrowed(a: ScaleContext, b: ScaleContext, key: Key): ScaleContext | null {
  if (a.reason !== 'borrowed' || b.reason !== 'borrowed') return null;
  const notes = a.notes.slice();
  const changes = a.changes.slice();
  for (const c of b.changes) {
    const prev = changes.find((x) => x.index === c.index);
    if (prev) { if (pc(prev.to) !== pc(c.to)) return null; continue; }
    changes.push(c);
    notes[c.index] = c.to;
  }
  changes.sort((x, y) => x.index - y.index);
  return { notes, chordIdx: [], changes, reason: 'borrowed', named: nameFor(key.tonic, notes), id: notes.map(pc).join(',') };
}
