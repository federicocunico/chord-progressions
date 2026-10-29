import { h } from '../dom';
import { tip, chordRef, richText } from '../components/chordTip';
import { keyControls } from '../components/controls';
import { analyzeAll, pill, legend } from '../components/progression';
import { chordDiagram, fretboard } from '../components/diagrams';
import { context, currentKey, styleFor } from '../state';
import { MODES, SCALES, harmonize, scaleNotes, scalePcs, type ScaleId } from '../../theory/scales';
import { formatRoman, makeKey } from '../../theory/roman';
import { noteName, pc } from '../../theory/notes';
import { SUB_TYPE_NAMES, type SubstitutionType } from '../../theory/substitutions';
import { voiceProgression } from '../../guitar/voicings';
import { href } from '../router';

export const SUB_TEXT: Record<SubstitutionType, string> = {
  diatonica: 'Sostituisci un accordo con un altro della stessa tonalità che ha 2 note in comune ([I] ↔ [vi] ↔ [iii], [IV] ↔ [ii], [V] ↔ [vii°]). Cambia il colore, non la direzione.',
  colore: 'Aggiungi note all\'accordo (7, 9, sus, 6) senza cambiarne la funzione. Il modo più semplice per "modernizzare" una progressione.',
  prestito: 'Prendi l\'accordo dalla tonalità parallela (Do maggiore ↔ Do minore): [iv], [♭VI], [♭VII] in maggiore; [IV], [V] in minore. Emozione immediata.',
  secondaria: 'Ogni accordo può avere la sua "dominante" (es. [V7/ii], [V7/vi]: {V7/ii} porta a {ii}, {V7/vi} a {vi}). Mettila prima per far sembrare quell\'accordo una piccola tonica.',
  tritono: 'Una dominante può essere sostituita da quella a distanza di tritono ({V7} → {♭II7}): stesse note di tensione, basso cromatico.',
  'ii-V': 'Fai precedere un accordo dal suo [ii]–[V]: il motore del jazz, utile anche nel pop per i cambi di tonalità.',
  diminuito: 'Un accordo diminuito di passaggio collega due accordi a distanza di tono con un basso cromatico ([I] – [♯i°7] – [ii]).',
  sus: 'Suona prima la versione sospesa (sus4) e poi risolvi: tensione e rilascio sullo stesso accordo.',
  inversione: 'Metti al basso la terza o la quinta (slash chord, es. {I/3}): la linea di basso diventa melodica e fluida.',
  power: 'Solo fondamentale e quinta: neutro tra maggiore e minore, perfetto con la distorsione.',
  backdoor: 'Arrivare alla tonica da [iv7] – [♭VII7] invece che da [V7]: un ritorno a casa caldo e nostalgico.',
  napoletana: 'Il [♭II] maggiore prima della dominante: colore struggente da opera e da metal neoclassico.',
  inganno: 'Dopo la dominante, al posto della tonica arriva [vi] (o [♭VI] in minore): la frase resta aperta.',
  pedale: 'Il basso resta fermo sulla tonica mentre sopra cambiano gli accordi: tensione sospesa.',
};

export const MODE_TABLE: { scale: ScaleId; mood: string; genres: string; chord: string }[] = [
  { scale: 'major', mood: 'Luminoso, risolto', genres: 'Pop, country, folk', chord: '[I] – [IV] – [V]' },
  { scale: 'mixolydian', mood: 'Solare ma rock', genres: 'Rock classico, blues, celtico', chord: '[I] – [♭VII]' },
  { scale: 'lydian', mood: 'Sognante, magico', genres: 'Colonne sonore, prog', chord: '[I] – [II]' },
  { scale: 'dorian', mood: 'Minore luminoso', genres: 'Funk, folk, jazz modale, folk metal', chord: '[i] – [IV]' },
  { scale: 'minor', mood: 'Malinconico, epico', genres: 'Rock, metal, pop', chord: '[i] – [♭VI] – [♭VII]' },
  { scale: 'phrygian', mood: 'Scuro, minaccioso', genres: 'Metal, flamenco', chord: '[i] – [♭II]' },
  { scale: 'harmonicMinor', mood: 'Drammatico, neoclassico', genres: 'Metal sinfonico, classica, latin', chord: '[i] – [iv] – [V]' },
  { scale: 'phrygianDominant', mood: 'Esotico, spagnolo', genres: 'Flamenco, metal', chord: '[I] – [♭II]' },
  { scale: 'locrian', mood: 'Instabile, disturbante', genres: 'Metal estremo', chord: '[i°] – [♭II]' },
];

