/** Original 16-bar electronic score. No third-party samples or remote music service. */
import { FILM_SECONDS } from './timeline';
export { FILM_SECONDS } from './timeline';
export const BPM = 128;
const beat = 60 / BPM;
export type Note = { at: number; length: number; midi: number; level: number; pan: number; voice: 'pad' | 'bell' | 'bass' | 'tick' | 'kick' | 'hat' };

export function composeScore(): Note[] {
  const notes: Note[] = [];
  // Dmaj9, Bm9, Gmaj9, Asus4. Open voicings leave space for the three-note signature.
  const harmony = [[50, 57, 61, 64], [47, 54, 57, 61], [43, 54, 57, 62], [45, 52, 59, 62]];
  for (let bar = 0; bar < 16; bar++) {
    const chord = harmony[bar >= 14 ? 0 : bar % 4];
    const at = bar * 4 * beat;
    chord.forEach((midi, i) => notes.push({ at, length: 2.1, midi, level: .024, pan: (i - 1.5) * .4, voice: 'pad' }));
    if (bar >= 2 && bar < 14) {
      for (const step of [0, 1.5, 2.5, 3.5]) notes.push({ at: at + step * beat, length: .3, midi: chord[0] - 12, level: step ? .075 : .12, pan: 0, voice: 'bass' });
      for (let i = 0; i < 4; i++) notes.push({ at: at + i * beat, length: .24, midi: 34, level: .32, pan: 0, voice: 'kick' });
      for (let i = 0; i < (bar >= 6 ? 8 : 4); i++) notes.push({ at: at + (i + .5) * beat * (bar >= 6 ? .5 : 1), length: i % 2 ? .10 : .06, midi: 90, level: i % 2 ? .045 : .025, pan: i % 2 ? .2 : -.2, voice: 'hat' });
    }
    if (bar > 4 && bar < 14) {
      for (let i = 0; i < 4; i++) {
        notes.push({ at: at + (i + .5) * beat, length: .16, midi: 84 + i * 2, level: i % 2 ? .026 : .016, pan: i % 2 ? .45 : -.45, voice: 'tick' });
      }
    }
    // Deliberate space between phrases. The last two bars resolve instead of looping.
    const melody = bar >= 14 ? [81, 76, 74] : bar % 4 === 2 ? [78, 76, 73] : [74, 76, 81];
    if (bar % 2 === 0 || bar === 15) melody.forEach((midi, i) => notes.push({
      at: at + [.5, 1.75, 3][i] * beat, length: 1.2, midi, level: bar >= 14 ? .075 : .045, pan: (i - 1) * .24, voice: 'bell',
    }));
    // Pixel synthesis adds a light counter-melody; the layout reveal opens its register.
    if (bar >= 5 && bar < 14) for (let i = 0; i < 8; i++) notes.push({
      at: at + (i + .25) * beat / 2, length: .3, midi: chord[(i + bar) % 4] + (bar >= 10 ? 24 : 12),
      level: i % 3 ? .014 : .028, pan: Math.sin(i * 1.5) * .5, voice: 'bell',
    });
  }
  return notes;
}

