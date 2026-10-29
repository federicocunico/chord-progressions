import { h, segmented } from '../dom';
import { keyControls } from '../components/controls';
import { analyzeAll, pill, playButton, legend, type ChordItem } from '../components/progression';
import { circleOfFifths } from '../components/diagrams';
import { context, currentKey, styleFor, patternFor } from '../state';
import { MODES, harmonize } from '../../theory/scales';
import { formatRoman, skeletonToken, type RomanChord } from '../../theory/roman';
import { suggestNext } from '../../theory/generator';
import { FUNCTION_NAMES, type HarmonicFunction } from '../../theory/analysis';
import { QUALITIES, type QualityId } from '../../theory/chords';
import { voiceProgression, voicingMidi } from '../../guitar/voicings';
import { player } from '../../audio/player';
import { noteName, pc } from '../../theory/notes';
import { href } from '../router';

let built: string[] = [];
let sevenths = false;

const BORROWED: Record<'major' | 'minor', string[]> = {
  major: ['iv', 'bVII', 'bVI', 'bIII', 'iiø7', 'v', 'bII', 'i'],
  minor: ['IV', 'V', 'V7', 'vii°', 'bII', 'I', 'ii', 'vi°'],
};
const SECONDARY: Record<'major' | 'minor', string[]> = {
  major: ['V7/ii', 'V7/iii', 'V7/IV', 'V7/V', 'V7/vi', 'vii°7/V'],
  minor: ['V7/iv', 'V7/bIII', 'V7/bVI', 'V7/bVII', 'V7/V'],
};

function upgrade(rc: RomanChord, q: QualityId): string {
  return formatRoman({ ...rc, quality: q });
}

