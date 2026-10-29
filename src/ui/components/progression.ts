import { h } from '../dom';
import { chordDiagram } from './diagrams';
import { parseRoman, realize, prettyRoman, type Key, type RomanChord } from '../../theory/roman';
import { chordSymbol, type Chord } from '../../theory/chords';
import { analyzeChord, type ChordAnalysis } from '../../theory/analysis';
import { pc } from '../../theory/notes';
import { voiceProgression, voicingMidi, type Voicing, type VoicingStyle } from '../../guitar/voicings';
import { player, INSTRUMENTS, type Pattern, type InstrumentId } from '../../audio/player';
import { renderSequence } from '../../audio/sequencer';
import { buildMidiFile, downloadBytes } from '../../audio/midi';
import { settings, instrumentFor } from '../state';
import type { GenreId } from '../../data/genres';

export interface ChordItem {
  numeral: string;
  rc: RomanChord;
  chord: Chord;
  symbol: string;
  analysis: ChordAnalysis;
  rootPc: number;
}

export function analyzeAll(chords: string[], key: Key): ChordItem[] {
  return chords.map((numeral) => {
    const rc = parseRoman(numeral);
    const chord = realize(rc, key);
    return { numeral, rc, chord, symbol: chordSymbol(chord), analysis: analyzeChord(rc, key), rootPc: pc(chord.root) };
  });
}

export function pill(item: ChordItem, opts: { small?: boolean; changed?: boolean; onClick?: () => void; active?: boolean } = {}): HTMLElement {
  const a = item.analysis;
  const cls = ['pill', `fn-${a.fn}`, a.borrowed ? 'borrowed' : '', a.secondary ? 'secondary' : '', opts.small ? 'small' : '', opts.changed ? 'changed' : '', opts.active ? 'active' : ''];
  const tag = opts.onClick ? 'button' : 'span';
  return h(tag as 'span', { class: cls.join(' '), title: `${prettyRoman(item.rc)} · ${a.label}`, onclick: opts.onClick, type: opts.onClick ? 'button' : undefined },
    h('span', { class: 'pill-sym' }, item.symbol),
    h('span', { class: 'pill-num' }, prettyRoman(item.rc)));
}

export function legend(): HTMLElement {
  return h('div', { class: 'legend' },
    h('span', { class: 'lg fn-T' }, 'Tonica — riposo'),
    h('span', { class: 'lg fn-S' }, 'Sottodominante — movimento'),
    h('span', { class: 'lg fn-D' }, 'Dominante — tensione'),
    h('span', { class: 'lg borrowed' }, 'Prestito modale'),
    h('span', { class: 'lg secondary' }, 'Secondaria'));
}

let stopCurrent: (() => void) | null = null;

export interface PlayArgs {
  voicings: Voicing[];
  bars: number[];
  pattern: Pattern;
  instrument: InstrumentId;
}

/** Riproduce una progressione e chiama onChord(i) a ogni accordo. Restituisce la funzione di stop. */
export function playProgression(a: PlayArgs, onChord: (i: number) => void, onStop: () => void, onReady?: () => void): () => void {
  stopCurrent?.();
  const stop = () => {
    player.stop();
    onStop();
    if (stopCurrent === stop) stopCurrent = null;
  };
  stopCurrent = stop;
  void player.play(a.voicings.map((v, i) => ({ midis: voicingMidi(v), bars: a.bars[i] ?? 1 })), {
    bpm: settings.bpm, pattern: a.pattern, loop: settings.loop, instrument: a.instrument, midiOut: settings.midiOut,
    onChord: (i) => { onReady?.(); onChord(i); }, onEnd: () => onStop(),
  });
  return stop;
}

export function stopAll(): void {
  stopCurrent?.();
  player.stop();
}

export function playButton(getArgs: () => PlayArgs, onChord: (i: number | null) => void, label = 'Ascolta'): HTMLButtonElement {
  let stop: (() => void) | null = null;
  const ico = h('span', { class: 'ico' }, '▶');
  const btn = h('button', { type: 'button', class: 'btn play', 'aria-label': label }, ico, h('span', null, label));
  const reset = () => {
    stop = null;
    btn.classList.remove('playing', 'loading');
    ico.textContent = '▶';
    onChord(null);
  };
  btn.addEventListener('click', () => {
    if (stop) {
      stop();
      return;
    }
    btn.classList.add('playing', 'loading');
    ico.textContent = '…';
    stop = playProgression(getArgs(), (i) => onChord(i), reset, () => {
      btn.classList.remove('loading');
      ico.textContent = '■';
    });
  });
  return btn;
}

/** Scarica la progressione come file MIDI, con le note esatte delle diteggiature e il ritmo scelto. */
export function exportMidi(a: PlayArgs, symbols: string[], name: string): void {
  const seq = renderSequence(a.voicings.map((v, i) => ({ midis: voicingMidi(v), bars: a.bars[i] ?? 1 })), a.pattern);
  const bytes = buildMidiFile(seq.events, {
    bpm: settings.bpm, program: INSTRUMENTS[a.instrument].program, name,
    markers: seq.chordStarts.map((b, i) => [b, symbols[i] ?? ''] as [number, string]),
  });
  const safe = name.normalize('NFD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'progressione';
  downloadBytes(bytes, `${safe}-${settings.bpm}bpm.mid`);
}

export function midiButton(getArgs: () => PlayArgs, symbols: () => string[], name: () => string): HTMLButtonElement {
  return h('button', {
    type: 'button', class: 'btn', title: 'Scarica un file .mid da aprire in un DAW, Guitar Pro, MuseScore…',
    onclick: () => exportMidi(getArgs(), symbols(), name()),
  }, '⬇ MIDI');
}

export interface CardOptions {
  title: string;
  subtitle?: string;
  chords: string[];
  key: Key;
  style: VoicingStyle;
  pattern: Pattern;
  genre?: GenreId;
  bars?: number[];
  badges?: (string | HTMLElement)[];
  meta?: HTMLElement | null;
  href: string;
}

export function progressionCard(o: CardOptions): HTMLElement {
  const items = analyzeAll(o.chords, o.key);
  const voicings = voiceProgression(items.map((i) => i.chord), o.style);
  const pills = items.map((it) => pill(it));
  const flats = o.key.tonic.acc < 0;
  const diagrams = h('div', { class: 'mini-diagrams' },
    items.map((it, i) => h('div', { class: 'mini' }, chordDiagram(voicings[i], { rootPc: it.rootPc, size: 'sm', title: it.symbol, flats }), h('span', null, it.symbol))));
  const highlight = (i: number | null) => pills.forEach((p, k) => p.classList.toggle('active', k === i));
  return h('article', { class: 'card prog-card' },
    h('header', null,
      h('div', null, h('h3', null, h('a', { href: o.href }, o.title)), o.subtitle ? h('p', { class: 'muted small' }, o.subtitle) : null),
      o.badges?.length ? h('div', { class: 'badges' }, o.badges) : null),
    h('div', { class: 'pills' }, pills),
    diagrams,
    o.meta ?? null,
    h('footer', null,
      playButton(() => ({ voicings, bars: o.bars ?? o.chords.map(() => 1), pattern: o.pattern, instrument: instrumentFor(o.genre) }), highlight),
      h('a', { class: 'btn primary', href: o.href }, 'Analizza e varia →')));
}

export function stars(n: number): HTMLElement {
  return h('span', { class: 'stars', title: `Popolarità ${n}/5`, 'aria-label': `Popolarità ${n} su 5` }, '★'.repeat(n) + '☆'.repeat(5 - n));
}
