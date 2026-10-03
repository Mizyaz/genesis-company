/** Original 12-bar score. No recording, remote service or third-party music. */
export const FILM_SECONDS = 30;
export const BPM = 96;
const beat = 60 / BPM;
export type Note = { at: number; length: number; midi: number; level: number; pan: number; voice: 'pad' | 'bell' | 'bass' | 'tick' };

export function composeScore(): Note[] {
  const notes: Note[] = [];
  // Dmaj9, Bm9, Gmaj9, Asus4. Open voicings leave space for the three-note signature.
  const harmony = [[50, 57, 61, 64], [47, 54, 57, 61], [43, 54, 57, 62], [45, 52, 59, 62]];
  for (let bar = 0; bar < 12; bar++) {
    const chord = harmony[bar >= 10 ? 0 : bar % 4];
    const at = bar * 4 * beat;
    chord.forEach((midi, i) => notes.push({ at, length: 3.05, midi, level: .034, pan: (i - 1.5) * .4, voice: 'pad' }));
    if (bar > 1 && bar < 10) {
      notes.push({ at: at + .025, length: 1.25, midi: chord[0] - 12, level: .13, pan: 0, voice: 'bass' });
      notes.push({ at: at + 2.5 * beat, length: .7, midi: chord[0] - 12, level: .075, pan: 0, voice: 'bass' });
    }
    if (bar > 3 && bar < 10) {
      for (let i = 0; i < 4; i++) {
        notes.push({ at: at + (i + .5) * beat, length: .16, midi: 84 + i * 2, level: i % 2 ? .026 : .016, pan: i % 2 ? .45 : -.45, voice: 'tick' });
      }
    }
    // Deliberate space between phrases. The last two bars resolve instead of looping.
    const melody = bar >= 10 ? [81, 76, 74] : bar % 2 ? [78, 76, 73] : [74, 76, 81];
    if (bar % 2 === 0 || bar === 11) melody.forEach((midi, i) => notes.push({
      at: at + [.5, 1.75, 3][i] * beat, length: 1.5, midi, level: bar >= 10 ? .085 : .072, pan: (i - 1) * .24, voice: 'bell',
    }));
  }
  return notes;
}

/** A small offline render gives pause/seek/replay exact audiovisual alignment. Stereo PCM is < 11 MB. */
export async function renderScore(): Promise<AudioBuffer> {
  const context = new OfflineAudioContext(2, FILM_SECONDS * 44100, 44100);
  const master = context.createGain();
  master.gain.setValueAtTime(0, 0);
  master.gain.linearRampToValueAtTime(.65, 1.5);
  master.gain.setValueAtTime(.65, 27);
  master.gain.linearRampToValueAtTime(0, FILM_SECONDS);
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -14;
  compressor.knee.value = 14;
  compressor.ratio.value = 3;
  master.connect(compressor).connect(context.destination);
  // Crossfeed taps give the plucks a restrained stereo tail without large convolution buffers.
  const wet = context.createGain();
  wet.gain.value = .19;
  for (const [seconds, pan, level] of [[.3125, -.65, .6], [.625, .65, .35], [.9375, -.3, .18]]) {
    const delay = context.createDelay(1);
    delay.delayTime.value = seconds;
    const position = context.createStereoPanner(); position.pan.value = pan;
    const gain = context.createGain(); gain.gain.value = level;
    wet.connect(delay).connect(position).connect(gain).connect(master);
  }
  for (const note of composeScore()) {
    const { at, length, level, voice } = note;
    const end = Math.min(FILM_SECONDS, at + length);
    const envelope = context.createGain();
    const position = context.createStereoPanner(); position.pan.value = note.pan;
    const filter = context.createBiquadFilter(); filter.type = 'lowpass';
    filter.frequency.value = voice === 'pad' ? 900 : voice === 'bass' ? 260 : 6000;
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(level, at + (voice === 'pad' ? .8 : .012));
    envelope.gain.exponentialRampToValueAtTime(.0001, end);
    envelope.connect(filter).connect(position).connect(master);
    if (voice === 'bell' || voice === 'tick') position.connect(wet);
    const frequency = 440 * 2 ** ((note.midi - 69) / 12);
    const partials = voice === 'pad' ? [[1, -.055, .55], [1, .055, .45]] : voice === 'bell' ? [[1, 0, .78], [2.002, 0, .16], [3.01, 0, .06]] : [[1, 0, 1]];
    for (const [ratio, detune, strength] of partials) {
      const oscillator = context.createOscillator();
      oscillator.type = voice === 'pad' ? 'triangle' : 'sine';
      oscillator.frequency.value = frequency * ratio;
      oscillator.detune.value = detune * 100;
      const gain = context.createGain(); gain.gain.value = strength;
      oscillator.connect(gain).connect(envelope);
      oscillator.start(at); oscillator.stop(end);
    }
  }
  const buffer = await context.startRendering();
  // Conservative peak normalization keeps the quiet score audible without clipping.
  let peak = 0;
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    for (const value of buffer.getChannelData(channel)) peak = Math.max(peak, Math.abs(value));
  }
  const gain = Math.min(6, .62 / Math.max(peak, .001));
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < data.length; i++) data[i] *= gain;
  }
  return buffer;
}

