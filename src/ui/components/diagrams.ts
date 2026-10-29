import { s, h } from '../dom';
import type { Voicing } from '../../guitar/voicings';
import { OPEN_PC } from '../../guitar/shapes';
import { noteName, spellPc, mod } from '../../theory/notes';
import type { HarmonicFunction } from '../../theory/analysis';

/** Diagramma di un accordo per chitarra (vista verticale, 6ª corda a sinistra). */
export function chordDiagram(v: Voicing, opts: { rootPc: number; size?: 'sm' | 'md'; title?: string; flats?: boolean }): SVGSVGElement {
  const sm = opts.size === 'sm';
  const sp = sm ? 11 : 15; // distanza tra le corde
  const fs = sm ? 14 : 19; // altezza del tasto
  const left = sm ? 16 : 22;
  const top = sm ? 16 : 24;
  const fretted = v.frets.filter((f): f is number => f !== null && f > 0);
  const maxF = fretted.length ? Math.max(...fretted) : 0;
  const minF = fretted.length ? Math.min(...fretted) : 0;
  const base = maxF <= 5 ? 1 : minF;
  const rows = Math.max(sm ? 4 : 5, maxF - base + 1);
  const width = left + sp * 5 + (sm ? 10 : 14);
  const notesRow = sm ? 0 : 14;
  const height = top + rows * fs + 8 + notesRow;
  const x = (str: number) => left + str * sp;
  const y = (f: number) => top + (f - base + 0.5) * fs;
  const r = sm ? 4.6 : 6.4;

  const g: SVGElement[] = [];
  // tasti
  for (let i = 0; i <= rows; i++) {
    g.push(s('line', { x1: x(0), x2: x(5), y1: top + i * fs, y2: top + i * fs, class: 'dg-fret' }));
  }
  if (base === 1) g.push(s('rect', { x: x(0) - 1, y: top - 3, width: sp * 5 + 2, height: 4, rx: 1, class: 'dg-nut' }));
  else g.push(s('text', { x: left - 5, y: top + fs * 0.5 + 4, class: 'dg-pos', 'text-anchor': 'end' }, String(base)));
  // corde
  for (let i = 0; i < 6; i++) g.push(s('line', { x1: x(i), x2: x(i), y1: top, y2: top + rows * fs, class: 'dg-string', 'stroke-width': 1.6 - i * 0.18 }));
  // vuote / mute
  v.frets.forEach((f, i) => {
    if (f === null) {
      const c = sm ? 3 : 4;
      g.push(s('path', { d: `M${x(i) - c},${top - 12 - c} l${2 * c},${2 * c} M${x(i) + c},${top - 12 - c} l${-2 * c},${2 * c}`, class: 'dg-mute' }));
    } else if (f === 0) {
      const isRoot = OPEN_PC[i] === opts.rootPc;
      g.push(s('circle', { cx: x(i), cy: top - 12, r: sm ? 3.2 : 4.2, class: isRoot ? 'dg-open root' : 'dg-open' }));
    }
  });
  // barré
  if (v.barre) {
    g.push(s('rect', {
      x: x(v.barre.from) - r, y: y(v.barre.fret) - r, width: x(v.barre.to) - x(v.barre.from) + 2 * r, height: 2 * r, rx: r, class: 'dg-barre',
    }));
  }
  // dita
  v.frets.forEach((f, i) => {
    if (f === null || f === 0) return;
    const isRoot = (OPEN_PC[i] + f) % 12 === opts.rootPc;
    const onBarre = v.barre && v.barre.fret === f && i >= v.barre.from && i <= v.barre.to && v.fingers[i] === 1;
    if (!onBarre || isRoot) g.push(s('circle', { cx: x(i), cy: y(f), r, class: isRoot ? 'dg-dot root' : 'dg-dot' }));
    const fi = v.fingers[i];
    if (fi && !sm && (!onBarre || i === v.barre!.from)) {
      g.push(s('text', { x: x(i), y: y(f) + 3.6, class: 'dg-finger', 'text-anchor': 'middle' }, String(fi)));
    }
  });
  // nomi delle note
  if (!sm) {
    v.frets.forEach((f, i) => {
      if (f === null) return;
      const p = mod(OPEN_PC[i] + f, 12);
      g.push(s('text', { x: x(i), y: top + rows * fs + 16, class: p === opts.rootPc ? 'dg-note root' : 'dg-note', 'text-anchor': 'middle' }, noteName(spellPc(p, opts.flats)).replace(/[♯]/, '♯')));
    });
  }
  const label = `${opts.title ?? 'Accordo'}: ${v.frets.map((f) => (f === null ? 'x' : f)).join(' ')} (dalla 6ª alla 1ª corda)`;
  return s('svg', { viewBox: `0 0 ${width} ${height}`, class: `diagram ${sm ? 'sm' : 'md'}`, role: 'img', 'aria-label': label }, s('title', null, label), g);
}

