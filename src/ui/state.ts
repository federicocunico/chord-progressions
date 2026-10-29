import { setNotation, type Notation, parseNote, transpose, simplify, noteName } from '../theory/notes';
import { MODES } from '../theory/scales';
import type { ModeId } from '../theory/scales';
import type { GenreId } from '../data/genres';
import { GENRE_MAP } from '../data/genres';
import type { VoicingStyle } from '../guitar/voicings';
import type { Pattern, InstrumentId } from '../audio/player';
import { makeKey, type Key } from '../theory/roman';

export interface Settings {
  notation: Notation;
  theme: 'auto' | 'light' | 'dark';
  bpm: number;
  pattern: Pattern | 'genre';
  loop: boolean;
  /** 'genre' = usa lo stile consigliato dal genere. */
  style: VoicingStyle | 'genre';
  /** 'genre' = strumento consigliato dal genere. */
  instrument: InstrumentId | 'genre';
  /** Id dell'uscita Web MIDI ('' = nessuna). */
  midiOut: string;
  /** Versione delle impostazioni salvate (per aggiornare i default). */
  v?: number;
}

export interface Context {
  tonic: string;
  mode: ModeId;
  genre: GenreId;
  length: number;
  popularity: number;
  seed: number;
}

/** Ascolto di default: pianoforte, ritmo semplice, in loop (il suono del genere resta a un clic). */
const SOUND_DEFAULTS = { bpm: 100, pattern: 'simple', loop: true, instrument: 'acoustic_grand_piano' } as const;
const SETTINGS_VERSION = 3;
const DEFAULT_SETTINGS: Settings = { notation: 'english', theme: 'auto', style: 'genre', midiOut: '', ...SOUND_DEFAULTS };
const DEFAULT_CONTEXT: Context = { tonic: 'C', mode: 'major', genre: 'pop', length: 4, popularity: 4, seed: 1 };

function load<T>(k: string, def: T): T {
  try {
    const raw = localStorage.getItem(k);
    return raw ? { ...def, ...JSON.parse(raw) } : { ...def };
  } catch {
    return { ...def };
  }
}
function save(k: string, v: unknown): void {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* storage non disponibile */
  }
}

export const settings: Settings = load('cp.settings', DEFAULT_SETTINGS);
if ((settings.v ?? 1) < SETTINGS_VERSION) {
  // v2: nuovo suono di default; v3: torna il loop (senza toccare suono e ritmo scelti dopo la v2)
  if ((settings.v ?? 1) < 2) Object.assign(settings, SOUND_DEFAULTS);
  else settings.loop = true;
  settings.v = SETTINGS_VERSION;
  save('cp.settings', settings);
}
export const context: Context = load('cp.context', DEFAULT_CONTEXT);
if (!GENRE_MAP[context.genre]) context.genre = 'pop';
try { parseNote(context.tonic); } catch { context.tonic = 'C'; }
setNotation(settings.notation);

type Listener = () => void;
const listeners = new Set<Listener>();
export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function updateSettings(p: Partial<Settings>): void {
  Object.assign(settings, p);
  setNotation(settings.notation);
  save('cp.settings', settings);
  applyTheme();
  listeners.forEach((l) => l());
}

export function updateContext(p: Partial<Context>, notify = true): void {
  Object.assign(context, p);
  save('cp.context', context);
  if (notify) listeners.forEach((l) => l());
}

export function currentKey(): Key {
  return makeKey(context.tonic, context.mode);
}

export function styleFor(genre?: GenreId): VoicingStyle {
  if (settings.style !== 'genre') return settings.style;
  return genre ? GENRE_MAP[genre].voicing : 'auto';
}

