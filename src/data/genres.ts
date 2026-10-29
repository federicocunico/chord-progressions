import type { ScaleId } from '../theory/scales';
import type { VoicingStyle } from '../guitar/voicings';

export type GenreId =
  | 'pop' | 'jpop' | 'kpop' | 'citypop' | 'synthpop' | 'cantautorato'
  | 'rock' | 'classicrock' | 'punk' | 'poppunk' | 'grunge' | 'indie' | 'jrock' | 'bluesrock' | 'prog'
  | 'metal' | 'heavy' | 'thrash' | 'power' | 'symphonic' | 'black' | 'doom' | 'folkmetal' | 'metalcore' | 'neoclassical'
  | 'jazz' | 'bebop' | 'bossa' | 'gypsy' | 'modaljazz'
  | 'blues'
  | 'soul' | 'gospel' | 'neosoul' | 'funk'
  | 'folk' | 'country' | 'bluegrass' | 'celtic'
  | 'latin' | 'flamenco' | 'latinpop'
  | 'reggae' | 'edm' | 'cinematic' | 'classical';

/** Come "colorare" gli accordi delle progressioni generate. */
export type Flavor = 'triads' | 'sevenths' | 'extended' | 'power' | 'color';

export interface GenreDef {
  id: GenreId;
  name: string;
  parent?: GenreId;
  description: string;
  scales: ScaleId[];
  flavor: Flavor;
  voicing: VoicingStyle;
  tonality: 'major' | 'minor' | 'both';
  bpm: [number, number];
  tips: string[];
  /** Colore della scheda (hue HSL). */
  hue: number;
}

const G = (d: GenreDef) => d;

