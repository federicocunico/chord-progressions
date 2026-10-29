import { h, select, field, segmented } from '../dom';
import { TONICS_MAJOR, TONICS_MINOR, noteName, parseNote, pc } from '../../theory/notes';
import { MODES, type ModeId } from '../../theory/scales';
import { GENRES, ROOT_GENRES, type GenreId } from '../../data/genres';
import { VOICING_STYLES, type VoicingStyle } from '../../guitar/voicings';
import { PATTERNS, type Pattern } from '../../audio/player';
import { context, settings, updateContext, updateSettings } from '../state';

export function tonicSelect(value: string, mode: ModeId, onChange: (t: string) => void): HTMLSelectElement {
  const list = MODES[mode].tonality === 'minor' ? TONICS_MINOR : TONICS_MAJOR;
  const opts = (list.includes(value) ? list : [value, ...list]).map((t) => ({ value: t, label: noteName(parseNote(t)) }));
  return select(value, opts, onChange, { 'aria-label': 'Tonica' });
}

export function modeControl(value: ModeId, onChange: (m: ModeId) => void): HTMLElement {
  const main = value === 'major' || value === 'minor' ? value : 'other';
  const others = (Object.keys(MODES) as ModeId[]).filter((m) => m !== 'major' && m !== 'minor');
  return h('div', { class: 'mode-control' },
    segmented(main as string, [{ value: 'major', label: 'Maggiore' }, { value: 'minor', label: 'Minore' }], (v) => onChange(v as ModeId), 'Tonalità'),
    select(main === 'other' ? value : ('' as ModeId), [{ value: '' as ModeId, label: 'Altri modi…' }, ...others.map((m) => ({ value: m, label: MODES[m].name }))],
      (v) => v && onChange(v), { 'aria-label': 'Modo', class: main === 'other' ? 'active' : '' }));
}

export function genreSelect(value: GenreId | 'all', onChange: (g: GenreId | 'all') => void, allowAll = false): HTMLSelectElement {
  const opts: { value: GenreId | 'all'; label: string; group?: string }[] = allowAll ? [{ value: 'all', label: 'Tutti i generi' }] : [];
  for (const root of ROOT_GENRES) {
    opts.push({ value: root.id, label: `${root.name} (tutto)`, group: root.name });
    for (const c of GENRES.filter((g) => g.parent === root.id)) opts.push({ value: c.id, label: c.name, group: root.name });
  }
  return select(value, opts, onChange, { 'aria-label': 'Genere' });
}

export function styleSelect(): HTMLElement {
  const opts = [{ value: 'genre' as const, label: 'Consigliato dal genere' }, ...(Object.keys(VOICING_STYLES) as VoicingStyle[]).map((v) => ({ value: v, label: VOICING_STYLES[v] }))];
  return field('Diteggiatura', select(settings.style, opts, (v) => updateSettings({ style: v as VoicingStyle | 'genre' })));
}

export function patternSelect(): HTMLElement {
  const opts = [{ value: 'genre' as const, label: 'Dal genere' }, ...(Object.keys(PATTERNS) as Pattern[]).map((p) => ({ value: p, label: PATTERNS[p] }))];
  return field('Ritmo', select(settings.pattern, opts, (v) => updateSettings({ pattern: v as Pattern | 'genre' })));
}

export function bpmControl(): HTMLElement {
  const out = h('output', null, String(settings.bpm));
  const input = h('input', {
    type: 'range', min: 50, max: 200, step: 5, value: settings.bpm, 'aria-label': 'BPM',
    oninput: (e: Event) => { out.textContent = (e.target as HTMLInputElement).value; },
    onchange: (e: Event) => updateSettings({ bpm: Number((e.target as HTMLInputElement).value) }),
  });
  return h('label', { class: 'field bpm' }, h('span', { class: 'field-label' }, 'BPM ', out), input);
}

/** Tonalità + modo + genere (condivisi tra le viste). */
export function keyControls(opts: { genre?: boolean; allowAllGenres?: boolean } = {}): HTMLElement {
  const setTonic = (t: string) => updateContext({ tonic: t });
  const setMode = (m: ModeId) => {
    const list = MODES[m].tonality === 'minor' ? TONICS_MINOR : TONICS_MAJOR;
    let tonic = context.tonic;
    if (!list.includes(tonic)) {
      const p = pc(parseNote(tonic));
      tonic = list.find((t) => pc(parseNote(t)) === p) ?? 'C';
    }
    updateContext({ mode: m, tonic });
  };
  return h('div', { class: 'controls-row' },
    field('Tonica', tonicSelect(context.tonic, context.mode, setTonic)),
    field('Tonalità / modo', modeControl(context.mode, setMode)),
    opts.genre !== false ? field('Genere', genreSelect(context.genre, (g) => g !== 'all' && updateContext({ genre: g }), opts.allowAllGenres)) : null);
}
