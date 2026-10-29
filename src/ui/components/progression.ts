import { h } from '../dom';
import { chordDiagram } from './diagrams';
import { tip, richText, plainText } from './chordTip';
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
  key: Key;
}

export function analyzeAll(chords: string[], key: Key): ChordItem[] {
  return chords.map((numeral) => {
    const rc = parseRoman(numeral);
    const chord = realize(rc, key);
    return { numeral, rc, chord, symbol: chordSymbol(chord), analysis: analyzeChord(rc, key), rootPc: pc(chord.root), key };
  });
}

export function pill(item: ChordItem, opts: { small?: boolean; big?: boolean; changed?: boolean; onClick?: () => void; active?: boolean } = {}): HTMLElement {
  const a = item.analysis;
  // il simbolo usa tutta la larghezza: lo rimpiccioliamo in base a quanti caratteri ha
  const n = item.symbol.length;
  const size = n >= 6 ? 'xlong' : n >= 4 ? 'long' : n === 3 ? 'mid' : '';
  const num = prettyRoman(item.rc);
  const cls = ['pill', `fn-${a.fn}`, a.borrowed ? 'borrowed' : '', a.secondary || a.chromatic ? 'secondary' : '', opts.small ? 'small' : '', opts.big ? 'big' : '', size, num.length > 5 ? 'longnum' : '', opts.changed ? 'changed' : '', opts.active ? 'active' : ''];
  const tag = opts.onClick ? 'button' : 'span';
  const el = h(tag as 'span', { class: cls.join(' '), tabindex: opts.onClick ? undefined : '0', onclick: opts.onClick, type: opts.onClick ? 'button' : undefined },
    h('span', { class: 'pill-sym' }, item.symbol),
    h('span', { class: 'pill-num' }, num));
  return tip(el, item.chord, undefined, `${prettyRoman(item.rc)} · ${plainText(a.label, item.key)}`);
}

export function legend(): HTMLElement {
  return h('div', { class: 'legend' },
    h('span', { class: 'lg fn-T' }, h('b', null, 'Casa'), ' · tonica'),
    h('span', { class: 'lg fn-S' }, h('b', null, 'Viaggio'), ' · sottodominante'),
    h('span', { class: 'lg fn-D' }, h('b', null, 'Tensione'), ' · dominante'),
    h('span', { class: 'lg borrowed' }, h('b', null, 'Colore'), ' · in prestito'),
    h('span', { class: 'lg secondary' }, h('b', null, 'Colore'), ' · cromatico (es. dominante secondaria)'));
}

let stopCurrent: (() => void) | null = null;

export interface PlayArgs {
  voicings: Voicing[];
  bars: number[];
  pattern: Pattern;
  instrument: InstrumentId;
  /** Per il lettore in basso: cosa sta suonando. */
  title?: string;
  items?: ChordItem[];
  genre?: GenreId;
}

/** Cosa sta suonando (o ha suonato per ultimo): lo mostra il lettore fisso in basso. */
export interface NowPlaying {
  args: PlayArgs;
  /** Ricalcola gli argomenti con le impostazioni correnti (suono, ritmo). */
  replay: () => PlayArgs;
  index: number | null;
  playing: boolean;
}
let now: NowPlaying | null = null;
const nowListeners = new Set<(n: NowPlaying | null, onlyIndex: boolean) => void>();
export function onNowPlaying(fn: (n: NowPlaying | null, onlyIndex: boolean) => void): () => void {
  nowListeners.add(fn);
  fn(now, false);
  return () => nowListeners.delete(fn);
}
const emit = (onlyIndex = false) => nowListeners.forEach((f) => f(now, onlyIndex));

/** Riproduce una progressione e chiama onChord(i) a ogni accordo. Restituisce la funzione di stop. */
export function playProgression(a: PlayArgs, onChord: (i: number) => void, onStop: () => void, onReady?: () => void, replay: () => PlayArgs = () => a): () => void {
  stopCurrent?.();
  const mine: NowPlaying = { args: a, replay, index: null, playing: true };
  now = mine;
  emit();
  const ended = () => {
    if (now === mine) { mine.playing = false; mine.index = null; emit(); }
  };
  const stop = () => {
    player.stop();
    onStop();
    ended();
    if (stopCurrent === stop) stopCurrent = null;
  };
  stopCurrent = stop;
  void player.play(a.voicings.map((v, i) => ({ midis: voicingMidi(v), bars: a.bars[i] ?? 1 })), {
    bpm: settings.bpm, pattern: a.pattern, loop: settings.loop, instrument: a.instrument, midiOut: settings.midiOut,
    onChord: (i) => { onReady?.(); onChord(i); if (now === mine) { mine.index = i; emit(true); } },
    onEnd: () => { onStop(); ended(); },
  });
  return stop;
}

