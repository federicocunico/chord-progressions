import { h, select } from '../dom';
import { onNowPlaying, playProgression, stopAll, exportMidi, pill, type NowPlaying } from './progression';
import { settings, updateSettings, genreInstrument, genrePattern } from '../state';
import { PATTERNS, INSTRUMENTS, type Pattern, type InstrumentId } from '../../audio/player';

/**
 * Lettore fisso in basso: compare dopo il primo ascolto e resta mentre si naviga.
 * Mostra cosa suona (con l'accordo corrente evidenziato) e i comandi di suono, ritmo, velocità e loop.
 */
export function playerBar(): HTMLElement {
  const bar = h('div', { class: 'player-bar', role: 'region', 'aria-label': 'Lettore', hidden: true });
  let pills: HTMLElement[] = [];
  let shown: NowPlaying | null = null;

  const restart = () => {
    if (shown?.playing) playProgression(shown.replay(), () => {}, () => {}, undefined, shown.replay);
  };
  const change = (p: Parameters<typeof updateSettings>[0]) => {
    updateSettings(p);
    restart();
  };

  function build(n: NowPlaying): void {
    const a = n.args;
    pills = (a.items ?? []).map((it) => pill(it, { small: true }));
    const toggle = h('button', {
      type: 'button', class: ['play-round', n.playing ? 'playing' : ''], 'aria-label': n.playing ? 'Ferma' : 'Suona di nuovo',
      onclick: () => (n.playing ? stopAll() : playProgression(n.replay(), () => {}, () => {}, undefined, n.replay)),
    }, n.playing ? '■' : '▶');
    const instOpts = [{ value: 'genre' as const, label: a.genre ? `Suono: ${INSTRUMENTS[genreInstrument(a.genre)].name}` : 'Suono del genere' },
      ...(Object.keys(INSTRUMENTS) as InstrumentId[]).map((i) => ({ value: i, label: INSTRUMENTS[i].name }))];
    const patOpts = [{ value: 'genre' as const, label: a.genre ? `Ritmo: ${PATTERNS[genrePattern(a.genre)]}` : 'Ritmo del genere' },
      ...(Object.keys(PATTERNS) as Pattern[]).map((p) => ({ value: p, label: PATTERNS[p] }))];
    const bpmOut = h('output', null, `${settings.bpm} bpm`);
    bar.replaceChildren(
      h('div', { class: 'player-inner' },
        toggle,
        h('div', { class: 'player-title' }, h('b', null, a.title ?? 'Progressione'), h('span', null, n.playing ? (settings.loop ? 'in loop' : 'in ascolto') : 'in pausa')),
        h('div', { class: 'pills' }, pills),
        h('div', { class: 'player-controls' },
          select(settings.instrument, instOpts, (v) => change({ instrument: v as InstrumentId | 'genre' }), { 'aria-label': 'Suono' }),
          select(settings.pattern, patOpts, (v) => change({ pattern: v as Pattern | 'genre' }), { 'aria-label': 'Ritmo' }),
          h('label', { class: 'player-bpm' },
            h('input', {
              type: 'range', min: 50, max: 200, step: 5, value: settings.bpm, 'aria-label': 'Velocità in BPM',
              oninput: (e: Event) => { bpmOut.textContent = `${(e.target as HTMLInputElement).value} bpm`; },
              onchange: (e: Event) => change({ bpm: Number((e.target as HTMLInputElement).value) }),
            }), bpmOut),
          h('button', { type: 'button', class: ['btn', 'small', settings.loop ? 'active' : ''], 'aria-pressed': String(settings.loop), onclick: () => change({ loop: !settings.loop }) }, 'Loop'),
          h('button', { type: 'button', class: 'btn small', onclick: () => exportMidi(n.replay(), (a.items ?? []).map((i) => i.symbol), a.title ?? 'progressione') }, 'MIDI'),
          h('button', { type: 'button', class: 'round', 'aria-label': 'Chiudi il lettore', onclick: () => { stopAll(); bar.hidden = true; document.body.classList.remove('has-player'); } }, '×'))));
  }

  onNowPlaying((n, onlyIndex) => {
    if (!n) return;
    if (onlyIndex && n === shown) {
      pills.forEach((p, k) => p.classList.toggle('active', k === n.index));
      return;
    }
    shown = n;
    build(n);
    bar.hidden = false;
    document.body.classList.add('has-player');
  });
  return bar;
}
