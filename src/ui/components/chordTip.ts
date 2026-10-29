import { h } from '../dom';
import { chordDiagram } from './diagrams';
import { QUALITIES, chordSymbol, chordTones, type Chord, type QualityId } from '../../theory/chords';
import { noteName, parseNote, pc, type Note } from '../../theory/notes';
import { voiceProgression, type Voicing } from '../../guitar/voicings';
import { parseRoman, realize } from '../../theory/roman';
import { context, currentKey, styleFor } from '../state';

interface TipData {
  chord: Chord;
  voicing?: Voicing;
  caption?: string;
}

const registry = new WeakMap<Element, TipData>();
const ATTR = 'data-chord-tip';

/**
 * Associa un accordo a un elemento: al passaggio del mouse (o al focus / tocco) compare il diagramma.
 * Se si passa `voicing` si mostra esattamente la forma usata nella progressione, altrimenti la più comoda.
 */
export function tip<T extends Element>(el: T, chord: Chord, voicing?: Voicing, caption?: string): T {
  registry.set(el, { chord, voicing, caption });
  el.setAttribute(ATTR, '');
  return el;
}

/** Nome di un accordo scritto nel testo, con il suo diagramma al mouseover. */
export function chordRef(chord: Chord, text?: string, voicing?: Voicing): HTMLElement {
  return tip(h('span', { class: 'chord-ref', tabindex: '0' }, text ?? chordSymbol(chord)), chord, voicing);
}

// ── popover ────────────────────────────────────────────────────────────────

let pop: HTMLElement | null = null;
let anchor: Element | null = null;
let showTimer = 0;

function popover(): HTMLElement {
  if (!pop) {
    pop = h('div', { class: 'chord-pop', role: 'tooltip', id: 'chord-pop', hidden: true });
    document.body.append(pop);
  }
  return pop;
}

function build(d: TipData): HTMLElement {
  const { chord } = d;
  const v = d.voicing ?? voiceProgression([chord], styleFor(context.genre), false)[0];
  const flats = chord.root.acc < 0 || (chord.bass?.acc ?? 0) < 0;
  const q = QUALITIES[chord.quality];
  return h('div', { class: 'chord-pop-body' },
    h('strong', { class: 'chord-pop-name' }, chordSymbol(chord)),
    h('span', { class: 'chord-pop-q muted small' }, q.name),
    v ? chordDiagram(v, { rootPc: pc(chord.root), title: chordSymbol(chord), flats }) : null,
    v ? h('span', { class: 'chord-pop-voicing small' }, v.label) : null,
    h('span', { class: 'chord-pop-notes small muted' }, chordTones(chord).map((n) => noteName(n)).join(' · ')),
    d.caption ? h('span', { class: 'chord-pop-cap small muted' }, d.caption) : null);
}

function place(el: Element, p: HTMLElement): void {
  const r = el.getBoundingClientRect();
  const gap = 8;
  const w = p.offsetWidth;
  const hgt = p.offsetHeight;
  let left = r.left + r.width / 2 - w / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
  let top = r.bottom + gap;
  if (top + hgt > window.innerHeight - 8) top = Math.max(8, r.top - gap - hgt);
  p.style.left = `${left}px`;
  p.style.top = `${top}px`;
}

function show(el: Element): void {
  const d = registry.get(el);
  if (!d) return;
  const p = popover();
  anchor = el;
  p.replaceChildren(build(d));
  p.hidden = false;
  place(el, p);
  el.setAttribute('aria-describedby', 'chord-pop');
}

export function hideChordTip(): void {
  window.clearTimeout(showTimer);
  if (anchor) anchor.removeAttribute('aria-describedby');
  anchor = null;
  if (pop) pop.hidden = true;
}

const target = (e: Event): Element | null => (e.target instanceof Element ? e.target.closest(`[${ATTR}]`) : null);

