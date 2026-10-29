import { h, field, segmented } from '../dom';
import { genreSelect } from '../components/controls';
import { analyzeAll, pill, playButton, midiButton, legend, type ChordItem } from '../components/progression';
import { richText } from '../components/chordTip';
import { circleOfFifths } from '../components/diagrams';
import { laneCells, scaleNotesExplain } from '../components/scaleLane';
import { context, updateContext, currentKey, styleFor, patternFor, instrumentFor } from '../state';
import { PROGRESSIONS } from '../../data/progressions';
import { GENRE_MAP, ROOT_GENRES, type GenreId } from '../../data/genres';
import { MODES, harmonize } from '../../theory/scales';
import { formatRoman, skeletonToken, type Key, type RomanChord } from '../../theory/roman';
import { suggestNext, buildModel, colorize, rng } from '../../theory/generator';
import { describeMove, type HarmonicFunction } from '../../theory/analysis';
import { QUALITIES, type QualityId } from '../../theory/chords';
import { voiceProgression, voicingMidi } from '../../guitar/voicings';
import { player } from '../../audio/player';
import { noteName, pc } from '../../theory/notes';
import { href, replaceQuery, type Route } from '../router';

const MAX = 8;
let built: string[] = [];
let sevenths = false;
let selected = -1;

const BORROWED: Record<'major' | 'minor', string[]> = {
  major: ['iv', 'bVII', 'bVI', 'bIII', 'iiø7', 'v', 'bII', 'i'],
  minor: ['IV', 'V', 'V7', 'vii°', 'bII', 'I', 'ii', 'vi°'],
};
const SECONDARY: Record<'major' | 'minor', string[]> = {
  major: ['V7/ii', 'V7/iii', 'V7/IV', 'V7/V', 'V7/vi', 'vii°7/V'],
  minor: ['V7/iv', 'V7/bIII', 'V7/bVI', 'V7/bVII', 'V7/V'],
};
/** Generi che "chiudono" un giro in modo riconoscibile, per confrontare i finali. */
const CONTRAST: Record<'major' | 'minor', GenreId[]> = {
  major: ['pop', 'rock', 'jazz', 'folk', 'soul', 'blues'],
  minor: ['metal', 'pop', 'jazz', 'flamenco', 'rock', 'folkmetal'],
};

const FN_GROUPS: { fn: HarmonicFunction; name: string; hint: string }[] = [
  { fn: 'T', name: 'Casa', hint: 'stabile, riposa' },
  { fn: 'S', name: 'Viaggio', hint: 'si allontana' },
  { fn: 'D', name: 'Tensione', hint: 'vuole tornare' },
];

const upgrade = (rc: RomanChord, q: QualityId): string => formatRoman({ ...rc, quality: q });

/** Quanto è comune, a parole: i numeri sono una stima, le parole dicono l'ordine di grandezza. */
function bucket(p: number): string {
  return p >= 0.3 ? 'molto comune' : p >= 0.12 ? 'comune' : p >= 0.05 ? 'possibile' : 'insolito';
}
const pct = (p: number): string => (p < 0.05 ? '<5%' : `${Math.round(p * 20) * 5}%`);

interface Ending { genre: GenreId; tokens: string[]; chords: string[]; title: string }

/** Il modo più tipico, per un genere, di tornare a casa dall'ultimo accordo (uno o due passi). */
function endingFor(last: string, genre: GenreId, key: Key, taken: Set<string>): Ending | null {
  const mode = key.mode;
  const tonic = MODES[mode].tonality === 'minor' ? 'i' : 'I';
  const lastTok = skeletonToken(last);
  const row = new Map(suggestNext(last, genre, mode, 30).map((s) => [s.token, s.prob]));
  const paths: { tokens: string[]; score: number }[] = [];
  if (lastTok !== tonic) paths.push({ tokens: [tonic], score: row.get(tonic) ?? 0 });
  for (const [x, px] of row) {
    if (x === tonic || x === lastTok) continue;
    const back = suggestNext(x, genre, mode, 30).find((s) => s.token === tonic)?.prob ?? 0;
    // un passo in più va premiato un po', altrimenti vince sempre la risoluzione diretta
    paths.push({ tokens: [x, tonic], score: px * back * 1.6 });
  }
  const best = paths.sort((a, b) => b.score - a.score).find((p) => !taken.has(p.tokens.join(' ')));
  if (!best) return null;
  taken.add(best.tokens.join(' '));
  const chords = colorize(best.tokens, GENRE_MAP[genre].flavor, mode, rng(7));
  const from = best.tokens.length > 1 ? chords[0] : last;
  return { genre, tokens: best.tokens, chords, title: describeMove(from, chords[chords.length - 1], key).title };
}

