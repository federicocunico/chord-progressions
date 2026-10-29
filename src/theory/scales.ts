import { type Note, transpose, MAJOR_STEPS, mod, simplify } from './notes';
import type { QualityId } from './chords';

export type ScaleId =
  | 'major' | 'minor' | 'dorian' | 'phrygian' | 'lydian' | 'mixolydian' | 'locrian'
  | 'harmonicMinor' | 'melodicMinor' | 'phrygianDominant' | 'hungarianMinor'
  | 'majorPentatonic' | 'minorPentatonic' | 'blues' | 'majorBlues';

/** Modalità selezionabili come "tonalità" per comporre. */
export type ModeId =
  | 'major' | 'minor' | 'dorian' | 'phrygian' | 'lydian' | 'mixolydian'
  | 'harmonicMinor' | 'phrygianDominant' | 'blues';

export interface ScaleDef {
  id: ScaleId;
  name: string;
  steps: readonly number[];
  /** Passi di lettera per l'ortografia. */
  letters: readonly number[];
  tonality: 'major' | 'minor';
  /** Nota caratteristica (indice in steps) — quella da enfatizzare. */
  character?: number;
  description: string;
}

const S = (
  id: ScaleId, name: string, steps: number[], tonality: 'major' | 'minor', description: string,
  character?: number, letters: number[] = [0, 1, 2, 3, 4, 5, 6],
): ScaleDef => ({ id, name, steps, letters, tonality, description, character });

export const SCALES: Record<ScaleId, ScaleDef> = {
  major: S('major', 'Maggiore (ionica)', [0, 2, 4, 5, 7, 9, 11], 'major', 'Luminosa e risolta: la base di pop, rock e folk.', 6),
  minor: S('minor', 'Minore naturale (eolia)', [0, 2, 3, 5, 7, 8, 10], 'minor', 'Malinconica e scura: rock, metal, pop drammatico.', 5),
  dorian: S('dorian', 'Dorica', [0, 2, 3, 5, 7, 9, 10], 'minor', 'Minore con la sesta maggiore: più "aperta", folk, funk, jazz modale, celtico.', 5),
  phrygian: S('phrygian', 'Frigia', [0, 1, 3, 5, 7, 8, 10], 'minor', 'Minore con la seconda bemolle: tesa, esotica, metal e flamenco.', 1),
  lydian: S('lydian', 'Lidia', [0, 2, 4, 6, 7, 9, 11], 'major', 'Maggiore con la quarta aumentata: sognante, cinematografica, prog.', 3),
  mixolydian: S('mixolydian', 'Misolidia', [0, 2, 4, 5, 7, 9, 10], 'major', 'Maggiore con la settima bemolle: rock classico, blues, celtico.', 6),
  locrian: S('locrian', 'Locria', [0, 1, 3, 5, 6, 8, 10], 'minor', 'Instabile (quinta diminuita): usata a tratti nel metal estremo.', 4),
  harmonicMinor: S('harmonicMinor', 'Minore armonica', [0, 2, 3, 5, 7, 8, 11], 'minor', 'Minore con la sensibile: drammatica, neoclassica, metal sinfonico.', 6),
  melodicMinor: S('melodicMinor', 'Minore melodica', [0, 2, 3, 5, 7, 9, 11], 'minor', 'Minore "jazz": morbida e sofisticata.', 6),
  phrygianDominant: S('phrygianDominant', 'Frigia dominante', [0, 1, 4, 5, 7, 8, 10], 'major', 'Quinto modo della minore armonica: flamenco, mediorientale, metal.', 1),
  hungarianMinor: S('hungarianMinor', 'Minore ungherese', [0, 2, 3, 6, 7, 8, 11], 'minor', 'Due seconde aumentate: gotica ed esotica, metal neoclassico.', 3),
  majorPentatonic: S('majorPentatonic', 'Pentatonica maggiore', [0, 2, 4, 7, 9], 'major', 'Cinque note, impossibile sbagliare: country, pop, rock.', undefined, [0, 1, 2, 4, 5]),
  minorPentatonic: S('minorPentatonic', 'Pentatonica minore', [0, 3, 5, 7, 10], 'minor', 'La scala dell\'assolo rock e blues per eccellenza.', undefined, [0, 2, 3, 4, 6]),
  blues: S('blues', 'Blues (esatonica)', [0, 3, 5, 6, 7, 10], 'minor', 'Pentatonica minore + "blue note" (quinta bemolle).', 3, [0, 2, 3, 4, 4, 6]),
  majorBlues: S('majorBlues', 'Blues maggiore', [0, 2, 3, 4, 7, 9], 'major', 'Pentatonica maggiore + terza minore di passaggio: country e blues solare.', 2, [0, 1, 2, 2, 4, 5]),
};

