# 🎸 Atlante delle Progressioni

Uno strumento web per **chitarristi che compongono** ma conoscono poca teoria: scegli tonalità, genere e
numero di accordi, e ottieni progressioni (famose o nuove), **diteggiature coerenti** per suonarle,
l'audio, la spiegazione armonica e le **sostituzioni** per variarle.

Ispirato all'approccio visivo di [Brian Calli](https://www.instagram.com/briancalli.music/): colori per
funzione, niente pentagramma.

**Sito:** https://federicocunico.github.io/chord-progressions/

## Cosa fa

| Sezione | Cosa trovi |
|---|---|
| **Componi** | Tonalità/modo, genere (46 generi e sottogeneri: dal pop al folk metal, dal J-rock al gypsy jazz), numero di accordi, cursore "classici ↔ rare". Progressioni dalla libreria + idee generate da un modello di Markov per genere. |
| **Dettaglio progressione** | Diagrammi con dita e barré scelti sull'intera progressione (algoritmo di Viterbi), forme alternative, audio (sintesi Karplus-Strong), analisi passaggio per passaggio, curva di tensione, circolo delle quinte, scale per l'assolo sul manico, sostituzioni con "Applica". URL condivisibile. |
| **Libreria** | 113 progressioni con descrizione, esempi famosi, filtri e ricerca. |
| **Mappa armonica** | Accordi diatonici, presi in prestito e dominanti secondarie per funzione; costruisci la tua progressione e vedi i prossimi accordi più probabili. |
| **Generi** | Schede con scale, tipo di accordi, diteggiatura consigliata e consigli di scrittura. |
| **Teoria** | Guida pratica in italiano, calcolata sulla tonalità scelta. |

## Sviluppo

```bash
npm install
npm run dev        # server di sviluppo
npm test           # test del motore (teoria, voicing, generatore, sostituzioni, dati)
npm run build      # build statica in dist/
```

Stack: TypeScript + Vite, nessuna dipendenza runtime, SVG e Web Audio fatti a mano.

## Deploy

Ogni push su `main` pubblica il sito tramite `.github/workflows/deploy.yml`.
Una tantum: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
Su PR e altri branch gira `.github/workflows/ci.yml` (typecheck, test, build).

## Documentazione (spec-driven)

- [`specs/001-chord-explorer/spec.md`](specs/001-chord-explorer/spec.md) — requisiti e criteri di accettazione
- [`specs/001-chord-explorer/plan.md`](specs/001-chord-explorer/plan.md) — architettura e algoritmi
- [`specs/001-chord-explorer/tasks.md`](specs/001-chord-explorer/tasks.md) — avanzamento e backlog
- [`docs/research.md`](docs/research.md) — fonti e sintesi teorica
- [`docs/data-model.md`](docs/data-model.md) — come aggiungere progressioni e generi

## Aggiungere una progressione

Aggiungi un oggetto in `src/data/progressions.ts` usando i numeri romani (es. `['i', 'bVI', 'bIII', 'bVII']`)
e lancia `npm test`: i test controllano che i numerali siano validi, che i generi esistano e che sia
suonabile in ogni tonalità.
