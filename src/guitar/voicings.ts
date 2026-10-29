import { type Chord, QUALITIES, chordPcs } from '../theory/chords';
import { pc, mod } from '../theory/notes';
import { MOVABLE_SHAPES, OPEN_SHAPES, OPEN_MIDI, OPEN_PC, type ShapeKind, type MovableShape } from './shapes';

export type VoicingStyle = 'auto' | 'open' | 'barre' | 'power' | 'jazz';

export const VOICING_STYLES: Record<VoicingStyle, string> = {
  auto: 'Automatico',
  open: 'Accordi aperti',
  barre: 'Barré (CAGED)',
  power: 'Power chord',
  jazz: 'Jazz (shell)',
};

export interface Barre {
  fret: number;
  from: number; // indice corda (0 = 6ª)
  to: number;
}

export interface Voicing {
  frets: (number | null)[];
  fingers: (number | null)[];
  barre?: Barre;
  kind: ShapeKind;
  family?: MovableShape['family'];
  /** Tasto più basso premuto (0 se solo corde a vuoto). */
  position: number;
  difficulty: number;
  label: string;
}

const ROMAN_FRETS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII'];
export const fretRoman = (f: number): string => ROMAN_FRETS[f] ?? String(f);

/**
 * Assegna le dita (1-4) e l'eventuale barré. Restituisce null se la forma richiede più di 4 dita.
 */
export function fingersFor(frets: (number | null)[]): { fingers: (number | null)[]; barre?: Barre } | null {
  const fingers: (number | null)[] = frets.map((f) => (f === null ? null : 0));
  const fretted = frets
    .map((f, s) => ({ f: f ?? 0, s }))
    .filter((n) => frets[n.s] !== null && n.f > 0)
    .sort((a, b) => a.f - b.f || a.s - b.s);
  if (fretted.length === 0) return { fingers };
  const minF = fretted[0].f;
  const atMin = fretted.filter((n) => n.f === minF);

  const assign = (notes: typeof fretted, firstFinger: number, base: number): boolean => {
    // 1° tentativo: dito "naturale" = distanza dal tasto base; 2° tentativo: sequenziale
    const tryMode = (natural: boolean): number[] | null => {
      const out: number[] = [];
      let prev = firstFinger - 1;
      for (const n of notes) {
        const ideal = natural ? n.f - base + firstFinger : prev + 1;
        const fi = Math.max(prev + 1, ideal);
        if (fi > 4) return null;
        out.push(fi);
        prev = fi;
      }
      return out;
    };
    const res = tryMode(true) ?? tryMode(false);
    if (!res) return false;
    notes.forEach((n, i) => (fingers[n.s] = res[i]));
    return true;
  };

  // Barré: dito 1 su più corde allo stesso tasto, senza corde a vuoto o mute in mezzo.
  const tryBarre = (): Barre | null => {
    if (atMin.length < 2) return null;
    const from = atMin[0].s;
    const to = atMin[atMin.length - 1].s;
    for (let s = from; s <= to; s++) {
      const f = frets[s];
      if (f === null || f < minF) return null;
    }
    return { fret: minF, from, to };
  };

  const sounding = frets.map((f, s) => (f === null ? -1 : s)).filter((s) => s >= 0);
  const topString = sounding[sounding.length - 1];
  const consecutive = atMin.every((n, i) => i === 0 || n.s === atMin[i - 1].s + 1);
  // Barré se servono più di 4 dita, o se le note più basse sono corde adiacenti in cima (mini-barré del Fa).
  const preferBarre = fretted.length > 4 || (atMin.length >= 2 && consecutive && atMin[atMin.length - 1].s === topString);
  const reset = () => frets.forEach((f, s) => (fingers[s] = f === null ? null : 0));
  const withBarre = (): { fingers: (number | null)[]; barre?: Barre } | null => {
    const barre = tryBarre();
    if (!barre) return null;
    for (const n of atMin) if (n.s >= barre.from && n.s <= barre.to) fingers[n.s] = 1;
    const rest = fretted.filter((n) => fingers[n.s] !== 1);
    if (assign(rest, 2, minF + 1)) return { fingers, barre };
    reset();
    return null;
  };
  if (preferBarre) {
    const b = withBarre();
    if (b) return b;
    if (fretted.length > 4) return null;
    return assign(fretted, 1, minF) ? { fingers } : null;
  }
  if (fretted.length <= 4 && assign(fretted, 1, minF)) return { fingers };
  reset();
  return withBarre();
}

