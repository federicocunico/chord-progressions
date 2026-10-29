# Piano tecnico — Spec 001

## Stack

| Scelta | Perché |
|---|---|
| **TypeScript + Vite** | Build statica veloce, perfetta per GitHub Pages, tipizzazione per motore di teoria. |
| **Nessun framework UI** (DOM + helper `h()`) | Bundle minuscolo (NFR-3), zero dipendenze runtime. |
| **SVG generato a mano** | Diagrammi accordi, circolo delle quinte, manico, curva di tensione: nitidi e leggeri. |
| **Web Audio API** | Sintesi Karplus-Strong delle corde, nessun campione audio da scaricare. |
| **Vitest** | Test del motore puro (teoria, voicing, generatore, sostituzioni). |
| **GitHub Actions** | `ci.yml` (typecheck+test+build) e `deploy.yml` (Pages). |

## Architettura a strati

```
src/
├── theory/          # Motore musicale puro, senza DOM
│   ├── notes.ts         note, altezze, ortografia, notazione latina
│   ├── chords.ts        qualità degli accordi (intervalli, simboli)
│   ├── scales.ts        modi e scale, armonizzazione
│   ├── roman.ts         parser/formatter numeri romani → accordi reali
│   ├── analysis.ts      funzioni armoniche, tensione, spiegazione dei passaggi, scale consigliate
│   ├── substitutions.ts motore delle sostituzioni
│   └── generator.ts     modello di Markov per genere + generazione
├── guitar/
│   ├── shapes.ts        forme aperte e mobili (CAGED, power, shell jazz) con diteggiatura
│   └── voicings.ts      candidati per accordo + ricerca generica + Viterbi sulla progressione
├── audio/player.ts  sintesi e riproduzione
├── data/            # Base di conoscenza
│   ├── genres.ts        tassonomia generi
│   └── progressions.ts  libreria progressioni
└── ui/              # Viste e componenti
```

Le dipendenze vanno solo verso il basso: `ui → (audio, guitar, theory, data)`, `guitar → theory`,
`data → theory (tipi)`. Il motore è testabile in Node senza browser.

## Algoritmi chiave

### Numeri romani → accordi
`[♭|♯]grado[qualità][/bersaglio | /basso]`, es. `bVII`, `V7/vi`, `iiø7`, `I/3`.
Radice = tonica + intervallo della scala **maggiore** per quel grado + alterazione; la lettera
avanza di `grado-1` posizioni per un'ortografia corretta (in Mi: `♭VII` = Re, non Do𝄪).
Le doppie alterazioni vengono semplificate enarmonicamente per leggibilità chitarristica.

### Voicing coerente (AC-3.2)
1. Per ogni accordo: candidati = forme aperte esatte ∪ forme mobili trasposte (tasti 1–15) ∪
   ricerca generica (finestre di 4 tasti, vincoli: basso corretto, note essenziali, ≤4 dita con barré).
2. Costo del candidato = difficoltà intrinseca + penalità di stile (es. "aperti" penalizza i barré alti).
3. Costo di transizione = salto di posizione della mano + movimento delle dita.
4. **Viterbi** sulla sequenza (inclusa la chiusura del loop) → combinazione a costo minimo.

### Generatore (AC-2.2)
1. Ogni progressione della libreria viene ridotta a "scheletro" (triadi) e contata come bigrammi,
   pesati per popolarità, per genere (con i sottogeneri che ereditano dal genere padre).
2. Probabilità di transizione = bigrammi del genere (smoothing) × prior funzionale
   (T→S→D→T, movimento per quinte, pool di accordi della modalità).
3. Campionamento con seed di ~400 sequenze, deduplica, punteggio = log-probabilità media (con
   chiusura del loop). Il cursore di popolarità sceglie la fascia di percentile.
4. "Colorazione" di genere: jazz → settime, neo-soul → none, metal → power chord, ecc.

### Sostituzioni (AC-6.1)
Regole indipendenti che, dato `(progressione, indice, tonalità)`, restituiscono nuove progressioni
con indici evidenziati, tipo, spiegazione e "audacia" (sicura / colore / audace).

## Dati

Vedi `docs/data-model.md`. Le progressioni usano numeri romani (indipendenti dalla tonalità).

## Deploy

- `vite.config.ts` con `base: '/chord-progressions/'`.
- `deploy.yml`: `actions/configure-pages` → `npm ci && npm run build` → `upload-pages-artifact` → `deploy-pages`.
- Requisito una tantum: *Settings → Pages → Source: GitHub Actions*.

## Rischi

| Rischio | Mitigazione |
|---|---|
| Voicing ineseguibili | Forme curate con diteggiatura esplicita hanno priorità; la ricerca generica ha vincoli di dita/estensione; test sulle forme note. |
| Dati teorici imprecisi | Fonti documentate in `docs/research.md`; esempi di brani solo se verificati; etichetta "approssimata" quando semplificata. |
| Generatore che produce sequenze strane | Prior funzionale + soglia minima di probabilità + pool di accordi limitato alla modalità. |
