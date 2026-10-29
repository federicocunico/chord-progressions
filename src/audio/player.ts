/**
 * Motore audio: suona le sequenze del sequencer con campioni reali di chitarra (soundfont FluidR3 GM,
 * CC BY 3.0) o, se non disponibili, con la sintesi Karplus-Strong. Può inviare le stesse note a un
 * dispositivo MIDI esterno (Web MIDI).
 */
import { renderSequence, type Pattern, type PlayChord, type NoteEvent } from './sequencer';
import { getOutput, allNotesOff } from './midi';

export { PATTERNS, type Pattern, type PlayChord } from './sequencer';

export type InstrumentId =
  | 'acoustic_guitar_steel' | 'acoustic_guitar_nylon' | 'electric_guitar_clean'
  | 'electric_guitar_jazz' | 'overdriven_guitar' | 'distortion_guitar' | 'synth';

export interface InstrumentDef {
  name: string;
  /** Programma General MIDI (0-based) per l'export e il Web MIDI. */
  program: number;
  gain: number;
  sampled: boolean;
}

export const INSTRUMENTS: Record<InstrumentId, InstrumentDef> = {
  acoustic_guitar_steel: { name: 'Chitarra acustica (corde in acciaio)', program: 25, gain: 0.9, sampled: true },
  acoustic_guitar_nylon: { name: 'Chitarra classica (nylon)', program: 24, gain: 1, sampled: true },
  electric_guitar_clean: { name: 'Elettrica pulita', program: 27, gain: 0.85, sampled: true },
  electric_guitar_jazz: { name: 'Elettrica jazz', program: 26, gain: 0.95, sampled: true },
  overdriven_guitar: { name: 'Elettrica crunch (overdrive)', program: 29, gain: 0.5, sampled: true },
  distortion_guitar: { name: 'Elettrica distorta (metal)', program: 30, gain: 0.45, sampled: true },
  synth: { name: 'Sintetizzata (offline, leggera)', program: 25, gain: 1, sampled: false },
};

const SAMPLE_MIN = 40;
const SAMPLE_MAX = 88;

export interface PlayOptions {
  bpm: number;
  pattern: Pattern;
  loop: boolean;
  instrument: InstrumentId;
  /** Id dell'uscita Web MIDI ('' = nessuna). */
  midiOut?: string;
  /** Suonare anche dagli altoparlanti (default true). */
  audio?: boolean;
  onChord?: (i: number) => void;
  onEnd?: () => void;
}

