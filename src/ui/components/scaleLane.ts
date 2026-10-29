import { h } from '../dom';
import { chordRef } from './chordTip';
import type { ChordItem } from './progression';
import { noteName } from '../../theory/notes';
import type { Key } from '../../theory/roman';
import { scaleContext, scaleChangeText, keyScaleName, mergeBorrowed, type ScaleContext } from '../../theory/scaleTrack';

export interface LaneSegment {
  start: number;
  end: number;
  ctx: ScaleContext;
}

/** Accordi consecutivi nella stessa scala diventano un unico tratto della corsia. */
export function laneSegments(items: ChordItem[], key: Key): LaneSegment[] {
  const out: LaneSegment[] = [];
  items.forEach((it, i) => {
    const ctx = scaleContext(it.rc, key);
    const last = out[out.length - 1];
    const merged = last && last.ctx.id !== ctx.id ? mergeBorrowed(last.ctx, ctx, key) : null;
    if (last && last.ctx.id === ctx.id) last.end = i;
    else if (last && merged) { last.end = i; last.ctx = merged; }
    else out.push({ start: i, end: i, ctx });
  });
  return out;
}

/** I tratti della corsia, da mettere in una griglia a colonne allineata agli accordi (riga `row`). */
export function laneCells(items: ChordItem[], key: Key, selected: number, onSelect: (i: number) => void, row = 2): HTMLElement[] {
  return laneSegments(items, key).map((seg) => {
    const changed = seg.ctx.changes.length > 0;
    const label = changed
      ? h('span', null, h('b', null, seg.ctx.changes.map((c) => `${noteName(c.from)} → ${noteName(c.to)}`).join(', ')), h('br'), seg.ctx.named ?? 'la scala cambia')
      : h('span', null, h('b', null, seg.ctx.named ?? keyScaleName(key)), seg.end > seg.start ? ' · stessa scala' : '');
    return h('button', {
      type: 'button',
      class: ['lane', changed ? 'changed' : '', selected >= seg.start && selected <= seg.end ? 'selected' : ''],
      style: { gridColumn: `${seg.start + 1} / span ${seg.end - seg.start + 1}`, gridRow: String(row) },
      onclick: () => onSelect(seg.start),
      'aria-label': changed ? `La scala cambia: ${scaleChangeText(seg.ctx, key)}` : `Scala: ${seg.ctx.named}`,
    }, label);
  });
}

/** Le sette note sotto l'accordo scelto, con quelle dell'accordo piene e quelle alterate tratteggiate. */
export function scaleNotesExplain(item: ChordItem, key: Key): HTMLElement {
  const ctx = scaleContext(item.rc, key);
  const altered = new Set(ctx.changes.map((c) => c.index));
  return h('div', { class: 'scale-explain' },
    h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
      h('span', { class: 'small muted' }, 'Le note sotto ', chordRef(item.chord, item.symbol)),
      h('div', { class: 'notes-row', role: 'list' }, ctx.notes.map((n, i) =>
        h('span', {
          role: 'listitem',
          class: ['note', ctx.chordIdx.includes(i) ? 'chord' : '', altered.has(i) ? 'alt' : ''],
          title: ctx.chordIdx.includes(i) ? 'nota dell\'accordo' : altered.has(i) ? 'nota cambiata' : 'nota della scala',
        }, noteName(n))))),
    h('p', null, h('b', null, ctx.changes.length ? 'Cambio di colore. ' : `${ctx.named}. `), scaleChangeText(ctx, key),
      ' Le note piene sono quelle dell\'accordo: le più sicure su cui fermare la melodia.'),
    h('div', { class: 'legend', style: { margin: '0' } },
      h('span', { class: 'key-dot' }, h('span', { class: 'note chord', style: { minWidth: '18px', height: '18px' } }), 'nell\'accordo'),
      h('span', { class: 'key-dot' }, h('span', { class: 'note alt', style: { minWidth: '18px', height: '18px' } }), 'nota cambiata')));
}
