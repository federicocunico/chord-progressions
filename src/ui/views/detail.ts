import { h, field, segmented } from '../dom';
import { tonicSelect, modeControl, genreSelect, styleSelect, patternSelect, bpmControl } from '../components/controls';
import { analyzeAll, pill, playButton, progressionCard, stars, legend, type ChordItem } from '../components/progression';
import { chordDiagram, circleOfFifths, fretboard, tensionCurve } from '../components/diagrams';
import { settings, updateSettings, styleFor, patternFor, context, updateContext } from '../state';
import { PROGRESSION_MAP } from '../../data/progressions';
import { GENRE_MAP, type GenreId } from '../../data/genres';
import { MODES, SCALES, scalePcs, type ModeId, type ScaleId } from '../../theory/scales';
import { parseNote, noteName, pc } from '../../theory/notes';
import { QUALITIES, chordPcs } from '../../theory/chords';
import { parseRoman, prettyRoman, type Key } from '../../theory/roman';
import { describeMove, mainScales, scaleForChord, chordNoteNames, FUNCTION_NAMES } from '../../theory/analysis';
import { substitutionsFor, SUB_TYPE_NAMES, type Substitution, type Boldness } from '../../theory/substitutions';
import { findMatch } from '../../theory/generator';
import { candidatesFor, voiceProgression, voicingMidi, powerize, type Voicing } from '../../guitar/voicings';
import { player } from '../../audio/player';
import { href, replaceQuery, type Route } from '../router';

const BOLD_LABEL: Record<Boldness, string> = { sicura: 'Sicura', colore: 'Colore', audace: 'Audace' };

