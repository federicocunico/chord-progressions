# Modello dati

## Numerale romano (stringa)

```
[b|#]GRADO[QUALITÀ][/BERSAGLIO | /BASSO]
```

- `GRADO`: `I II III IV V VI VII` (maiuscolo = base maggiore) o `i … vii` (minuscolo = base minore).
- Le alterazioni sono **relative alla scala maggiore** della tonica: in La minore `bVI` = Fa.
- `QUALITÀ` (maiuscolo): `''` `7` `maj7` `6` `69` `add9` `9` `maj9` `13` `7b9` `7#9` `sus2` `sus4`
  `7sus4` `+` `7#5` `maj7#11` `5`
- `QUALITÀ` (minuscolo): `''` `7` `9` `11` `6` `add9` `maj7` `°` `°7` `ø7` (accetta anche `o`, `o7`, `h7`)
- `/BERSAGLIO` (numerale romano): accordo secondario, es. `V7/vi`, `vii°7/V`.
- `/BASSO` (numero arabo con alterazione opzionale): basso sul grado della tonalità, es. `I/3` = Do/Mi in Do,
  `V/7` = Sol/Si, `i/b7` = Lam/Sol.

## Accordi nei testi

Nei testi (`description`, `tips`, spiegazioni) ogni accordo citato va **marcato** con un numerale romano,
che viene risolto nella tonalità in cui il testo è mostrato e ottiene il diagramma al mouseover:

- `[V7/vi]` mostra il numerale (`V7/vi`);
- `{V7/vi}` mostra il simbolo nella tonalità e notazione scelte (`E7` in Do, `Mi7` in notazione latina).

Esempio: `'Il [V] non va al [I] ma scende al [IV]: in Do, {V} → {IV}.'`.
Il testo non marcato resta testo: note di basso ("il basso scende Do–Si–La"), tonalità ("giro di Do"),
nomi di qualità ("add9"). I test (`tests/chordtext.test.ts`) falliscono se una marcatura non è un numerale
valido o se nei dati resta un numerale romano non marcato (tranne "I"/"i" da soli, che sono anche articoli).

## Progressione (`src/data/progressions.ts`)

```ts
interface ProgressionDef {
  id: string;            // kebab-case univoco
  name: string;          // nome italiano
  aka?: string[];        // altri nomi
  chords: string[];      // numerali romani
  mode: ModeId;          // 'major' | 'minor' | 'dorian' | ... (vedi scales.ts)
  genres: GenreId[];     // id dei generi (anche sottogeneri)
  popularity: 1|2|3|4|5; // 5 = iconica, 1 = rara/ricercata
  mood: string[];        // tag emotivi
  description: string;   // spiegazione in italiano
  examples?: string[];   // "Brano — Artista" (verificati)
  related?: string[];    // id di varianti
  bars?: number[];       // durata in battute per accordo (default 1)
}
```

## Genere (`src/data/genres.ts`)

```ts
interface GenreDef {
  id: GenreId; name: string; parent?: GenreId;
  description: string;
  scales: ScaleId[];          // scale tipiche
  flavor: Flavor;             // 'triads' | 'sevenths' | 'extended' | 'power' | 'color'
  voicing: VoicingStyle;      // stile chitarristico consigliato
  tonality: 'major' | 'minor' | 'both';
  tips: string[];
  bpm: [number, number];
}
```

## Forma di chitarra (`src/guitar/shapes.ts`)

```ts
interface Voicing {
  frets: (number | null)[];   // 6 corde, dalla 6ª (Mi basso) alla 1ª; null = muta
  fingers: (number | null)[]; // 1-4, 0/null = vuota o muta
  barre?: { fret: number; from: number; to: number };
  label: string;              // "Aperto", "Barré forma di Mi", ...
  kind: 'open' | 'barre' | 'movable' | 'power' | 'shell' | 'generic';
}
```

Aggiungere una progressione = aggiungere un oggetto all'array. I test (`tests/data.test.ts`) verificano
che ogni numerale si analizzi, che i generi esistano e che gli id siano unici.
