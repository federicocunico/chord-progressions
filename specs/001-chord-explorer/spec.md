# Spec 001 — Chord Progression Explorer

> Stato: **Approvata per implementazione** · Versione 1.0 · Ottobre 2026

## 1. Visione

Uno strumento web, servito su GitHub Pages, che aiuta un **chitarrista-compositore con poca teoria**
a scegliere, capire e variare progressioni di accordi. Ispirazione: l'approccio visivo e "illustrato"
di Brian Calli (Brian Callipari, *Illustrated Harmony*): niente pentagramma, colori per funzione,
diagrammi chiari, relazioni tra accordi a colpo d'occhio.

Domanda chiave a cui l'app risponde:

> *"Voglio scrivere un pezzo **[genere]** in **[tonalità]** **[maggiore/minore]** con **N** accordi:
> quali progressioni posso usare, come le suono sulla chitarra, e come le posso variare?"*

## 2. Utente tipo (persona)

- **Federico, chitarrista**: conosce gli accordi aperti e i barré, sa cos'è una tonalità,
  ma non sa perché un accordo "funziona" dopo un altro.
- Compone generi molto diversi (pop, rock, metal, folk metal, J-rock, jazz…).
- Usa l'app su desktop e telefono, spesso con la chitarra in mano.

## 3. User stories e criteri di accettazione

### US-1 — Scegliere il contesto (P1)
Come compositore voglio impostare **tonalità**, **maggiore/minore (o modo)**, **genere/sottogenere**,
**numero di accordi** e **quanto "famosa"** deve essere la progressione.

- AC-1.1 Tonica selezionabile tra le 12 note, con ortografia corretta (es. Si♭ maggiore, non La♯).
- AC-1.2 Tonalità: Maggiore, Minore; modalità avanzate: Dorico, Frigio, Lidio, Misolidio,
  Minore armonica, Frigio dominante, Blues.
- AC-1.3 Generi gerarchici (macro-genere → sottogenere), es. Metal → Folk metal, Rock → J-rock.
- AC-1.4 Lunghezza da 2 a 8 accordi (più le forme lunghe "blues 12 battute" in libreria).
- AC-1.5 Cursore popolarità: da "Classici" (le più usate) a "Rare/originali".

### US-2 — Ottenere progressioni (P1)
Come compositore voglio una lista di progressioni coerenti con il contesto.

- AC-2.1 Sezione **Dalla libreria**: progressioni note della base di conoscenza, filtrate
  e ordinate per popolarità.
- AC-2.2 Sezione **Generate per te**: progressioni nuove create da un modello statistico (catena di
  Markov) appreso dalla libreria per quel genere + regole di armonia funzionale, ordinate secondo il
  cursore di popolarità. Riproducibili (seed) e rigenerabili.
- AC-2.3 Ogni progressione mostra: numeri romani, nomi degli accordi nella tonalità scelta,
  colore per funzione (Tonica / Sottodominante / Dominante / Prestito / Secondaria).
- AC-2.4 Le progressioni generate che coincidono (anche ruotate) con una della libreria lo dichiarano.

### US-3 — Suonarle sulla chitarra (P1)
Come chitarrista voglio, per ogni accordo, **la forma da suonare**, scelta in modo coerente con gli
altri accordi della progressione.

- AC-3.1 Diagramma SVG per ogni accordo: tasti, dita (1-4), barré, corde a vuoto/mute, fondamentale
  evidenziata, tasto di partenza.
- AC-3.2 Le forme sono scelte **sull'intera progressione** minimizzando gli spostamenti della mano
  (ottimizzazione di Viterbi), non accordo per accordo.
- AC-3.3 Stili di diteggiatura: *Automatico (dal genere)*, *Accordi aperti*, *Barré (CAGED)*,
  *Power chord*, *Jazz (shell/drop)*.
- AC-3.4 Per ogni accordo posso scorrere le forme alternative.
- AC-3.5 Ogni forma ha un'etichetta comprensibile: "Aperto", "Barré forma di Mi, V tasto", "Power chord", ecc.

### US-4 — Ascoltarle (P2)
- AC-4.1 Play/stop con sintesi di chitarra (Karplus-Strong) che suona **esattamente** le note dei diagrammi.
- AC-4.2 BPM regolabile, loop, accordo corrente evidenziato durante la riproduzione.

