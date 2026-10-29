import { describe, it, expect } from 'vitest';
import { parseChordName } from '../src/ui/components/chordTip';
import { chordSymbol } from '../src/theory/chords';

describe('riconoscimento degli accordi nei testi', () => {
  it('legge nomi inglesi e latini', () => {
    expect(chordSymbol(parseChordName('Am7')!)).toBe('Am7');
    expect(chordSymbol(parseChordName('Sol7')!)).toBe('G7');
    expect(chordSymbol(parseChordName('Re♭7')!)).toBe('D♭7');
    expect(chordSymbol(parseChordName('Do/Mi')!)).toBe('C/E');
  });
  it('non scambia le parole per accordi', () => {
    for (const w of ['La', 'E', 'A', 'Si', 'Mi', 'Dominante', 'Dm7x']) expect(parseChordName(w)).toBeNull();
  });
});
