import { type Note, pc, mod, noteName, spellPc } from './notes';
import { QUALITIES, chordPcs, chordTones, type Chord } from './chords';
import { MODES, SCALES, scalePcs, scaleNotes, type ScaleId } from './scales';
import {
  type RomanChord, type Key, parseRoman, realize, rootOffset, isDiatonic, formatRoman, formatDegree,
} from './roman';

export type HarmonicFunction = 'T' | 'S' | 'D';

export interface ChordAnalysis {
  fn: HarmonicFunction;
  secondary: boolean;
  borrowed: boolean;
  /** Descrizione breve: "Tonica", "Dominante secondaria → vi", … */
  label: string;
  tension: number; // 0..6
}

export const FUNCTION_NAMES: Record<HarmonicFunction, string> = {
  T: 'Tonica',
  S: 'Sottodominante',
  D: 'Dominante',
};

const toRc = (n: string | RomanChord): RomanChord => (typeof n === 'string' ? parseRoman(n) : n);

export function analyzeChord(input: string | RomanChord, key: Key): ChordAnalysis {
  const rc = toRc(input);
  const q = QUALITIES[rc.quality];
  const minorKey = MODES[key.mode].tonality === 'minor';
  const fam = q.family;
  const majorish = fam === 'major' || fam === 'dominant' || fam === 'augmented';

  if (rc.target) {
    const isPre = rc.degree === 2 || rc.degree === 4;
    const t = formatDegree(rc.target, !!rc.target.lower, false);
    return {
      fn: isPre ? 'S' : 'D',
      secondary: true,
      borrowed: false,
      label: isPre ? `Preparazione secondaria → [${t}]` : `Dominante secondaria → [${t}]`,
      tension: isPre ? 3.5 : 4.5,
    };
  }

  const off = rootOffset(rc);
  let fn: HarmonicFunction;
  let tension: number;
  let label: string | undefined;
  switch (off) {
    case 0: fn = 'T'; tension = fam === 'dominant' ? 2.2 : 0.6; break;
    case 1:
      if (fam === 'dominant') { fn = 'D'; tension = 5; label = 'Sostituto di tritono'; }
      else { fn = 'S'; tension = 4; label = minorKey ? 'Napoletana / frigio' : 'Napoletana'; }
      break;
    case 2:
      if (majorish) { fn = 'D'; tension = 4.2; label = 'Dominante della dominante ([V/V])'; }
      else { fn = 'S'; tension = 3; }
      break;
    case 3: fn = 'T'; tension = 1.6; break;
    case 4:
      if (majorish) { fn = 'D'; tension = 4.2; label = 'Dominante di [vi] ([V/vi])'; }
      else { fn = 'T'; tension = 2; }
      break;
    case 5: fn = 'S'; tension = fam === 'minor' ? 3.4 : 3; break;
    case 6: fn = 'D'; tension = 5.5; label = fam === 'diminished' ? 'Diminuito di passaggio' : 'Tritono'; break;
    case 7: fn = 'D'; tension = fam === 'minor' ? 3.6 : fam === 'dominant' ? 5.2 : 4.8; break;
    case 8: fn = 'S'; tension = 3; break;
    case 9:
      if (majorish && !minorKey) { fn = 'D'; tension = 4.2; label = 'Dominante di [ii] ([V/ii])'; }
      else { fn = minorKey ? 'S' : 'T'; tension = minorKey ? 3 : 1.4; }
      break;
    case 10: fn = minorKey ? 'D' : 'S'; tension = minorKey ? 3.8 : 3.4; label = 'Sottotonica ([♭VII])'; break;
    default: fn = 'D'; tension = 5.4; label = 'Sensibile'; break;
  }
  if (fam === 'diminished') tension = Math.max(tension, 5);
  if (q.tones.length > 3 && fam !== 'dominant') tension += 0.3;
  const borrowed = key.mode !== 'blues' && !isDiatonic(rc, key);
  if (borrowed) tension += 0.5;
  const base = label ?? FUNCTION_NAMES[fn];
  return {
    fn,
    secondary: false,
    borrowed,
    label: borrowed ? `${base} · prestito` : base,
    tension: Math.min(6, tension),
  };
}

export interface MoveDescription {
  title: string;
  text: string;
  common: number;
}

