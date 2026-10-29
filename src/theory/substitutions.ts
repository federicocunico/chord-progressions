import { mod, MAJOR_STEPS } from './notes';
import { QUALITIES, chordSymbol, commonTones, type QualityId } from './chords';
import { MODES, harmonize, scalePcs, type ScaleId } from './scales';
import {
  type Key, type RomanChord, type Degree, parseRoman, formatRoman, realize, rootOffset, isDiatonic, prettyRoman,
} from './roman';
import { pc } from './notes';

export type Boldness = 'sicura' | 'colore' | 'audace';

export type SubstitutionType =
  | 'diatonica' | 'colore' | 'prestito' | 'secondaria' | 'tritono' | 'ii-V' | 'diminuito'
  | 'sus' | 'inversione' | 'power' | 'backdoor' | 'napoletana' | 'inganno' | 'pedale';

export const SUB_TYPE_NAMES: Record<SubstitutionType, string> = {
  diatonica: 'Sostituzione diatonica',
  colore: 'Colore / estensione',
  prestito: 'Prestito modale',
  secondaria: 'Dominante secondaria',
  tritono: 'Sostituzione di tritono',
  'ii-V': 'ii–V di avvicinamento',
  diminuito: 'Diminuito di passaggio',
  sus: 'Sospensione',
  inversione: 'Inversione (basso)',
  power: 'Power chord',
  backdoor: 'Backdoor',
  napoletana: 'Napoletana',
  inganno: 'Cadenza d\'inganno',
  pedale: 'Pedale',
};

export interface Substitution {
  type: SubstitutionType;
  title: string;
  explanation: string;
  boldness: Boldness;
  /** Nuova progressione completa. */
  chords: string[];
  /** Indici modificati nella nuova progressione. */
  changed: number[];
  /** Durate (battute) della nuova progressione. */
  bars: number[];
}

/** Grado e alterazione "standard" per ogni distanza in semitoni dalla tonica. */
const OFFSET_DEGREE: Record<number, [number, number]> = {
  0: [1, 0], 1: [2, -1], 2: [2, 0], 3: [3, -1], 4: [3, 0], 5: [4, 0],
  6: [5, -1], 7: [5, 0], 8: [6, -1], 9: [6, 0], 10: [7, -1], 11: [7, 0],
};

export function rcFromOffset(off: number, quality: QualityId): RomanChord {
  const [degree, acc] = OFFSET_DEGREE[mod(off, 12)];
  return { degree, acc, quality };
}

function targetOf(rc: RomanChord): Degree {
  return { acc: rc.acc, degree: rc.degree, lower: QUALITIES[rc.quality].lower };
}

function isTonic(rc: RomanChord): boolean {
  return !rc.target && rootOffset(rc) === 0;
}

const fam = (rc: RomanChord) => QUALITIES[rc.quality].family;

interface Ctx {
  chords: string[];
  rcs: RomanChord[];
  bars: number[];
  i: number;
  key: Key;
  sym: (rc: RomanChord | string) => string;
}

function replace(ctx: Ctx, at: number, items: RomanChord[], barsSplit?: number[]): { chords: string[]; changed: number[]; bars: number[] } {
  const chords = ctx.chords.slice();
  const bars = ctx.bars.slice();
  const strs = items.map((r) => formatRoman(r));
  const total = bars[at];
  const split = barsSplit ?? items.map(() => total / items.length);
  chords.splice(at, 1, ...strs);
  bars.splice(at, 1, ...split);
  return { chords, changed: items.map((_, k) => at + k), bars };
}

type Rule = (ctx: Ctx) => Substitution[];

const diatonicRule: Rule = (ctx) => {
  const cur = ctx.rcs[ctx.i];
  if (cur.target || cur.bass) return [];
  const mode = MODES[ctx.key.mode];
  if (mode.id === 'blues') return [];
  const curCh = realize(cur, ctx.key);
  const seventh = QUALITIES[cur.quality].tones.length >= 4;
  const out: Substitution[] = [];
  for (const d of harmonize(mode.scale)) {
    const cand: RomanChord = { degree: d.degree, acc: d.acc, quality: seventh ? d.seventh : d.triad };
    if (rootOffset(cand) === rootOffset(cur)) continue;
    const shared = commonTones(curCh, realize(cand, ctx.key));
    if (shared < 2) continue;
    const r = replace(ctx, ctx.i, [cand]);
    out.push({
      type: 'diatonica', boldness: 'sicura', ...r,
      title: `${prettyRoman(cur)} → ${prettyRoman(cand)}`,
      explanation: `${ctx.sym(cand)} condivide ${shared} note con ${ctx.sym(cur)}: stessa "famiglia", il cambio è morbido ma il colore cambia.`,
    });
  }
  return out;
};