### US-5 — Capire perché funziona (P1)
- AC-5.1 Spiegazione in italiano di ogni passaggio (cadenze, movimento di fondamentale, note comuni).
- AC-5.2 Curva della tensione armonica.
- AC-5.3 Circolo delle quinte con il percorso della progressione disegnato sopra.
- AC-5.4 Scale consigliate per melodia/assolo: scala globale + scala per accordo; manico con note
  della scala e note dell'accordo evidenziate.

### US-6 — Variare (P1)
- AC-6.1 Per ogni accordo, sostituzioni suggerite con tipo e spiegazione: diatonica, colore/estensione,
  prestito modale, dominante secondaria, sostituzione di tritono, ii–V, diminuito di passaggio,
  sus, inversioni (basso che scende/sale), power chord, backdoor, napoletana, cadenza d'inganno.
- AC-6.2 "Applica" modifica la progressione di lavoro (diagrammi, audio e analisi si aggiornano);
  "Ripristina" torna all'originale.
- AC-6.3 Varianti correlate dalla libreria (stessa famiglia, rotazioni).

### US-7 — Esplorare la mappa armonica (P2)
- AC-7.1 Mappa della tonalità: accordi diatonici, presi in prestito e dominanti secondarie,
  raggruppati per funzione e colorati.
- AC-7.2 Costruttore: clicco gli accordi per comporre la mia progressione; dopo ogni accordo l'app
  evidenzia i **prossimi accordi consigliati** con la loro forza (dal modello del genere).
- AC-7.3 La progressione costruita si può aprire nell'analisi completa (US-3..US-6).

### US-8 — Guide di genere e teoria (P2)
- AC-8.1 Scheda per ogni genere/sottogenere: carattere, scale tipiche, accordi tipici,
  consigli di scrittura, stile di diteggiatura consigliato, progressioni rappresentative.
- AC-8.2 Mini-guida teorica in italiano (funzioni, numeri romani, modi, cadenze, sostituzioni, glossario).

### US-9 — Pubblicazione (P1)
- AC-9.1 Sito statico su GitHub Pages, deploy automatico a ogni push su `main`.
- AC-9.2 CI su ogni PR/push: typecheck, test unitari, build.
- AC-9.3 Funziona offline dopo il primo caricamento (nessun backend, nessuna API esterna).

## 4. Requisiti non funzionali

- **NFR-1** Nessun backend: tutto calcolato nel browser.
- **NFR-2** Mobile-first: usabile su schermo da 360 px; tema chiaro e scuro.
- **NFR-3** Caricamento iniziale < 200 KB gzip; nessuna dipendenza runtime pesante.
- **NFR-4** Motore di teoria e chitarra in TypeScript puro, testato (≥ 60 test).
- **NFR-5** Base di conoscenza in file dati tipizzati, facile da estendere (vedi `docs/data-model.md`).
- **NFR-6** Notazione selezionabile: anglosassone (C D E) o latina (Do Re Mi).
- **NFR-7** Accessibilità: contrasto AA, controlli da tastiera, testo alternativo per i diagrammi.

## 5. Fuori ambito (v1)

- Riconoscimento audio / import di file MIDI o tab.
- Account utente e salvataggio in cloud (solo `localStorage` per preferenze e preferiti).
- Accordature alternative (prevista per v2: Drop D, D standard, 7 corde — rilevante per il metal).

## 6. Glossario rapido

| Termine | Significato |
|---|---|
| Numeri romani | Gradi della scala: maiuscolo = accordo maggiore, minuscolo = minore. Sempre riferiti alla scala **maggiore** della tonica (quindi in minore si scrive `i – ♭VI – ♭III – ♭VII`). |
| Funzione | Ruolo dell'accordo: **T** riposo, **S** movimento, **D** tensione che chiede risoluzione. |
| Prestito modale | Accordo preso dalla tonalità parallela (es. `iv` in maggiore). |
| Dominante secondaria | `V7/x`: dominante di un accordo diverso dalla tonica. |
| Voicing / forma | Come l'accordo è disposto sulle corde. |