/** Installa i listener globali (una sola volta): vale per tutto il sito, anche per i contenuti creati dopo. */
export function initChordTips(): void {
  const open = (e: Event, delay: number) => {
    const el = target(e);
    if (!el || el === anchor) return;
    window.clearTimeout(showTimer);
    showTimer = window.setTimeout(() => show(el), delay);
  };
  const close = (e: Event) => {
    const el = target(e);
    if (!el) return;
    const to = (e as MouseEvent | FocusEvent).relatedTarget;
    if (to instanceof Node && el.contains(to)) return;
    if (el === anchor || !anchor) hideChordTip();
    else window.clearTimeout(showTimer);
  };
  document.addEventListener('mouseover', (e) => open(e, 90));
  document.addEventListener('mouseout', close);
  document.addEventListener('focusin', (e) => open(e, 0));
  document.addEventListener('focusout', close);
  // touch: un tocco apre il diagramma, un tocco altrove lo chiude
  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    const el = target(e);
    if (el) { window.clearTimeout(showTimer); if (el !== anchor) show(el); } else hideChordTip();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideChordTip(); });
  const stale = () => { if (anchor && !anchor.isConnected) hideChordTip(); };
  document.addEventListener('mousemove', stale, { passive: true });
  window.addEventListener('scroll', hideChordTip, { passive: true, capture: true });
  window.addEventListener('resize', hideChordTip);
  window.addEventListener('hashchange', hideChordTip);
}

// ── accordi scritti nei testi ──────────────────────────────────────────────

const ROOT = '(?:Sol|Do|Re|Mi|Fa|La|Si|[A-G])[♯♭#b]?';
const SUFFIXES = (() => {
  const map = new Map<string, QualityId>();
  for (const q of Object.values(QUALITIES)) {
    if (!q.symbol) continue;
    for (const s of new Set([q.symbol, q.symbol.replace(/♭/g, 'b').replace(/♯/g, '#')])) map.set(s, q.id);
  }
  map.set('min', 'min'); map.set('min7', 'm7'); map.set('dim', 'dim'); map.set('aug', 'aug');
  return map;
})();
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const SUFFIX_RE = [...SUFFIXES.keys()].sort((a, b) => b.length - a.length).map(esc).join('|');
// Un nome è un accordo solo se ha un suffisso (Am, Sol7, Re♭7) o un basso (Do/Mi): "La" o "E" da soli sono parole.
const CHORD_RE = new RegExp(`(${ROOT})(${SUFFIX_RE})?(?:/(${ROOT}))?(?![\\p{L}\\d♯♭#])`, 'gu');

const LATIN: Record<string, string> = { Do: 'C', Re: 'D', Mi: 'E', Fa: 'F', Sol: 'G', La: 'A', Si: 'B' };
const noteFromText = (s: string): Note => parseNote(s.replace(/^(Sol|Do|Re|Mi|Fa|La|Si)/, (l) => LATIN[l]));

/** Interpreta un nome scritto (es. "Sol7", "Am", "Do/Mi"); null se non è un accordo. */
export function parseChordName(text: string): Chord | null {
  const m = new RegExp(`^${CHORD_RE.source}$`, 'u').exec(text);
  if (!m || (!m[2] && !m[3])) return null;
  try {
    return { root: noteFromText(m[1]), quality: m[2] ? SUFFIXES.get(m[2])! : 'maj', bass: m[3] ? noteFromText(m[3]) : undefined };
  } catch {
    return null;
  }
}