const COLOR_OPTIONS: Partial<Record<QualityId, QualityId[]>> = {
  maj: ['add9', 'sus2', 'sus4', 'maj7', '6', '7'],
  min: ['m7', 'madd9', 'm9', 'm6', 'm11'],
  '7': ['9', '13', '7sus4', '7b9', '7#9'],
  maj7: ['maj9', '6', '69', 'maj7#11'],
  m7: ['m9', 'm11', 'min'],
  '5': ['maj', 'min'],
  sus4: ['maj', '7sus4'],
  sus2: ['maj', 'add9'],
  add9: ['maj', 'maj9'],
  dim: ['dim7', 'm7b5'],
};

const COLOR_TEXT: Partial<Record<QualityId, string>> = {
  add9: 'la nona aggiunta apre l\'accordo, suono moderno e luminoso',
  sus2: 'senza terza: sospeso, né maggiore né minore',
  sus4: 'la quarta "spinge" verso la terza: crea attesa',
  maj7: 'la settima maggiore ammorbidisce: sognante, jazzy',
  '6': 'la sesta dà un sapore retrò e dolce',
  '7': 'la settima minore crea tensione: chiede di andare avanti (verso la quarta sopra)',
  m7: 'la settima rende il minore più morbido e soul',
  madd9: 'la nona sul minore: malinconia elegante',
  m9: 'minore con settima e nona: neo-soul, notturno',
  m6: 'la sesta maggiore sul minore: suono dorico, manouche',
  m11: 'undicesima: suono aperto e moderno (per quarte)',
  '9': 'la nona sulla dominante: funky e piena',
  '13': 'la tredicesima: dominante ricca, jazz e soul',
  '7sus4': 'dominante sospesa: tensione morbida, gospel e pop',
  '7b9': 'nona bemolle: tensione scura, ideale verso un accordo minore',
  '7#9': 'l\'"accordo di Hendrix": dominante aggressiva tra maggiore e minore',
  maj9: 'settima maggiore + nona: lussureggiante',
  '69': 'sei-nove: aperto, bossa nova e finali jazz',
  'maj7#11': 'undicesima aumentata: il colore lidio, sognante',
  maj: 'triade semplice: più diretta e pulita',
  min: 'triade minore semplice',
  dim7: 'diminuito settima: simmetrico, ottimo di passaggio',
  m7b5: 'semidiminuito: il ii del minore',
} as Partial<Record<QualityId, string>>;

const colorRule: Rule = (ctx) => {
  const cur = ctx.rcs[ctx.i];
  const opts = COLOR_OPTIONS[cur.quality];
  if (!opts) return [];
  const out: Substitution[] = [];
  for (const q of opts) {
    const cand: RomanChord = { ...cur, quality: q };
    // accetta solo estensioni coerenti con la scala (salvo dominanti secondarie, power e triadi)
    const keep = cur.target || q === 'maj' || q === 'min' || cur.quality === '5' || ctx.key.mode === 'blues' || isDiatonic(cand, ctx.key) || !isDiatonic(cur, ctx.key);
    if (!keep) continue;
    if (cur.quality === '7' && q === '7b9') {
      const next = ctx.rcs[(ctx.i + 1) % ctx.rcs.length];
      if (fam(next) !== 'minor') continue;
    }
    const r = replace(ctx, ctx.i, [cand]);
    out.push({
      type: 'colore', boldness: q === '7#9' || q === 'maj7#11' ? 'audace' : 'colore', ...r,
      title: `${ctx.sym(cur)} → ${ctx.sym(cand)}`,
      explanation: `Stessa funzione, nuovo colore: ${COLOR_TEXT[q] ?? QUALITIES[q].name}.`,
    });
  }
  return out;
};

const PARALLEL: Record<'major' | 'minor', ScaleId[]> = {
  major: ['minor', 'dorian', 'mixolydian', 'phrygian'],
  minor: ['major', 'dorian', 'harmonicMinor', 'melodicMinor'],
};

