import { h } from '../dom';
import { analyzeAll, pill, playButton } from '../components/progression';
import { keyForMode, styleFor, patternFor, instrumentFor } from '../state';
import { PROGRESSION_MAP } from '../../data/progressions';
import { MOODS, moodExample } from '../../data/moods';
import { ROOT_GENRES } from '../../data/genres';
import { voiceProgression } from '../../guitar/voicings';
import { noteName } from '../../theory/notes';
import { MODES } from '../../theory/scales';
import { href } from '../router';

const STEP_WORDS = ['Parti da casa', 'Sali in tensione', 'Casa, ma in ombra', 'Respira e riparti'];

export function homeView(): HTMLElement {
  // Il viaggio dell'asse del pop, nella tonalità scelta
  const axis = PROGRESSION_MAP['axis'];
  const { key: axisKey, tonic: axisTonic } = keyForMode('major');
  const axisItems = analyzeAll(axis.chords, axisKey);
  const axisPills = axisItems.map((it) => pill(it));
  const journey = h('figure', { class: 'journey-card', 'aria-label': 'Il viaggio di una progressione' },
    h('div', { class: 'section-head', style: { margin: '0', alignItems: 'center' } },
      h('span', { class: 'kicker' }, 'Ogni giro è un piccolo viaggio'),
      playButton(() => ({ voicings: voiceProgression(axisItems.map((i) => i.chord), styleFor('pop')), bars: axis.chords.map(() => 1), pattern: patternFor('pop'), instrument: instrumentFor('pop'), title: axis.name, items: axisItems, genre: 'pop' as const }),
        (i) => axisPills.forEach((p, k) => p.classList.toggle('active', k === i)), 'Ascolta l\'asse del pop', 'sm')),
    h('div', { class: 'journey-row' }, axisPills.map((p, i) => h('div', null, p, h('span', null, STEP_WORDS[i])))),
    h('p', { class: 'small', style: { margin: '0', borderTop: '2px dashed var(--line)', paddingTop: '14px' } },
      'È ', h('a', { href: href('prog', { id: 'axis', k: axisTonic, m: 'major', g: 'pop' }) }, h('b', null, 'l\'asse del pop')),
      ': lo senti in ', axis.examples!.slice(0, 3).map((e) => e.split(' — ')[0]).join(', '), '.'));

  const moodCards = MOODS.map((m) => {
    const ex = moodExample(m);
    const { key } = keyForMode(ex.mode);
    const genre = ex.genres[0];
    const items = analyzeAll(ex.chords.slice(0, 4), key);
    const pills = items.map((it) => pill(it, { small: true }));
    const play = playButton(() => ({ voicings: voiceProgression(analyzeAll(ex.chords, key).map((i) => i.chord), styleFor(genre)), bars: ex.bars ?? ex.chords.map(() => 1), pattern: patternFor(genre), instrument: instrumentFor(genre), title: ex.name, items: analyzeAll(ex.chords, key), genre }),
      (i) => pills.forEach((p, k) => p.classList.toggle('active', k === i)), `Ascolta ${ex.name}`, 'sm');
    // il tasto play sta dentro la card ma non deve aprire il link
    play.addEventListener('click', (e) => e.preventDefault());
    return h('a', { class: 'mood-card', href: href('ascolta', { u: m.id }) },
      h('div', null, h('div', { class: 'name' }, m.name), h('div', { class: 'feel' }, m.feel)),
      h('div', { class: 'pills' }, pills),
      h('footer', null, play, h('span', null, h('b', null, ex.name), h('br'), h('span', { class: 'muted' }, ex.examples?.[0] ?? `in ${noteName(key.tonic)} ${MODES[ex.mode].name.toLowerCase()}`))));
  });

  return h('div', { class: 'view home' },
    h('section', { class: 'home-hero' },
      h('div', null,
        h('h1', null, 'Che sapore deve avere la tua canzone?'),
        h('p', { class: 'lead' }, 'Scegli un\'emozione: ti facciamo sentire i giri di accordi che la raccontano, con le diteggiature per chitarra già pronte. Niente teoria obbligatoria.'),
        h('div', { class: 'toolbar-actions' },
          h('a', { class: 'btn primary', href: '#emozioni', onclick: (e: Event) => { e.preventDefault(); document.getElementById('emozioni')?.scrollIntoView({ behavior: 'smooth' }); } }, 'Scegli un\'emozione'),
          h('a', { class: 'btn', href: href('lab') }, 'Prova nel laboratorio'))),
      journey),
    h('section', { id: 'emozioni' },
      h('div', { class: 'section-head' }, h('h2', null, 'Parti da un\'emozione'), h('span', { class: 'muted small' }, 'La tonalità si cambia in alto, in qualsiasi momento')),
      h('div', { class: 'mood-grid' }, moodCards)),
    h('section', null,
      h('h2', null, '…oppure da un genere'),
      h('div', { class: 'chips' }, ROOT_GENRES.map((g) => h('a', { class: 'chip-btn', href: href('ascolta', { g: g.id }) }, g.name)))),
    h('section', null,
      h('h2', null, 'Tre modi di usare l\'Atlante'),
      h('div', { class: 'ways' },
        h('a', { class: 'way fn-T', href: href('ascolta') }, h('strong', null, 'Ascolta'), h('span', null, 'Sfoglia più di cento giri famosi e idee nuove, filtrati per emozione, genere e lunghezza.'), h('b', null, 'Esplora →')),
        h('a', { class: 'way fn-S', href: href('lab') }, h('strong', null, 'Laboratorio'), h('span', null, 'Aggiungi un accordo alla volta: ti mostriamo cosa arriva di solito dopo e come lo chiuderebbe ogni genere.'), h('b', null, 'Apri il laboratorio →')),
        h('a', { class: 'way fn-D', href: href('capisci') }, h('strong', null, 'Capisci'), h('span', null, 'Casa, viaggio e tensione spiegati con la tua tonalità, e i trucchi armonici di ogni genere.'), h('b', null, 'Inizia →')))));
}
