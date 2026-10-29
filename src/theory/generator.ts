import { PROGRESSIONS, type ProgressionDef } from '../data/progressions';
import { GENRE_MAP, GENRES, type GenreId, type Flavor } from '../data/genres';
import { MODES, harmonize, type ModeId } from './scales';
import { QUALITIES, type QualityId } from './chords';
import { mod } from './notes';
import {
  parseRoman, formatRoman, skeletonToken, rootOffset, isDiatonic, makeKey, type RomanChord,
} from './roman';
import { analyzeChord, type HarmonicFunction } from './analysis';

/** PRNG deterministico (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Model {
  pool: string[];
  trans: Map<string, Map<string, number>>;
  start: Map<string, number>;
  tonic: string;
}

const FN_MATRIX: Record<HarmonicFunction, Record<HarmonicFunction, number>> = {
  T: { T: 0.15, S: 0.4, D: 0.3 },
  S: { T: 0.25, S: 0.15, D: 0.45 },
  D: { T: 0.55, S: 0.14, D: 0.08 },
};
const MOTION: Record<number, number> = { 0: 0, 1: 0.03, 2: 0.12, 3: 0.08, 4: 0.08, 5: 0.3, 6: 0, 7: 0.12, 8: 0.08, 9: 0.08, 10: 0.12, 11: 0.03 };

const refKey = (mode: ModeId) => makeKey('C', mode);

/** Probabilità "teorica" di passare da a a b secondo l'armonia funzionale. */
export function functionalPrior(a: string, b: string, mode: ModeId): number {
  if (a === b) return 0;
  const key = refKey(mode);
  const ra = parseRoman(a);
  const rb = parseRoman(b);
  const fa = analyzeChord(ra, key);
  const fb = analyzeChord(rb, key);
  const oa = rootOffset(ra);
  const ob = rootOffset(rb);
  let p = 0.04 + FN_MATRIX[fa.fn][fb.fn] + MOTION[mod(ob - oa, 12)];
  if (QUALITIES[ra.quality].family === 'diminished') p = ob === mod(oa + 1, 12) ? p + 0.6 : p * 0.3;
  if (ra.target) {
    const t = rootOffset({ ...ra.target, quality: 'maj' });
    p = ob === t ? p + 1 : p * 0.2;
  }
  if (!rb.target && !isDiatonic(rb, key)) p *= 0.5;
  if (QUALITIES[rb.quality].family === 'diminished') p *= 0.45;
  if (ob === 0 && !rb.target) p *= 1.2;
  return p;
}

function genreWeight(p: ProgressionDef, genre: GenreId): number {
  const g = GENRE_MAP[genre];
  if (p.genres.includes(genre)) return 1;
  const children = GENRES.filter((x) => x.parent === genre).map((x) => x.id);
  if (p.genres.some((x) => children.includes(x))) return 0.8;
  if (g.parent && p.genres.includes(g.parent)) return 0.45;
  if (g.parent && p.genres.some((x) => GENRE_MAP[x].parent === g.parent)) return 0.2;
  return 0.03;
}

function diatonicTokens(mode: ModeId): string[] {
  const def = MODES[mode];
  if (mode === 'blues') return ['I', 'IV', 'V', 'ii', 'vi', 'bVII', 'bIII'];
  return harmonize(def.scale).map((d) => formatRoman({ acc: d.acc, degree: d.degree, quality: d.triad }));
}

const modelCache = new Map<string, Model>();

export function buildModel(genre: GenreId, mode: ModeId): Model {
  const ck = `${genre}|${mode}`;
  const hit = modelCache.get(ck);
  if (hit) return hit;
  const tonality = MODES[mode].tonality;
  const counts = new Map<string, Map<string, number>>();
  const start = new Map<string, number>();
  const pool = new Set(diatonicTokens(mode));
  const tokenWeight = new Map<string, number>();
  const add = (m: Map<string, number>, k: string, w: number) => m.set(k, (m.get(k) ?? 0) + w);

  for (const p of PROGRESSIONS) {
    if (MODES[p.mode].tonality !== tonality) continue;
    let w = genreWeight(p, genre) * Math.pow(p.popularity, 1.3);
    if (p.mode === mode) w *= 1.5;
    const toks = p.chords.map(skeletonToken);
    new Set(toks).forEach((t) => add(tokenWeight, t, w));
    add(start, toks[0], w);
    for (let i = 0; i < toks.length; i++) {
      const a = toks[i];
      const b = toks[(i + 1) % toks.length];
      if (a === b) continue;
      if (!counts.has(a)) counts.set(a, new Map());
      add(counts.get(a)!, b, w);
    }
  }
  // accordi fuori scala solo se il genere li usa davvero
  for (const [t, w] of tokenWeight) if (w >= 0.9) pool.add(t);
  const poolArr = [...pool];
  const trans = new Map<string, Map<string, number>>();
  for (const a of poolArr) trans.set(a, transitionRow(a, poolArr, counts.get(a), mode));
  const tonic = tonality === 'minor' ? 'i' : 'I';
  const model: Model = { pool: poolArr, trans, start, tonic };
  modelCache.set(ck, model);
  return model;
}