function makeVoicing(frets: (number | null)[], kind: ShapeKind, difficulty: number, family?: MovableShape['family']): Voicing | null {
  const fb = fingersFor(frets);
  if (!fb) return null;
  const fretted = frets.filter((f): f is number => f !== null && f > 0);
  const position = fretted.length ? Math.min(...fretted) : 0;
  const hasOpen = frets.some((f) => f === 0);
  let k = kind;
  if ((kind === 'movable' || kind === 'barre') && hasOpen && position <= 4) k = 'open';
  else if (kind === 'movable' && fb.barre && fb.barre.to - fb.barre.from >= 3) k = 'barre';
  const label = labelFor(k, family, position, !!fb.barre);
  return { frets, fingers: fb.fingers, barre: fb.barre, kind: k, family, position, difficulty: difficulty + (fb.barre ? 0.3 : 0), label };
}

function labelFor(kind: ShapeKind, family: MovableShape['family'] | undefined, position: number, barre: boolean): string {
  const where = position > 0 ? ` · tasto ${fretRoman(position)}` : '';
  switch (kind) {
    case 'open': return 'Aperto';
    case 'power': return `Power chord${where}`;
    case 'shell': return `Shell jazz${where}`;
    case 'generic': return `Voicing alternativo${where}`;
    default: {
      const fam = family === 'E' ? 'forma di Mi' : family === 'A' ? 'forma di La' : family === 'D' ? 'forma di Re' : 'forma mobile';
      const name = barre && (family === 'E' || family === 'A') ? `Barré ${fam}` : fam[0].toUpperCase() + fam.slice(1);
      return `${name}${where}`;
    }
  }
}

const key = (frets: (number | null)[]) => frets.map((f) => (f === null ? 'x' : f)).join(',');

function templateVoicings(chord: Chord): Voicing[] {
  const rootPc = pc(chord.root);
  const bassPc = chord.bass ? pc(chord.bass) : rootPc;
  const out: Voicing[] = [];
  for (const o of OPEN_SHAPES) {
    if (o.root === rootPc && o.quality === chord.quality && (o.bass ?? o.root) === bassPc) {
      const v = makeVoicing(o.frets, 'open', o.difficulty);
      if (v) out.push(v);
    }
  }
  if (bassPc !== rootPc) return out;
  for (const sh of MOVABLE_SHAPES) {
    if (sh.quality !== chord.quality) continue;
    const f0 = mod(rootPc - OPEN_PC[sh.rootString], 12);
    for (const r of [f0, f0 + 12]) {
      const frets = sh.pattern.map((o) => (o === null ? null : r + o));
      if (frets.some((f) => f !== null && (f < 0 || f > 17))) continue;
      const kind: ShapeKind = sh.family === 'power' ? 'power' : sh.family === 'shell' ? 'shell' : 'movable';
      const v = makeVoicing(frets, kind, sh.difficulty + (r > 9 ? 0.4 : 0), sh.family);
      if (v) out.push(v);
    }
  }
  return out;
}