export function mapView(): HTMLElement {
  const key = currentKey();
  const mode = MODES[context.mode];
  const tonality = mode.tonality;
  const root = h('div', { class: 'view map' });

  function render() {
    const diatonic = mode.id === 'blues'
      ? ['I7', 'IV7', 'V7', 'ii7', 'vi7', 'bVII7']
      : harmonize(mode.scale).map((d) => upgrade({ degree: d.degree, acc: d.acc, quality: d.triad }, sevenths ? d.seventh : d.triad));
    const borrowed = BORROWED[tonality].filter((n) => !diatonic.map(skeletonToken).includes(skeletonToken(n)));
    const secondary = SECONDARY[tonality];
    const last = built[built.length - 1];
    const sugg = last ? suggestNext(last, context.genre, context.mode, 30) : [];
    const strength = new Map(sugg.map((s) => [s.token, s.prob]));
    const maxP = sugg[0]?.prob ?? 1;

    const add = (n: string) => {
      if (built.length >= 8) return;
      built = [...built, n];
      const it = analyzeAll([n], key)[0];
      player.preview(voicingMidi(voiceProgression([it.chord], styleFor(context.genre))[0]));
      render();
    };
    const chordBtn = (n: string) => {
      const it = analyzeAll([n], key)[0];
      const p = strength.get(skeletonToken(n));
      const rel = p ? p / maxP : 0;
      const b = pill(it, { onClick: () => add(n) });
      if (last) {
        b.style.setProperty('--glow', rel.toFixed(2));
        b.classList.add(rel > 0.45 ? 'sugg-strong' : rel > 0.15 ? 'sugg' : 'sugg-weak');
        if (p) b.append(h('span', { class: 'pct' }, `${Math.round(p * 100)}%`));
      }
      return b;
    };
    const byFn = (list: string[]) => {
      const cols: Record<HarmonicFunction, HTMLElement[]> = { T: [], S: [], D: [] };
      analyzeAll(list, key).forEach((it: ChordItem, i) => cols[it.analysis.fn].push(chordBtn(list[i])));
      return h('div', { class: 'fn-columns' }, (['T', 'S', 'D'] as HarmonicFunction[]).map((f) =>
        h('div', { class: `fn-col fn-${f}` }, h('h4', null, FUNCTION_NAMES[f]), cols[f].length ? cols[f] : h('span', { class: 'muted small' }, '—'))));
    };

    const items = analyzeAll(built, key);
    const style = styleFor(context.genre);
    const builder = h('section', { class: 'panel builder' },
      h('div', { class: 'section-head' }, h('h2', null, 'La tua progressione'), h('span', { class: 'muted small' }, `${built.length}/8`)),
      built.length ? h('div', { class: 'pills' }, items.map((it, i) => h('span', { class: 'built' }, pill(it),
        h('button', { type: 'button', class: 'x', 'aria-label': 'Rimuovi', onclick: () => { built = built.filter((_, k) => k !== i); render(); } }, '×'))))
        : h('p', { class: 'empty' }, 'Tocca un accordo qui sotto per iniziare (di solito si parte dalla tonica). Dopo ogni accordo ti mostro i prossimi più probabili per il genere scelto.'),
      last ? h('div', { class: 'next' }, h('span', { class: 'muted small' }, 'Dopo ', h('strong', null, items[items.length - 1].symbol), ' di solito arriva: '),
        sugg.slice(0, 5).map((s) => chordBtn(s.token))) : null,
      h('footer', null,
        built.length ? playButton(() => {
          const vs = voiceProgression(items.map((i) => i.chord), style);
          return { voicings: vs, bars: built.map(() => 1), pattern: patternFor(context.genre) };
        }, (i) => root.querySelectorAll('.built .pill').forEach((p, k) => p.classList.toggle('active', k === i))) : null,
        built.length ? h('button', { type: 'button', class: 'btn', onclick: () => { built = built.slice(0, -1); render(); } }, '⌫ Annulla') : null,
        built.length ? h('button', { type: 'button', class: 'btn', onclick: () => { built = []; render(); } }, 'Svuota') : null,
        built.length >= 2 ? h('a', { class: 'btn primary', href: href('prog', { c: built.join(','), o: built.join(','), k: context.tonic, m: context.mode, g: context.genre }) }, 'Analizza e varia →') : null));

    root.replaceChildren(
      h('section', { class: 'hero' },
        h('h1', null, 'Mappa armonica'),
        h('p', { class: 'lead' }, `Tutti gli accordi utili in ${noteName(key.tonic)} ${mode.name.toLowerCase()}, raggruppati per funzione. Costruisci la tua progressione: dopo ogni accordo la mappa si "accende" sui passaggi più naturali per il genere scelto.`)),
      h('section', { class: 'panel controls' }, keyControls(),
        segmented(sevenths ? 'y' : 'n', [{ value: 'n', label: 'Triadi' }, { value: 'y', label: 'Settime' }], (v) => { sevenths = v === 'y'; render(); }, 'Tipo di accordi')),
      builder,
      legend(),
      h('div', { class: 'map-grid' },
        h('div', null,
          h('h3', null, 'Accordi della tonalità (diatonici)'),
          h('p', { class: 'muted small' }, 'Nascono tutti dalla stessa scala: stanno sempre bene insieme.'),
          byFn(diatonic),
          h('h3', null, 'Presi in prestito (prestito modale)'),
          h('p', { class: 'muted small' }, `Dalla tonalità ${tonality === 'major' ? 'minore' : 'maggiore'} parallela o da altri modi: aggiungono colore ed emozione.`),
          byFn(borrowed),
          h('h3', null, 'Dominanti secondarie'),
          h('p', { class: 'muted small' }, 'Accordi di settima che "puntano" verso un accordo della tonalità (V7/x → x).'),
          byFn(secondary)),
        h('div', { class: 'panel' },
          h('h3', null, 'Circolo delle quinte'),
          circleOfFifths({
            tonicPc: pc(key.tonic), minor: tonality === 'minor', flats: key.tonic.acc < 0,
            path: items.map((it) => {
              const f = QUALITIES[it.chord.quality].family;
              return { rootPc: it.rootPc, family: f === 'minor' ? 'minor' : f === 'diminished' ? 'dim' : 'major', fn: it.analysis.fn, label: it.symbol };
            }),
          }),
          h('p', { class: 'muted small' }, 'Gli accordi vicini sul cerchio condividono molte note: muoversi di un passo è sempre morbido, saltare lontano crea sorpresa.'))));
  }
  render();
  return root;
}
