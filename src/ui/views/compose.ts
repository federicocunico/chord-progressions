import { h, field } from '../dom';
import { keyControls, styleSelect } from '../components/controls';
import { progressionCard, stars, legend } from '../components/progression';
import { context, updateContext, currentKey, styleFor, patternFor } from '../state';
import { generate, libraryFor } from '../../theory/generator';
import { GENRE_MAP } from '../../data/genres';
import { MODES } from '../../theory/scales';
import { noteName } from '../../theory/notes';
import { href } from '../router';

const POP_LABELS = ['', 'Rare e originali', 'Poco comuni', 'Equilibrate', 'Molto usate', 'I grandi classici'];

export function composeView(): HTMLElement {
  const key = currentKey();
  const genre = GENRE_MAP[context.genre];
  const style = styleFor(context.genre);
  const pattern = patternFor(context.genre);

  const lengthCtl = h('div', { class: 'stepper' },
    h('button', { type: 'button', 'aria-label': 'Meno accordi', onclick: () => updateContext({ length: Math.max(2, context.length - 1) }) }, '−'),
    h('output', { 'aria-live': 'polite' }, String(context.length)),
    h('button', { type: 'button', 'aria-label': 'Più accordi', onclick: () => updateContext({ length: Math.min(8, context.length + 1) }) }, '+'));
  const popOut = h('output', null, POP_LABELS[context.popularity]);
  const popCtl = h('div', { class: 'pop-slider' },
    h('span', { class: 'muted small' }, 'Rare'),
    h('input', {
      type: 'range', min: 1, max: 5, step: 1, value: context.popularity, 'aria-label': 'Popolarità',
      oninput: (e: Event) => { popOut.textContent = POP_LABELS[Number((e.target as HTMLInputElement).value)]; },
      onchange: (e: Event) => updateContext({ popularity: Number((e.target as HTMLInputElement).value) }),
    }),
    h('span', { class: 'muted small' }, 'Classici'));

  const controls = h('section', { class: 'panel controls' },
    keyControls(),
    h('div', { class: 'controls-row' },
      field('Numero di accordi', lengthCtl),
      field('Popolarità', h('div', null, popCtl, popOut)),
      styleSelect()));

  const keyName = `${noteName(key.tonic)} ${MODES[key.mode].name.toLowerCase()}`;
  const lib = libraryFor(context.genre, context.mode, context.length).slice(0, 6);
  const libAll = libraryFor(context.genre, context.mode);
  const gen = generate({ genre: context.genre, mode: context.mode, length: context.length, popularity: context.popularity, seed: context.seed, count: 6 });

  const libCards = lib.map((p) => progressionCard({
    title: p.name, subtitle: p.description, chords: p.chords, key: { tonic: key.tonic, mode: p.mode }, style, pattern, genre: context.genre, bars: p.bars,
    badges: [stars(p.popularity)],
    href: href('prog', { id: p.id, k: context.tonic, m: context.mode, g: context.genre }),
  }));
  const genCards = gen.map((g, i) => {
    const meter = h('div', { class: 'meter', title: 'Quanto è comune nel genere' },
      h('span', { class: 'muted small' }, 'Familiarità'),
      h('span', { class: 'meter-bar' }, h('span', { style: { width: `${Math.round(g.familiarity * 100)}%` } })));
    return progressionCard({
      title: g.match ? `≈ ${g.match.name}` : `Idea #${i + 1}`,
      subtitle: g.match ? 'Coincide (o è una rotazione) di una progressione nota della libreria.' : undefined,
      chords: g.chords, key, style, pattern, genre: context.genre,
      badges: g.match ? [h('span', { class: 'badge' }, 'nota')] : [h('span', { class: 'badge new' }, 'nuova')],
      meta: meter,
      href: href('prog', { c: g.chords.join(','), k: context.tonic, m: context.mode, g: context.genre, id: g.match?.id }),
    });
  });

  return h('div', { class: 'view compose' },
    h('section', { class: 'hero' },
      h('h1', null, 'Componi'),
      h('p', { class: 'lead' }, 'Scegli tonalità, genere e quanti accordi vuoi: ti propongo progressioni dalla libreria e idee nuove generate per quel genere, con la diteggiatura già pensata per passare comodamente da un accordo all\'altro.')),
    controls,
    legend(),
    h('section', null,
      h('div', { class: 'section-head' },
        h('h2', null, `Dalla libreria · ${genre.name} in ${keyName}`),
        h('a', { class: 'link', href: href('libreria', { g: context.genre }) }, `Tutte (${libAll.length}) →`)),
      libCards.length ? h('div', { class: 'grid' }, libCards)
        : h('p', { class: 'empty' }, `Nessuna progressione da ${context.length} accordi per questo genere nella libreria: guarda le idee generate qui sotto o cambia il numero di accordi.`)),
    h('section', null,
      h('div', { class: 'section-head' },
        h('h2', null, 'Generate per te'),
        h('button', { type: 'button', class: 'btn', onclick: () => updateContext({ seed: context.seed + 1 }) }, '↻ Altre idee')),
      h('p', { class: 'muted' }, `Create da un modello statistico delle progressioni ${genre.name.toLowerCase()} + regole di armonia funzionale. Sposta il cursore "Popolarità" verso sinistra per idee meno scontate.`),
      genCards.length ? h('div', { class: 'grid' }, genCards) : h('p', { class: 'empty' }, 'Nessuna idea valida con questi parametri: prova un\'altra lunghezza.')));
}