const borrowRule: Rule = (ctx) => {
  const cur = ctx.rcs[ctx.i];
  if (cur.target) return [];
  const tonality = MODES[ctx.key.mode].tonality;
  const off = rootOffset(cur);
  const out: Substitution[] = [];
  const tpc = pc(ctx.key.tonic);
  const push = (cand: RomanChord, from: string, text: string, bold: Boldness = 'colore') => {
    if (formatRoman(cand) === formatRoman(cur)) return;
    const r = replace(ctx, ctx.i, [cand]);
    out.push({ type: 'prestito', boldness: bold, ...r, title: `${prettyRoman(cur)} → ${prettyRoman(cand)}`, explanation: `Preso in prestito ${from}: ${text}` });
  };
  // 1) stesso grado, terza opposta
  const f = fam(cur);
  if (f === 'major' || f === 'minor') {
    const flipped: RomanChord = { ...cur, quality: f === 'major' ? 'min' : 'maj', bass: undefined };
    for (const s of PARALLEL[tonality]) {
      const set = scalePcs(tpc, s);
      const ch = realize(flipped, ctx.key);
      const ok = QUALITIES[flipped.quality].tones.every(([iv]) => set.includes(mod(pc(ch.root) + iv, 12)));
      if (ok && !isDiatonic(flipped, ctx.key)) {
        const nm = s === 'minor' ? 'dal minore parallelo' : s === 'major' ? 'dal maggiore parallelo' : `dal modo ${s === 'harmonicMinor' ? 'minore armonico' : s === 'melodicMinor' ? 'minore melodico' : s === 'dorian' ? 'dorico' : s === 'mixolydian' ? 'misolidio' : 'frigio'}`;
        const isLastTonic = off === 0 && tonality === 'minor';
        const text = off === 5 && f === 'major'
          ? 'il IV diventa minore: il suono dolce-amaro di Beatles e Radiohead.'
          : isLastTonic ? 'la "terza piccarda": finire un brano minore sull\'accordo maggiore.'
            : off === 7 && f === 'minor' ? 'il V maggiore porta la sensibile: risoluzione molto più forte.'
              : off === 9 && f === 'major' && tonality === 'minor' ? 'la sesta dorica: il minore si illumina.'
                : 'stesso basso, cambia la terza: luce e ombra.';
        push(flipped, nm, text, off === 0 ? 'audace' : 'colore');
        break;
      }
    }
  }
  // 2) prestiti per funzione
  if (tonality === 'major') {
    if (off === 9 && f === 'minor') push(rcFromOffset(8, 'maj'), 'dal minore', '♭VI al posto del vi: più epico e drammatico.');
    if (off === 4 && f === 'minor') push(rcFromOffset(3, 'maj'), 'dal minore', '♭III al posto del iii: sapore rock/blues.');
    if (off === 7) push(rcFromOffset(10, 'maj'), 'dal misolidio', '♭VII al posto del V: risoluzione "rock" senza sensibile.');
    if (off === 2 && f === 'minor') push({ ...cur, quality: 'm7b5' }, 'dal minore', 'ii semidiminuito: prepara il V con un tocco scuro.');
    if (off === 5) push(rcFromOffset(8, 'maj'), 'dal minore', '♭VI come sottodominante alternativa: grande ed epica.', 'audace');
  } else {
    if (off === 10) push(rcFromOffset(11, 'dim'), 'dalla minore armonica', 'vii° al posto del ♭VII: tensione classica verso i.');
    if (off === 7 && f === 'minor') push({ ...cur, quality: '7' }, 'dalla minore armonica', 'V7: la dominante con la sensibile, molto più "classica".');
    if (off === 8) push(rcFromOffset(5, 'min'), 'stesso campo armonico', 'iv al posto del ♭VI: stessa funzione di sottodominante, più scura.');
  }
  return out;
};