const INTERVAL_TEXT: Record<number, [string, string]> = {
  0: ['Stessa fondamentale', 'Cambia solo il colore dell\'accordo sopra lo stesso basso.'],
  1: ['Semitono su', 'Slittamento cromatico: crea sorpresa e tensione.'],
  2: ['Tono su', 'Movimento per grado: fluido, "sale" in modo naturale.'],
  3: ['Terza minore su', 'Salto per terza: morbido, spesso con note in comune.'],
  4: ['Terza maggiore su', 'Mediante cromatica: colore cinematografico ed epico.'],
  5: ['Quarta su (quinta giù)', 'Il movimento più forte dell\'armonia: sembra "cadere" nel posto giusto.'],
  6: ['Tritono', 'Il massimo contrasto: suono inquietante, caro al metal.'],
  7: ['Quinta su', 'Movimento aperto e luminoso, tipico di rock e pop ([I]→[V]).'],
  8: ['Terza maggiore giù', 'Mediante: discesa morbida e malinconica.'],
  9: ['Terza minore giù', 'Discesa per terza: accordi "parenti", passaggio dolce.'],
  10: ['Tono giù', 'Discesa per grado: naturale, molto usata nel rock ([I]→[♭VII]).'],
  11: ['Semitono giù', 'Discesa cromatica: scivolamento elegante (tipico del jazz).'],
};

export function describeMove(aIn: string | RomanChord, bIn: string | RomanChord, key: Key): MoveDescription {
  const a = toRc(aIn);
  const b = toRc(bIn);
  const oa = rootOffset(a);
  const ob = rootOffset(b);
  const interval = mod(ob - oa, 12);
  const ca = realize(a, key);
  const cb = realize(b, key);
  const shared = chordPcs(ca).filter((p) => chordPcs(cb).includes(p));
  const fa = analyzeChord(a, key);
  const fb = analyzeChord(b, key);
  const qa = QUALITIES[a.quality];
  const qb = QUALITIES[b.quality];
  const pa = `[${formatRoman(a)}]`;
  const pb = `[${formatRoman(b)}]`;
  const minorKey = MODES[key.mode].tonality === 'minor';

  let title: string | undefined;
  let text: string | undefined;

  if (a.target && !b.target && rootOffset({ ...a.target, quality: 'maj' }) === ob && (a.degree === 5 || a.degree === 7)) {
    title = 'Risoluzione della dominante secondaria';
    text = `${pa} è la "dominante" di ${pb}: per un attimo ${pb} sembra la nuova tonica.`;
  } else if (oa === 7 && ob === 0 && qa.family !== 'minor') {
    title = 'Cadenza perfetta ([V] → [I])';
    text = 'La risoluzione più forte in assoluto: tensione che torna a casa.';
  } else if (oa === 7 && ob === 9 && qb.family === 'minor' && !minorKey) {
    title = 'Cadenza d\'inganno ([V] → [vi])';
    text = 'L\'orecchio si aspetta la tonica e invece arriva il relativo minore: sorpresa malinconica.';
  } else if (oa === 7 && ob === 8 && minorKey) {
    title = 'Cadenza d\'inganno in minore ([V] → [♭VI])';
    text = 'Invece di tornare a [i] si cade su [♭VI]: drammatico, tipico del metal sinfonico.';
  } else if (oa === 11 && ob === 0) {
    title = 'Sensibile → tonica';
    text = 'La sensibile sale di semitono alla tonica: risoluzione decisa.';
  } else if (oa === 5 && ob === 0 && interval === 7) {
    title = qa.family === 'minor' ? 'Cadenza plagale minore ([iv] → [I])' : 'Cadenza plagale ([IV] → [I])';
    text = qa.family === 'minor'
      ? 'Il [iv] preso in prestito dal minore rende il ritorno a casa dolce-amaro (gospel, Beatles, Radiohead).'
      : 'La cadenza "Amen": ritorno a casa morbido, senza la spinta della dominante.';
  } else if (oa === 10 && ob === 0) {
    title = minorKey ? 'Cadenza eolica ([♭VII] → [i])' : 'Cadenza misolidia ([♭VII] → [I])';
    text = minorKey
      ? 'Risoluzione "rock" in minore, senza sensibile: fiera ed epica (metal, folk).'
      : 'Il suono del rock classico: risoluzione aperta, senza la sensibile.';
  } else if (oa === 8 && ob === 10) {
    title = '[♭VI] → [♭VII]: la rampa epica';
    text = 'Due accordi maggiori che salgono di un tono: preparano il ritorno trionfale alla tonica.';
  } else if (oa === 1 && ob === 0) {
    title = qa.family === 'dominant' ? 'Sostituzione di tritono → tonica' : 'Cadenza frigia ([♭II] → [I])';
    text = qa.family === 'dominant'
      ? 'La dominante sostituita scende di semitono alla tonica: suono jazz sofisticato.'
      : 'Discesa di semitono sulla tonica: oscura, flamenco e metal.';
  } else if (oa === 2 && ob === 7 && qa.family === 'minor') {
    title = '[ii] → [V]: preparazione della dominante';
    text = 'Il cuore del jazz: il [ii] prepara la dominante per quinta discendente.';
  } else if (oa === ob && qa.family !== qb.family) {
    title = `${pa} → ${pb}: cambio di modo`;
    text = 'Stesso basso, cambia la terza: effetto luce/ombra immediato.';
  }

  const [it, itx] = INTERVAL_TEXT[interval];
  if (!title) {
    title = `${FUNCTION_NAMES[fa.fn]} → ${FUNCTION_NAMES[fb.fn]} · ${it}`;
    text = itx;
  } else {
    text = `${text} (${it.toLowerCase()})`;
  }
  if (shared.length >= 2) {
    const names = shared.map((p) => noteName(spellPc(p, key.tonic.acc < 0))).join(', ');
    text += ` Note in comune: ${names} → passaggio morbido.`;
  }
  return { title, text, common: shared.length };
}

