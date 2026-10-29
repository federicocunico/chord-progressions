# Handoff — Atlante delle Progressioni

> Aggiornato al 29 ottobre 2026. Documento per chi riprende il progetto (persona o agente).

## 1. Stato attuale (in breve)

| Area | Stato |
|---|---|
| Spec, piano, task | `specs/001-chord-explorer/` — completi per la v1 |
| Motore di teoria | `src/theory/` — note, accordi, modi, numeri romani, analisi, generatore Markov, 14 regole di sostituzione |
| Voicing chitarra | `src/guitar/` — forme aperte, CAGED (Mi/La/Re), power chord, shell jazz, ricerca generica, Viterbi sulla progressione |
| Base di conoscenza | `src/data/` — 113 progressioni, 46 generi/sottogeneri |
| Audio | `src/audio/` — sequencer (10 ritmi), campioni reali di 6 chitarre (FluidR3 GM, CC BY 3.0) caricati a richiesta, synth Karplus-Strong di riserva, riverbero, palm mute |
| MIDI | Export `.mid` (SMF tipo 0, tempo, programma GM, marker con i nomi degli accordi) e uscita **Web MIDI** verso synth/DAW esterni |
| UI | Componi, Libreria, Dettaglio (analisi, scale, sostituzioni), Mappa armonica, Generi, Teoria; tema chiaro/scuro; notazione C D E / Do Re Mi |
| Test | 48 test Vitest (`npm test`) |
| CI/CD | `.github/workflows/ci.yml` (PR e branch) e `deploy.yml` (push su `main` → GitHub Pages) |

### ⚠️ Blocco aperto
Il primo deploy si è fermato su `actions/configure-pages`, perché **GitHub Pages non è ancora abilitato**.
Una tantum: *Settings → Pages → Build and deployment → Source: GitHub Actions*, poi rilanciare il workflow.

### Come lavorarci
```bash
npm install
npm run dev      # http://localhost:5173/chord-progressions/
npm test
npm run build
```
Per aggiungere progressioni o generi vedi `docs/data-model.md`: i test validano automaticamente i dati.

## 2. Limiti dovuti alla sandbox in cui è stato sviluppato

Durante lo sviluppo la rete era filtrata: funzionavano solo la ricerca web (solo snippet), il registro npm
e `raw.githubusercontent.com`. **Non è stato possibile aprire le pagine** (Wikipedia, Hooktheory, il sito
di Brian Calli, Ultimate Guitar, YouTube, Spotify), né scaricare dataset o soundfont da altri host.
Le conseguenze sono:

- La libreria è stata scritta a partire dagli snippet di ricerca più conoscenza teorica, **senza verificare
  ogni esempio su una fonte primaria**. Ho incluso solo i brani di cui ero sicuro, ma vanno controllati.
- Le probabilità del generatore vengono dalla libreria (113 voci) più regole funzionali, **non da statistiche
  reali** su migliaia di brani.
- I campioni audio sono di qualità General MIDI (buona, non da studio).
- Il test nel browser è stato fatto con Chromium headless, senza ascolto reale né test su dispositivi fisici.

## 3. Cosa farei con accesso completo a Internet

Priorità: 🔴 alta · 🟠 media · 🟢 bassa. Ogni voce indica *cosa*, *perché* e *come*.

### A. Dati e conoscenza musicale