export function stopAll(): void {
  stopCurrent?.();
  player.stop();
}

export function playButton(getArgs: () => PlayArgs, onChord: (i: number | null) => void, label = 'Ascolta', round?: 'lg' | 'sm'): HTMLButtonElement {
  let stop: (() => void) | null = null;
  const ico = h('span', { class: 'ico', 'aria-hidden': 'true' }, '▶');
  const btn = round
    ? h('button', { type: 'button', class: `play-round${round === 'sm' ? ' sm' : ''}`, 'aria-label': label, title: label }, ico)
    : h('button', { type: 'button', class: 'btn play', 'aria-label': label }, ico, h('span', null, label));
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
    }, getArgs);
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
  const pills = items.map((it, i) => tip(pill(it), it.chord, voicings[i], `${prettyRoman(it.rc)} · ${plainText(it.analysis.label, o.key)}`));
  const flats = o.key.tonic.acc < 0;
  const diagrams = h('div', { class: 'mini-diagrams' },
    items.map((it, i) => tip(h('div', { class: 'mini', tabindex: '0' }, chordDiagram(voicings[i], { rootPc: it.rootPc, size: 'sm', title: it.symbol, flats }), h('span', null, it.symbol)), it.chord, voicings[i])));
  const highlight = (i: number | null) => pills.forEach((p, k) => p.classList.toggle('active', k === i));
  return h('article', { class: 'card prog-card' },
    h('header', null,
      h('div', null, h('h3', null, h('a', { href: o.href }, o.title)), o.subtitle ? h('p', { class: 'muted small' }, richText(o.subtitle, o.key)) : null),
      o.badges?.length ? h('div', { class: 'badges' }, o.badges) : null),
    h('div', { class: 'pills' }, pills),
    diagrams,
    o.meta ?? null,
    h('footer', null,
      playButton(() => ({ voicings, bars: o.bars ?? o.chords.map(() => 1), pattern: o.pattern, instrument: instrumentFor(o.genre), title: o.title, items, genre: o.genre }), highlight),
      h('a', { class: 'btn primary', href: o.href }, 'Analizza e varia →')));
}

export function stars(n: number): HTMLElement {
  return h('span', { class: 'stars', title: `Popolarità ${n}/5`, 'aria-label': `Popolarità ${n} su 5` }, '★'.repeat(n) + '☆'.repeat(5 - n));
}

/** Riga larga per le liste (Ascolta): play, testo, tessere con la curva di tensione sotto. */
export function progressionRow(o: CardOptions): HTMLElement {
  const items = analyzeAll(o.chords, o.key);
  let voicings: Voicing[] | null = null;
  const getVoicings = () => (voicings ??= voiceProgression(items.map((i) => i.chord), o.style));
  const pills = items.map((it) => pill(it));
  const highlight = (i: number | null) => pills.forEach((p, k) => p.classList.toggle('active', k === i));
  const strip = h('div', { class: 'strip', 'aria-label': 'Accordi e curva della tensione' },
    items.map((it, i) => h('div', { class: 'strip-col' }, pills[i],
      h('div', { class: 'tbar', 'aria-hidden': 'true', title: 'Tensione' },
        h('span', { style: { height: `${Math.round(6 + (it.analysis.tension / 6) * 38)}px`, opacity: String(0.35 + (it.analysis.tension / 6) * 0.65) } })))));
  return h('article', { class: 'prog-row' },
    playButton(() => ({ voicings: getVoicings(), bars: o.bars ?? o.chords.map(() => 1), pattern: o.pattern, instrument: instrumentFor(o.genre), title: o.title, items, genre: o.genre }), highlight, `Ascolta ${o.title}`, 'lg'),
    h('div', { class: 'info' },
      h('div', { class: 'badges' }, h('h3', null, h('a', { href: o.href }, o.title)), o.badges ?? null),
      o.subtitle ? h('p', null, richText(o.subtitle, o.key)) : null,
      o.meta ?? null),
    strip,
    h('a', { class: 'btn', href: o.href }, 'Apri →'));
}