function transitionRow(a: string, pool: string[], kb: Map<string, number> | undefined, mode: ModeId): Map<string, number> {
  const prior = new Map<string, number>();
  let ps = 0;
  for (const b of pool) {
    const v = functionalPrior(a, b, mode);
    prior.set(b, v);
    ps += v;
  }
  let ks = 0;
  if (kb) for (const [b, v] of kb) if (pool.includes(b)) ks += v;
  const row = new Map<string, number>();
  for (const b of pool) {
    if (b === a) continue;
    const pp = ps ? (prior.get(b) ?? 0) / ps : 0;
    const kp = ks && kb ? (kb.get(b) ?? 0) / ks : 0;
    const v = ks ? 0.7 * kp + 0.3 * pp : pp;
    if (v > 0) row.set(b, v);
  }
  return row;
}

export interface NextSuggestion {
  token: string;
  prob: number;
}

/** Accordi consigliati dopo `numeral`, dal più probabile. */
export function suggestNext(numeral: string, genre: GenreId, mode: ModeId, limit = 8): NextSuggestion[] {
  const model = buildModel(genre, mode);
  const tok = skeletonToken(numeral);
  const row = model.trans.get(tok) ?? transitionRow(tok, model.pool, undefined, mode);
  return [...row.entries()]
    .map(([token, prob]) => ({ token, prob }))
    .sort((a, b) => b.prob - a.prob)
    .slice(0, limit);
}

export interface GenerateOptions {
  genre: GenreId;
  mode: ModeId;
  length: number;
  popularity: number; // 1..5
  seed: number;
  count?: number;
}

export interface GeneratedProgression {
  chords: string[];
  tokens: string[];
  /** 0..1: quanto è "familiare" (1 = molto comune). */
  familiarity: number;
  match?: ProgressionDef;
}

function sample(dist: [string, number][], r: number): string {
  const total = dist.reduce((s, [, v]) => s + v, 0);
  let x = r * total;
  for (const [k, v] of dist) {
    x -= v;
    if (x <= 0) return k;
  }
  return dist[dist.length - 1][0];
}

function canonicalRotation(t: string[]): string {
  let best = '';
  for (let i = 0; i < t.length; i++) {
    const s = [...t.slice(i), ...t.slice(0, i)].join(' ');
    if (!best || s < best) best = s;
  }
  return best;
}

const kbCanon = new Map<string, ProgressionDef>();
const kbExact = new Map<string, ProgressionDef>();
function indexKb(): void {
  if (kbCanon.size) return;
  for (const p of [...PROGRESSIONS].sort((a, b) => a.popularity - b.popularity)) {
    const t = p.chords.map(skeletonToken);
    const ton = MODES[p.mode].tonality;
    kbCanon.set(`${ton}|${canonicalRotation(t)}`, p);
    kbExact.set(`${ton}|${t.join(' ')}`, p);
  }
}

/** Progressione della libreria uguale (o una sua rotazione). */
export function findMatch(tokens: string[], mode: ModeId): ProgressionDef | undefined {
  indexKb();
  const t = tokens.map(skeletonToken);
  const ton = MODES[mode].tonality;
  return kbExact.get(`${ton}|${t.join(' ')}`) ?? kbCanon.get(`${ton}|${canonicalRotation(t)}`);
}