export const GENRES: GenreDef[] = [
  // ───────────── POP
  G({ id: 'pop', name: 'Pop', description: 'Melodie orecchiabili sopra loop di 4 accordi. Il segreto è la ripetizione: la stessa progressione regge strofa e ritornello, cambiano ritmo e arrangiamento.', scales: ['major', 'majorPentatonic', 'minor'], flavor: 'color', voicing: 'open', tonality: 'both', bpm: [90, 128], hue: 330,
    tips: ['Parti da [I]–[V]–[vi]–[IV] o da una sua rotazione: ognuna ha un umore diverso.', 'Aggiungi add9 e sus2 sul [I] e sul [IV] per un suono moderno e "aperto".', 'Un accordo preso in prestito ([iv], [♭VII]) nel bridge crea il momento emotivo.', 'Usa il capotasto per tenere forme aperte in qualsiasi tonalità.'] }),
  G({ id: 'jpop', name: 'J-pop / Anime', parent: 'pop', description: 'Armonia ricca e "drammatica": progressioni che partono dal [IV], dominanti secondarie, settime e modulazioni di un tono nel ritornello finale.', scales: ['major', 'minor', 'majorPentatonic'], flavor: 'sevenths', voicing: 'barre', tonality: 'both', bpm: [120, 180], hue: 345,
    tips: ['La "royal road" [IVmaj7]–[V7]–[iii7]–[vi] è la firma del genere.', 'Inserisci [V7/vi] ([III7]) prima del [vi] per un tocco struggente.', 'Ritornello finale mezzo tono o un tono sopra.', 'Le settime maggiori sul [IV] rendono tutto più cinematografico.'] }),
  G({ id: 'kpop', name: 'K-pop', parent: 'pop', description: 'Pop moderno con influenze EDM, R&B e hip hop: loop minori, accordi di settima e cambi di sezione molto contrastati.', scales: ['minor', 'dorian', 'major'], flavor: 'sevenths', voicing: 'barre', tonality: 'both', bpm: [95, 130], hue: 300,
    tips: ['Loop minori [i]–[♭VI]–[♭III]–[♭VII] per le strofe, ritornello che si apre in maggiore.', 'Settime minori e maj7 per il colore R&B.', 'Il pre-ritornello spesso sale con [IV]–[V]–[vi].'] }),
  G({ id: 'citypop', name: 'City pop', parent: 'pop', description: 'Pop giapponese anni \'80 con armonia jazz: maj7, m9, catene di [ii]–[V] e linee di basso morbide.', scales: ['major', 'dorian', 'mixolydian'], flavor: 'extended', voicing: 'jazz', tonality: 'major', bpm: [95, 120], hue: 280,
    tips: ['Pensa in coppie [ii]–[V] che scendono di tono.', '[IVmaj7]–[iii7]–[ii7]–[Imaj7] è la discesa classica.', 'Il "Just the Two of Us" ([IVmaj7]–[III7]–[vi7]) è onnipresente.'] }),
  G({ id: 'synthpop', name: 'Synth-pop / Anni \'80', parent: 'pop', description: 'Loop ipnotici, spesso minori o dorici, con accordi semplici e molto ripetuti sotto melodie brillanti.', scales: ['minor', 'dorian', 'major'], flavor: 'triads', voicing: 'auto', tonality: 'both', bpm: [100, 125], hue: 260,
    tips: ['Il dorico ([i]–[IV]) dà il sapore "new wave" malinconico ma luminoso.', 'Pochi accordi, molto ritmo: lascia lavorare arpeggi e bassi.'] }),
  G({ id: 'cantautorato', name: 'Cantautorato / Ballata', parent: 'pop', description: 'La canzone d\'autore (italiana e non): giri armonici classici, bassi che scendono, inversioni e qualche accordo di passaggio per sostenere il testo.', scales: ['major', 'minor', 'harmonicMinor'], flavor: 'triads', voicing: 'open', tonality: 'both', bpm: [65, 110], hue: 30,
    tips: ['Il "giro di Do" ([I]–[vi]–[IV]–[V]) è la base di tantissime canzoni.', 'Le inversioni ([I/3], [V/7]) fanno scendere il basso e rendono la ballata elegante.', 'In minore, la cadenza [i]–[iv]–[V] con il [V] maggiore dà il pathos.'] }),

  // ───────────── ROCK
  G({ id: 'rock', name: 'Rock', description: 'Energia e semplicità: [I]–[IV]–[V], misolidio e prestiti dal minore. Le chitarre spesso suonano power chord o accordi aperti con distorsione.', scales: ['major', 'mixolydian', 'minorPentatonic', 'minor'], flavor: 'triads', voicing: 'auto', tonality: 'both', bpm: [100, 150], hue: 10,
    tips: ['[♭VII] è l\'accordo più "rock" che esista: [I]–[♭VII]–[IV].', 'Con la distorsione meglio power chord o triadi senza estensioni.', 'Riff sulla pentatonica minore sopra accordi maggiori: il cuore del rock blues.'] }),
  G({ id: 'classicrock', name: 'Rock classico', parent: 'rock', description: 'Anni \'60-\'70: Beatles, Stones, Led Zeppelin. Doppie plagali, misolidio, blues e progressioni discendenti in minore.', scales: ['mixolydian', 'major', 'minorPentatonic', 'blues'], flavor: 'triads', voicing: 'open', tonality: 'both', bpm: [90, 140], hue: 20,
    tips: ['[I]–[♭VII]–[IV]–[I] (doppia plagale) per il suono "Hey Jude".', '[i]–[♭VII]–[♭VI]–[♭VII] per i brani ipnotici e scuri.'] }),
  G({ id: 'punk', name: 'Punk', parent: 'rock', description: 'Tre accordi e tanta urgenza: power chord veloci, [I]–[IV]–[V] e loop pop suonati in ottavi.', scales: ['major', 'minorPentatonic'], flavor: 'power', voicing: 'power', tonality: 'major', bpm: [160, 210], hue: 0,
    tips: ['Power chord sulla 6ª e 5ª corda: tutto il brano in due forme.', 'Ottavi in pennata in giù, palm muting nelle strofe.'] }),
  G({ id: 'poppunk', name: 'Pop punk / Emo', parent: 'rock', description: 'I loop del pop ([I]–[V]–[vi]–[IV], [vi]–[IV]–[I]–[V]) suonati veloci con power chord e accordi aperti con corde a vuoto.', scales: ['major', 'majorPentatonic'], flavor: 'power', voicing: 'power', tonality: 'major', bpm: [150, 200], hue: 350,
    tips: ['Lascia suonare le corde a vuoto sopra il power chord per il suono emo.', 'Strofa con palm muting, ritornello aperto.'] }),
  G({ id: 'grunge', name: 'Grunge / Alt anni \'90', parent: 'rock', description: 'Accordi presi in prestito e movimenti cromatici sopra power chord: maggiore e minore si mescolano.', scales: ['minorPentatonic', 'minor', 'blues'], flavor: 'power', voicing: 'power', tonality: 'both', bpm: [80, 130], hue: 40,
    tips: ['[I]–[IV]–[♭III]–[♭VI]: quattro power chord, metà fuori tonalità.', 'Strofe pulite e ritornelli esplosivi con gli stessi accordi.'] }),
  G({ id: 'indie', name: 'Indie / Alternative', parent: 'rock', description: 'Pop-rock con colori particolari: maj7, prestiti modali ([I]–[III]–[IV]–[iv]), accordi con corde a vuoto e capotasto.', scales: ['major', 'lydian', 'dorian', 'mixolydian'], flavor: 'color', voicing: 'open', tonality: 'both', bpm: [90, 140], hue: 170,
    tips: ['Forme aperte "strane" con corde a vuoto che risuonano: prova add9 e maj7.', 'Un [III] maggiore ([V/vi]) crea subito il suono sognante e malinconico.'] }),
  G({ id: 'jrock', name: 'J-rock / Visual kei', parent: 'rock', description: 'Rock giapponese: le progressioni del J-pop (royal road, Komuro) suonate con power chord, unite a progressioni minori epiche e cambi di tonalità.', scales: ['minor', 'major', 'harmonicMinor'], flavor: 'power', voicing: 'barre', tonality: 'both', bpm: [140, 200], hue: 355,
    tips: ['[IV]–[V]–[iii]–[vi] con power chord: il ritornello anime per eccellenza.', 'Il [V] maggiore in minore (armonica) per il dramma.', 'Strofe in minore, ritornello nel relativo maggiore.'] }),
  G({ id: 'bluesrock', name: 'Blues rock / Hard rock', parent: 'rock', description: 'Il blues amplificato: riff pentatonici, [I]–[♭III]–[IV], settime di dominante e cadenze eoliche.', scales: ['minorPentatonic', 'blues', 'mixolydian'], flavor: 'power', voicing: 'auto', tonality: 'both', bpm: [90, 140], hue: 25,
    tips: ['Riff sulla pentatonica minore anche sopra accordi maggiori.', '[♭VI]–[♭VII]–[I] chiude un brano hard rock come nient\'altro.'] }),
  G({ id: 'prog', name: 'Prog rock', parent: 'rock', description: 'Modi (lidio, dorico), accordi con basso diverso, mediante cromatiche e tempi dispari.', scales: ['lydian', 'dorian', 'mixolydian', 'minor'], flavor: 'sevenths', voicing: 'barre', tonality: 'both', bpm: [80, 160], hue: 200,
    tips: ['[I]–[II] in lidio per il suono sospeso e "spaziale".', 'Prova a muovere lo stesso accordo per terze maggiori ([I]–[♭VI]–[IV]…).'] }),

  // ───────────── METAL
  G({ id: 'metal', name: 'Metal', description: 'Minore eolio e frigio, power chord, cromatismi e tritoni. La cadenza [♭VI]–[♭VII]–[i] è il "[V]–[I]" del metal.', scales: ['minor', 'phrygian', 'harmonicMinor', 'minorPentatonic'], flavor: 'power', voicing: 'power', tonality: 'minor', bpm: [90, 200], hue: 0,
    tips: ['Power chord: fondamentale + quinta, nessuna terza → funzionano sia in maggiore che in minore.', 'Il [♭II] (frigio) è la tensione più metal che ci sia: [i]–[♭II].', 'Accorda più basso (Drop D, Re standard) per tonalità come Re minore o Do♯ minore.'] }),
  G({ id: 'heavy', name: 'Heavy metal classico', parent: 'metal', description: 'Iron Maiden, Judas Priest, Black Sabbath: eolio, cavalcate, [i]–[♭VI]–[♭VII] e armonizzazioni a terze.', scales: ['minor', 'minorPentatonic', 'harmonicMinor'], flavor: 'power', voicing: 'power', tonality: 'minor', bpm: [110, 180], hue: 5,
    tips: ['[i]–[♭VI]–[♭VII]–[i] è la progressione fondamentale.', 'Armonizza le melodie a terze sulla scala minore.'] }),
  G({ id: 'thrash', name: 'Thrash / Death', parent: 'metal', description: 'Riff cromatici sulla 6ª corda, frigio e locrio, tritoni e power chord veloci.', scales: ['phrygian', 'locrian', 'minor', 'blues'], flavor: 'power', voicing: 'power', tonality: 'minor', bpm: [160, 240], hue: 355,
    tips: ['Pedale sulla corda a vuoto alternato a power chord cromatici ([i]–[♭II]–[♭III]).', 'Il tritono ([i]–[♭v]) per la massima aggressività.'] }),
  G({ id: 'power', name: 'Power metal', parent: 'metal', description: 'Epico e melodico: progressioni minori che si aprono in maggiore, [V] maggiore dalla minore armonica, ritornelli corali.', scales: ['minor', 'harmonicMinor', 'major'], flavor: 'power', voicing: 'barre', tonality: 'both', bpm: [140, 200], hue: 45,
    tips: ['[i]–[♭VI]–[♭III]–[♭VII]: il ritornello epico per eccellenza.', 'Chiudi con [♭VI]–[♭VII]–[I] (maggiore!) per il finale trionfale.', 'Il [V] maggiore (armonica) prima della tonica crea il pathos neoclassico.'] }),
  G({ id: 'symphonic', name: 'Symphonic / Epic metal', parent: 'metal', description: 'Metal con orchestra: armonia da colonna sonora, minore armonica, mediante cromatiche e cadenze solenni.', scales: ['harmonicMinor', 'minor', 'phrygianDominant'], flavor: 'triads', voicing: 'barre', tonality: 'minor', bpm: [80, 170], hue: 270,
    tips: ['Triadi piene (non solo power chord) per lasciare spazio a orchestra e cori.', '[i]–[♭VI]–[iv]–[V] e la napoletana [♭II] per il dramma.'] }),
  G({ id: 'black', name: 'Black metal', parent: 'metal', description: 'Accordi minori paralleli in tremolo picking, mediante cromatiche ([i]–[♭vi]) e dissonanze: atmosfera gelida e sinistra.', scales: ['minor', 'phrygian', 'harmonicMinor', 'locrian'], flavor: 'triads', voicing: 'barre', tonality: 'minor', bpm: [140, 220], hue: 230,
    tips: ['Muovi la stessa forma barré minore su tasti diversi (accordi minori paralleli).', '[i]–[♭vi] (es. {i}–{♭vi}) è il suono più "black" che ci sia.', 'Lascia suonare le corde acute a vuoto sopra gli accordi per la dissonanza.'] }),
  G({ id: 'doom', name: 'Doom / Stoner', parent: 'metal', description: 'Lento e pesante: minore naturale o armonica, [i]–[♭VI]–[V], tritoni sabbathiani, riff pentatonici ribassati.', scales: ['minor', 'blues', 'harmonicMinor', 'phrygian'], flavor: 'power', voicing: 'power', tonality: 'minor', bpm: [50, 90], hue: 15,
    tips: ['Pochi accordi, molto sustain.', 'Il tritono ([i]–[♭V]) di Black Sabbath è il manifesto del genere.'] }),
  G({ id: 'folkmetal', name: 'Folk / Viking metal', parent: 'metal', description: 'Melodie da danza popolare (cornamuse, violini) sopra chitarre distorte: dorico ed eolio, [♭VII], pedali e bordoni, progressioni a due accordi.', scales: ['dorian', 'minor', 'mixolydian', 'minorPentatonic'], flavor: 'power', voicing: 'power', tonality: 'both', bpm: [120, 190], hue: 120,
    tips: ['[i]–[♭VII]–[i]–[♭VII]: il "bordone" che regge la melodia folk.', 'Il [IV] maggiore in minore (dorico) dà il sapore celtico.', 'Melodie in 6/8 o in levare, chitarre che raddoppiano la linea folk.'] }),
  G({ id: 'metalcore', name: 'Metalcore / Djent', parent: 'metal', description: 'Strofe minori con breakdown sul frigio e ritornelli melodici con loop pop ([vi]–[IV]–[I]–[V]).', scales: ['minor', 'phrygian', 'major'], flavor: 'power', voicing: 'power', tonality: 'both', bpm: [110, 180], hue: 210,
    tips: ['Breakdown: corda a vuoto + [♭II].', 'Ritornello "pulito" sui loop pop con accordi più aperti.'] }),
  G({ id: 'neoclassical', name: 'Neoclassical metal', parent: 'metal', description: 'Yngwie, Rhapsody, Malmsteen: minore armonica, cadenze barocche ([i]–[iv]–[V]), arpeggi e diminuiti.', scales: ['harmonicMinor', 'phrygianDominant', 'hungarianMinor'], flavor: 'triads', voicing: 'barre', tonality: 'minor', bpm: [120, 200], hue: 290,
    tips: ['Usa sempre il [V] maggiore (sensibile alzata).', 'Il [vii°7] è un ottimo accordo di passaggio verso la tonica.'] }),

  // ───────────── JAZZ
  G({ id: 'jazz', name: 'Jazz', description: 'Accordi di settima ed estesi, catene di [ii]–[V]–[I], sostituzioni (tritono, backdoor) e modulazioni frequenti.', scales: ['major', 'melodicMinor', 'dorian', 'mixolydian'], flavor: 'sevenths', voicing: 'jazz', tonality: 'both', bpm: [80, 220], hue: 220,
    tips: ['Ogni accordo ha almeno la settima.', 'Il [ii]–[V]–[I] è il mattone: impara a riconoscerlo in tutte le tonalità.', 'Sulla chitarra suona "shell" (fondamentale, terza, settima): leggere e chiare.'] }),
  G({ id: 'bebop', name: 'Standard / Bebop', parent: 'jazz', description: 'Il repertorio degli standard americani: turnaround, rhythm changes, blues jazz, ciclo delle quinte.', scales: ['major', 'dorian', 'mixolydian', 'melodicMinor'], flavor: 'sevenths', voicing: 'jazz', tonality: 'both', bpm: [120, 260], hue: 225,
    tips: ['[I]–[vi]–[ii]–[V]: il turnaround alla fine di ogni giro.', 'Trasforma ogni accordo in dominante del successivo.'] }),
  G({ id: 'bossa', name: 'Bossa nova', parent: 'jazz', description: 'Brasile anni \'60: maj7, m7, dominanti alterati e cromatismi morbidi su ritmo sincopato.', scales: ['major', 'dorian', 'lydian'], flavor: 'extended', voicing: 'jazz', tonality: 'both', bpm: [110, 140], hue: 150,
    tips: ['[Imaj7]–[II7]–[ii7]–[♭II7] (Ipanema): il cromatismo discendente è tutto.', 'Pollice sul basso, dita sugli accordi in sincope.'] }),
  G({ id: 'gypsy', name: 'Gypsy jazz (manouche)', parent: 'jazz', description: 'Django Reinhardt: minore con sesta (m6), dominanti, diminuiti e la "pompe" ritmica.', scales: ['harmonicMinor', 'melodicMinor', 'major'], flavor: 'sevenths', voicing: 'jazz', tonality: 'minor', bpm: [150, 260], hue: 35,
    tips: ['Usa m6 al posto della triade minore: i6–iv6–[V7].', 'Il diminuito sostituisce il [V7] (un semitono sopra la fondamentale).'] }),
  G({ id: 'modaljazz', name: 'Jazz modale / Fusion', parent: 'jazz', description: 'Pochi accordi a lungo (vamp) e un modo come colore: dorico, lidio, misolidio.', scales: ['dorian', 'lydian', 'mixolydian'], flavor: 'extended', voicing: 'jazz', tonality: 'both', bpm: [90, 160], hue: 190,
    tips: ['[i7]–[IV7] in dorico: il groove modale per eccellenza.', 'Accordi per quarte sovrapposte per un suono moderno.'] }),

  // ───────────── BLUES
  G({ id: 'blues', name: 'Blues', description: 'Dodici battute, settime di dominante su tutti i gradi e la "blue note". La base di rock, jazz e soul.', scales: ['blues', 'minorPentatonic', 'majorBlues', 'mixolydian'], flavor: 'sevenths', voicing: 'auto', tonality: 'major', bpm: [60, 140], hue: 215,
    tips: ['Tutti gli accordi sono dominanti (7): [I7]–[IV7]–[V7].', 'Pentatonica minore e scala blues sopra tutto il giro.', 'Turnaround nelle ultime due battute per ripartire.'] }),

  // ───────────── SOUL / R&B
  G({ id: 'soul', name: 'R&B / Soul', description: 'Settime, none, cadenze plagali e dominanti secondarie; groove e linee di basso melodiche.', scales: ['dorian', 'major', 'minorPentatonic'], flavor: 'sevenths', voicing: 'jazz', tonality: 'both', bpm: [65, 110], hue: 310,
    tips: ['m7 e maj7 ovunque; il [iv] minore come colore.', '[ii]–[V] che non risolvono: lasciano il groove sospeso.'] }),
  G({ id: 'gospel', name: 'Gospel', parent: 'soul', description: 'Cadenze plagali, diminuiti di passaggio, "7-3-6", inversioni e bassi che camminano.', scales: ['major', 'majorBlues', 'mixolydian'], flavor: 'extended', voicing: 'barre', tonality: 'major', bpm: [60, 130], hue: 50,
    tips: ['[IV]–[♯iv°7]–[I/5]: il diminuito che sale è il cuore del gospel.', '[I]–[I7]–[IV]–[iv]: la cadenza "amen" dolce-amara.'] }),
  G({ id: 'neosoul', name: 'Neo-soul / Lo-fi', parent: 'soul', description: 'D\'Angelo, Erykah Badu, lo-fi hip hop: maj9, m9, 13, catene [ii]–[V]–[iii]–[vi] e cromatismi morbidi.', scales: ['dorian', 'major', 'melodicMinor'], flavor: 'extended', voicing: 'jazz', tonality: 'both', bpm: [70, 95], hue: 320,
    tips: ['Ogni accordo con nona: maj9, m9, 9.', '[IVmaj7]–[iii7]–[ii7]–[Imaj7]: la discesa lo-fi.', 'Suona accordi "slide" cromatici (stesso accordo mezzo tono sotto) come passaggio.'] }),
  G({ id: 'funk', name: 'Funk', parent: 'soul', description: 'Il groove prima dell\'armonia: vamp su uno o due accordi (7, 9, m7), spesso dorici.', scales: ['dorian', 'mixolydian', 'minorPentatonic'], flavor: 'extended', voicing: 'jazz', tonality: 'both', bpm: [90, 120], hue: 290,
    tips: ['Accordi di nona sulle corde acute, pennata in sedicesimi.', '[i7]–[IV7]: il vamp dorico funky.'] }),

  // ───────────── FOLK
  G({ id: 'folk', name: 'Folk / Country', description: 'Accordi aperti, [I]–[IV]–[V], pentatonica maggiore e melodie cantabili.', scales: ['major', 'majorPentatonic', 'mixolydian', 'dorian'], flavor: 'triads', voicing: 'open', tonality: 'both', bpm: [80, 140], hue: 95,
    tips: ['Accordi aperti e capotasto: la chitarra acustica suona meglio così.', 'Basso alternato (fondamentale/quinta) con il pollice.'] }),
  G({ id: 'country', name: 'Country', parent: 'folk', description: '[I]–[IV]–[V] con dominanti secondarie ([II7], [VI7]), inversioni e il "twang" della pentatonica maggiore.', scales: ['majorPentatonic', 'majorBlues', 'major', 'mixolydian'], flavor: 'triads', voicing: 'open', tonality: 'major', bpm: [90, 160], hue: 60,
    tips: ['Il [II7] ([V/V]) prima del [V] è tipicissimo.', 'Basso alternato e "walk-up" tra gli accordi (G–A–B–C).'] }),
  G({ id: 'bluegrass', name: 'Bluegrass / Old time', parent: 'folk', description: 'Folk americano acustico veloce: [I]–[IV]–[V], progressione ragtime [I]–[VI7]–[II7]–[V7].', scales: ['majorPentatonic', 'major', 'mixolydian'], flavor: 'triads', voicing: 'open', tonality: 'major', bpm: [120, 200], hue: 75,
    tips: ['Il ciclo di dominanti [VI7]–[II7]–[V7]–[I] (ragtime).', 'Tieni il ritmo con il "boom-chick" (basso-accordo).'] }),
  G({ id: 'celtic', name: 'Celtico / Irlandese', parent: 'folk', description: 'Danze e ballate modali: dorico e misolidio, bordoni, progressioni a due accordi ([i]–[♭VII]).', scales: ['dorian', 'mixolydian', 'major', 'minorPentatonic'], flavor: 'triads', voicing: 'open', tonality: 'both', bpm: [90, 180], hue: 130,
    tips: ['[i]–[♭VII] (es. {i}–{♭VII}) è il suono del "Drunken Sailor".', 'Accordatura DADGAD o corde a vuoto come bordone.'] }),

  // ───────────── LATIN
  G({ id: 'latin', name: 'Latin / Flamenco', description: 'Cadenza andalusa, frigio dominante, minore armonica e ritmi sincopati.', scales: ['phrygianDominant', 'harmonicMinor', 'minor', 'dorian'], flavor: 'triads', voicing: 'open', tonality: 'minor', bpm: [90, 140], hue: 15,
    tips: ['[i]–[♭VII]–[♭VI]–[V]: la cadenza andalusa.', 'Il [V] maggiore in minore è d\'obbligo.'] }),
  G({ id: 'flamenco', name: 'Flamenco', parent: 'latin', description: 'Il modo frigio "spagnolo" (frigio dominante): [I]–[♭II]–[♭III]–[♭II], rasgueado e cadenze andaluse.', scales: ['phrygianDominant', 'phrygian', 'harmonicMinor'], flavor: 'triads', voicing: 'open', tonality: 'minor', bpm: [90, 180], hue: 5,
    tips: ['In Mi: Mi–Fa–Sol–Fa–Mi, l\'accordo di Mi maggiore è la "tonica" frigia.', 'Rasgueado e corde a vuoto per il suono tipico.'] }),
  G({ id: 'latinpop', name: 'Latin pop / Reggaeton', parent: 'latin', description: 'I loop del pop ([vi]–[IV]–[I]–[V], [i]–[♭VI]–[♭III]–[♭VII]) su ritmi dembow e bossa.', scales: ['minor', 'major', 'harmonicMinor'], flavor: 'triads', voicing: 'open', tonality: 'both', bpm: [85, 105], hue: 25,
    tips: ['Quattro accordi minori/maggiori in loop, il ritmo fa il genere.'] }),

  // ───────────── ALTRI
  G({ id: 'reggae', name: 'Reggae / Ska', description: 'Accordi in levare ("skank"), loop di due o quattro accordi, [I]–[IV] e [i]–[iv].', scales: ['major', 'dorian', 'minorPentatonic'], flavor: 'triads', voicing: 'barre', tonality: 'both', bpm: [70, 150], hue: 140,
    tips: ['Accordi corti sul levare, triadi sulle corde acute.', 'Pochi accordi, molta ripetizione.'] }),
  G({ id: 'edm', name: 'Elettronica / EDM', description: 'Loop di 4 accordi minori, build-up e drop: [i]–[♭VI]–[♭III]–[♭VII], [vi]–[IV]–[I]–[V].', scales: ['minor', 'major', 'dorian'], flavor: 'color', voicing: 'auto', tonality: 'both', bpm: [120, 150], hue: 185,
    tips: ['Un solo loop per tutto il brano, cambia l\'energia non gli accordi.', 'sus2 e add9 per pad ampi.'] }),
  G({ id: 'cinematic', name: 'Cinematografica / Epica', description: 'Colonne sonore: mediante cromatiche ([I]–[♭VI], [I]–[III]), lidio, minore armonica, cadenze solenni.', scales: ['minor', 'lydian', 'harmonicMinor', 'dorian'], flavor: 'triads', voicing: 'barre', tonality: 'both', bpm: [60, 120], hue: 250,
    tips: ['Accordi maggiori a distanza di terza ([I]–[♭VI]–[IV]): eroico e "magico".', 'Il lidio ([I]–[II]) per meraviglia e fantasia.'] }),
  G({ id: 'classical', name: 'Classica / Cadenze', description: 'Le regole dell\'armonia tonale: cadenze perfette, plagali, d\'inganno, napoletana, terza piccarda.', scales: ['major', 'harmonicMinor', 'melodicMinor'], flavor: 'triads', voicing: 'open', tonality: 'both', bpm: [60, 120], hue: 40,
    tips: ['T → S → D → T: la grammatica di base.', 'La sensibile sale sempre alla tonica.'] }),
];

export const GENRE_MAP: Record<GenreId, GenreDef> = Object.fromEntries(GENRES.map((g) => [g.id, g])) as Record<GenreId, GenreDef>;

export function genreChildren(id: GenreId): GenreId[] {
  return GENRES.filter((g) => g.parent === id).map((g) => g.id);
}

/** Il genere e tutti i suoi sottogeneri. */
export function genreFamily(id: GenreId): GenreId[] {
  return [id, ...genreChildren(id)];
}

export const ROOT_GENRES = GENRES.filter((g) => !g.parent);
