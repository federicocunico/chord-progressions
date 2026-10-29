# Task — Spec 001

Legenda: `[x]` fatto · `[ ]` da fare · (US-n) storia collegata

## Fase 0 — Fondazioni
- [x] T001 Ricerca fonti e teoria → `docs/research.md`
- [x] T002 Spec, piano, modello dati
- [x] T003 Scaffold Vite + TypeScript + Vitest

## Fase 1 — Motore di teoria (US-1, US-2, US-5)
- [x] T010 Note, ortografia, notazione latina (`theory/notes.ts`)
- [x] T011 Qualità degli accordi (`theory/chords.ts`)
- [x] T012 Scale e modi, armonizzazione (`theory/scales.ts`)
- [x] T013 Parser/formatter numeri romani (`theory/roman.ts`)
- [x] T014 Analisi: funzioni, tensione, spiegazione passaggi, scale consigliate (`theory/analysis.ts`)
- [x] T015 Test del motore

## Fase 2 — Chitarra (US-3)
- [x] T020 Libreria forme aperte + mobili con diteggiatura (`guitar/shapes.ts`)
- [x] T021 Ricerca generica dei voicing + assegnazione dita
- [x] T022 Viterbi sulla progressione + stili di diteggiatura
- [x] T023 Test (forme note, eseguibilità, coerenza)

## Fase 3 — Base di conoscenza (US-2, US-8)
- [x] T030 Tassonomia generi con schede
- [x] T031 Libreria progressioni (≥ 100) con descrizioni ed esempi
- [x] T032 Test di validità dei dati (tutti i numerali si analizzano, generi esistono)

## Fase 4 — Generazione e variazione (US-2, US-6)
- [x] T040 Modello di Markov per genere + generatore con seed
- [x] T041 Motore sostituzioni (14 regole)
- [x] T042 Test

## Fase 5 — Audio (US-4)
- [x] T050 Sintesi Karplus-Strong + strumming + loop + BPM

## Fase 5b — Audio realistico e MIDI (richiesta successiva)
- [x] T051 Sequencer puro con 10 ritmi e umanizzazione (`audio/sequencer.ts`)
- [x] T052 Campioni reali di 6 chitarre GM caricati a richiesta, synth di riserva, palm mute, riverbero
- [x] T053 Strumento e ritmo di default per genere
- [x] T054 Export file MIDI (SMF) con marker degli accordi
- [x] T055 Uscita Web MIDI verso dispositivi/DAW
- [x] T056 Test del sequencer e del writer MIDI

## Fase 6 — UI (US-1..US-8)
- [x] T060 Shell, routing a hash, tema, preferenze (notazione, stile)
- [x] T061 Componenti SVG: diagramma accordo, circolo quinte, manico, curva tensione
- [x] T062 Vista Componi (generatore)
- [x] T063 Vista Libreria (filtri e ricerca)
- [x] T064 Vista Dettaglio/Analisi (diagrammi, audio, analisi, scale, sostituzioni)
- [x] T065 Vista Mappa armonica + costruttore con prossimi accordi
- [x] T066 Viste Generi e Teoria

## Fase 7 — CI/CD (US-9)
- [x] T070 `ci.yml` typecheck + test + build
- [x] T071 `deploy.yml` GitHub Pages
- [x] T072 README con istruzioni

## Backlog v2
- [ ] Accordature alternative (Drop D, Eb standard, 7 corde)
- [x] Export MIDI (Guitar Pro / MusicXML ancora da fare, vedi HANDOFF.md)
- [ ] Ritmiche di strumming per genere
- [ ] Preferiti e progressioni salvate condivisibili via URL (parziale: URL già condivisibile)
- [ ] Modalità "melodia": suggerimento di frasi sulla scala