const secondaryRule: Rule = (ctx) => {
  const n = ctx.rcs.length;
  if (n < 2) return [];
  const cur = ctx.rcs[ctx.i];
  const next = ctx.rcs[(ctx.i + 1) % n];
  const out: Substitution[] = [];
  const dom = (target: RomanChord): RomanChord =>
    isTonic(target) ? rcFromOffset(7, '7') : { degree: 5, acc: 0, quality: '7', target: targetOf(target) };
  // A) l'accordo diventa la dominante del successivo
  if (fam(next) !== 'diminished' && rootOffset(cur) !== mod(rootOffset(next) + 7, 12) && !next.target) {
    const cand = dom(next);
    const r = replace(ctx, ctx.i, [cand]);
    out.push({
      type: 'secondaria', boldness: 'colore', ...r,
      title: `${prettyRoman(cur)} → ${prettyRoman(cand)}`,
      explanation: `${ctx.sym(cand)} è la dominante di ${ctx.sym(next)}: crea una forte attrazione verso l'accordo successivo.`,
    });
  }
  // B) inserisci la dominante prima dell'accordo corrente (dividendo la battuta precedente)
  if (fam(cur) !== 'diminished' && !cur.target) {
    const prevIdx = (ctx.i - 1 + n) % n;
    const prev = ctx.rcs[prevIdx];
    const cand = dom(cur);
    if (formatRoman(prev) !== formatRoman(cand)) {
      const r = replace(ctx, prevIdx, [prev, cand]);
      out.push({
        type: 'secondaria', boldness: 'colore', ...r,
        title: `+ ${prettyRoman(cand)} prima di ${prettyRoman(cur)}`,
        explanation: `Mezza battuta di ${ctx.sym(cand)} (dominante di ${ctx.sym(cur)}) per "annunciare" l'accordo.`,
      });
    }
  }
  return out;
};

const tritoneRule: Rule = (ctx) => {
  const cur = ctx.rcs[ctx.i];
  const off = rootOffset(cur);
  const isDom = fam(cur) === 'dominant' || (fam(cur) === 'major' && (off === 7 || !!cur.target));
  if (!isDom) return [];
  const cand = rcFromOffset(off + 6, '7');
  const r = replace(ctx, ctx.i, [cand]);
  return [{
    type: 'tritono', boldness: 'audace', ...r,
    title: `${ctx.sym(cur)} → ${ctx.sym(cand)}`,
    explanation: `${ctx.sym(cand)} ha la stessa "coppia di tensione" (terza e settima scambiate) di ${ctx.sym(cur)}, ma il basso scende cromaticamente: suono jazz.`,
  }];
};

const twoFiveRule: Rule = (ctx) => {
  const n = ctx.rcs.length;
  if (n < 2) return [];
  const cur = ctx.rcs[ctx.i];
  if (cur.target || fam(cur) === 'diminished' || fam(cur) === 'power') return [];
  const prevIdx = (ctx.i - 1 + n) % n;
  const minorTarget = fam(cur) === 'minor';
  const t = targetOf(cur);
  const two: RomanChord = isTonic(cur)
    ? { degree: 2, acc: 0, quality: minorTarget ? 'm7b5' : 'm7' }
    : { degree: 2, acc: 0, quality: minorTarget ? 'm7b5' : 'm7', target: t };
  const five: RomanChord = isTonic(cur) ? rcFromOffset(7, '7') : { degree: 5, acc: 0, quality: '7', target: t };
  const r = replace(ctx, prevIdx, [two, five]);
  return [{
    type: 'ii-V', boldness: isTonic(cur) ? 'colore' : 'audace', ...r,
    title: `${prettyRoman(two)} – ${prettyRoman(five)} → ${prettyRoman(cur)}`,
    explanation: `Il "ii–V" di ${ctx.sym(cur)} (${ctx.sym(two)} – ${ctx.sym(five)}) al posto dell'accordo precedente: ${ctx.sym(cur)} sembra una piccola tonica.`,
  }];
};

const diminishedRule: Rule = (ctx) => {
  const n = ctx.rcs.length;
  if (n < 2) return [];
  const cur = ctx.rcs[ctx.i];
  const next = ctx.rcs[(ctx.i + 1) % n];
  const a = rootOffset(cur);
  const b = rootOffset(next);
  const out: Substitution[] = [];
  if (mod(b - a, 12) === 2 && cur.acc < 1 && !cur.target) {
    const pass: RomanChord = { degree: cur.degree, acc: cur.acc + 1, quality: 'dim7' };
    const r = replace(ctx, ctx.i, [cur, pass]);
    out.push({
      type: 'diminuito', boldness: 'colore', ...r,
      title: `+ ${prettyRoman(pass)} tra ${prettyRoman(cur)} e ${prettyRoman(next)}`,
      explanation: `Il basso sale di semitono (${ctx.sym(cur)} → ${ctx.sym(pass)} → ${ctx.sym(next)}): passaggio cromatico tipico di gospel, jazz e cantautorato.`,
    });
  }
  if (mod(a - b, 12) === 2 && !cur.target && fam(next) === 'minor') {
    const pass = rcFromOffset(a - 1, 'dim7');
    const r = replace(ctx, ctx.i, [cur, pass]);
    out.push({
      type: 'diminuito', boldness: 'audace', ...r,
      title: `+ ${prettyRoman(pass)} discendente`,
      explanation: `Diminuito cromatico discendente fra ${ctx.sym(cur)} e ${ctx.sym(next)}: elegante, molto jazz.`,
    });
  }
  return out;
};