export interface ModeDef {
  id: ModeId;
  name: string;
  scale: ScaleId;
  tonality: 'major' | 'minor';
  /** Usare accordi di settima di dominante su I/IV/V (blues). */
  dominantSevenths?: boolean;
}

export const MODES: Record<ModeId, ModeDef> = {
  major: { id: 'major', name: 'Maggiore', scale: 'major', tonality: 'major' },
  minor: { id: 'minor', name: 'Minore', scale: 'minor', tonality: 'minor' },
  dorian: { id: 'dorian', name: 'Dorico', scale: 'dorian', tonality: 'minor' },
  phrygian: { id: 'phrygian', name: 'Frigio', scale: 'phrygian', tonality: 'minor' },
  lydian: { id: 'lydian', name: 'Lidio', scale: 'lydian', tonality: 'major' },
  mixolydian: { id: 'mixolydian', name: 'Misolidio', scale: 'mixolydian', tonality: 'major' },
  harmonicMinor: { id: 'harmonicMinor', name: 'Minore armonica', scale: 'harmonicMinor', tonality: 'minor' },
  phrygianDominant: { id: 'phrygianDominant', name: 'Frigio dominante', scale: 'phrygianDominant', tonality: 'major' },
  blues: { id: 'blues', name: 'Blues', scale: 'mixolydian', tonality: 'major', dominantSevenths: true },
};

export function scaleNotes(tonic: Note, scale: ScaleId): Note[] {
  const def = SCALES[scale];
  return def.steps.map((s, i) => simplify(transpose(tonic, def.letters[i], s), tonic.acc < 0));
}

export function scalePcs(tonicPc: number, scale: ScaleId): number[] {
  return SCALES[scale].steps.map((s) => mod(tonicPc + s, 12));
}

export interface DiatonicDegree {
  degree: number; // 1..7
  acc: number; // alterazione rispetto alla scala maggiore
  triad: QualityId;
  seventh: QualityId;
}

function triadQuality(third: number, fifth: number): QualityId {
  if (third === 4 && fifth === 7) return 'maj';
  if (third === 3 && fifth === 7) return 'min';
  if (third === 3 && fifth === 6) return 'dim';
  if (third === 4 && fifth === 8) return 'aug';
  return 'maj';
}

function seventhQuality(triad: QualityId, seventh: number): QualityId {
  switch (triad) {
    case 'maj': return seventh === 11 ? 'maj7' : '7';
    case 'min': return seventh === 11 ? 'mMaj7' : 'm7';
    case 'dim': return seventh === 9 ? 'dim7' : 'm7b5';
    case 'aug': return '7#5';
    default: return '7';
  }
}

/** Armonizza una scala eptatonica: triadi e quadriadi per grado. */
export function harmonize(scale: ScaleId): DiatonicDegree[] {
  const st = SCALES[scale].steps;
  if (st.length !== 7) return [];
  return st.map((root, i) => {
    const at = (k: number) => mod(st[(i + k) % 7] - root, 12);
    const triad = triadQuality(at(2), at(4));
    return {
      degree: i + 1,
      acc: root - MAJOR_STEPS[i],
      triad,
      seventh: seventhQuality(triad, at(6)),
    };
  });
}