export function theoryView(): HTMLElement {
  const key = currentKey();
  const mode = MODES[context.mode];
  const deg = harmonize(mode.scale);
  const triads = deg.map((d) => formatRoman({ degree: d.degree, acc: d.acc, quality: d.triad }));
  const sevenths = deg.map((d) => formatRoman({ degree: d.degree, acc: d.acc, quality: d.seventh }));
  const tItems = analyzeAll(triads, key);
  const sItems = analyzeAll(sevenths, key);
  const voic = voiceProgression(tItems.map((i) => i.chord), styleFor(context.genre), false);
  const notes = scaleNotes(key.tonic, mode.scale).map((n) => noteName(n));
  // accordi citati nel testo: [x] numerale, {x} simbolo, entrambi nella tonalità scelta
  const rt = (s: string) => richText(s, key);
  // forme CAGED e esempi fissi: sempre in Do
  const inC = (s: string) => richText(s, makeKey('C', 'major'));
  const tonicName = noteName(key.tonic);

  const toc: [string, string][] = [
    ['scala', 'La scala e gli accordi della tonalità'], ['numeri', 'Numeri romani'], ['funzioni', 'Funzioni: T, S, D'],
    ['cadenze', 'Cadenze'], ['modi', 'Modi e generi'], ['sostituzioni', 'Sostituzioni'], ['chitarra', 'Sulla chitarra'], ['glossario', 'Glossario'],
  ];

  return h('div', { class: 'view theory' },
    h('section', { class: 'hero' },
      h('h1', null, 'Teoria in pratica'),
      h('p', { class: 'lead' }, 'Il minimo indispensabile per capire perché una progressione funziona, spiegato con la tonalità che hai scelto. Niente pentagramma: solo accordi, colori e forme.')),
    h('nav', { class: 'toc panel' }, toc.map(([id, t]) => h('a', { href: `#/teoria`, onclick: (e: Event) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); } }, t))),
    h('section', { class: 'panel controls' }, keyControls({ genre: false })),

    h('section', { id: 'scala', class: 'prose' },
      h('h2', null, `1. La scala di ${noteName(key.tonic)} ${mode.name.toLowerCase()} e i suoi accordi`),
      h('p', null, 'Una tonalità è una famiglia di 7 note. Prendendo una nota sì e una no a partire da ciascuna (impilando "terze") nascono 7 accordi che stanno sempre bene insieme: gli accordi diatonici.'),
      h('div', { class: 'scale-notes' }, notes.map((n, i) => h('span', { class: 'note-chip' }, h('strong', null, n), h('small', null, String(i + 1))))),
      legend(),
      h('div', { class: 'diatonic-table' },
        tItems.map((it, i) => h('div', { class: `diatonic fn-${it.analysis.fn}` },
          pill(it),
          chordRef(sItems[i].chord, sItems[i].symbol, voic[i]),
          tip(chordDiagram(voic[i], { rootPc: it.rootPc, size: 'sm', title: it.symbol }), it.chord, voic[i]),
          h('span', { class: 'small' }, richText(it.analysis.label, key))))),
      fretboard({ scalePcs: scalePcs(pc(key.tonic), mode.scale), tonicPc: pc(key.tonic), flats: key.tonic.acc < 0, labels: 'degrees' })),

    h('section', { id: 'numeri', class: 'prose' },
      h('h2', null, '2. I numeri romani'),
      h('p', null, rt('Invece di "{I} – {V} – {vi} – {IV}" scriviamo [I] – [V] – [vi] – [IV]: il numero dice su quale grado della scala è costruito l\'accordo. Così la stessa progressione vale in tutte le tonalità.')),
      h('ul', null,
        h('li', null, h('strong', null, 'Maiuscolo'), rt(' = accordo maggiore ([I], [IV], [V]). '), h('strong', null, 'minuscolo'), rt(' = minore ([ii], [iii], [vi]).')),
        h('li', null, h('strong', null, '°'), rt(' = diminuito ([vii°]), '), h('strong', null, 'ø7'), rt(' = semidiminuito ([viiø7]), '), h('strong', null, '+'), ' = aumentato.'),
        h('li', null, h('strong', null, '♭ e ♯'), rt(` davanti al numero indicano accordi fuori dalla scala maggiore: [♭VII] in ${tonicName} è {♭VII}.`)),
        h('li', null, rt('In questa app i numeri sono sempre riferiti alla scala maggiore della tonica: la progressione minore epica si scrive [i] – [♭VI] – [♭III] – [♭VII].')),
        h('li', null, h('strong', null, rt('[V7/vi]')), rt(' = "dominante del [vi]": l\'accordo di settima che porta al [vi].')),
        h('li', null, h('strong', null, rt('[I/3]')), rt(` = accordo di [I] con la terza al basso (in ${tonicName}: {I/3}).`)))),

    h('section', { id: 'funzioni', class: 'prose' },
      h('h2', null, '3. Le funzioni: casa, viaggio, tensione'),
      h('p', null, 'Ogni accordo ha un "ruolo". Capire i ruoli è capire l\'armonia:'),
      h('div', { class: 'fn-explain' },
        h('div', { class: 'panel fn-T' }, h('h3', null, 'T — Tonica'), h('p', null, rt('Casa, riposo. [I], [vi], [iii] in maggiore; [i], [♭III] in minore. Finire qui dà senso di conclusione.'))),
        h('div', { class: 'panel fn-S' }, h('h3', null, 'S — Sottodominante'), h('p', null, rt('Ci si allontana da casa. [IV], [ii] (e in prestito [iv], [♭VI], [♭VII]). Prepara la tensione.'))),
        h('div', { class: 'panel fn-D' }, h('h3', null, 'D — Dominante'), h('p', null, rt('Tensione che chiede di tornare: [V], [V7], [vii°]. Contiene la sensibile, la nota che "vuole" salire alla tonica.')))),
      h('p', null, rt('La frase tipica è T → S → D → T. Le progressioni pop spesso la "ruotano" o la interrompono per creare emozione (es. [V] → [vi], la cadenza d\'inganno).'))),

    h('section', { id: 'cadenze', class: 'prose' },
      h('h2', null, '4. Le cadenze (come finisce una frase)'),
      h('table', { class: 'simple' },
        h('thead', null, h('tr', null, h('th', null, 'Nome'), h('th', null, 'Accordi'), h('th', null, 'Effetto'))),
        h('tbody', null, [
          ['Perfetta', '[V] – [I]', 'Punto fermo, conclusione'], ['Plagale', '[IV] – [I]', '"Amen", morbida'], ['Plagale minore', '[iv] – [I]', 'Dolce-amara'],
          ['D\'inganno', '[V] – [vi]', 'Sorpresa, la frase continua'], ['Sospesa', '… – [V]', 'Virgola, domanda'], ['Eolica / rock', '[♭VI] – [♭VII] – [i]', 'Epica, metal'],
          ['"Mario"', '[♭VI] – [♭VII] – [I]', 'Trionfale'], ['Misolidia', '[♭VII] – [I]', 'Rock classico'], ['Frigia', '[♭II] – [i]', 'Scura, flamenco/metal'], ['Andalusa', '[i] – [♭VII] – [♭VI] – [V]', 'Spagnola, drammatica'],
        ].map(([a, b, c]) => h('tr', null, h('td', null, a), h('td', null, rt(b)), h('td', null, c)))))),

    h('section', { id: 'modi', class: 'prose' },
      h('h2', null, '5. I modi: sette colori, sette generi'),
      h('p', null, 'Un modo è una scala con un "centro" diverso. Ogni modo ha una nota caratteristica e un accordo-firma: usalo per dare subito il carattere giusto al pezzo.'),
      h('table', { class: 'simple' },
        h('thead', null, h('tr', null, h('th', null, 'Modo'), h('th', null, 'Carattere'), h('th', null, 'Generi'), h('th', null, 'Accordi-firma'))),
        h('tbody', null, MODE_TABLE.map((m) => h('tr', null, h('td', null, h('strong', null, SCALES[m.scale].name)), h('td', null, m.mood), h('td', null, m.genres), h('td', null, richText(m.chord, key))))))),

    h('section', { id: 'sostituzioni', class: 'prose' },
      h('h2', null, '6. Sostituzioni: come variare una progressione'),
      h('p', null, 'Nella pagina di ogni progressione trovi le sostituzioni già calcolate. Ecco cosa significano:'),
      h('dl', { class: 'subs-dl' }, (Object.keys(SUB_TEXT) as SubstitutionType[]).map((t) => [h('dt', null, SUB_TYPE_NAMES[t]), h('dd', null, richText(SUB_TEXT[t], key))]))),

    h('section', { id: 'chitarra', class: 'prose' },
      h('h2', null, '7. Sulla chitarra'),
      h('ul', null,
        h('li', null, h('strong', null, 'Accordi aperti'), ': usano corde a vuoto, suonano pieni. Con il capotasto puoi usarli in ogni tonalità.'),
        h('li', null, h('strong', null, 'Sistema CAGED'), inC(': le forme aperte di {I}, {VI}, {V}, {III}, {II} diventano mobili con il barré. In questa app trovi soprattutto la forma di {III} (fondamentale sulla 6ª corda) e di {VI} (fondamentale sulla 5ª).')),
        h('li', null, h('strong', null, 'Restare in zona'), ': la scelta delle forme minimizza i salti della mano. Spesso conviene alternare forme di Mi e di La nello stesso punto del manico invece di spostare un unico barré.'),
        h('li', null, h('strong', null, 'Power chord'), ': fondamentale + quinta (+ ottava). Due o tre dita, perfetti con la distorsione.'),
        h('li', null, h('strong', null, 'Shell jazz'), ': fondamentale, terza e settima su tre corde: leggeri e chiari, il modo jazz di suonare le settime.'),
        h('li', null, 'Nei diagrammi: i numeri sono le dita (1 indice, 2 medio, 3 anulare, 4 mignolo), ', h('strong', null, '×'), ' corda muta, ', h('strong', null, '○'), ' corda a vuoto; il colore pieno indica la fondamentale.'))),

    h('section', { id: 'glossario', class: 'prose' },
      h('h2', null, '8. Glossario'),
      h('dl', { class: 'subs-dl' }, [
        ['Tonalità', 'L\'insieme di note e accordi attorno a una nota "casa" (la tonica).'],
        ['Triade', 'Accordo di tre note: fondamentale, terza, quinta.'],
        ['Settima', 'Quarta nota aggiunta sopra la triade: rende l\'accordo più ricco (maj7, 7, m7).'],
        ['Sensibile', 'Il 7° grado della scala maggiore, a un semitono dalla tonica: crea la spinta della dominante.'],
        ['Relativo', 'Maggiore e minore con le stesse note (Do maggiore ↔ La minore).'],
        ['Parallelo', 'Maggiore e minore con la stessa tonica (Do maggiore ↔ Do minore): la fonte dei prestiti.'],
        ['Slash chord', 'Accordo con una nota diversa al basso: {V/7} = {V} con la sua terza al basso.'],
        ['Voicing', 'Il modo in cui le note di un accordo sono disposte sulle corde.'],
        ['Turnaround', 'Breve giro di accordi che riporta all\'inizio della sezione.'],
        ['Vamp', 'Due o tre accordi ripetuti a lungo, spesso come base per improvvisare.'],
      ].map(([a, b]) => [h('dt', null, a), h('dd', null, inC(b))])),
      h('p', null, 'Pronto? ', h('a', { href: href('') }, 'Torna a comporre →'))));
}