const susRule: Rule = (ctx) => {
  const cur = ctx.rcs[ctx.i];
  const f = fam(cur);
  if (!(f === 'major' || f === 'dominant') || cur.bass) return [];
  const sus: RomanChord = { ...cur, quality: f === 'dominant' ? '7sus4' : 'sus4' };
  const r = replace(ctx, ctx.i, [sus, cur]);
  return [{
    type: 'sus', boldness: 'sicura', ...r,
    title: `${ctx.sym(sus)} → ${ctx.sym(cur)}`,
    explanation: 'Prima la quarta sospesa, poi si risolve sulla terza: tensione e rilascio sullo stesso accordo, un classico della chitarra acustica.',
  }];
};

/** Grado della tonalità per una nota dell'accordo (per scrivere l'inversione). */
function bassDegree(rc: RomanChord, semis: number, letters: number): Degree {
  const off = mod(rootOffset(rc) + semis, 12);
  const baseDeg = rc.target ? rc.target.degree - 1 + rc.degree - 1 : rc.degree - 1;
  const deg = mod(baseDeg + letters, 7) + 1;
  let acc = off - MAJOR_STEPS[deg - 1];
  if (acc > 6) acc -= 12;
  if (acc < -6) acc += 12;
  return { degree: deg, acc };
}

const inversionRule: Rule = (ctx) => {
  const n = ctx.rcs.length;
  if (n < 2) return [];
  const cur = ctx.rcs[ctx.i];
  if (cur.bass || cur.target) return [];
  const f = fam(cur);
  if (!(f === 'major' || f === 'minor' || f === 'dominant')) return [];
  const prev = ctx.rcs[(ctx.i - 1 + n) % n];
  const next = ctx.rcs[(ctx.i + 1) % n];
  const bassOff = (rc: RomanChord) => (rc.bass ? mod(MAJOR_STEPS[rc.bass.degree - 1] + rc.bass.acc, 12) : rootOffset(rc));
  const pb = bassOff(prev);
  const nb = bassOff(next);
  const dist = (x: number, y: number) => Math.min(mod(x - y, 12), mod(y - x, 12));
  const tones = QUALITIES[cur.quality].tones;
  const out: Substitution[] = [];
  const rootDist = dist(rootOffset(cur), pb) + dist(rootOffset(cur), nb);
  for (const [semis, letters] of tones.slice(1)) {
    if (semis > 11) continue;
    if (semis === 10 && f !== 'dominant') continue;
    const b = bassDegree(cur, semis, letters);
    const bo = mod(MAJOR_STEPS[b.degree - 1] + b.acc, 12);
    const d = dist(bo, pb) + dist(bo, nb);
    if (d >= rootDist || Math.abs(b.acc) > 1) continue;
    const cand: RomanChord = { ...cur, bass: b };
    const r = replace(ctx, ctx.i, [cand]);
    const which = letters === 2 ? 'la terza' : letters === 4 ? 'la quinta' : 'la settima';
    out.push({
      type: 'inversione', boldness: 'sicura', ...r,
      title: `${ctx.sym(cur)} → ${ctx.sym(cand)}`,
      explanation: `Con ${which} al basso la linea di basso si muove per gradi vicini (${ctx.sym(prev)} → ${ctx.sym(cand)} → ${ctx.sym(next)}): più fluida e cantabile.`,
    });
  }
  return out;
};

const powerRule: Rule = (ctx) => {
  const cur = ctx.rcs[ctx.i];
  const f = fam(cur);
  if (!(f === 'major' || f === 'minor')) return [];
  const cand: RomanChord = { ...cur, quality: '5', bass: undefined };
  const r = replace(ctx, ctx.i, [cand]);
  return [{
    type: 'power', boldness: 'sicura', ...r,
    title: `${ctx.sym(cur)} → ${ctx.sym(cand)}`,
    explanation: 'Solo fondamentale e quinta: con la distorsione suona più pesante e definito, e non dichiara se è maggiore o minore.',
  }];
};