export interface ScaleSuggestion {
  tonic: Note;
  scale: ScaleId;
  /** Note che cambiano rispetto alla scala principale. */
  changes: string[];
  name: string;
}

const CANDIDATE_SCALES: ScaleId[] = [
  'major', 'minor', 'dorian', 'mixolydian', 'lydian', 'phrygian',
  'harmonicMinor', 'melodicMinor', 'phrygianDominant',
];

function scaleLabel(tonic: Note, scale: ScaleId): string {
  return `${noteName(tonic)} ${SCALES[scale].name.toLowerCase()}`;
}

export function mainScales(key: Key): ScaleSuggestion[] {
  const mode = MODES[key.mode];
  const main: ScaleSuggestion = { tonic: key.tonic, scale: mode.scale, changes: [], name: scaleLabel(key.tonic, mode.scale) };
  const pent: ScaleId = mode.tonality === 'major' ? 'majorPentatonic' : 'minorPentatonic';
  const out = [main, { tonic: key.tonic, scale: pent, changes: [], name: scaleLabel(key.tonic, pent) }];
  if (key.mode === 'blues') {
    out.push({ tonic: key.tonic, scale: 'blues', changes: [], name: scaleLabel(key.tonic, 'blues') });
    out.push({ tonic: key.tonic, scale: 'majorBlues', changes: [], name: scaleLabel(key.tonic, 'majorBlues') });
  }
  return out;
}

/** Scala consigliata per suonare sopra un singolo accordo, il più vicina possibile alla scala della tonalità. */
export function scaleForChord(input: string | RomanChord, key: Key): ScaleSuggestion {
  const rc = toRc(input);
  const chord = realize(rc, key);
  const tones = chordPcs(chord);
  const tpc = pc(key.tonic);
  const mainScale = MODES[key.mode].scale;
  const mainSet = new Set(scalePcs(tpc, mainScale));
  const mainNotes = scaleNotes(key.tonic, mainScale);

  let best: { scale: ScaleId; diff: number } | null = null;
  for (const s of [mainScale, ...CANDIDATE_SCALES]) {
    const set = scalePcs(tpc, s);
    if (!tones.every((t) => set.includes(t))) continue;
    const diff = set.filter((p) => !mainSet.has(p)).length;
    if (!best || diff < best.diff) best = { scale: s, diff };
  }
  if (best) {
    const notes = scaleNotes(key.tonic, best.scale);
    const changes: string[] = [];
    notes.forEach((n, i) => {
      const old = mainNotes[i];
      if (old && pc(old) !== pc(n)) changes.push(`${noteName(old)} → ${noteName(n)}`);
    });
    return { tonic: key.tonic, scale: best.scale, changes, name: scaleLabel(key.tonic, best.scale) };
  }
  // Nessuna scala sulla tonica contiene l'accordo: usa il modo costruito sulla fondamentale.
  const fam = QUALITIES[chord.quality].family;
  const scale: ScaleId =
    fam === 'dominant' ? (chord.quality === '7b9' ? 'phrygianDominant' : 'mixolydian')
      : fam === 'minor' ? 'dorian'
        : fam === 'diminished' ? 'locrian'
          : chord.quality === 'maj7#11' ? 'lydian' : 'major';
  return {
    tonic: chord.root,
    scale,
    changes: ['scala costruita sulla fondamentale dell\'accordo'],
    name: scaleLabel(chord.root, scale),
  };
}

export function chordNoteNames(ch: Chord): string[] {
  return chordTones(ch).map((n) => noteName(n));
}
