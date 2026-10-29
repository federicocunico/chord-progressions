/**
 * MIDI: scrittura di file .mid standard (SMF tipo 0) e uscita verso dispositivi Web MIDI.
 */
import type { NoteEvent } from './sequencer';

export const PPQ = 480;

/** Accorcia le note che si sovrappongono sulla stessa altezza (evita note-off "rubati"). */
export function normalizeEvents(events: NoteEvent[], bpm: number): { start: number; end: number; midi: number; velocity: number }[] {
  const toBeats = (sec: number) => (sec * bpm) / 60;
  const notes = events
    .map((e) => ({ start: e.beat + toBeats(e.offset), end: e.beat + toBeats(e.offset) + e.length, midi: e.midi, velocity: e.velocity }))
    .map((n) => ({ ...n, start: Math.max(0, n.start) }))
    .sort((a, b) => a.start - b.start || a.midi - b.midi);
  const lastByPitch = new Map<number, (typeof notes)[number]>();
  for (const n of notes) {
    const prev = lastByPitch.get(n.midi);
    if (prev && prev.end > n.start) prev.end = Math.max(prev.start + 0.01, n.start - 0.005);
    lastByPitch.set(n.midi, n);
  }
  return notes;
}

function vlq(n: number): number[] {
  const bytes = [n & 0x7f];
  n >>= 7;
  while (n > 0) {
    bytes.unshift((n & 0x7f) | 0x80);
    n >>= 7;
  }
  return bytes;
}

const text = (s: string) => [...new TextEncoder().encode(s)];

export interface MidiFileOptions {
  bpm: number;
  program: number; // programma General MIDI (0-based)
  name?: string;
  /** Marker con il nome degli accordi: [beat, testo]. */
  markers?: [number, string][];
  channel?: number;
}

export function buildMidiFile(events: NoteEvent[], o: MidiFileOptions): Uint8Array {
  const ch = o.channel ?? 0;
  const raw: { tick: number; order: number; data: number[] }[] = [];
  const tick = (beat: number) => Math.round(beat * PPQ);
  const usPerBeat = Math.round(60_000_000 / o.bpm);
  raw.push({ tick: 0, order: 0, data: [0xff, 0x03, ...vlq(text(o.name ?? 'Progressione').length), ...text(o.name ?? 'Progressione')] });
  raw.push({ tick: 0, order: 0, data: [0xff, 0x51, 0x03, (usPerBeat >> 16) & 0xff, (usPerBeat >> 8) & 0xff, usPerBeat & 0xff] });
  raw.push({ tick: 0, order: 0, data: [0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08] });
  raw.push({ tick: 0, order: 1, data: [0xc0 | ch, o.program & 0x7f] });
  for (const [b, label] of o.markers ?? []) {
    const t = text(label);
    raw.push({ tick: tick(b), order: 1, data: [0xff, 0x06, ...vlq(t.length), ...t] });
  }
  for (const n of normalizeEvents(events, o.bpm)) {
    raw.push({ tick: tick(n.start), order: 3, data: [0x90 | ch, n.midi & 0x7f, n.velocity & 0x7f] });
    raw.push({ tick: Math.max(tick(n.start) + 1, tick(n.end)), order: 2, data: [0x80 | ch, n.midi & 0x7f, 0] });
  }
  raw.sort((a, b) => a.tick - b.tick || a.order - b.order);
  const track: number[] = [];
  let last = 0;
  for (const e of raw) {
    track.push(...vlq(e.tick - last), ...e.data);
    last = e.tick;
  }
  track.push(0x00, 0xff, 0x2f, 0x00);
  const header = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, (PPQ >> 8) & 0xff, PPQ & 0xff];
  const len = track.length;
  const trackHeader = [0x4d, 0x54, 0x72, 0x6b, (len >>> 24) & 0xff, (len >>> 16) & 0xff, (len >>> 8) & 0xff, len & 0xff];
  return new Uint8Array([...header, ...trackHeader, ...track]);
}

export function downloadBytes(bytes: Uint8Array, filename: string, mime = 'audio/midi'): void {
  const blob = new Blob([bytes as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// ───────────────────────── Web MIDI (dispositivi esterni, DAW)

let access: MIDIAccess | null = null;

export function webMidiSupported(): boolean {
  return typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator;
}

export async function midiOutputs(): Promise<MIDIOutput[]> {
  if (!webMidiSupported()) return [];
  access ??= await navigator.requestMIDIAccess();
  return [...access.outputs.values()];
}

export function getOutput(id: string): MIDIOutput | undefined {
  return access?.outputs.get(id);
}

export function allNotesOff(out: MIDIOutput, channel = 0): void {
  out.send([0xb0 | channel, 123, 0]);
  out.send([0xb0 | channel, 120, 0]);
}