let renderedScore: Promise<AudioBuffer> | undefined;
export type AudioStatus = 'loading' | 'ready' | 'blocked' | 'unavailable' | 'closed';

/** Construct only inside the user's click. Closing the film closes its AudioContext. */
export class IntroSound {
  private context: AudioContext | undefined;
  private gain: GainNode | undefined;
  private source: AudioBufferSourceNode | undefined;
  private buffer: AudioBuffer | undefined;
  private anchor = 0;
  private offset = 0;
  private active = false;
  private disposed = false;
  private muted = false;
  status: AudioStatus = 'loading';
  readonly ready: Promise<void>;

  constructor() {
    try {
      this.context = new AudioContext();
      this.gain = this.context.createGain();
      this.gain.gain.value = .8;
      this.gain.connect(this.context.destination);
      void this.context.resume().catch(() => { if (!this.disposed) this.status = 'blocked'; });
      renderedScore ??= renderScore().catch(error => { renderedScore = undefined; throw error; });
      this.ready = renderedScore.then(buffer => {
        if (this.disposed) return;
        this.buffer = buffer;
        this.status = this.context?.state === 'running' ? 'ready' : 'blocked';
      }).catch(() => { if (!this.disposed) this.status = 'unavailable'; });
    } catch { this.status = 'unavailable'; this.ready = Promise.resolve(); }
  }

  get position() { return this.active && this.context?.state === 'running' ? Math.min(FILM_SECONDS, this.offset + this.context.currentTime - this.anchor) : null; }
  async unlock() {
    if (!this.context || this.disposed || this.status === 'unavailable') return;
    try { await this.context.resume(); if (!this.disposed) this.status = this.buffer ? 'ready' : 'loading'; }
    catch { if (!this.disposed) this.status = 'blocked'; }
  }
  play(offset: number) {
    this.pause();
    if (!this.context || !this.buffer || this.context.state !== 'running' || this.disposed || offset >= FILM_SECONDS) return;
    this.source = this.context.createBufferSource(); this.source.buffer = this.buffer;
    this.source.connect(this.gain!);
    this.offset = offset; this.anchor = this.context.currentTime; this.active = true;
    this.source.start(0, offset);
  }
  pause() {
    if (this.source) { this.source.stop(); this.source.disconnect(); this.source = undefined; }
    this.active = false;
  }
  setMuted(value: boolean) {
    this.muted = value;
    if (this.context && this.gain) this.gain.gain.setTargetAtTime(this.muted ? 0 : .8, this.context.currentTime, .025);
  }
  dispose() {
    this.disposed = true; this.pause(); this.status = 'closed';
    this.gain?.disconnect(); void this.context?.close().catch(() => {});
  }
}