export function detailView(route: Route): HTMLElement {
  const q = route.query;
  const def = q.get('id') ? PROGRESSION_MAP[q.get('id')!] : undefined;
  const fromUrl = q.get('c')?.split(',').filter(Boolean);
  const original = q.get('o')?.split(',').filter(Boolean) ?? def?.chords ?? fromUrl ?? ['I', 'V', 'vi', 'IV'];
  let chords = fromUrl ?? original.slice();
  try { chords.forEach(parseRoman); } catch { chords = original.slice(); }
  const originalBars = def?.bars ?? original.map(() => 1);
  let bars = q.get('b')?.split(',').map(Number) ?? (chords.join() === original.join() ? originalBars.slice() : chords.map(() => 1));
  if (bars.length !== chords.length) bars = chords.map(() => 1);
  let tonic = q.get('k') ?? context.tonic;
  try { parseNote(tonic); } catch { tonic = 'C'; }
  let mode = (q.get('m') as ModeId) ?? def?.mode ?? context.mode;
  if (!MODES[mode]) mode = 'major';
  let genre = (q.get('g') as GenreId) ?? def?.genres[0] ?? context.genre;
  if (!GENRE_MAP[genre]) genre = 'pop';
  let selected = 0;
  let overrides = new Map<number, number>();
  let scaleView: 'key' | 'pent' | 'chord' = 'key';
  let labels: 'notes' | 'degrees' = 'notes';
  let playing: number | null = null;

  const root = h('div', { class: 'view detail' });
  const key = (): Key => ({ tonic: parseNote(tonic), mode });

  const syncUrl = () => replaceQuery({
    id: def?.id, c: chords.join(','), o: def ? undefined : original.join(','),
    b: bars.some((x) => x !== 1) ? bars.join(',') : undefined, k: tonic, m: mode, g: genre,
  });

  const setChords = (c: string[], b: number[]) => {
    chords = c;
    bars = b;
    overrides = new Map();
    selected = Math.min(selected, chords.length - 1);
    player.stop();
    syncUrl();
    render();
  };

  const voicingsFor = (items: ChordItem[]): { chosen: Voicing[]; alts: Voicing[][] } => {
    const style = styleFor(genre);
    const opt = voiceProgression(items.map((i) => i.chord), style);
    const alts = items.map((i) => candidatesFor(i.chord, style));
    const chosen = opt.map((v, i) => {
      const o = overrides.get(i);
      return o !== undefined && alts[i][o] ? alts[i][o] : v;
    });
    return { chosen, alts };
  };

  const highlight = (i: number | null) => {
    playing = i;
    root.querySelectorAll<HTMLElement>('[data-ci]').forEach((el) => el.classList.toggle('playing', Number(el.dataset.ci) === i));
  };

  function render(): void {
    const k = key();
    const items = analyzeAll(chords, k);
    const { chosen, alts } = voicingsFor(items);
    const flats = k.tonic.acc < 0;
    const g = GENRE_MAP[genre];
    const modified = chords.join(',') !== original.join(',');
    const match = !def ? findMatch(chords, mode) : undefined;
    const title = def?.name ?? (match ? `≈ ${match.name}` : 'La tua progressione');
    const pattern = patternFor(genre);
    const power = styleFor(genre) === 'power';

    // ── intestazione
    const header = h('section', { class: 'detail-head' },
      h('a', { class: 'link back', href: href('') }, '← Componi'),
      h('h1', null, title, modified ? h('span', { class: 'badge warn' }, 'modificata') : null),
      def?.aka?.length ? h('p', { class: 'muted' }, def.aka.join(' · ')) : null,
      h('div', { class: 'badges' },
        def ? stars(def.popularity) : null,
        h('span', { class: 'badge' }, MODES[mode].name),
        h('a', { class: 'badge genre', href: href('generi/' + genre), style: { '--hue': String(g.hue) } }, g.name),
        ...(def?.mood ?? []).map((m) => h('span', { class: 'tag' }, m))),
      def ? h('p', { class: 'lead' }, def.description) : match ? h('p', { class: 'lead' }, match.description) : null,
      def?.examples?.length ? h('p', { class: 'examples' }, h('strong', null, 'Ascoltala in: '), def.examples.join(' · ')) : null,
      modified ? h('button', { type: 'button', class: 'btn', onclick: () => setChords(original.slice(), originalBars.slice()) }, '↺ Ripristina l\'originale') : null);

    // ── barra strumenti
    const toolbar = h('section', { class: 'panel toolbar' },
      h('div', { class: 'controls-row' },
        field('Tonica', tonicSelect(tonic, mode, (t) => { tonic = t; updateContext({ tonic: t }, false); syncUrl(); render(); })),
        field('Tonalità / modo', modeControl(mode, (m) => { mode = m; syncUrl(); render(); })),
        field('Genere', genreSelect(genre, (x) => { if (x !== 'all') { genre = x; syncUrl(); render(); } })),
        styleSelect(), patternSelect(), bpmControl(),
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: settings.loop, onchange: (e: Event) => updateSettings({ loop: (e.target as HTMLInputElement).checked }) }), ' Loop')),
      h('div', { class: 'toolbar-actions' },
        playButton(() => ({ voicings: chosen, bars, pattern }), highlight, 'Suona la progressione'),
        h('button', {
          type: 'button', class: 'btn', onclick: async (e: Event) => {
            const b = e.currentTarget as HTMLButtonElement;
            try { await navigator.clipboard.writeText(location.href); b.textContent = '✓ Link copiato'; } catch { b.textContent = 'Copia il link dalla barra'; }
          },
        }, '🔗 Condividi')));

    // ── accordi e diteggiature
    const chordCards = items.map((it, i) => {
      const v = chosen[i];
      const list = alts[i];
      const idx = Math.max(0, list.findIndex((x) => x.frets.join() === v.frets.join()));
      const cycle = (d: number) => { overrides.set(i, (idx + d + list.length) % list.length); render(); };
      const shownSym = power && it.chord.quality !== powerize(it.chord).quality ? `${it.symbol} → ${noteName(it.chord.root)}5` : it.symbol;
      return h('article', {
        class: `chord-card fn-${it.analysis.fn}${it.analysis.borrowed ? ' borrowed' : ''}${it.analysis.secondary ? ' secondary' : ''}${i === selected ? ' selected' : ''}${playing === i ? ' playing' : ''}`,
        'data-ci': i,
      },
        h('header', null,
          h('span', { class: 'step' }, String(i + 1)),
          h('div', null, h('h3', null, shownSym), h('span', { class: 'num' }, prettyRoman(it.rc))),
          bars[i] !== 1 ? h('span', { class: 'badge' }, `${bars[i]} batt.`) : null),
        h('p', { class: 'fn-label' }, it.analysis.label),
        h('button', { type: 'button', class: 'diagram-btn', title: 'Ascolta questo accordo', onclick: () => player.preview(voicingMidi(v)) },
          chordDiagram(v, { rootPc: it.rootPc, title: it.symbol, flats })),
        h('p', { class: 'voicing-label' }, v.label),
        list.length > 1 ? h('div', { class: 'alt-nav' },
          h('button', { type: 'button', 'aria-label': 'Forma precedente', onclick: () => cycle(-1) }, '‹'),
          h('span', null, `forma ${idx + 1}/${list.length}`),
          h('button', { type: 'button', 'aria-label': 'Forma successiva', onclick: () => cycle(1) }, '›')) : null,
        h('p', { class: 'notes small' }, chordNoteNames(it.chord).join(' · '), ' — ', QUALITIES[it.chord.quality].name),
        h('button', { type: 'button', class: 'btn small', onclick: () => { selected = i; render(); document.getElementById('subs')?.scrollIntoView({ behavior: 'smooth' }); } }, 'Varia questo accordo'));
    });

    const chordsSection = h('section', null,
      h('div', { class: 'section-head' }, h('h2', null, 'Accordi e diteggiature'),
        h('p', { class: 'muted small' }, 'Le forme sono scelte sull\'intera progressione per minimizzare gli spostamenti della mano. Tocca un diagramma per ascoltarlo, usa ‹ › per le alternative.')),
      legend(),
      h('div', { class: 'chord-grid' }, chordCards));

    // ── analisi
    const moves = items.map((it, i) => {
      const next = items[(i + 1) % items.length];
      if (items.length < 2) return null;
      const m = describeMove(it.rc, next.rc, k);
      return h('li', null,
        h('div', { class: 'move-pills' }, pill(it, { small: true }), h('span', { class: 'arrow' }, '→'), pill(next, { small: true })),
        h('div', null, h('strong', null, m.title), h('p', null, m.text)),
        i === items.length - 1 ? h('span', { class: 'badge' }, 'ritorno all\'inizio') : null);
    });
    const fam = (it: ChordItem) => {
      const f = QUALITIES[it.chord.quality].family;
      return f === 'minor' ? 'minor' : f === 'diminished' ? 'dim' : 'major';
    };
    const analysisSection = h('section', null,
      h('h2', null, 'Perché funziona'),
      h('div', { class: 'analysis-grid' },
        h('div', { class: 'panel' },
          h('h3', null, 'Passaggio per passaggio'),
          h('ol', { class: 'moves' }, moves)),
        h('div', { class: 'panel' },
          h('h3', null, 'Tensione armonica'),
          h('p', { class: 'muted small' }, 'Quanto ogni accordo "chiede" di andare avanti. Le belle progressioni alternano tensione e riposo.'),
          tensionCurve(items.map((it) => ({ tension: it.analysis.tension, fn: it.analysis.fn, label: it.symbol })), playing ?? undefined),
          h('h3', null, 'Sul circolo delle quinte'),
          h('p', { class: 'muted small' }, 'Esterno: accordi maggiori · centro: minori · interno: diminuito. Lo spicchio evidenziato sono gli accordi della tonalità: più il percorso esce dallo spicchio, più la progressione è "colorata".'),
          circleOfFifths({
            tonicPc: pc(k.tonic), minor: MODES[mode].tonality === 'minor', flats,
            path: items.map((it) => ({ rootPc: it.rootPc, family: fam(it), fn: it.analysis.fn, label: it.symbol })),
          }))));

    // ── scale
    const mains = mainScales(k);
    const sel = items[selected] ?? items[0];
    const chordScale = scaleForChord(sel.rc, k);
    const fbScale: { tonicPc: number; scale: ScaleId; name: string } =
      scaleView === 'chord' ? { tonicPc: pc(chordScale.tonic), scale: chordScale.scale, name: chordScale.name }
        : scaleView === 'pent' ? { tonicPc: pc(k.tonic), scale: mains[1].scale, name: mains[1].name }
          : { tonicPc: pc(k.tonic), scale: mains[0].scale, name: mains[0].name };
    const scaleSection = h('section', null,
      h('h2', null, 'Scale per melodia e assolo'),
      h('div', { class: 'scale-chips' }, mains.map((m) => h('span', { class: 'chip' }, h('strong', null, m.name), ' — ', SCALES[m.scale].description))),
      h('div', { class: 'panel' },
        h('table', { class: 'scale-table' },
          h('thead', null, h('tr', null, h('th', null, 'Accordo'), h('th', null, 'Scala consigliata'), h('th', null, 'Cosa cambia'))),
          h('tbody', null, items.map((it, i) => {
            const sc = scaleForChord(it.rc, k);
            return h('tr', { class: i === selected ? 'selected' : '', onclick: () => { selected = i; render(); } },
              h('td', null, pill(it, { small: true })),
              h('td', null, sc.name),
              h('td', { class: 'muted' }, sc.changes.length ? sc.changes.join(', ') : 'niente: resta nella scala'));
          })))),
      h('div', { class: 'panel' },
        h('div', { class: 'controls-row' },
          segmented(scaleView, [{ value: 'key', label: 'Scala della tonalità' }, { value: 'pent', label: 'Pentatonica' }, { value: 'chord', label: `Scala su ${sel.symbol}` }], (v) => { scaleView = v; render(); }),
          segmented(labels, [{ value: 'notes', label: 'Note' }, { value: 'degrees', label: 'Gradi' }], (v) => { labels = v; render(); })),
        h('p', { class: 'muted small' }, `${fbScale.name}. In evidenza (colorate) le note di ${sel.symbol}: sono le più sicure su cui fermarsi mentre suona questo accordo.`),
        fretboard({ scalePcs: scalePcs(fbScale.tonicPc, fbScale.scale), tonicPc: fbScale.tonicPc, chordPcs: chordPcs(sel.chord), chordRoot: sel.rootPc, fn: sel.analysis.fn, flats, labels })));

    // ── sostituzioni
    const subs = substitutionsFor(chords, selected, k, bars);
    const groups: Record<Boldness, Substitution[]> = { sicura: [], colore: [], audace: [] };
    subs.forEach((x) => groups[x.boldness].push(x));
    const subCard = (sub: Substitution) => {
      const newItems = analyzeAll(sub.chords, k);
      return h('li', { class: `sub-card bold-${sub.boldness}` },
        h('header', null, h('span', { class: 'badge' }, SUB_TYPE_NAMES[sub.type]), h('strong', null, sub.title)),
        h('p', null, sub.explanation),
        h('div', { class: 'pills' }, newItems.map((it, i) => pill(it, { small: true, changed: sub.changed.includes(i) }))),
        h('footer', null,
          playButton(() => ({ voicings: voiceProgression(newItems.map((x) => x.chord), styleFor(genre)), bars: sub.bars, pattern }), () => {}, 'Ascolta'),
          h('button', { type: 'button', class: 'btn primary', onclick: () => setChords(sub.chords, sub.bars) }, 'Applica')));
    };
    const subsSection = h('section', { id: 'subs' },
      h('h2', null, 'Varianti e sostituzioni'),
      h('p', { class: 'muted' }, 'Scegli un accordo: ti propongo come sostituirlo o arricchirlo, dalla scelta più sicura alla più audace. "Applica" modifica la progressione (puoi sempre ripristinare l\'originale).'),
      h('div', { class: 'pills selector' }, items.map((it, i) => pill(it, { onClick: () => { selected = i; render(); }, active: i === selected }))),
      subs.length ? (['sicura', 'colore', 'audace'] as Boldness[]).filter((b) => groups[b].length).map((b) =>
        h('div', { class: 'sub-group' }, h('h3', null, BOLD_LABEL[b], h('span', { class: 'muted small' }, ` · ${groups[b].length}`)), h('ul', { class: 'sub-list' }, groups[b].map(subCard))))
        : h('p', { class: 'empty' }, 'Nessuna sostituzione per questo accordo.'));

    // ── correlate
    const relatedIds = def?.related ?? match?.related ?? [];
    const related = relatedIds.map((id) => PROGRESSION_MAP[id]).filter(Boolean);
    const relatedSection = related.length ? h('section', null,
      h('h2', null, 'Progressioni parenti'),
      h('div', { class: 'grid' }, related.map((p) => progressionCard({
        title: p.name, subtitle: p.description, chords: p.chords, key: { tonic: k.tonic, mode: p.mode }, style: styleFor(genre), pattern, bars: p.bars,
        badges: [stars(p.popularity)], href: href('prog', { id: p.id, k: tonic, m: p.mode, g: genre }),
      })))) : null;

    const fnSummary = h('p', { class: 'muted small fn-summary' },
      items.map((it) => FUNCTION_NAMES[it.analysis.fn][0]).join(' → '), ' (T = tonica, S = sottodominante, D = dominante)');

    root.replaceChildren(header, toolbar, fnSummary, chordsSection, analysisSection, scaleSection, subsSection, relatedSection ?? '');
  }

  render();
  return root;
}