/** Ricerca esaustiva di voicing eseguibili in finestre di 4 tasti. */
export function genericVoicings(chord: Chord, limit = 8): Voicing[] {
  const rootPc = pc(chord.root);
  const bassPc = chord.bass ? pc(chord.bass) : rootPc;
  const q = QUALITIES[chord.quality];
  const allowed = new Set(chordPcs(chord));
  const required = new Set(q.tones.filter(([s]) => !q.optional.includes(s)).map(([s]) => mod(rootPc + s, 12)));
  required.add(bassPc);
  const minSounding = Math.max(3, Math.min(4, required.size));
  const found = new Map<string, Voicing>();

  for (let p = 0; p <= 12; p++) {
    const lo = Math.max(1, p);
    const hi = lo + 3;
    const opts: (number | null)[][] = OPEN_PC.map((open) => {
      const o: (number | null)[] = [null];
      if (p <= 3 && allowed.has(open)) o.push(0);
      for (let f = lo; f <= hi; f++) if (allowed.has((open + f) % 12)) o.push(f);
      return o;
    });
    const frets: (number | null)[] = new Array(6).fill(null);
    const dfs = (s: number, started: boolean): void => {
      if (s === 6) {
        evaluate(frets.slice());
        return;
      }
      for (const f of opts[s]) {
        if (f !== null && !started && (OPEN_PC[s] + f) % 12 !== bassPc) continue;
        frets[s] = f;
        dfs(s + 1, started || f !== null);
      }
      frets[s] = null;
    };
    const evaluate = (fr: (number | null)[]) => {
      const sounding = fr.map((f, s) => (f === null ? -1 : s)).filter((s) => s >= 0);
      if (sounding.length < minSounding) return;
      const first = sounding[0];
      const last = sounding[sounding.length - 1];
      const internalMutes = last - first + 1 - sounding.length;
      if (internalMutes > 1) return;
      const present = new Set(sounding.map((s) => (OPEN_PC[s] + (fr[s] as number)) % 12));
      for (const r of required) if (!present.has(r)) return;
      const fretted = fr.filter((f): f is number => f !== null && f > 0);
      if (fretted.length && Math.max(...fretted) - Math.min(...fretted) > 3) return;
      const k = key(fr);
      if (found.has(k)) return;
      const opens = fr.filter((f) => f === 0).length;
      const diff = 1.0 + fretted.length * 0.25 + internalMutes * 1.2 + (6 - sounding.length) * 0.15
        + (fretted.length ? (Math.max(...fretted) - Math.min(...fretted)) * 0.3 : 0) - opens * 0.1 + p * 0.03;
      const v = makeVoicing(fr, 'generic', diff);
      if (v) found.set(k, v);
    };
    dfs(0, false);
  }
  return [...found.values()].sort((a, b) => a.difficulty - b.difficulty).slice(0, limit);
}

/** Trasforma un accordo in power chord quando ha senso (stile metal/punk). */
export function powerize(chord: Chord): Chord {
  const fam = QUALITIES[chord.quality].family;
  if (fam === 'major' || fam === 'minor' || fam === 'dominant' || fam === 'suspended') {
    return { root: chord.root, quality: '5' };
  }
  return chord;
}

function styleCost(v: Voicing, style: VoicingStyle): number {
  const hi = v.position * 0.06;
  switch (style) {
    case 'open':
      return v.kind === 'open' ? 0 : v.kind === 'power' || v.kind === 'shell' ? 2.6 : 1.3 + v.position * 0.12;
    case 'barre':
      return v.kind === 'barre' || v.kind === 'movable' ? hi : v.kind === 'open' ? 2.4 : v.kind === 'generic' ? 1.2 + hi : 2.4;
    case 'power':
      return v.kind === 'power' ? hi : 2.2;
    case 'jazz':
      return v.kind === 'shell' ? hi : v.kind === 'movable' || v.kind === 'barre' ? 0.5 + hi : v.kind === 'generic' ? 0.7 + hi : v.kind === 'open' ? 1.3 : 3;
    default:
      return v.kind === 'open' ? 0 : v.kind === 'movable' || v.kind === 'barre' ? 0.6 + hi : v.kind === 'generic' ? 1.1 + hi : 1.4;
  }
}

const cache = new Map<string, Voicing[]>();

/** Tutti i voicing candidati per un accordo, ordinati per costo (difficoltà + stile). */
export function candidatesFor(input: Chord, style: VoicingStyle = 'auto', limit = 12): Voicing[] {
  const chord = style === 'power' ? powerize(input) : input;
  const ck = `${pc(chord.root)}|${chord.quality}|${chord.bass ? pc(chord.bass) : ''}|${style}`;
  const hit = cache.get(ck);
  if (hit) return hit;
  const seen = new Set<string>();
  let all: Voicing[] = [];
  for (const v of templateVoicings(chord)) {
    const k = key(v.frets);
    if (!seen.has(k)) { seen.add(k); all.push(v); }
  }
  if (all.length < 4 || chord.bass) {
    for (const v of genericVoicings(chord)) {
      const k = key(v.frets);
      if (!seen.has(k)) { seen.add(k); all.push(v); }
    }
  }
  if (all.length === 0 && chord.bass) {
    // basso impossibile: ripiega sull'accordo senza basso
    all = candidatesFor({ root: chord.root, quality: chord.quality }, style, limit);
  }
  const sorted = all
    .map((v) => ({ v, c: v.difficulty + styleCost(v, style) }))
    .sort((a, b) => a.c - b.c)
    .slice(0, limit)
    .map((x) => x.v);
  cache.set(ck, sorted);
  return sorted;
}