class GuitarPlayer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private reverb: GainNode | null = null;
  private synthCache = new Map<number, AudioBuffer>();
  private sampleCache = new Map<string, Promise<AudioBuffer | null>>();
  private timer: number | null = null;
  private visualTimers: number[] = [];
  private active = new Set<AudioScheduledSourceNode>();
  private midiOutId = '';
  private session = 0;
  playing = false;

  private ensure(): AudioContext {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctor();
      this.ctx = ctx;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.ratio.value = 3.5;
      this.master = ctx.createGain();
      this.master.gain.value = 0.8;
      this.master.connect(comp).connect(ctx.destination);
      // riverbero leggero (impulso generato: niente file da scaricare)
      const conv = ctx.createConvolver();
      const len = Math.floor(ctx.sampleRate * 1.6);
      const ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = ir.getChannelData(c);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
      }
      conv.buffer = ir;
      this.reverb = ctx.createGain();
      this.reverb.gain.value = 0.16;
      this.reverb.connect(conv).connect(comp);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  // ───────── campioni

  private sampleUrl(inst: InstrumentId, midi: number): string {
    return `${import.meta.env.BASE_URL}samples/${inst}/${midi}.mp3`;
  }

  private loadSample(inst: InstrumentId, midi: number): Promise<AudioBuffer | null> {
    const k = `${inst}:${midi}`;
    let p = this.sampleCache.get(k);
    if (!p) {
      const ctx = this.ensure();
      p = fetch(this.sampleUrl(inst, midi))
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
        .then((b) => ctx.decodeAudioData(b))
        .catch(() => null);
      this.sampleCache.set(k, p);
    }
    return p;
  }

  /** Campione più vicino disponibile e fattore di velocità per arrivare all'altezza giusta. */
  private nearest(midi: number): { base: number; rate: number } {
    const base = Math.min(SAMPLE_MAX, Math.max(SAMPLE_MIN, midi));
    return { base, rate: Math.pow(2, (midi - base) / 12) };
  }

  /** Precarica le note necessarie. Restituisce false se i campioni non sono raggiungibili. */
  async preload(inst: InstrumentId, midis: Iterable<number>): Promise<boolean> {
    if (!INSTRUMENTS[inst].sampled) return true;
    const bases = new Set([...midis].map((m) => this.nearest(m).base));
    const res = await Promise.all([...bases].map((b) => this.loadSample(inst, b)));
    return res.every(Boolean);
  }

  // ───────── sintesi di riserva (Karplus-Strong)

  private synthBuffer(midi: number): AudioBuffer {
    const hit = this.synthCache.get(midi);
    if (hit) return hit;
    const ctx = this.ensure();
    const sr = ctx.sampleRate;
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const period = sr / freq - 0.5; // compensa il mezzo campione del filtro a media
    const N = Math.max(2, Math.floor(period));
    const frac = period - N;
    const len = Math.floor(sr * 3.2);
    const buf = ctx.createBuffer(1, len, sr);
    const y = buf.getChannelData(0);
    let prev = 0;
    for (let i = 0; i < N + 2; i++) {
      prev = prev * 0.45 + (Math.random() * 2 - 1) * 0.55;
      y[i] = prev;
    }
    const decay = midi < 52 ? 0.9968 : midi < 64 ? 0.9955 : 0.994;
    for (let i = N + 2; i < len; i++) {
      const d0 = (1 - frac) * y[i - N] + frac * y[i - N - 1];
      const d1 = (1 - frac) * y[i - N - 1] + frac * y[i - N - 2];
      y[i] = decay * 0.5 * (d0 + d1);
    }
    let peak = 0;
    for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(y[i]));
    if (peak > 0) for (let i = 0; i < len; i++) y[i] /= peak * 2.2;
    this.synthCache.set(midi, buf);
    return buf;
  }

  // ───────── esecuzione di una nota

  private async voice(inst: InstrumentId, midi: number, when: number, velocity: number, dur: number, muted: boolean): Promise<void> {
    const ctx = this.ensure();
    const def = INSTRUMENTS[inst];
    let buffer: AudioBuffer | null = null;
    let rate = 1;
    if (def.sampled) {
      const { base, rate: r } = this.nearest(midi);
      const cached = this.sampleCache.get(`${inst}:${base}`);
      buffer = cached ? await cached : null;
      rate = r;
    }
    if (!buffer) {
      buffer = this.synthBuffer(midi);
      rate = 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    const amp = Math.pow(velocity / 127, 1.5) * def.gain * 0.55;
    const t = Math.max(when, ctx.currentTime);
    g.gain.setValueAtTime(amp, t);
    g.gain.setTargetAtTime(0, t + dur, muted ? 0.025 : 0.1);
    let out: AudioNode = g;
    if (muted) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = inst === 'distortion_guitar' || inst === 'overdriven_guitar' ? 1400 : 900;
      g.connect(lp);
      out = lp;
    }
    src.connect(g);
    out.connect(this.master!);
    if (!muted) out.connect(this.reverb!);
    src.start(t);
    src.stop(t + dur + (muted ? 0.2 : 0.8));
    this.active.add(src);
    src.onended = () => this.active.delete(src);
  }

  private sendMidi(out: MIDIOutput, ev: { midi: number; velocity: number }, when: number, dur: number): void {
    const ctx = this.ensure();
    const at = performance.now() + Math.max(0, when - ctx.currentTime) * 1000;
    out.send([0x90, ev.midi, ev.velocity], at);
    out.send([0x80, ev.midi, 0], at + Math.max(20, dur * 1000));
  }

  /** Suona subito un accordo (anteprima al tocco del diagramma). */
  async preview(midis: number[], inst: InstrumentId = 'acoustic_guitar_steel'): Promise<void> {
    const ctx = this.ensure();
    await this.preload(inst, midis);
    const t = ctx.currentTime + 0.03;
    midis.forEach((m, i) => void this.voice(inst, m, t + i * 0.016, 96 - i * 3, 2, false));
  }

  async play(seq: PlayChord[], opts: PlayOptions): Promise<void> {
    this.stop();
    if (!seq.length) return;
    const session = ++this.session;
    const ctx = this.ensure();
    this.playing = true;
    const audio = opts.audio !== false;
    const midiOut = opts.midiOut ? getOutput(opts.midiOut) : undefined;
    this.midiOutId = opts.midiOut ?? '';
    const def = INSTRUMENTS[opts.instrument];
    if (midiOut) midiOut.send([0xc0, def.program]);
    if (audio) await this.preload(opts.instrument, seq.flatMap((c) => c.midis));
    if (session !== this.session || !this.playing) return;

    const { events, chordStarts, totalBeats } = renderSequence(seq, opts.pattern);
    const spb = 60 / opts.bpm;
    // durata effettiva: una nota ribattuta sulla stessa altezza interrompe la precedente
    const ends = new Array<number>(events.length);
    const lastByPitch = new Map<number, number>();
    const order = events.map((_, i) => i).sort((a, b) => events[a].beat - events[b].beat);
    for (const i of order) {
      const e = events[i];
      ends[i] = e.beat + e.length;
      const prev = lastByPitch.get(e.midi);
      if (prev !== undefined && ends[prev] > e.beat) ends[prev] = e.beat;
      lastByPitch.set(e.midi, i);
    }
    const sorted = order.map((i) => ({ e: events[i] as NoteEvent, end: ends[i] }));

    let cycleStart = ctx.currentTime + 0.08;
    let ei = 0;
    let ci = 0;
    const tick = () => {
      if (!this.playing || session !== this.session) return;
      const horizon = ctx.currentTime + 0.4;
      for (;;) {
        const nextNote = ei < sorted.length ? cycleStart + sorted[ei].e.beat * spb : Infinity;
        const nextChord = ci < chordStarts.length ? cycleStart + chordStarts[ci] * spb : Infinity;
        if (nextNote === Infinity && nextChord === Infinity) {
          if (!opts.loop) {
            const endIn = Math.max(0, (cycleStart + totalBeats * spb - ctx.currentTime) * 1000);
            this.visualTimers.push(window.setTimeout(() => { this.stop(); opts.onEnd?.(); }, endIn));
            if (this.timer) window.clearInterval(this.timer);
            this.timer = null;
            return;
          }
          cycleStart += totalBeats * spb;
          ei = 0;
          ci = 0;
          continue;
        }
        if (Math.min(nextNote, nextChord) > horizon) break;
        if (nextChord <= nextNote) {
          const idx = ci++;
          const delay = Math.max(0, (nextChord - ctx.currentTime) * 1000);
          this.visualTimers.push(window.setTimeout(() => this.playing && session === this.session && opts.onChord?.(idx), delay));
        } else {
          const { e, end } = sorted[ei++];
          const when = nextNote + e.offset;
          const dur = Math.max(0.04, (end - e.beat) * spb);
          if (audio) void this.voice(opts.instrument, e.midi, when, e.velocity, dur, e.muted);
          if (midiOut) this.sendMidi(midiOut, e, when, dur);
        }
      }
    };
    tick();
    this.timer = window.setInterval(tick, 50);
  }

  stop(): void {
    this.playing = false;
    this.session++;
    if (this.timer) window.clearInterval(this.timer);
    this.timer = null;
    this.visualTimers.forEach((t) => window.clearTimeout(t));
    this.visualTimers = [];
    const now = this.ctx?.currentTime ?? 0;
    for (const s of this.active) {
      try { s.stop(now + 0.05); } catch { /* già fermato */ }
    }
    this.active.clear();
    const out = this.midiOutId ? getOutput(this.midiOutId) : undefined;
    if (out) allNotesOff(out);
  }
}

export const player = new GuitarPlayer();