export function generate(opts: GenerateOptions): GeneratedProgression[] {
  const { genre, mode, length, popularity, seed } = opts;
  const count = opts.count ?? 6;
  const model = buildModel(genre, mode);
  const rand = rng(seed * 7919 + length * 31 + popularity);
  const startDist = new Map<string, number>();
  const startTotal = [...model.start.values()].reduce((a, b) => a + b, 0) || 1;
  for (const [k, v] of model.start) if (model.pool.includes(k)) startDist.set(k, 0.6 * (v / startTotal));
  startDist.set(model.tonic, (startDist.get(model.tonic) ?? 0) + 0.4);
  const startArr = [...startDist.entries()];

  const key = refKey(mode);
  const outside = new Map(model.pool.map((t) => [t, mode !== 'blues' && !isDiatonic(parseRoman(t), key)]));
  const flavor0 = GENRE_MAP[genre].flavor;
  const maxOutside = (length <= 4 ? 1 : 2) + (flavor0 === 'sevenths' || flavor0 === 'extended' ? 1 : 0);
  const floor = 0.35 / model.pool.length;
  const seen = new Map<string, { tokens: string[]; score: number }>();
  for (let n = 0; n < 700; n++) {
    const seq = [sample(startArr, rand())];
    let logp = Math.log(startDist.get(seq[0]) ?? 1e-3);
    let ok = true;
    for (let i = 1; i < length; i++) {
      const row = model.trans.get(seq[i - 1]);
      if (!row) { ok = false; break; }
      const cand = [...row.entries()].filter(([t]) => seq.filter((s) => s === t).length < 2);
      if (!cand.length) { ok = false; break; }
      const next = sample(cand, rand());
      const pn = row.get(next)!;
      if (pn < floor) { ok = false; break; }
      logp += Math.log(pn);
      seq.push(next);
    }
    if (!ok) continue;
    if (length > 1) {
      if (seq[length - 1] === seq[0]) continue;
      const close = model.trans.get(seq[length - 1])?.get(seq[0]) ?? 0;
      if (close < floor) continue;
      logp += Math.log(close);
    }
    if (seq.filter((t) => outside.get(t)).length > maxOutside) continue;
    if (!seq.some((t) => t === model.tonic || (mode === 'phrygianDominant' && t === 'I'))) continue;
    const canon = canonicalRotation(seq);
    const score = logp / length;
    const prev = seen.get(canon);
    if (!prev || score > prev.score) seen.set(canon, { tokens: seq, score });
  }
  const all = [...seen.values()].sort((a, b) => b.score - a.score);
  // scarta la coda di qualità più bassa, poi scegli la finestra secondo la popolarità
  const usable = all.slice(0, Math.max(count, Math.ceil(all.length * 0.85)));
  const p = Math.min(5, Math.max(1, popularity));
  const c = ((5 - p) / 4) * 0.8;
  const startIdx = Math.max(0, Math.min(usable.length - count, Math.floor(c * (usable.length - count))));
  const picked = usable.slice(startIdx, startIdx + count);
  const flavor = GENRE_MAP[genre].flavor;
  const color = rng(seed + 17);
  return picked.map((g) => {
    const rank = all.indexOf(g);
    const tokens = g.tokens;
    return {
      tokens,
      chords: colorize(tokens, flavor, mode, color),
      familiarity: all.length > 1 ? 1 - rank / (all.length - 1) : 1,
      match: findMatch(tokens, mode),
    };
  });
}

export function colorize(tokens: string[], flavor: Flavor, mode: ModeId, rand: () => number = Math.random): string[] {
  const key = refKey(mode);
  const blues = mode === 'blues';
  return tokens.map((t) => {
    const rc = parseRoman(t);
    const off = rootOffset(rc);
    const fam = QUALITIES[rc.quality].family;
    const set = (q: QualityId): string => formatRoman({ ...rc, quality: q });
    const seventh = (): QualityId => {
      if (fam === 'minor') return 'm7';
      if (fam === 'diminished') return 'm7b5';
      if (rc.quality === 'aug') return 'aug';
      if (blues || rc.target || off === 7) return '7';
      const asMaj7: RomanChord = { ...rc, quality: 'maj7' };
      if (isDiatonic(asMaj7, key)) return 'maj7';
      return '7';
    };
    switch (flavor) {
      case 'sevenths': return set(seventh());
      case 'extended': {
        const s = seventh();
        if (s === 'maj7' && (off === 0 || off === 5)) return set(rand() < 0.5 ? 'maj9' : 'maj7');
        if (s === 'm7' && rand() < 0.5) return set('m9');
        if (s === '7' && rand() < 0.5) return set(off === 7 ? '13' : '9');
        return set(s);
      }
      case 'color': {
        if (blues && fam === 'major') return set('7');
        const r = rand();
        if (fam === 'major' && !rc.target && (off === 0 || off === 5) && r < 0.35) {
          const q: QualityId = r < 0.18 ? 'add9' : off === 5 && isDiatonic({ ...rc, quality: 'maj7' }, key) ? 'maj7' : 'sus2';
          return set(q);
        }
        if (fam === 'major' && off === 7 && r < 0.25) return set('sus4');
        if (fam === 'minor' && r < 0.3) return set('m7');
        return t;
      }
      default:
        return blues && fam === 'major' ? set('7') : t;
    }
  });
}

/** Progressioni della libreria adatte al contesto, ordinate per vicinanza al genere e popolarità. */
export function libraryFor(genre: GenreId | 'all', mode: ModeId, length?: number): ProgressionDef[] {
  const tonality = MODES[mode].tonality;
  return PROGRESSIONS
    .filter((p) => MODES[p.mode].tonality === tonality)
    .filter((p) => !length || p.chords.length === length)
    .map((p) => ({ p, w: (genre === 'all' ? 1 : genreWeight(p, genre)) * (p.mode === mode ? 1.3 : 1) }))
    .filter((x) => x.w >= 0.2)
    .sort((a, b) => b.w * b.p.popularity - a.w * a.p.popularity)
    .map((x) => x.p);
}

