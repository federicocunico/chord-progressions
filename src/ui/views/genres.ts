import { h } from '../dom';
import { progressionCard, stars } from '../components/progression';
import { GENRES, GENRE_MAP, ROOT_GENRES, type GenreId } from '../../data/genres';
import { SCALES, MODES } from '../../theory/scales';
import { VOICING_STYLES } from '../../guitar/voicings';
import { libraryFor } from '../../theory/generator';
import { context, updateContext, patternFor, styleFor } from '../state';
import { parseNote } from '../../theory/notes';
import { href, navigate } from '../router';

const FLAVOR_TEXT = {
  triads: 'Triadi semplici',
  sevenths: 'Accordi di settima',
  extended: 'Accordi estesi (none, tredicesime)',
  power: 'Power chord',
  color: 'Triadi con colori (add9, sus)',
} as const;

export function genresView(): HTMLElement {
  return h('div', { class: 'view genres' },
    h('section', { class: 'hero' },
      h('h1', null, 'Generi e stili'),
      h('p', { class: 'lead' }, 'Ogni genere ha le sue abitudini armoniche: scale preferite, tipi di accordi, modo di suonarli sulla chitarra. Scegline uno per vedere consigli e progressioni tipiche.')),
    ROOT_GENRES.map((root) => h('section', { class: 'genre-family' },
      h('h2', null, root.name),
      h('div', { class: 'genre-grid' },
        [root, ...GENRES.filter((g) => g.parent === root.id)].map((g) =>
          h('a', { class: 'genre-card', href: href('generi/' + g.id), style: { '--hue': String(g.hue) } },
            h('strong', null, g.id === root.id ? `${g.name} — panoramica` : g.name),
            h('span', null, g.description)))))));
}

export function genreDetailView(id: GenreId): HTMLElement {
  const g = GENRE_MAP[id];
  if (!g) return genresView();
  const tonality = g.tonality === 'both' ? MODES[context.mode].tonality : g.tonality;
  const mode = tonality === 'minor' ? 'minor' : 'major';
  const tonic = MODES[context.mode].tonality === tonality ? context.tonic : tonality === 'minor' ? 'A' : 'C';
  const lib = [...libraryFor(id, mode), ...(g.tonality === 'both' ? libraryFor(id, mode === 'major' ? 'minor' : 'major') : [])]
    .filter((p, i, arr) => arr.indexOf(p) === i)
    .slice(0, 9);
  const children = GENRES.filter((x) => x.parent === id);
  const parent = g.parent ? GENRE_MAP[g.parent] : undefined;
  return h('div', { class: 'view genre-detail', style: { '--hue': String(g.hue) } },
    h('section', { class: 'hero genre-hero' },
      h('a', { class: 'link back', href: href('generi') }, '← Tutti i generi'),
      h('h1', null, g.name),
      parent ? h('p', { class: 'muted' }, 'Sottogenere di ', h('a', { href: href('generi/' + parent.id) }, parent.name)) : null,
      h('p', { class: 'lead' }, g.description),
      h('button', {
        type: 'button', class: 'btn primary',
        onclick: () => { updateContext({ genre: id, mode: mode === context.mode || MODES[context.mode].tonality === tonality ? context.mode : mode, tonic }, false); navigate(''); },
      }, `Componi un brano ${g.name} →`)),
    h('section', { class: 'facts' },
      h('div', { class: 'panel' }, h('h3', null, 'Scale tipiche'), h('ul', null, g.scales.map((s) => h('li', null, h('strong', null, SCALES[s].name), ' — ', SCALES[s].description)))),
      h('div', { class: 'panel' }, h('h3', null, 'Sulla chitarra'), h('ul', null,
        h('li', null, h('strong', null, 'Accordi: '), FLAVOR_TEXT[g.flavor]),
        h('li', null, h('strong', null, 'Diteggiatura consigliata: '), VOICING_STYLES[g.voicing]),
        h('li', null, h('strong', null, 'Tempo tipico: '), `${g.bpm[0]}–${g.bpm[1]} BPM`),
        h('li', null, h('strong', null, 'Carattere: '), g.tonality === 'both' ? 'maggiore e minore' : g.tonality === 'major' ? 'soprattutto maggiore' : 'soprattutto minore'))),
      h('div', { class: 'panel' }, h('h3', null, 'Consigli di scrittura'), h('ul', null, g.tips.map((t) => h('li', null, t))))),
    children.length ? h('section', null, h('h2', null, 'Sottogeneri'), h('div', { class: 'genre-grid' }, children.map((c) =>
      h('a', { class: 'genre-card', href: href('generi/' + c.id), style: { '--hue': String(c.hue) } }, h('strong', null, c.name), h('span', null, c.description))))) : null,
    h('section', null,
      h('div', { class: 'section-head' }, h('h2', null, 'Progressioni tipiche'), h('a', { class: 'link', href: href('libreria', { g: id }) }, 'Tutte →')),
      h('div', { class: 'grid' }, lib.map((p) => {
        const t = MODES[p.mode].tonality === tonality ? tonic : MODES[p.mode].tonality === 'minor' ? 'A' : 'C';
        return progressionCard({
          title: p.name, subtitle: p.description, chords: p.chords, key: { tonic: parseNote(t), mode: p.mode },
          style: styleFor(id), pattern: patternFor(id), bars: p.bars, badges: [stars(p.popularity)],
          href: href('prog', { id: p.id, k: t, m: p.mode, g: id }),
        });
      }))));
}
