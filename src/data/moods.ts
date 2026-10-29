import { PROGRESSIONS, type ProgressionDef } from './progressions';

/** Le emozioni da cui si parte in Home e in Ascolta: raggruppano gli aggettivi "mood" della libreria. */
export interface MoodDef {
  id: string;
  name: string;
  feel: string;
  words: string[];
}

export const MOODS: MoodDef[] = [
  { id: 'solare', name: 'Solare', feel: 'Luminosa, orecchiabile, da cantare in coro', words: ['solare', 'luminoso', 'brillante', 'festoso', 'arioso', 'aperto', 'speranzoso', 'liberatorio', 'universale'] },
  { id: 'malinconica', name: 'Malinconica', feel: 'Parte in ombra e si illumina a tratti', words: ['malinconico', 'triste', 'struggente', 'commovente', 'emozionale', 'tragico', 'anime'] },
  { id: 'nostalgica', name: 'Nostalgica', feel: 'Dolce-amara, sa di ricordi', words: ['nostalgico', 'retrò', 'romantico', 'dolce', 'tenero', 'dolce-amaro', 'caldo', 'intimo'] },
  { id: 'sognante', name: 'Sognante', feel: 'Sospesa, notturna, un po\' magica', words: ['sognante', 'etereo', 'magico', 'sospeso', 'spaziale', 'notturno', 'vellutato', 'ambiguo'] },
  { id: 'epica', name: 'Epica', feel: 'Da colonna sonora, grande e potente', words: ['epico', 'eroico', 'trionfale', 'grandioso', 'potente', 'drammatico', 'solenne', 'fiero', 'nobile'] },
  { id: 'oscura', name: 'Oscura', feel: 'Scura, ipnotica, un po\' minacciosa', words: ['ipnotico', 'scuro', 'oscuro', 'cupo', 'sinistro', 'minaccioso', 'misterioso', 'circolare', 'inquieto', 'spettrale', 'funereo'] },
  { id: 'rilassata', name: 'Rilassata', feel: 'Morbida, elegante, con il groove', words: ['rilassato', 'groovy', 'swing', 'elegante', 'sofisticato', 'cool', 'fluido', 'sensuale'] },
  { id: 'energica', name: 'Energica', feel: 'Grezza, veloce, da alzare il volume', words: ['energico', 'rabbioso', 'aggressivo', 'grezzo', 'travolgente', 'veloce', 'intenso', 'danzante'] },
];

export const MOOD_MAP: Record<string, MoodDef> = Object.fromEntries(MOODS.map((m) => [m.id, m]));

export function matchesMood(p: ProgressionDef, mood: MoodDef): boolean {
  return p.mood.some((w) => mood.words.includes(w));
}

/** La progressione che rappresenta l'emozione: la più famosa con quell'umore come primo aggettivo, senza ripetere quelle già scelte. */
const picked = new Map<string, ProgressionDef>();
export function moodExample(mood: MoodDef): ProgressionDef {
  if (!picked.size) {
    const used = new Set<string>();
    for (const m of MOODS) {
      const best = PROGRESSIONS.filter((p) => matchesMood(p, m) && !used.has(p.id))
        .sort((a, b) => Number(m.words.includes(b.mood[0])) - Number(m.words.includes(a.mood[0])) || b.popularity - a.popularity || a.chords.length - b.chords.length)[0] ?? PROGRESSIONS[0];
      used.add(best.id);
      picked.set(m.id, best);
    }
  }
  return picked.get(mood.id)!;
}
