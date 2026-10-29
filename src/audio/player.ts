/**
 * Sintesi di chitarra pizzicata (algoritmo di Karplus-Strong) e riproduzione di progressioni.
 * Nessun campione audio: ogni corda è generata al volo e messa in cache.
 */

export type Pattern = 'strum' | 'arpeggio' | 'pad' | 'eighths';

export const PATTERNS: Record<Pattern, string> = {
  strum: 'Strumming pop',
  arpeggio: 'Arpeggio',
  pad: 'Un colpo per accordo',
  eighths: 'Ottavi (rock/metal)',
};

export interface PlayChord {
  /** Note MIDI dalla corda più grave alla più acuta. */
  midis: number[];
  bars: number;
}

interface Stroke {
  t: number; // in beat dall'inizio dell'accordo
  dir: 'down' | 'up' | 'single';
  strings?: number[]; // indici in midis; default tutte
  gain: number;
  dur: number; // secondi di sustain
}

function patternStrokes(pattern: Pattern, beats: number, n: number): Stroke[] {
  const out: Stroke[] = [];
  for (let b = 0; b < beats; b += 4) {
    const len = Math.min(4, beats - b);
    switch (pattern) {
      case 'pad':
        if (b === 0) out.push({ t: 0, dir: 'down', gain: 0.9, dur: 4 });
        break;
      case 'eighths':
        for (let e = 0; e < len * 2; e++) {
          out.push({ t: b + e / 2, dir: 'down', strings: [0, 1, 2].filter((s) => s < n), gain: e % 2 ? 0.55 : 0.75, dur: 0.22 });
        }
        break;
      case 'arpeggio': {
        const order = n >= 6 ? [0, 2, 3, 4, 5, 4, 3, 2] : [...Array(n).keys(), ...[...Array(n).keys()].reverse().slice(1, -1)];
        for (let e = 0; e < len * 2; e++) {
          out.push({ t: b + e / 2, dir: 'single', strings: [order[e % order.length] % n], gain: 0.7, dur: 2.2 });
        }
        break;
      }
      default: {
        const p: [number, 'down' | 'up', number][] = [[0, 'down', 0.9], [1, 'down', 0.6], [1.5, 'up', 0.45], [2.5, 'up', 0.45], [3, 'down', 0.6], [3.5, 'up', 0.45]];
        for (const [t, dir, gain] of p) if (t < len) out.push({ t: b + t, dir, gain, dur: 1.4 });
      }
    }
  }
  return out;
}

class GuitarSynth {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private cache = new Map<number, AudioBuffer>();
  private timer: number | null = null;
  private visualTimers: number[] = [];
  private active: AudioBufferSourceNode[] = [];
  playing = false;

  private ensure(): AudioContext {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 3;
      const tone = this.ctx.createBiquadFilter();
      tone.type = 'lowpass';
      tone.frequency.value = 5200;
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.55;
      this.master.connect(tone).connect(comp).connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private buffer(midi: number): AudioBuffer {
    const hit = this.cache.get(midi);
    if (hit) return hit;
    const ctx = this.ensure();
    const sr = ctx.sampleRate;
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    // il filtro a media introduce mezzo campione di ritardo: lo compensiamo
    const period = sr / freq - 0.5;
    const N = Math.max(2, Math.floor(period));
    const frac = period - N;
    const len = Math.floor(sr * 3.2);
    const buf = ctx.createBuffer(1, len, sr);
    const y = buf.getChannelData(0);
    // eccitazione: rumore filtrato (pennata morbida)
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
    // normalizza
    let peak = 0;
    for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(y[i]));
    if (peak > 0) for (let i = 0; i < len; i++) y[i] /= peak;
    this.cache.set(midi, buf);
    return buf;
  }

  pluck(midi: number, when: number, gain: number, dur: number): void {
    const ctx = this.ensure();
    const src = ctx.createBufferSource();
    src.buffer = this.buffer(midi);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain * 0.32, when);
    g.gain.setTargetAtTime(0, when + dur, 0.08);
    src.connect(g).connect(this.master!);
    src.start(when);
    src.stop(when + dur + 0.6);
    this.active.push(src);
    src.onended = () => {
      this.active = this.active.filter((s) => s !== src);
    };
  }

  strum(midis: number[], when: number, stroke: Stroke): void {
    const idx = stroke.strings ?? midis.map((_, i) => i);
    const order = stroke.dir === 'up' ? [...idx].reverse() : idx;
    const spread = stroke.dir === 'single' ? 0 : 0.014;
    const used = stroke.dir === 'up' ? order.slice(0, Math.max(3, Math.ceil(order.length / 2))) : order;
    used.forEach((k, j) => {
      const m = midis[k];
      if (m !== undefined) this.pluck(m, when + j * spread, stroke.gain, stroke.dur);
    });
  }

  /** Suona subito un accordo (anteprima). */
  preview(midis: number[]): void {
    const ctx = this.ensure();
    this.strum(midis, ctx.currentTime + 0.02, { t: 0, dir: 'down', gain: 0.9, dur: 2.2 });
  }

  play(seq: PlayChord[], opts: { bpm: number; pattern: Pattern; loop: boolean; onChord?: (i: number) => void; onEnd?: () => void }): void {
    this.stop();
    if (!seq.length) return;
    const ctx = this.ensure();
    this.playing = true;
    const beat = 60 / opts.bpm;
    let cursor = 0;
    let cursorTime = ctx.currentTime + 0.12;
    const tick = () => {
      if (!this.playing) return;
      while (cursorTime < ctx.currentTime + 0.35) {
        if (cursor >= seq.length) {
          if (!opts.loop) {
            const endIn = Math.max(0, (cursorTime - ctx.currentTime) * 1000);
            this.visualTimers.push(window.setTimeout(() => { this.stop(); opts.onEnd?.(); }, endIn));
            if (this.timer) window.clearInterval(this.timer);
            this.timer = null;
            return;
          }
          cursor = 0;
        }
        const ch = seq[cursor];
        const beats = Math.max(1, Math.round(ch.bars * 4));
        for (const s of patternStrokes(opts.pattern, beats, ch.midis.length)) this.strum(ch.midis, cursorTime + s.t * beat, s);
        const idx = cursor;
        const delay = Math.max(0, (cursorTime - ctx.currentTime) * 1000);
        this.visualTimers.push(window.setTimeout(() => this.playing && opts.onChord?.(idx), delay));
        cursorTime += beats * beat;
        cursor++;
      }
    };
    tick();
    this.timer = window.setInterval(tick, 60);
  }

  stop(): void {
    this.playing = false;
    if (this.timer) window.clearInterval(this.timer);
    this.timer = null;
    this.visualTimers.forEach((t) => window.clearTimeout(t));
    this.visualTimers = [];
    const now = this.ctx?.currentTime ?? 0;
    for (const s of this.active) {
      try { s.stop(now + 0.05); } catch { /* già fermato */ }
    }
    this.active = [];
  }
}

export const player = new GuitarSynth();