const ROMAN = '[♭♯]?(?:VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(?:°7?|ø7?|\\+|maj7|sus[24]|[0-9]+)?(?:/(?:[♭♯]?(?:VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)|[0-9]))?';
const NAME = `${ROOT}(?:${SUFFIX_RE})?(?:/${ROOT})?`;
const TOKEN = `(?:${ROMAN}|${NAME})`;
const NB = '(?![\\p{L}\\d♯♭#])';
// Una sequenza di almeno due accordi ("I – V – vi – IV", "Do – Sol – Lam"): qui anche i nomi nudi sono accordi.
const RUN_RE = new RegExp(`(?<![\\p{L}\\d])${TOKEN}(?:\\s*[–—,→-]\\s*${TOKEN})+${NB}`, 'gu');
const TOKEN_RE = new RegExp(`(?<![\\p{L}\\d])${TOKEN}${NB}`, 'gu');
// Un numero romano da solo è un accordo solo se è inequivocabile (♭VII, V7, I/3, ii°): "i" e "vi" nudi sono parole.
const SOLO_ROMAN = new RegExp(`^(?:[♭♯](?:VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)|(?:VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(?:°|ø|\\+|maj7|sus|[0-9]|/))`, 'u');

function chordFromToken(tok: string, bare: boolean): Chord | null {
  const named = parseChordName(tok) ?? (bare ? bareName(tok) : null);
  if (named) return named;
  if (!bare && !SOLO_ROMAN.test(tok)) return null;
  try {
    return realize(parseRoman(tok), currentKey());
  } catch {
    return null;
  }
}

function bareName(tok: string): Chord | null {
  if (!new RegExp(`^${ROOT}$`, 'u').test(tok)) return null;
  try {
    return { root: noteFromText(tok), quality: 'maj' };
  } catch {
    return null;
  }
}

function linkTokens(text: string, bare: boolean, out: (string | HTMLElement)[]): void {
  let last = 0;
  for (const m of text.matchAll(TOKEN_RE)) {
    const i = m.index ?? 0;
    if (!bare && !m[0].includes('/') && parseChordName(m[0]) === null && !SOLO_ROMAN.test(m[0])) continue;
    const chord = chordFromToken(m[0], bare);
    if (!chord) continue;
    if (i > last) out.push(text.slice(last, i));
    out.push(chordRef(chord, m[0]));
    last = i + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
}

/** Spezza un testo in nodi, sostituendo i nomi di accordo e i numeri romani con elementi che mostrano il diagramma. */
export function linkChords(text: string): (string | HTMLElement)[] {
  const out: (string | HTMLElement)[] = [];
  let last = 0;
  for (const m of text.matchAll(RUN_RE)) {
    const i = m.index ?? 0;
    const toks = [...m[0].matchAll(TOKEN_RE)].map((t) => t[0]);
    if (!toks.every((t) => chordFromToken(t, true))) continue;
    if (i > last) linkTokens(text.slice(last, i), false, out);
    linkTokens(m[0], true, out);
    last = i + m[0].length;
  }
  if (last < text.length) linkTokens(text.slice(last), false, out);
  return out.length === 1 && typeof out[0] === 'string' ? [text] : out;
}

const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'BUTTON', 'SVG', 'TITLE']);

/**
 * Rete di sicurezza: dopo ogni render cerca nei testi i nomi di accordo rimasti "nudi" e li rende interattivi.
 * Non tocca pulsanti, SVG e ciò che ha già un diagramma.
 */
export function autolinkChords(root: Element): void {
  // pulsanti con un accordo nell'etichetta (es. "Scala su Cmaj7"): il diagramma compare sul pulsante stesso
  root.querySelectorAll(`button:not([${ATTR}])`).forEach((b) => {
    for (const m of (b.textContent ?? '').matchAll(CHORD_RE)) {
      const chord = (m[2] || m[3]) ? parseChordName(m[0]) : null;
      if (chord) { tip(b, chord); break; }
    }
  });
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      for (let p = n.parentElement; p && p !== root.parentElement; p = p.parentElement) {
        if (SKIP.has(p.tagName.toUpperCase()) || p.hasAttribute(ATTR)) return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n as Text);
  for (const n of nodes) {
    const parts = linkChords(n.data);
    if (parts.length > 1 || typeof parts[0] !== 'string') n.replaceWith(...parts);
  }
}