const FIFTHS = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];
const fifthIndex = (p: number) => FIFTHS.indexOf(mod(p, 12));

export interface CirclePoint {
  rootPc: number;
  family: 'major' | 'minor' | 'dim';
  fn: HarmonicFunction;
  label: string;
}

/** Circolo delle quinte con la tonalità evidenziata e il percorso della progressione. */
export function circleOfFifths(opts: { tonicPc: number; minor: boolean; path: CirclePoint[]; flats?: boolean; activeIndex?: number }): SVGSVGElement {
  const C = 160;
  const R = [130, 92, 58];
  const pos = (idx: number, ring: number) => {
    const a = ((idx * 30 - 90) * Math.PI) / 180;
    return [C + R[ring] * Math.cos(a), C + R[ring] * Math.sin(a)];
  };
  const majorTonic = opts.minor ? mod(opts.tonicPc + 3, 12) : opts.tonicPc;
  const ki = fifthIndex(majorTonic);
  const g: SVGElement[] = [];
  // spicchio della tonalità (IV–I–V e relativi)
  const wedge = (from: number, to: number, r1: number, r2: number) => {
    const a1 = ((from * 30 - 105) * Math.PI) / 180;
    const a2 = ((to * 30 - 75) * Math.PI) / 180;
    const p = (r: number, a: number) => `${C + r * Math.cos(a)},${C + r * Math.sin(a)}`;
    return `M${p(r1, a1)} A${r1},${r1} 0 0 1 ${p(r1, a2)} L${p(r2, a2)} A${r2},${r2} 0 0 0 ${p(r2, a1)} Z`;
  };
  g.push(s('path', { d: wedge(ki - 1, ki + 1, 152, 38), class: 'cof-key' }));
  g.push(s('circle', { cx: C, cy: C, r: 152, class: 'cof-ring' }));
  g.push(s('circle', { cx: C, cy: C, r: 111, class: 'cof-ring' }));
  g.push(s('circle', { cx: C, cy: C, r: 74, class: 'cof-ring' }));
  for (let i = 0; i < 12; i++) {
    const p = FIFTHS[i];
    const flats = i >= 7 || (opts.flats ?? false);
    const [mx, my] = pos(i, 0);
    const [nx, ny] = pos(i, 1);
    const [dx, dy] = pos(i, 2);
    const inKey = Math.abs(((i - ki + 18) % 12) - 6) <= 1;
    g.push(s('text', { x: mx, y: my + 5, class: `cof-major${inKey ? ' in' : ''}${i === ki && !opts.minor ? ' tonic' : ''}`, 'text-anchor': 'middle' }, noteName(spellPc(p, flats))));
    g.push(s('text', { x: nx, y: ny + 4, class: `cof-minor${inKey ? ' in' : ''}${i === ki && opts.minor ? ' tonic' : ''}`, 'text-anchor': 'middle' }, noteName(spellPc(p + 9, flats && i !== 6)) + 'm'));
    if (i === ki) g.push(s('text', { x: dx, y: dy + 4, class: 'cof-dim in', 'text-anchor': 'middle' }, noteName(spellPc(p + 11, flats)) + '°'));
  }
  // percorso
  const pts = opts.path.map((pt) => {
    const ring = pt.family === 'major' ? 0 : pt.family === 'minor' ? 1 : 2;
    const idx = fifthIndex(pt.family === 'major' ? pt.rootPc : pt.rootPc + 3);
    return pos(idx, ring);
  });
  if (pts.length > 1) {
    const d = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px},${py}`).join(' ') + (pts.length > 2 ? ' Z' : '');
    g.push(s('path', { d, class: 'cof-path' }));
  }
  const used = new Map<string, number>();
  pts.forEach(([px, py], i) => {
    const k = `${Math.round(px)},${Math.round(py)}`;
    const n = used.get(k) ?? 0;
    used.set(k, n + 1);
    const pt = opts.path[i];
    g.push(s('circle', { cx: px, cy: py, r: 15, class: `cof-node fn-${pt.fn}${opts.activeIndex === i ? ' active' : ''}` }));
    g.push(s('text', { x: px + 11 + n * 9, y: py - 10, class: 'cof-step', 'text-anchor': 'middle' }, String(i + 1)));
  });
  return s('svg', { viewBox: '0 0 320 320', class: 'circle', role: 'img', 'aria-label': 'Circolo delle quinte con il percorso della progressione' },
    s('title', null, 'Circolo delle quinte'), g);
}

/** Manico con le note di una scala e le note dell'accordo evidenziate. */
export function fretboard(opts: { scalePcs: number[]; tonicPc: number; chordPcs?: number[]; chordRoot?: number; fn?: HarmonicFunction; frets?: number; flats?: boolean; labels?: 'notes' | 'degrees' }): HTMLElement {
  const frets = opts.frets ?? 15;
  const fw = 38;
  const sh = 22;
  const left = 26;
  const top = 18;
  const width = left + fw * (frets + 1) + 10;
  const height = top + sh * 5 + 30;
  const g: SVGElement[] = [];
  const xf = (f: number) => left + f * fw + fw / 2;
  const ys = (str: number) => top + (5 - str) * sh;
  g.push(s('rect', { x: left + fw, y: top - 6, width: fw * frets, height: sh * 5 + 12, rx: 4, class: 'fb-wood' }));
  for (let f = 1; f <= frets + 1; f++) g.push(s('line', { x1: left + f * fw, x2: left + f * fw, y1: top - 6, y2: top + sh * 5 + 6, class: f === 1 ? 'fb-nut' : 'fb-fret' }));
  for (const m of [3, 5, 7, 9, 15]) if (m <= frets) g.push(s('circle', { cx: xf(m), cy: top + sh * 2.5, r: 4, class: 'fb-inlay' }));
  if (frets >= 12) {
    g.push(s('circle', { cx: xf(12), cy: top + sh * 1.5, r: 4, class: 'fb-inlay' }));
    g.push(s('circle', { cx: xf(12), cy: top + sh * 3.5, r: 4, class: 'fb-inlay' }));
  }
  for (let str = 0; str < 6; str++) g.push(s('line', { x1: left + fw, x2: left + fw * (frets + 1), y1: ys(str), y2: ys(str), class: 'fb-string', 'stroke-width': 2.2 - str * 0.3 }));
  for (let f = 0; f <= frets; f++) if (f % 3 === 0 || f === 12) g.push(s('text', { x: xf(f), y: top + sh * 5 + 24, class: 'fb-num', 'text-anchor': 'middle' }, String(f)));
  const scale = new Set(opts.scalePcs);
  const chord = new Set(opts.chordPcs ?? []);
  const DEG = ['1', '♭2', '2', '♭3', '3', '4', '♯4', '5', '♭6', '6', '♭7', '7'];
  for (let str = 0; str < 6; str++) {
    for (let f = 0; f <= frets; f++) {
      const p = (OPEN_PC[str] + f) % 12;
      const inChord = chord.has(p);
      if (!scale.has(p) && !inChord) continue;
      const isTonic = p === opts.tonicPc;
      const isRoot = opts.chordRoot !== undefined && p === opts.chordRoot;
      const cls = ['fb-note', inChord ? `chord fn-${opts.fn ?? 'T'}` : 'scale', isTonic ? 'tonic' : '', isRoot ? 'root' : '', !scale.has(p) ? 'outside' : ''].join(' ');
      const label = opts.labels === 'degrees' ? DEG[mod(p - opts.tonicPc, 12)] : noteName(spellPc(p, opts.flats));
      g.push(s('g', { class: cls },
        s('circle', { cx: xf(f), cy: ys(str), r: inChord ? 10 : 8.5 }),
        s('text', { x: xf(f), y: ys(str) + 3.5, 'text-anchor': 'middle' }, label)));
    }
  }
  const svg = s('svg', { viewBox: `0 0 ${width} ${height}`, width, height, class: 'fretboard', role: 'img', 'aria-label': 'Manico della chitarra con le note della scala' }, g);
  return h('div', { class: 'fretboard-wrap' }, svg);
}

/** Curva della tensione armonica. */
export function tensionCurve(points: { tension: number; fn: HarmonicFunction; label: string }[], activeIndex?: number): SVGSVGElement {
  const step = 64;
  const w = Math.max(points.length, 2) * step;
  const hgt = 120;
  const y = (t: number) => 92 - t * 13;
  const xs = (i: number) => step / 2 + i * step;
  const g: SVGElement[] = [];
  for (const [t, label] of [[0.6, 'riposo'], [3, 'movimento'], [5.2, 'tensione']] as const) {
    g.push(s('line', { x1: 0, x2: w, y1: y(t), y2: y(t), class: 'tc-grid' }));
    g.push(s('text', { x: 4, y: y(t) - 3, class: 'tc-axis' }, label));
  }
  if (points.length > 1) {
    const d = points.map((p, i) => {
      if (i === 0) return `M${xs(0)},${y(p.tension)}`;
      const px = xs(i - 1);
      const py = y(points[i - 1].tension);
      const cx = (px + xs(i)) / 2;
      return `C${cx},${py} ${cx},${y(p.tension)} ${xs(i)},${y(p.tension)}`;
    }).join(' ');
    g.push(s('path', { d, class: 'tc-line' }));
  }
  points.forEach((p, i) => {
    g.push(s('circle', { cx: xs(i), cy: y(p.tension), r: activeIndex === i ? 8 : 6, class: `tc-dot fn-${p.fn}` }));
    g.push(s('text', { x: xs(i), y: hgt - 6, class: 'tc-label', 'text-anchor': 'middle' }, p.label));
  });
  return s('svg', { viewBox: `0 0 ${w} ${hgt}`, class: 'tension', role: 'img', 'aria-label': 'Curva della tensione armonica' }, g);
}