function center(v: Voicing): number {
  const fretted = v.frets.filter((f): f is number => f !== null && f > 0);
  if (!fretted.length) return 0;
  return fretted.reduce((a, b) => a + b, 0) / fretted.length;
}

/** Costo di passaggio da una forma all'altra: salto della mano + movimento delle dita. */
export function transitionCost(a: Voicing, b: Voicing): number {
  const d = Math.abs(center(a) - center(b));
  let fingerMove = 0;
  for (let s = 0; s < 6; s++) {
    const fa = a.frets[s];
    const fb = b.frets[s];
    if (fa !== null && fb !== null && fa > 0 && fb > 0) fingerMove += Math.abs(fa - fb);
  }
  return 0.3 * d + (d > 5 ? 0.8 : 0) + 0.04 * fingerMove;
}

/**
 * Sceglie le forme per tutta la progressione minimizzando difficoltà + spostamenti (Viterbi),
 * considerando anche il ritorno dall'ultimo al primo accordo (loop).
 */
export function voiceProgression(chords: Chord[], style: VoicingStyle = 'auto', loop = true): Voicing[] {
  if (chords.length === 0) return [];
  const cands = chords.map((c) => candidatesFor(c, style));
  const local = cands.map((list) => list.map((v) => v.difficulty + styleCost(v, style)));
  if (cands.some((l) => l.length === 0)) return cands.map((l) => l[0]);
  if (chords.length === 1) return [cands[0][0]];
  if (!loop) return viterbiFree(cands, local);

  let bestTotal = Infinity;
  let bestPath: number[] = [];
  const firstOptions = Math.min(6, cands[0].length);
  for (let start = 0; start < firstOptions; start++) {
    let cost = [local[0][start]];
    const back: number[][] = [[start]];
    let prevIdx = [start];
    for (let i = 1; i < chords.length; i++) {
      const nc: number[] = [];
      const nb: number[] = [];
      cands[i].forEach((v, j) => {
        let best = Infinity;
        let arg = 0;
        prevIdx.forEach((pi, k) => {
          const c = cost[k] + transitionCost(cands[i - 1][pi], v);
          if (c < best) { best = c; arg = k; }
        });
        nc.push(best + local[i][j]);
        nb.push(arg);
      });
      cost = nc;
      back.push(nb);
      prevIdx = cands[i].map((_, j) => j);
    }
    cost.forEach((c, j) => {
      const total = c + transitionCost(cands[chords.length - 1][j], cands[0][start]);
      if (total < bestTotal) {
        bestTotal = total;
        const path = [j];
        let k = j;
        for (let i = chords.length - 1; i >= 1; i--) {
          k = back[i][k];
          path.unshift(k);
        }
        path[0] = start;
        bestPath = path;
      }
    });
  }
  return bestPath.map((j, i) => cands[i][j]);
}

function viterbiFree(cands: Voicing[][], local: number[][]): Voicing[] {
  let cost = local[0].slice();
  const back: number[][] = [];
  for (let i = 1; i < cands.length; i++) {
    const nc: number[] = [];
    const nb: number[] = [];
    cands[i].forEach((v, j) => {
      let best = Infinity;
      let arg = 0;
      cands[i - 1].forEach((u, k) => {
        const c = cost[k] + transitionCost(u, v);
        if (c < best) { best = c; arg = k; }
      });
      nc.push(best + local[i][j]);
      nb.push(arg);
    });
    cost = nc;
    back.push(nb);
  }
  let j = cost.indexOf(Math.min(...cost));
  const path = [j];
  for (let i = back.length - 1; i >= 0; i--) {
    j = back[i][j];
    path.unshift(j);
  }
  return path.map((k, i) => cands[i][k]);
}

export function voicingMidi(v: Voicing): number[] {
  return v.frets.flatMap((f, s) => (f === null ? [] : [OPEN_MIDI[s] + f]));
}

export function voicingPcs(v: Voicing): number[] {
  return v.frets.flatMap((f, s) => (f === null ? [] : [(OPEN_PC[s] + f) % 12]));
}
