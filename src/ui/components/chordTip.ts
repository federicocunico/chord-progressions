import { h } from '../dom';
import { chordDiagram } from './diagrams';
import { QUALITIES, chordSymbol, chordTones, type Chord } from '../../theory/chords';
import { noteName, pc } from '../../theory/notes';
import { voiceProgression, type Voicing } from '../../guitar/voicings';
import { parseRoman, prettyRoman, realize, type Key } from '../../theory/roman';
import { context, styleFor } from '../state';

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
//
// Nei testi un accordo si marca esplicitamente con un numerale romano, risolto nella tonalità del contesto:
//   [V7/vi] → mostra il numerale ("V7/vi")
//   {V7/vi} → mostra il simbolo (es. "E7" in Do, "Mi7" in notazione latina)
// Tutto il resto è testo: nessuna euristica decide cosa "sembra" un accordo.

const MARK_RE = /\[([^\]]+)\]|\{([^}]+)\}/g;

interface Mark {
  chord: Chord;
  label: string;
}

function resolveMark(token: string, asSymbol: boolean, key: Key): Mark {
  const rc = parseRoman(token);
  const chord = realize(rc, key);
  return { chord, label: asSymbol ? chordSymbol(chord) : prettyRoman(rc) };
}

function splitMarks(text: string, key: Key): (string | Mark)[] {
  const out: (string | Mark)[] = [];
  let last = 0;
  for (const m of text.matchAll(MARK_RE)) {
    const i = m.index ?? 0;
    if (i > last) out.push(text.slice(last, i));
    out.push(resolveMark(m[1] ?? m[2], m[2] !== undefined, key));
    last = i + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Testo con accordi marcati → nodi, con il diagramma al mouseover su ogni accordo. */
export function richText(text: string, key: Key): (string | HTMLElement)[] {
  return splitMarks(text, key).map((p) => (typeof p === 'string' ? p : chordRef(p.chord, p.label)));
}

/** Come richText, ma restituisce una stringa (per title, aria-label, didascalie). */
export function plainText(text: string, key: Key): string {
  return splitMarks(text, key).map((p) => (typeof p === 'string' ? p : p.label)).join('');
}

/** Elenca i token marcati in un testo (usato dai test per validare i dati). */
export function marks(text: string): string[] {
  return [...text.matchAll(MARK_RE)].map((m) => m[1] ?? m[2]);
}
