import { h, field } from '../dom';
import { genreSelect } from '../components/controls';
import { progressionRow, stars, legend } from '../components/progression';
import { context, updateContext, currentKey, keyForMode, styleFor, patternFor } from '../state';
import { PROGRESSIONS } from '../../data/progressions';
import { GENRE_MAP, genreFamily, type GenreId } from '../../data/genres';
import { MOODS, MOOD_MAP, matchesMood } from '../../data/moods';
import { generate } from '../../theory/generator';
import { noteName } from '../../theory/notes';
import { MODES } from '../../theory/scales';
import { href, replaceQuery, type Route } from '../router';

type Tab = 'all' | 'famous' | 'new';
const LENGTHS = ['all', '2', '3', '4', '5', '6+'] as const;

export function ascoltaView(route: Route): HTMLElement {
  const q = route.query;
  let mood = q.get('u') && MOOD_MAP[q.get('u')!] ? q.get('u')! : '';
  let genre = (q.get('g') as GenreId | 'all') || 'all';
  if (genre !== 'all' && !GENRE_MAP[genre]) genre = 'all';
  let len = (q.get('n') as (typeof LENGTHS)[number]) || 'all';
  if (!LENGTHS.includes(len)) len = 'all';
  let tab = (q.get('t') as Tab) || 'all';
  let text = q.get('q') || '';

  const root = h('div', { class: 'view ascolta' });
  const search = h('input', {
    type: 'search', placeholder: 'Cerca: nome, brano, "bVII"…', value: text, 'aria-label': 'Cerca',
    oninput: (e: Event) => { text = (e.target as HTMLInputElement).value; renderResults(); },
  });
  const results = h('div', { class: 'rows' });
  const count = h('span', { class: 'muted small' });

  const sync = () => replaceQuery({ u: mood || undefined, g: genre === 'all' ? undefined : genre, n: len === 'all' ? undefined : len, t: tab === 'all' ? undefined : tab, q: text || undefined });

  function libraryRows(): HTMLElement[] {
    const fam = genre === 'all' ? null : genreFamily(genre);
    const m = mood ? MOOD_MAP[mood] : null;
    const needle = text.trim().toLowerCase();
    const list = PROGRESSIONS
      .filter((p) => !m || matchesMood(p, m))
      .filter((p) => !fam || p.genres.some((g) => fam.includes(g)))
      .filter((p) => len === 'all' || (len === '6+' ? p.chords.length >= 6 : p.chords.length === Number(len)))
      .filter((p) => !needle || [p.name, ...(p.aka ?? []), ...(p.examples ?? []), ...p.mood, p.description, p.chords.join(' ')].join(' ').toLowerCase().includes(needle))
      .sort((a, b) => b.popularity - a.popularity || a.chords.length - b.chords.length);
    count.textContent = `${list.length} progressioni famose`;
    return list.map((p) => {
      const { key, tonic } = keyForMode(p.mode);
      const g = genre !== 'all' ? genre : p.genres[0];
      return progressionRow({
        title: p.name, subtitle: p.description, chords: p.chords, key, style: styleFor(g), pattern: patternFor(g), genre: g, bars: p.bars,
        badges: [stars(p.popularity)],
        meta: p.examples?.length ? h('span', { class: 'examples' }, 'La senti in: ', p.examples.slice(0, 2).join(' · ')) : null,
        href: href('prog', { id: p.id, k: tonic, m: p.mode, g }),
      });
    });
  }

  function newRows(): HTMLElement[] {
    const g = genre === 'all' ? context.genre : genre;
    const length = len === 'all' ? context.length : len === '6+' ? 6 : Number(len);
    const key = currentKey();
    const gen = generate({ genre: g, mode: context.mode, length, popularity: context.popularity, seed: context.seed, count: 6 });
    return gen.map((x, i) => progressionRow({
      title: x.match ? `≈ ${x.match.name}` : `Idea nuova #${i + 1}`,
      subtitle: x.match ? 'Coincide con una progressione famosa (o una sua rotazione).' : `Generata per il ${GENRE_MAP[g].name.toLowerCase()} in ${noteName(key.tonic)} ${MODES[context.mode].name.toLowerCase()}.`,
      chords: x.chords, key, style: styleFor(g), pattern: patternFor(g), genre: g,
      badges: [h('span', { class: x.match ? 'badge' : 'badge new' }, x.match ? 'nota' : 'nuova per te')],
      meta: h('div', { class: 'meter', title: 'Stima: quanto suona comune nel genere' },
        h('span', { class: 'muted small' }, 'Quanto suona familiare'),
        h('span', { class: 'meter-bar' }, h('span', { style: { width: `${Math.round(x.familiarity * 100)}%` } }))),
      href: href('prog', { c: x.chords.join(','), k: context.tonic, m: context.mode, g, id: x.match?.id }),
    }));
  }

  function renderResults(): void {
    sync();
    const parts: HTMLElement[] = [];
    if (tab !== 'new') {
      const rows = libraryRows();
      parts.push(...(rows.length ? rows : [h('p', { class: 'empty' }, 'Nessuna progressione famosa con questi filtri: prova a togliere un filtro o guarda le idee nuove.')]));
    }
    if (tab !== 'famous') {
      const g = genre === 'all' ? context.genre : genre;
      parts.push(h('div', { class: 'section-head', style: { marginTop: tab === 'all' ? '24px' : '0' } },
        h('h2', null, 'Idee nuove per te'),
        h('div', { class: 'controls-row', style: { alignItems: 'center' } },
          h('label', { class: 'meter' }, h('span', { class: 'small' }, 'Familiari'),
            h('input', { type: 'range', min: 1, max: 5, step: 1, value: 6 - context.popularity, 'aria-label': 'Da familiari a originali', onchange: (e: Event) => updateContext({ popularity: 6 - Number((e.target as HTMLInputElement).value) }) }),
            h('span', { class: 'small' }, 'Originali')),
          h('button', { type: 'button', class: 'btn', onclick: () => updateContext({ seed: context.seed + 1 }) }, '↻ Altre idee'))));
      parts.push(h('p', { class: 'muted small', style: { marginTop: '-6px' } },
        `Generate da un modello del ${GENRE_MAP[g].name.toLowerCase()} (progressioni della libreria + regole dell'armonia)${mood ? ': seguono genere e tonalità, non l\'emozione scelta' : ''}.`));
      parts.push(...newRows());
    }
    results.replaceChildren(...parts);
  }

  function render(): void {
    const m = mood ? MOOD_MAP[mood] : null;
    const title = m?.name ?? (genre !== 'all' ? GENRE_MAP[genre].name : 'Tutte le progressioni');
    const chip = (id: string, label: string) => h('button', {
      type: 'button', class: ['chip-btn', mood === id ? 'active' : ''], 'aria-pressed': String(mood === id),
      onclick: () => { mood = id; render(); },
    }, label);
    root.replaceChildren(
      h('section', { class: 'hero lab-top' },
        h('div', null,
          h('span', { class: 'kicker' }, m ? 'Ascolta · per emozione' : 'Ascolta'),
          h('h1', null, title),
          h('p', { class: 'lead', style: { margin: '0' } }, m ? `${m.feel}. Sotto ogni giro, la curva della tensione: bassa = casa, alta = vuole tornare.` : 'Giri famosi e idee nuove, già trasposti nella tua tonalità. Sotto ogni giro, la curva della tensione: bassa = casa, alta = vuole tornare.'))),
      h('section', { class: 'panel filters', 'aria-label': 'Filtri' },
        h('div', { class: 'chips' }, chip('', 'Tutte'), MOODS.map((x) => chip(x.id, x.name))),
        h('div', { class: 'row2' },
          field('Genere', genreSelect(genre, (g) => { genre = g; render(); }, true)),
          h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Accordi'),
            h('div', { class: 'dots', role: 'group', 'aria-label': 'Quanti accordi' }, LENGTHS.map((l) =>
              h('button', { type: 'button', class: len === l ? 'active' : '', 'aria-pressed': String(len === l), onclick: () => { len = l; render(); } }, l === 'all' ? 'Tutti' : l)))),
          field('Cerca', search))),
      h('div', { class: 'section-head' },
        h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Origine' },
          ([['all', 'Tutte'], ['famous', 'Famose'], ['new', 'Nuove per te']] as [Tab, string][]).map(([id, label]) =>
            h('button', { type: 'button', role: 'tab', 'aria-selected': String(tab === id), class: tab === id ? 'active' : '', onclick: () => { tab = id; render(); } }, label))),
        count),
      legend(),
      results);
    renderResults();
  }

  // il genere dei filtri non cambia il genere "di lavoro", tranne quando si arriva da un link di genere
  if (genre !== 'all' && genre !== context.genre) updateContext({ genre }, false);
  render();
  return root;
}
