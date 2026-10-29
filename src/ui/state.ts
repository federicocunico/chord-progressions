import { setNotation, type Notation, parseNote } from '../theory/notes';
import type { ModeId } from '../theory/scales';
import type { GenreId } from '../data/genres';
import { GENRE_MAP } from '../data/genres';
import type { VoicingStyle } from '../guitar/voicings';
import type { Pattern } from '../audio/player';
import { makeKey, type Key } from '../theory/roman';

export interface Settings {
  notation: Notation;
  theme: 'auto' | 'light' | 'dark';
  bpm: number;
  pattern: Pattern | 'genre';
  loop: boolean;
  /** 'genre' = usa lo stile consigliato dal genere. */
  style: VoicingStyle | 'genre';
}

export interface Context {
  tonic: string;
  mode: ModeId;
  genre: GenreId;
  length: number;
  popularity: number;
  seed: number;
}

const DEFAULT_SETTINGS: Settings = { notation: 'english', theme: 'auto', bpm: 90, pattern: 'genre', loop: true, style: 'genre' };
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

export function patternFor(genre?: GenreId): Pattern {
  if (settings.pattern !== 'genre') return settings.pattern;
  const v = genre ? GENRE_MAP[genre].voicing : 'auto';
  if (v === 'power') return 'eighths';
  if (v === 'jazz') return 'pad';
  if (genre && ['folk', 'celtic', 'cantautorato', 'classical', 'cinematic', 'symphonic', 'neoclassical'].includes(genre)) return 'arpeggio';
  return 'strum';
}

export function applyTheme(): void {
  const root = document.documentElement;
  if (settings.theme === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', settings.theme);
}