/** Progressioni della libreria che contengono il giro costruito (anche "a cavallo" del loop). */
function lookalikes(tokens: string[], key: Key) {
  if (tokens.length < 2) return [];
  const t = tokens.map(skeletonToken).join(' ');
  const tonality = MODES[key.mode].tonality;
  return PROGRESSIONS.filter((p) => MODES[p.mode].tonality === tonality).filter((p) => {
    const s = p.chords.map(skeletonToken);
    return [...s, ...s].join(' ').includes(t) && s.length >= tokens.length;
  }).sort((a, b) => b.popularity - a.popularity).slice(0, 3);
}

export function labView(route: Route): HTMLElement {
  const fromUrl = route.query.get('c')?.split(',').filter(Boolean);
  if (fromUrl?.length) built = fromUrl.slice(0, MAX);
  const root = h('div', { class: 'view lab' });

  function render(): void {
    replaceQuery({ c: built.length ? built.join(',') : undefined });
    const key = currentKey();
    const mode = MODES[context.mode];
    const tonality = mode.tonality;
    const genre = context.genre;
    const style = styleFor(genre);
    const items = analyzeAll(built, key);
    if (selected >= built.length || selected < 0) selected = built.length - 1;
    const last = built[built.length - 1];
    const sugg = last ? suggestNext(last, genre, context.mode, 30) : [];
    const strength = new Map(sugg.map((s) => [s.token, s.prob]));
    const maxP = sugg[0]?.prob ?? 1;

    const add = (n: string) => {
      if (built.length >= MAX) return;
      built = [...built, n];
      selected = built.length - 1;
      const it = analyzeAll([n], key)[0];
      void player.preview(voicingMidi(voiceProgression([it.chord], style)[0]), instrumentFor(genre));
      render();
    };
    const playArgs = (chords: string[]) => () => {
      const its = analyzeAll(chords, key);
      return { voicings: voiceProgression(its.map((i) => i.chord), style), bars: chords.map(() => 1), pattern: patternFor(genre), instrument: instrumentFor(genre) };
    };

    // ── la progressione, con la corsia della scala sotto
    const slotPills = items.map((it) => pill(it, { big: true }));
    const highlight = (i: number | null) => slotPills.forEach((p, k) => p.classList.toggle('active', k === i));
    const slots = items.map((it, i) => h('div', { class: 'slot', style: { gridRow: '1' } },
      h('span', { class: 'stepn' }, String(i + 1)),
      slotPills[i],
      h('button', { type: 'button', class: 'x', 'aria-label': `Togli ${it.symbol}`, onclick: () => { built = built.filter((_, k) => k !== i); render(); } }, '×')));
    if (built.length < MAX) {
      slots.push(h('div', { class: 'slot empty-slot', style: { gridRow: '1' } },
        h('span', { class: 'stepn' }, built.length ? `${built.length + 1} · prossimo` : 'il primo'),
        h('span', { class: 'q', 'aria-label': 'Prossimo accordo' }, '?')));
    }
    const timeline = h('div', { class: 'timeline' },
      h('div', { class: 'timeline-grid', style: { '--n': String(Math.max(1, slots.length)) } },
        slots, items.length ? laneCells(items, key, selected, (i) => { selected = i; render(); }) : null));

    const progression = h('section', { class: 'panel', 'aria-label': 'La tua progressione' },
      h('div', { class: 'section-head' },
        h('h2', null, 'La tua progressione'),
        h('div', { class: 'toolbar-actions' },
          built.length ? playButton(playArgs(built), highlight, 'Suona') : null,
          built.length ? h('button', { type: 'button', class: 'btn', onclick: () => { built = built.slice(0, -1); render(); } }, 'Annulla') : null,
          built.length ? h('button', { type: 'button', class: 'btn', onclick: () => { built = []; render(); } }, 'Svuota') : null,
          built.length ? midiButton(playArgs(built), () => items.map((i) => i.symbol), () => 'La mia progressione') : null,
          built.length >= 2 ? h('a', { class: 'btn primary', href: href('prog', { c: built.join(','), o: built.join(','), k: context.tonic, m: context.mode, g: genre }) }, 'Apri come progressione →') : null)),
      timeline,
      items.length ? scaleNotesExplain(items[selected], key)
        : h('p', { class: 'muted', style: { margin: '8px 0 0' } }, 'Di solito si parte da casa: tocca un accordo qui sotto. Sotto ogni accordo vedrai la scala in cui sei, e quando cambia.'));

    // ── cosa viene dopo
    const startRow = (): { token: string; prob: number }[] => {
      const st = buildModel(genre, context.mode).start;
      const tot = [...st.values()].reduce((a, b) => a + b, 0) || 1;
      return [...st.entries()].map(([token, v]) => ({ token, prob: v / tot })).sort((a, b) => b.prob - a.prob).slice(0, 6);
    };
    const list = last ? sugg.slice(0, 7) : startRow();
    const nextItems = analyzeAll(list.map((s) => s.token), key);
    const nextPanel = h('section', { class: 'panel wide', 'aria-label': 'Cosa viene dopo' },
      h('div', { class: 'section-head', style: { marginBottom: '6px' } },
        h('h2', null, last ? h('span', null, 'Cosa viene dopo ', richText(`{${last}}`, key), '?') : 'Da dove si parte?')),
      h('p', { class: 'muted small' }, `Quanto è comune (stima) nel ${GENRE_MAP[genre].name.toLowerCase()} · tocca per aggiungere`),
      h('div', { class: 'next-list' }, list.map((s, i) => {
        const it = nextItems[i];
        const move = last ? describeMove(last, s.token, key).title : it.analysis.label;
        return h('button', { type: 'button', class: 'next-item', onclick: () => add(s.token), disabled: built.length >= MAX },
          pill(it, { small: true }),
          h('span', { class: 'txt' },
            h('span', null, h('b', null, bucket(s.prob)), h('span', { class: 'muted' }, ' · ', richText(move, key))),
            h('span', { class: 'freq', 'aria-hidden': 'true' }, h('span', { style: { width: `${Math.round((s.prob / list[0].prob) * 100)}%` } }))),
          h('span', { class: 'p' }, pct(s.prob)));
      })),
      h('p', { class: 'muted small', style: { margin: '12px 0 0', borderTop: '2px dashed var(--line)', paddingTop: '12px' } },
        'Stima basata sulle progressioni della libreria, pesate per genere, e sulle regole dell\'armonia: non è un conteggio di canzoni reali.'));

    // ── finali per genere
    let endingsPanel: HTMLElement | null = null;
    if (last) {
      const taken = new Set<string>();
      const genres = [genre, ...CONTRAST[tonality].filter((g) => g !== genre && GENRE_MAP[g].parent !== genre && GENRE_MAP[genre].parent !== g)].slice(0, 3);
      const endings = genres.map((g) => endingFor(last, g, key, taken)).filter((e): e is Ending => !!e);
      const like = lookalikes(built, key);
      endingsPanel = h('aside', { class: 'panel dark', 'aria-label': 'Finali per genere' },
        h('h2', null, 'Come la chiuderebbe…'),
        h('p', { class: 'muted small' }, 'Lo stesso inizio, il ritorno a casa più tipico di generi diversi'),
        h('div', { class: 'next-list', style: { gap: '14px' } }, endings.map((e) => {
          const its = analyzeAll(e.chords, key);
          const ps = its.map((x) => pill(x, { small: true }));
          return h('div', { class: 'ending' },
            h('div', { class: 'row', style: { justifyContent: 'space-between' } },
              h('span', { class: 'g' }, GENRE_MAP[e.genre].name),
              playButton(playArgs([...built, ...e.chords]), (i) => ps.forEach((p, k) => p.classList.toggle('active', i !== null && k === i - built.length)), `Ascolta il finale ${GENRE_MAP[e.genre].name}`, 'sm')),
            h('div', { class: 'row' }, h('span', { class: 'small muted' }, `…${items[items.length - 1].symbol} →`), ps),
            h('span', { class: 'small' }, richText(e.title, key)),
            h('button', { type: 'button', class: 'btn small', style: { alignSelf: 'flex-start' }, disabled: built.length + e.chords.length > MAX, onclick: () => { built = [...built, ...e.chords]; selected = built.length - 1; render(); } }, 'Usa questo finale'));
        })),
        like.length ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1.5px solid color-mix(in srgb, var(--bg) 25%, var(--ink))', paddingTop: '14px', marginTop: '14px' } },
          h('b', { class: 'small' }, 'Somiglia a…'),
          like.map((p) => h('a', { href: href('prog', { id: p.id, k: context.tonic, m: p.mode, g: genre }), style: { color: 'inherit' } }, h('span', { class: 'small' }, h('b', null, p.name), p.examples?.length ? ` · ${p.examples[0].split(' — ')[0]}` : '')))) : null);
    }

    // ── tutti gli accordi
    const diatonic = mode.id === 'blues'
      ? ['I7', 'IV7', 'V7', 'ii7', 'vi7', 'bVII7']
      : harmonize(mode.scale).map((d) => upgrade({ degree: d.degree, acc: d.acc, quality: d.triad }, sevenths ? d.seventh : d.triad));
    const color = [...BORROWED[tonality].filter((n) => !diatonic.map(skeletonToken).includes(skeletonToken(n))), ...SECONDARY[tonality]];
    const chordBtn = (it: ChordItem, n: string) => {
      const p = strength.get(skeletonToken(n));
      const b = pill(it, { onClick: () => add(n) });
      if (last) {
        const rel = p ? p / maxP : 0;
        b.classList.add(rel > 0.45 ? 'sugg-strong' : rel > 0.15 ? 'sugg' : 'sugg-weak');
        if (p && p >= 0.05) b.append(h('span', { class: 'pct' }, pct(p)));
      }
      return b;
    };
    const dItems = analyzeAll(diatonic, key);
    const cItems = analyzeAll(color, key);
    const palette = h('section', null,
      h('div', { class: 'section-head' }, h('h2', null, 'Tutti gli accordi'),
        segmented(sevenths ? 'y' : 'n', [{ value: 'n', label: 'Semplici' }, { value: 'y', label: 'Con la settima' }], (v) => { sevenths = v === 'y'; render(); }, 'Tipo di accordi')),
      legend(),
      h('div', { class: 'palette' },
        FN_GROUPS.map((g) => h('div', { class: `palette-group fn-${g.fn}` },
          h('h3', null, g.name, h('span', { class: 'muted small' }, ` · ${g.hint}`)),
          h('div', { class: 'pills' }, dItems.map((it, i) => (it.analysis.fn === g.fn ? chordBtn(it, diatonic[i]) : null))))),
        h('div', { class: 'palette-group color' },
          h('h3', null, 'Colori', h('span', { class: 'muted small' }, ' · fuori tonalità')),
          h('div', { class: 'pills' }, cItems.map((it, i) => chordBtn(it, color[i]))))));

    const circle = h('section', { class: 'panel flat' },
      h('h2', null, 'Il giro sul circolo delle quinte'),
      h('div', { class: 'lab-cols', style: { alignItems: 'center' } },
        circleOfFifths({
          tonicPc: pc(key.tonic), minor: tonality === 'minor', flats: key.tonic.acc < 0,
          path: items.map((it) => {
            const f = QUALITIES[it.chord.quality].family;
            return { rootPc: it.rootPc, family: f === 'minor' ? 'minor' : f === 'diminished' ? 'dim' : 'major', fn: it.analysis.fn, label: it.symbol, chord: it.chord };
          }),
        }),
        h('p', { class: 'muted' }, 'Gli accordi vicini sul cerchio condividono molte note: muoversi di un passo è sempre morbido, saltare lontano crea sorpresa. Lo spicchio evidenziato sono gli accordi della tonalità.')));

    root.replaceChildren(
      h('section', { class: 'hero lab-top' },
        h('div', null,
          h('span', { class: 'kicker' }, 'Laboratorio'),
          h('h1', null, 'Prova, ascolta, cambia.'),
          h('p', { class: 'lead', style: { margin: '0' } }, `Aggiungi un accordo alla volta in ${noteName(key.tonic)} ${mode.name.toLowerCase()}. Dopo ognuno vedi cosa arriva di solito, quanto è comune e come chiuderebbe il giro ogni genere.`)),
        h('div', { class: 'controls-row' },
          field('Genere', genreSelect(genre, (g) => g !== 'all' && updateContext({ genre: g }))),
          h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Generi principali'),
            h('div', { class: 'chips' }, ROOT_GENRES.slice(0, 4).map((g) => h('button', { type: 'button', class: ['chip-btn', g.id === genre ? 'active' : ''], onclick: () => updateContext({ genre: g.id }) }, g.name)))))),
      progression,
      h('section', { class: 'lab-cols' }, nextPanel, endingsPanel),
      palette,
      circle);
  }

  render();
  return root;
}