/** Build-time synthesis only. A full stereo PCM render is < 11 MB. */
export async function renderScore(): Promise<AudioBuffer> {
  const context = new OfflineAudioContext(2, FILM_SECONDS * 44100, 44100);
  const master = context.createGain();
  master.gain.setValueAtTime(0, 0);
  master.gain.linearRampToValueAtTime(.65, .4);
  master.gain.setValueAtTime(.65, FILM_SECONDS - 1.2);
  master.gain.linearRampToValueAtTime(0, FILM_SECONDS);
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -14;
  compressor.knee.value = 14;
  compressor.ratio.value = 3;
  master.connect(compressor).connect(context.destination);
  // Crossfeed taps give the plucks a restrained stereo tail without large convolution buffers.
  const wet = context.createGain();
  wet.gain.value = .19;
  for (const [seconds, pan, level] of [[beat * .75, -.65, .6], [beat * 1.5, .65, .35], [beat * 2.25, -.3, .18]]) {
    const delay = context.createDelay(1);
    delay.delayTime.value = seconds;
    const position = context.createStereoPanner(); position.pan.value = pan;
    const gain = context.createGain(); gain.gain.value = level;
    wet.connect(delay).connect(position).connect(gain).connect(master);
  }
  const noise = context.createBuffer(1, 44100, 44100), samples = noise.getChannelData(0);
  let seed = 24381;
  for (let i = 0; i < samples.length; i++) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; samples[i] = seed / 2147483648 - 1; }
  for (const note of composeScore()) {
    const { at, length, level, voice } = note;
    const end = Math.min(FILM_SECONDS, at + length);
    const envelope = context.createGain();
    const position = context.createStereoPanner(); position.pan.value = note.pan;
    const filter = context.createBiquadFilter(); filter.type = voice === 'hat' ? 'highpass' : 'lowpass';
    filter.frequency.value = voice === 'pad' ? 1400 : voice === 'bass' ? 480 : voice === 'kick' ? 350 : voice === 'hat' ? 8000 : 6200;
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(level, Math.min(end - .001, at + (voice === 'pad' ? .3 : .004)));
    envelope.gain.exponentialRampToValueAtTime(.0001, end);
    envelope.connect(filter).connect(position).connect(master);
    if (voice === 'bell' || voice === 'tick') position.connect(wet);
    if (voice === 'hat') {
      const source = context.createBufferSource(); source.buffer = noise; source.connect(envelope); source.start(at); source.stop(end); continue;
    }
    const frequency = 440 * 2 ** ((note.midi - 69) / 12);
    const partials = voice === 'pad' ? [[1, -.055, .55], [1, .055, .45]] : voice === 'bell' ? [[1, 0, .78], [2.002, 0, .16], [3.01, 0, .06]] : [[1, 0, 1]];
    for (const [ratio, detune, strength] of partials) {
      const oscillator = context.createOscillator();
      oscillator.type = voice === 'pad' ? 'triangle' : 'sine';
      oscillator.frequency.value = frequency * ratio;
      if (voice === 'kick') { oscillator.frequency.setValueAtTime(115, at); oscillator.frequency.exponentialRampToValueAtTime(42, Math.min(end, at + .10)); }
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

export type AudioStatus = 'loading' | 'ready' | 'blocked' | 'unavailable' | 'closed';

/** Play the pre-rendered original score from this static site. No synthesis cost for visitors. */
export class IntroSound {
  private media: HTMLAudioElement | undefined;
  private active = false;
  private disposed = false;
  private cleanup = () => {};
  status: AudioStatus = 'loading';
  readonly ready: Promise<void>;

  constructor(url: string) {
    try {
      const media = new Audio(url); this.media = media;
      media.preload = 'auto'; media.volume = .8;
      this.ready = new Promise(resolve => {
        const loaded = () => { if (this.status !== 'blocked') this.status = 'ready'; resolve(); };
        const failed = () => { this.status = 'unavailable'; resolve(); };
        media.addEventListener('canplay', loaded, { once: true });
        media.addEventListener('error', failed, { once: true });
        this.cleanup = () => { media.removeEventListener('canplay', loaded); media.removeEventListener('error', failed); };
      });
      // Acquire playback permission in the original click, including mobile browsers.
      void this.unlock();
    } catch { this.status = 'unavailable'; this.ready = Promise.resolve(); }
  }

  get position() { return this.active && this.media && !this.media.paused && this.media.readyState >= 2 ? Math.min(FILM_SECONDS, this.media.currentTime) : null; }
  async unlock() {
    if (!this.media || this.disposed || this.status === 'unavailable') return;
    try { await this.media.play(); if (!this.disposed) { this.status = 'ready'; if (!this.active) this.media?.pause(); } }
    catch (error) { if (!this.disposed && (error as DOMException).name !== 'AbortError') this.status = (error as DOMException).name === 'NotAllowedError' ? 'blocked' : 'unavailable'; }
  }
  play(offset: number) {
    if (!this.media || this.disposed || offset >= FILM_SECONDS || this.status === 'unavailable') return;
    this.media.currentTime = offset; this.active = true; void this.unlock();
  }
  pause() { this.active = false; this.media?.pause(); }
  setMuted(value: boolean) { if (this.media) this.media.muted = value; }
  dispose() {
    this.disposed = true; this.pause(); this.status = 'closed';
    this.cleanup(); this.media?.removeAttribute('src'); this.media?.load(); this.media = undefined;
  }
}