1. 🔴 **Statistiche reali sulle progressioni.** Importare e analizzare un corpus di accordi annotato per
   genere, e sostituire i bigrammi della libreria con frequenze vere (per genere, per modo, per posizione).
   - [Chordonomicon](https://huggingface.co/datasets/ailsntua/Chordonomicon): circa 666.000 brani con accordi e
     tag di genere/decennio. È la fonte principale per tutti i generi, compresi i sottogeneri metal.
   - [McGill Billboard](https://ddmal.music.mcgill.ca/research/The_McGill_Billboard_Project_(Chord_Analysis_Dataset)/):
     analisi armoniche di esperti per il pop/rock americano.
   - Hooktheory TheoryTab ([API](https://www.hooktheory.com/api/trends/docs)): trend "dopo X arriva Y"
     già in numeri romani.
   - Corpus degli standard jazz (iReal Pro / [Jazz Harmony Treebank](https://github.com/DCMLab/JazzHarmonyTreebank)).
   - Script: normalizzare in numeri romani (rilevamento della tonalità), calcolare n-grammi di 2-8 accordi,
     esportare `src/data/stats/<genere>.json`, usarli nel generatore (`buildModel`) al posto dei conteggi attuali.
2. 🔴 **Verificare ogni esempio di brano** della libreria su fonti primarie (spartiti ufficiali, Hooktheory,
   analisi accademiche) e aggiungere tonalità originale e anno. Segnare i dubbi con `approx: true`.
3. 🔴 **Esempi famosi generati dai dati:** per ogni progressione, i 5-10 brani più noti che la usano
   (dal corpus del punto 1, ordinati per popolarità via Spotify/Last.fm API), divisi per genere.
4. 🟠 **Ampliare i generi meno coperti**, con analisi di brani reali: folk metal (Eluveitie, Korpiklaani,
   Ensiferum), J-rock/visual kei, K-pop, city pop, black/doom, djent, shoegaze, math rock, metal sinfonico,
   musica italiana (cantautorato, pop italiano, canzone napoletana con la sesta napoletana).
5. 🟠 **Fonti accademiche sul metal e sui generi non pop** (Huddersfield, *Music Theory Online*, Society for
   Music Theory) per citare e motivare le regole di ogni genere nella sezione Teoria.
6. 🟠 **Studiare il linguaggio visivo di Brian Calli** (libri *Illustrated Harmony*, *Illustrated Modes*,
   *Magic Glue*, post Instagram) per allineare colori, icone e metafore, senza copiarne i materiali.
   Valutare un contatto per una collaborazione o almeno per un feedback.
7. 🟢 **Progressioni di modulazione** (cambi di tonalità tipici: +1 semitono nel ritornello finale del J-pop,
   pivot chord, modulazione al relativo), con un generatore di "ponti" tra due tonalità.

### B. Audio e MIDI

8. 🔴 **Campioni di chitarra di qualità superiore**, multi-velocity e con articolazioni (pennata in su/giù,
   palm mute vero, rumori di corda). Candidati con licenze compatibili:
   [FreePats](https://freepats.zenvoid.org/) (CC0), [Karoryfer](https://www.karoryfer.com/) (CC0/CC BY),
   [VSCO-2 CE](https://github.com/sgossner/VSCO-2-CE) (CC0), [Sonatina](https://github.com/peastman/sso);
   oppure soundfont SF2/SFZ caricati con [spessasynth](https://github.com/spessasus/SpessaSynth) o
   [WebAudioFont](https://github.com/surikov/webaudiofont). Convertire in Opus/OGG per dimezzare il peso.
9. 🔴 **Amplificatore e cabinet per l'elettrica**: distorsione con WaveShaper + risposte all'impulso (IR)
   gratuite dei cabinet (per esempio quelle di [Kalthallen](https://www.kalthallen-cabs.com/)), così si suona
   l'elettrica pulita con gain regolabile invece di usare campioni già distorti.
10. 🟠 **Accompagnamento completo**: batteria (pattern per genere da un set di campioni CC0), basso che segue
    le fondamentali con passaggi, metronomo. Così la progressione suona come una demo del genere.
11. 🟠 **Export Guitar Pro / MusicXML / tablature** con [alphaTab](https://www.alphatab.net/) (anche per
    vedere e suonare la tab nel browser), che è il vero equivalente "RSE" di Guitar Pro. Export WAV/MP3
    tramite OfflineAudioContext.
12. 🟢 **Import**: leggere un file MIDI o MusicXML, o incollare una sequenza di accordi da Ultimate Guitar,
    e analizzarli nell'app (tonalità, funzioni, sostituzioni).
13. 🟢 **Riconoscimento degli accordi da audio o microfono** ([essentia.js](https://mtg.github.io/essentia.js/),
    [basic-pitch](https://github.com/spotify/basic-pitch)): suoni la tua idea e l'app la trascrive e la analizza.

### C. Chitarra

14. 🔴 **Accordature alternative**: Drop D, Re standard, Do♯ standard, Drop C, DADGAD (celtico), Open G,
    7 e 8 corde (metal/djent). Basta generalizzare `OPEN_MIDI` in `shapes.ts` e i test.
15. 🟠 **Capotasto**: suggerire su quale tasto metterlo per usare forme aperte in tonalità scomode.
16. 🟠 **Voicing più ricchi**: triadi sulle corde acute, drop-2/drop-3 jazz, accordi "a corda vuota"
    (indie/shoegaze), quartali, e verifica di eseguibilità con un modello della mano (estensione reale delle dita).
17. 🟢 **Modalità mancini** e diagrammi orizzontali (vista tab).
18. 🟢 **Strumming visivo** (frecce giù/su sincronizzate con l'audio) per imparare il ritmo.

### D. Prodotto e UX

19. 🔴 **Test con utenti reali** (chitarristi principianti/intermedi): capire se le spiegazioni sono chiare
    e se le sostituzioni proposte sono utili; misurare il tempo per trovare una progressione.
20. 🟠 **Assistente AI**: un campo "descrivi il pezzo" ("ballata folk metal malinconica in Re minore, 6/8")
    che usa l'API di Claude per scegliere i parametri, proporre progressioni e spiegarle. Serve un piccolo
    backend o una funzione serverless per non esporre la chiave.
21. 🟠 **Salvataggio e condivisione**: preferiti, "canzoni" composte da più sezioni (strofa, ritornello,
    bridge) con la loro progressione, esportabili come PDF o chord sheet.
22. 🟠 **Versione inglese** (i18n) per un pubblico più ampio.
23. 🟢 **PWA installabile** con funzionamento offline completo (service worker che mette in cache i campioni).
24. 🟢 **Video/audio di riferimento**: link a YouTube o Spotify sui brani d'esempio (con le API ufficiali).

### E. Qualità e infrastruttura

25. 🔴 **Abilitare GitHub Pages** (vedi il blocco sopra) e verificare il sito pubblicato su dispositivi reali
    (iOS Safari: sblocco dell'audio al primo tocco; Android Chrome; desktop Firefox, dove non c'è Web MIDI).
26. 🟠 **Aggiornare le GitHub Actions** a versioni per Node 24 (`actions/checkout@v5`, `setup-node@v5`,
    `configure-pages`, `upload-pages-artifact`, `deploy-pages` aggiornati): il runner segnala che Node 20 è deprecato.
27. 🟠 **Audit Lighthouse e accessibilità** (axe-core), test end-to-end con Playwright in CI, test visuali.
28. 🟢 **Dominio personalizzato**, statistiche d'uso rispettose della privacy (es. Plausible), pagina "chi siamo".

## 4. Mappa del codice per orientarsi

| Voglio cambiare… | File |
|---|---|
| le progressioni | `src/data/progressions.ts` |
| i generi e i loro default | `src/data/genres.ts`, `src/ui/state.ts` (ritmo e strumento per genere) |
| come si scrivono gli accordi | `src/theory/roman.ts`, `src/theory/chords.ts` |
| la scelta delle diteggiature | `src/guitar/voicings.ts` (costi in `styleCost` e `transitionCost`) |
| le forme disponibili | `src/guitar/shapes.ts` (testate automaticamente in tutte le tonalità) |
| i ritmi | `src/audio/sequencer.ts` (`barStrokes`) |
| i suoni | `src/audio/player.ts`, campioni in `public/samples/` |
| l'export MIDI | `src/audio/midi.ts` |
| le sostituzioni | `src/theory/substitutions.ts` |
| il generatore | `src/theory/generator.ts` |
