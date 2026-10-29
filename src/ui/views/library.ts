import { h, field, select } from '../dom';
import { genreSelect, keyControls } from '../components/controls';
import { progressionCard, stars, legend } from '../components/progression';
import { context, styleFor, patternFor } from '../state';
import { PROGRESSIONS } from '../../data/progressions';
import { GENRE_MAP, genreFamily, type GenreId } from '../../data/genres';
import { MODES } from '../../theory/scales';
import { parseNote } from '../../theory/notes';
import { href, replaceQuery, type Route } from '../router';

export function libraryView(route: Route): HTMLElement {
  const q = route.query;
  let genre = (q.get('g') as GenreId | 'all') || 'all';
  if (genre !== 'all' && !GENRE_MAP[genre]) genre = 'all';
  let tonality = (q.get('t') as 'major' | 'minor' | 'all') || 'all';
  let len = q.get('n') || 'all';
  let text = q.get('q') || '';
  let minPop = Number(q.get('p') || 1);

  const results = h('div', { class: 'grid' });
  const count = h('p', { class: 'muted' });

  const render = () => {
    replaceQuery({ g: genre === 'all' ? undefined : genre, t: tonality === 'all' ? undefined : tonality, n: len === 'all' ? undefined : len, q: text || undefined, p: minPop > 1 ? minPop : undefined });
    const fam = genre === 'all' ? null : genreFamily(genre);
    const needle = text.trim().toLowerCase();
    const list = PROGRESSIONS
      .filter((p) => !fam || p.genres.some((g) => fam.includes(g)))
      .filter((p) => tonality === 'all' || MODES[p.mode].tonality === tonality)
      .filter((p) => len === 'all' || (len === '6+' ? p.chords.length >= 6 : p.chords.length === Number(len)))
      .filter((p) => p.popularity >= minPop)
      .filter((p) => !needle || [p.name, ...(p.aka ?? []), ...(p.examples ?? []), ...p.mood, p.description, p.chords.join(' ')].join(' ').toLowerCase().includes(needle))
      .sort((a, b) => b.popularity - a.popularity || a.chords.length - b.chords.length);
    count.textContent = `${list.length} progressioni`;
    results.replaceChildren(...list.map((p) => {
      const tonic = MODES[p.mode].tonality === MODES[context.mode].tonality ? context.tonic : MODES[p.mode].tonality === 'minor' ? 'A' : 'C';
      const g = genre !== 'all' ? genre : p.genres[0];
      return progressionCard({
        title: p.name, subtitle: p.description, chords: p.chords, key: { tonic: parseNote(tonic), mode: p.mode },
        style: styleFor(g), pattern: patternFor(g), bars: p.bars,
        badges: [stars(p.popularity), h('span', { class: 'badge' }, MODES[p.mode].name)],
        meta: h('div', { class: 'tags' },
          p.genres.slice(0, 5).map((x) => h('a', { class: 'tag', href: href('generi/' + x) }, GENRE_MAP[x].name)),
          p.examples?.length ? h('p', { class: 'examples small' }, '♪ ', p.examples.slice(0, 2).join(' · ')) : null),
        href: href('prog', { id: p.id, k: tonic, m: p.mode, g }),
      });
    }));
  };

  const search = h('input', {
    type: 'search', placeholder: 'Cerca: nome, brano, umore, "bVII"…', value: text, 'aria-label': 'Cerca',
    oninput: (e: Event) => { text = (e.target as HTMLInputElement).value; render(); },
  });

  const view = h('div', { class: 'view library' },
    h('section', { class: 'hero' },
      h('h1', null, 'Libreria delle progressioni'),
      h('p', { class: 'lead' }, `${PROGRESSIONS.length} progressioni con spiegazione, esempi famosi e diteggiature. I numeri romani le rendono valide in qualsiasi tonalità: scegli la tonica e vengono trasposte.`)),
    h('section', { class: 'panel controls' },
      keyControls({ genre: false }),
      h('div', { class: 'controls-row' },
        field('Cerca', search),
        field('Genere', genreSelect(genre, (g) => { genre = g; render(); }, true)),
        field('Carattere', select(tonality, [{ value: 'all', label: 'Tutte' }, { value: 'major', label: 'Maggiori' }, { value: 'minor', label: 'Minori' }], (v) => { tonality = v; render(); })),
        field('Accordi', select(len, [{ value: 'all', label: 'Qualsiasi' }, ...['2', '3', '4', '5'].map((n) => ({ value: n, label: n })), { value: '6+', label: '6 o più' }], (v) => { len = v; render(); })),
        field('Popolarità minima', select(String(minPop), [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: '★'.repeat(n) })), (v) => { minPop = Number(v); render(); })))),
    legend(),
    count,
    results);
  render();
  return view;
}
