import './styles.css';
import { h, mount } from './ui/dom';
import { currentRoute, href } from './ui/router';
import { settings, updateSettings, subscribe, applyTheme } from './ui/state';
import { homeView } from './ui/views/home';
import { ascoltaView } from './ui/views/ascolta';
import { detailView } from './ui/views/detail';
import { labView } from './ui/views/lab';
import { tonicSelect } from './ui/components/controls';
import { select } from './ui/dom';
import { context, updateContext } from './ui/state';
import { MODES, type ModeId } from './theory/scales';
import { TONICS_MAJOR, TONICS_MINOR, parseNote, pc } from './theory/notes';
import { genresView, genreDetailView } from './ui/views/genres';
import { theoryView } from './ui/views/theory';
import { initChordTips, hideChordTip } from './ui/components/chordTip';
import { stopAll } from './ui/components/progression';
import type { GenreId } from './data/genres';

const NAV: [string, string][] = [
  ['ascolta', 'Ascolta'],
  ['lab', 'Laboratorio'],
  ['capisci', 'Capisci'],
];
/** A quale voce del menu appartiene ogni percorso (vecchi link compresi). */
const SECTION: Record<string, string> = { ascolta: 'ascolta', libreria: 'ascolta', prog: 'ascolta', lab: 'lab', mappa: 'lab', capisci: 'capisci', teoria: 'capisci', generi: 'capisci' };

function setMode(m: ModeId): void {
  const list = MODES[m].tonality === 'minor' ? TONICS_MINOR : TONICS_MAJOR;
  let tonic = context.tonic;
  if (!list.includes(tonic)) {
    const p = pc(parseNote(tonic));
    tonic = list.find((t) => pc(parseNote(t)) === p) ?? 'C';
  }
  updateContext({ mode: m, tonic });
}

/** Tonalità di lavoro, sempre a portata di mano nella barra in alto. */
function keyPill(): HTMLElement {
  return h('div', { class: 'key-pill', role: 'group', 'aria-label': 'Tonalità' },
    h('span', { class: 'lbl' }, 'Tonalità'),
    tonicSelect(context.tonic, context.mode, (t) => updateContext({ tonic: t })),
    select(context.mode, (Object.keys(MODES) as ModeId[]).map((m) => ({ value: m, label: MODES[m].name.toLowerCase() })), setMode, { 'aria-label': 'Modo' }));
}

applyTheme();

const main = h('main', { id: 'main', tabindex: '-1' });
const nav = h('nav', { class: 'nav', 'aria-label': 'Sezioni' });

function themeLabel(): string {
  return settings.theme === 'dark' ? '☾' : settings.theme === 'light' ? '☼' : 'A';
}

function header(): HTMLElement {
  const notation = h('button', {
    type: 'button', class: 'round', title: 'Notazione delle note',
    onclick: () => updateSettings({ notation: settings.notation === 'english' ? 'latin' : 'english' }),
  'aria-label': settings.notation === 'english' ? 'Notazione: C D E (tocca per Do Re Mi)' : 'Notazione: Do Re Mi (tocca per C D E)',
  }, settings.notation === 'english' ? 'C' : 'Do');
  const theme = h('button', {
    type: 'button', class: 'round', title: 'Tema: automatico (A), scuro (☾), chiaro (☼)', 'aria-label': 'Cambia tema',
    onclick: () => updateSettings({ theme: settings.theme === 'auto' ? 'dark' : settings.theme === 'dark' ? 'light' : 'auto' }),
  }, themeLabel());
  return h('header', { class: 'top' },
    h('button', { type: 'button', class: 'skip', onclick: () => main.focus() }, 'Vai al contenuto'),
    h('a', { class: 'brand', href: href('') },
      h('span', { class: 'logo', 'aria-hidden': 'true' }, h('i', { class: 'fn-T' }), h('i', { class: 'fn-S' }), h('i', { class: 'fn-D' })),
      h('span', null, 'Atlante')),
    nav,
    h('div', { class: 'top-actions' }, keyPill(), notation, theme));
}

const shell = h('div', { class: 'shell' });
document.getElementById('app')!.append(shell);

function renderNav(active: string) {
  const sec = SECTION[active] ?? '';
  mount(nav, NAV.map(([p, label]) => h('a', { href: href(p), class: sec === p ? 'active' : '', 'aria-current': sec === p ? 'page' : undefined }, label)));
}

let lastPath = '';
function render(fromRoute: boolean) {
  const r = currentRoute();
  const path = r.path[0] ?? '';
  let view: HTMLElement;
  switch (path) {
    case 'ascolta': case 'libreria': view = ascoltaView(r); break;
    case 'prog': view = detailView(r); break;
    case 'lab': case 'mappa': view = labView(r); break;
    case 'generi': view = r.path[1] ? genreDetailView(r.path[1] as GenreId) : genresView(); break;
    case 'capisci': case 'teoria': view = theoryView(); break;
    default: view = homeView();
  }
  hideChordTip();
  mount(main, view);
  renderNav(path);
  const full = r.path.join('/');
  if (fromRoute && full !== lastPath) {
    window.scrollTo({ top: 0 });
    main.focus({ preventScroll: true });
  }
  lastPath = full;
}

function renderShell() {
  mount(shell, header(), main,
    h('footer', { class: 'bottom' },
      h('p', null, 'Ispirato all\'approccio visivo di ', h('a', { href: 'https://www.instagram.com/briancalli.music/', rel: 'noopener', target: '_blank' }, 'Brian Calli'), '. ',
        'Teoria, voicing e audio calcolati nel browser. Suoni di chitarra: soundfont FluidR3 GM (CC BY 3.0, ',
        h('a', { href: 'https://github.com/gleitz/midi-js-soundfonts', rel: 'noopener', target: '_blank' }, 'midi-js-soundfonts'), '). ',
        h('a', { href: 'https://github.com/federicocunico/chord-progressions', rel: 'noopener', target: '_blank' }, 'Codice su GitHub'), '.')));
}

initChordTips();
renderShell();
render(true);
window.addEventListener('hashchange', () => {
  stopAll();
  render(true);
});
subscribe(() => {
  renderShell();
  render(false);
});