const backdoorRule: Rule = (ctx) => {
  const n = ctx.rcs.length;
  const cur = ctx.rcs[ctx.i];
  const next = ctx.rcs[(ctx.i + 1) % n];
  if (n < 2 || rootOffset(cur) !== 7 || cur.target || !isTonic(next) || fam(cur) === 'minor') return [];
  const iv: RomanChord = rcFromOffset(5, 'm7');
  const b7: RomanChord = rcFromOffset(10, '7');
  const r = replace(ctx, ctx.i, [iv, b7]);
  return [{
    type: 'backdoor', boldness: 'audace', ...r,
    title: `${prettyRoman(cur)} → ${prettyRoman(iv)} – ${prettyRoman(b7)}`,
    explanation: `Al posto della dominante, si arriva a casa dalla "porta di servizio" (${ctx.sym(iv)} – ${ctx.sym(b7)}): caldo e nostalgico.`,
  }];
};

const neapolitanRule: Rule = (ctx) => {
  const n = ctx.rcs.length;
  const cur = ctx.rcs[ctx.i];
  const next = ctx.rcs[(ctx.i + 1) % n];
  const off = rootOffset(cur);
  if (n < 2 || cur.target || rootOffset(next) !== 7 || !(off === 5 || off === 2)) return [];
  const cand = rcFromOffset(1, 'maj');
  const r = replace(ctx, ctx.i, [cand]);
  return [{
    type: 'napoletana', boldness: 'audace', ...r,
    title: `${prettyRoman(cur)} → ${prettyRoman(cand)}`,
    explanation: `La "sesta napoletana" ${ctx.sym(cand)} prepara la dominante con un colore struggente, da opera (o da metal frigio).`,
  }];
};

const deceptiveRule: Rule = (ctx) => {
  const n = ctx.rcs.length;
  const cur = ctx.rcs[ctx.i];
  const prev = ctx.rcs[(ctx.i - 1 + n) % n];
  if (n < 2 || !isTonic(cur) || rootOffset(prev) !== 7) return [];
  const minor = MODES[ctx.key.mode].tonality === 'minor';
  const cand = minor ? rcFromOffset(8, 'maj') : rcFromOffset(9, 'min');
  const r = replace(ctx, ctx.i, [cand]);
  return [{
    type: 'inganno', boldness: 'colore', ...r,
    title: `${prettyRoman(cur)} → ${prettyRoman(cand)}`,
    explanation: `Dopo la dominante l'orecchio si aspetta la tonica: con ${ctx.sym(cand)} la frase resta aperta, emozionante.`,
  }];
};

const pedalRule: Rule = (ctx) => {
  const cur = ctx.rcs[ctx.i];
  if (isTonic(cur) || cur.bass || cur.target) return [];
  const f = fam(cur);
  if (!(f === 'major' || f === 'minor' || f === 'dominant' || f === 'suspended')) return [];
  const cand: RomanChord = { ...cur, bass: { degree: 1, acc: 0 } };
  const r = replace(ctx, ctx.i, [cand]);
  return [{
    type: 'pedale', boldness: 'colore', ...r,
    title: `${ctx.sym(cur)} → ${ctx.sym(cand)}`,
    explanation: 'Il basso resta sulla tonica mentre l\'accordo cambia sopra: effetto "pedale", tensione sospesa tipica di rock, gospel e colonne sonore.',
  }];
};

const RULES: Rule[] = [
  colorRule, diatonicRule, borrowRule, secondaryRule, susRule, inversionRule, pedalRule,
  diminishedRule, twoFiveRule, tritoneRule, backdoorRule, neapolitanRule, deceptiveRule, powerRule,
];

export function substitutionsFor(chords: string[], index: number, key: Key, bars?: number[]): Substitution[] {
  const rcs = chords.map(parseRoman);
  const ctx: Ctx = {
    chords, rcs, i: index, key, bars: bars ?? chords.map(() => 1),
    sym: (rc) => chordSymbol(realize(typeof rc === 'string' ? parseRoman(rc) : rc, key)),
  };
  const seen = new Set<string>([chords.join(' ')]);
  const out: Substitution[] = [];
  for (const rule of RULES) {
    for (const s of rule(ctx)) {
      const k = s.chords.join(' ');
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(s);
    }
  }
  const order: Record<Boldness, number> = { sicura: 0, colore: 1, audace: 2 };
  return out.sort((a, b) => order[a.boldness] - order[b.boldness]);
}