const PATTERN_BY_GENRE: Partial<Record<GenreId, Pattern>> = {
  metal: 'eighths', heavy: 'gallop', thrash: 'gallop', power: 'gallop', black: 'eighths', doom: 'pad', folkmetal: 'gallop',
  metalcore: 'eighths', symphonic: 'ballad', neoclassical: 'arpeggio', punk: 'eighths', poppunk: 'eighths', grunge: 'eighths',
  jrock: 'eighths', bluesrock: 'shuffle', blues: 'shuffle', reggae: 'reggae', bossa: 'bossa', funk: 'funk',
  folk: 'arpeggio', celtic: 'arpeggio', cantautorato: 'ballad', classical: 'arpeggio', cinematic: 'ballad', flamenco: 'strum',
  jazz: 'pad', bebop: 'pad', gypsy: 'strum', modaljazz: 'pad', neosoul: 'ballad', soul: 'ballad', gospel: 'ballad', citypop: 'ballad',
};

export function patternFor(genre?: GenreId): Pattern {
  if (settings.pattern !== 'genre') return settings.pattern;
  return genrePattern(genre);
}

export function genrePattern(genre?: GenreId): Pattern {
  if (!genre) return 'strum';
  return PATTERN_BY_GENRE[genre] ?? (GENRE_MAP[genre].parent ? PATTERN_BY_GENRE[GENRE_MAP[genre].parent!] : undefined) ?? 'strum';
}

const INSTRUMENT_BY_GENRE: Partial<Record<GenreId, InstrumentId>> = {
  metal: 'distortion_guitar', heavy: 'distortion_guitar', thrash: 'distortion_guitar', power: 'distortion_guitar', black: 'distortion_guitar',
  doom: 'distortion_guitar', folkmetal: 'distortion_guitar', metalcore: 'distortion_guitar', symphonic: 'distortion_guitar', neoclassical: 'distortion_guitar',
  punk: 'overdriven_guitar', poppunk: 'overdriven_guitar', grunge: 'overdriven_guitar', jrock: 'overdriven_guitar', bluesrock: 'overdriven_guitar', rock: 'overdriven_guitar', classicrock: 'overdriven_guitar',
  jazz: 'electric_guitar_jazz', bebop: 'electric_guitar_jazz', modaljazz: 'electric_guitar_jazz', neosoul: 'electric_guitar_jazz', citypop: 'electric_guitar_clean', soul: 'electric_guitar_jazz',
  funk: 'electric_guitar_clean', reggae: 'electric_guitar_clean', synthpop: 'electric_guitar_clean', edm: 'electric_guitar_clean', kpop: 'electric_guitar_clean', indie: 'electric_guitar_clean', blues: 'electric_guitar_clean', gospel: 'electric_guitar_clean',
  bossa: 'acoustic_guitar_nylon', flamenco: 'acoustic_guitar_nylon', latin: 'acoustic_guitar_nylon', latinpop: 'acoustic_guitar_nylon', classical: 'acoustic_guitar_nylon', cinematic: 'acoustic_guitar_nylon',
};

export function instrumentFor(genre?: GenreId): InstrumentId {
  if (settings.instrument !== 'genre') return settings.instrument;
  return genreInstrument(genre);
}

export function genreInstrument(genre?: GenreId): InstrumentId {
  return (genre && (INSTRUMENT_BY_GENRE[genre] ?? (GENRE_MAP[genre].parent ? INSTRUMENT_BY_GENRE[GENRE_MAP[genre].parent!] : undefined))) || 'acoustic_guitar_steel';
}

export function applyTheme(): void {
  const root = document.documentElement;
  if (settings.theme === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', settings.theme);
}

/** Tonalità in cui mostrare una progressione di modo `mode`: quella scelta, o la sua relativa se il carattere è diverso. */
export function keyForMode(mode: ModeId): { key: Key; tonic: string } {
  const own = currentKey();
  const ownMinor = MODES[context.mode].tonality === 'minor';
  const minor = MODES[mode].tonality === 'minor';
  const note = ownMinor === minor ? own.tonic : minor ? transpose(own.tonic, 5, 9) : transpose(own.tonic, 2, 3);
  const tonic = noteName(simplify(note, own.tonic.acc < 0), 'english', true);
  return { key: makeKey(tonic, mode), tonic };
}
