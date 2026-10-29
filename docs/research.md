# Ricerca — fonti e sintesi teorica

Questa è la base documentale da cui è costruita la libreria di progressioni e le regole del motore.

## Fonti consultate

**Ispirazione e approccio visivo**
- Brian Calli (Brian Callipari) — [Instagram @briancalli.music](https://www.instagram.com/briancalli.music/),
  [sito](https://briancallimusic.com/en), [Patreon](https://www.patreon.com/BrianCalliMusic).
  Libri *Illustrated Harmony*, *Illustrated Modes*, *Magic Glue for Guitar Players*: teoria spiegata con
  diagrammi, colori e simboli di accordo, senza pentagramma. → principio guida della UI.

**Statistiche e progressioni comuni**
- Hooktheory — [I analyzed the chords of 1300 popular songs](https://www.hooktheory.com/blog/i-analyzed-the-chords-of-1300-popular-songs-for-patterns-this-is-what-i-found/):
  IV e V compaiono quanto (o più di) I; dopo I, IV segue ~46% e V ~26%.
- Hooktheory — [Statistical study of inversions and slash chords](https://www.hooktheory.com/blog/statistical-study-inversions-slash-chords-popular-music/).
- UCSD, [Chord progression analysis report](https://salu133445.github.io/pdf/chord_progression_analysis_report.pdf)
  (oltre 10.000 brani Hooktheory): i 4-grammi più frequenti sono C–G–Am–F, C–F–G–C e le loro rotazioni.
- Wikipedia — [Chord progression](https://en.wikipedia.org/wiki/Chord_progression),
  [I–V–vi–IV](https://en.wikipedia.org/wiki/I%E2%80%93V%E2%80%93vi%E2%80%93IV_progression),
  [Royal road progression](https://en.wikipedia.org/wiki/Royal_road_progression),
  [Just the Two of Us](https://en.wikipedia.org/wiki/Just_the_Two_of_Us_(Grover_Washington_Jr._song)).
- Native Instruments, [Common chord progressions](https://www.native-instruments.com/blogs/blog/common-chord-progressions);
  LANDR, [Common chord progressions](https://blog.landr.com/common-chord-progressions);
  Yousician, [4 popular chord progressions](https://yousician.com/blog/4-popular-chord-progressions).
- Flat.io, [J-pop & anime chord progressions](https://blog.flat.io/jpop-anime-chord-progressions/);
  nippon.com, [丸サ進行 / Just the Two of Us](https://www.nippon.com/hk/japan-topics/g01096/).

**Rock, modi, metal**
- Ethan Hein — [Mixolydian mode](https://ethanhein.com/wp/2022/mixolydian-mode/),
  [Identifying plagal cadences](https://ethanhein.substack.com/p/identifying-plagal-cadences)
  (I–♭VII–IV–I "doppia plagale"); Stereogum, [In Theory](https://www.stereogum.com/2154471/lorde-solar-power-music-theory/columns).
- Uberchord, [The Andalusian Cadence](https://www.uberchord.com/?p=15889); Signals,
  [The power of the Andalusian cadence](https://signalsmusic.studio/lessons/andalusian-cadence).
- University of Huddersfield, [Harmonic structures in 21st-century metal](https://pure.hud.ac.uk/en/publications/harmonic-structures-in-twenty-first-century-metal-music-a-harmoni/):
  il black metal privilegia accordi minori non diatonici; CORE, [black metal e armonia per terze](https://core.ac.uk/download/223740647.pdf).
- Pickup Music, [Metal guitar chords](https://www.pickupmusic.com/blog/metal-guitar-chords); Fretjam,
  [Metal guitar scales](https://fretjam.com/metal-guitar-scales.html) (frigio dominante, minore armonica).
- JamPlay, [Writing modal chord progressions](https://jamplay.com/articles/5-guides/62-writing-modal-chord-progressions);
  Musiversal, [Master the Phrygian mode](https://musiversal.com/blog/master-phrygian-mode).

**Jazz, sostituzioni, soul**
- Yamaha Hub, [A guitarist's guide to chord substitutions — Part 1](https://hub.yamaha.com/guitars/g-how-to/a-guitarists-guide-to-chord-substitutions-part-one-diatonics/)
  e [Part 2](https://hub.yamaha.com/guitars/g-how-to/a-guitaristss-guide-to-chord-substitutions-part-2-beyond-diatonic/).
- Learn Jazz Standards, [What is a chord substitution?](https://www.learnjazzstandards.com/blog/learning-jazz/jazz-theory/what-is-a-chord-substitution/),
  [Tritone substitution types](https://www.learnjazzstandards.com/blog/learning-jazz/jazz-theory/tritone-substitution-types/).
- Hooktheory, [Jazz chord progressions](https://www.hooktheory.com/blog/jazz-chord-progressions/).
- Pickup Music, [10 essential neo soul chord progressions](https://www.pickupmusic.com/blog/10-essential-neo-soul-chord-progressions-for-guitarists).

**Folk, country**
- Uberchord, [Essential progressions in country, bluegrass & old time](https://www.uberchord.com/?p=17072).

**Chitarra e voicing**
- [tombatossals/chords-db](https://github.com/tombatossals/chords-db) (MIT): formato dati di riferimento
  (tasti per corda, dita, barré, capo).
- TrueFire, [CAGED chords](https://truefire.com/c735); Guitar World,
  [Triads and inversions](https://www.guitarworld.com/lessons/bach-rock-expanding-your-musicality-and-fretboard-knowledge-using-triads-and-inversions-guitar-un-caged);
  Premier Guitar, [How to make the most of 4 chords](https://www.premierguitar.com/what-the-ell-how-to-make-the-most-of-4-chords):
  muovere le forme CAGED nella stessa zona del manico invece di saltare con il barré → base del
  criterio "minimo spostamento" del Viterbi.

## Sintesi teorica usata dal motore

### Funzioni armoniche
| Funzione | Gradi (maggiore) | Gradi (minore) | Sensazione |
|---|---|---|---|
| **T** Tonica | I, vi, iii | i, ♭III | casa, riposo |
| **S** Sottodominante | IV, ii | iv, ii°, ♭VI, ♭VII* | allontanamento, preparazione |
| **D** Dominante | V, vii° | V (armonica), vii°, ♭VII* | tensione, chiede di tornare |

\* `♭VII` fa da sottodominante in rock (I–♭VII–IV) e da "dominante debole" in minore (♭VI–♭VII–i).

### Cadenze principali
- Perfetta/autentica `V–I`; plagale `IV–I` ("Amen"); plagale minore `iv–I`; d'inganno `V–vi`;
  sospesa `…–V`; frigia `♭II–i` / `iv6–V`; eolica `♭VI–♭VII–i`; "Mario" `♭VI–♭VII–I`;
  misolidia `♭VII–I`; doppia plagale `♭VII–IV–I`; andalusa `i–♭VII–♭VI–V`.

### Tratti per genere (riassunto)
- **Pop**: I–V–vi–IV e rotazioni dominano; triadi, add9/sus come colore.
- **J-pop/J-rock/anime**: royal road IVmaj7–V7–iii7–vi; Komuro vi–IV–V–I; "Marusa" IVmaj7–III7–vi7;
  dominanti secondarie frequenti, modulazioni di un tono nel finale.
- **Rock classico**: I–IV–V, misolidio I–♭VII–IV; **punk** power chord I–IV–V, I–V–vi–IV veloce;
  **grunge** cromatismi e prestiti (I–IV–♭III–♭VI).
- **Metal**: modo eolio/frigio, power chord, cadenza eolica ♭VI–♭VII–i, ♭II frigio, tritono
  (Black Sabbath); **black metal**: accordi minori paralleli e mediante cromatica (i–♭vi);
  **doom**: i–♭VI–V lenti, minore armonica; **power/symphonic**: i–♭VI–♭III–♭VII epico,
  V maggiore armonico; **folk metal**: dorico/eolio, ♭VII, pedali (bordone) stile cornamusa.
- **Jazz**: ii–V–I, turnaround I–vi–ii–V, rhythm changes, sostituzione di tritono, backdoor,
  ciclo delle quinte; **bossa**: Imaj7–II7–ii7–♭II7; **gypsy**: i6–iv6–V7; **modale**: vamp dorici.
- **Blues**: 12 battute I7–IV7–V7, quick change, minore con ♭VI7–V7.
- **Soul/gospel/neo-soul**: IV–iv–I, passing diminished, catene di ii–V, accordi di nona.
- **Folk/country/celtico**: I–IV–V, ragtime I–VI7–II7–V7, celtico i–♭VII (dorico/misolidio).
- **Flamenco/latin**: andalusa, frigio dominante I–♭II–♭III–♭II.
