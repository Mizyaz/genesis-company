// Writes the story film's original score, timed to its scenes:
//   node story/score.mjs --scenes ask:0,schematic:13.8,... --length <s> --out <score.wav> [--robot]
// Synthesised from scratch (no samples): a solo piano at 80 bpm in A minor and C major, with soft strings under the
// middle of the film. Every scene starts on its own chord and has its own progression, figure and touch: single
// rolled chords for the question, broken chords as the circuit is drawn, flowing arpeggios with a melody through the
// optimisation and the layout, one held chord for the checks, a full resolution for the 3D view, high sparkles for
// "any technology", and a last rolled chord that rings out on the end card. With --robot the score ends where the
// robot comes and the robot gets its own cue (see below). 48 kHz stereo, 16 bit, peak -1 dBFS; render.mjs cuts and
// fades it to the film.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const argv = process.argv.slice(2), arg = name => { const i = argv.indexOf(`--${name}`); if (i < 0) throw new Error(`--${name} is required`); return argv[i + 1]; };
const scenes = Object.fromEntries(arg('scenes').split(',').map(p => { const [id, s] = p.split(':'); return [id, Number(s)]; }));
const length = Number(arg('length')), out = resolve(arg('out')), robot = argv.includes('--robot');
const RATE = 48000, N = Math.ceil((length + 3) * RATE), L = new Float32Array(N), R = new Float32Array(N), VERB = new Float32Array(N);
let seed = 7;
const noise = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 31 - 1; };
const hz = midi => 440 * 2 ** ((midi - 69) / 12);
const at = id => scenes[id] ?? Infinity;
const end = at('end');

/** Adds a mono voice: fn(t since start, i) -> sample, panned (-1 left, 1 right), with a reverb send. */
function voice(start, dur, fn, { gain = 1, pan = 0, verb = 0 } = {}) {
  const i0 = Math.max(0, Math.round(start * RATE)), i1 = Math.min(N, Math.round((start + dur) * RATE));
  const gl = gain * Math.cos((pan + 1) * Math.PI / 4), gr = gain * Math.sin((pan + 1) * Math.PI / 4);
  for (let i = i0; i < i1; i++) { const v = fn((i - i0) / RATE); L[i] += v * gl; R[i] += v * gr; VERB[i] += v * gain * verb; }
}
const env = (t, a, d) => Math.min(1, t / a) * Math.exp(-t / d);
const saw = (p) => 2 * (p - Math.floor(p + .5));

// A piano note: two slightly detuned strings, each a stack of stretched partials (string stiffness) whose upper
// partials die faster and are brighter when struck harder, a two-stage decay, a felt hammer knock, and the damper
// after `dur` seconds. Low notes ring longer, a little softer and a little left; high notes sit right.
function piano(t0, midi, vel, dur, { verb = .35 } = {}) {
  if (t0 >= stop) return;
  dur = Math.min(dur, stop + .3 - t0);
  const f = hz(midi), ring = Math.min(9, Math.max(.7, 4 * Math.sqrt(220 / f))), parts = [];
  for (let n = 1; n <= 10 && n * f < 9000; n++)
    parts.push([2 * Math.PI * n * f * Math.sqrt(1 + .0004 * n * n), Math.exp(-(n - 1) * (1.15 - vel) * .7) / n ** 1.4, ring / (1 + .3 * (n - 1))]);
  const len = dur + .9, low = midi < 50 ? .55 + .45 * (midi - 33) / 17 : 1; let lp = 0, lp2 = 0;
  voice(t0, len, t => {
    let v = 0;
    for (const [w, a, d] of parts) v += a * (Math.sin(w * .9996 * t) + Math.sin(w * 1.0004 * t + .7)) * (.65 * Math.exp(-t / (d * .22)) + .35 * Math.exp(-t / d));
    if (t < .015) { lp += .35 * (noise() - lp); lp2 += .03 * (lp - lp2); v += (lp - lp2) * .8 * vel * (1 - t / .015); }
    return v * Math.min(1, t / .002) * (t > dur ? Math.exp(-(t - dur) / .14) : 1);
  }, { gain: .06 * vel * low, pan: Math.max(-.6, Math.min(.6, (midi - 62) / 30)), verb });
}

// Chords: a bass root and the right hand's tones (MIDI, middle C is 60).
const CH = {
  Am: [45, 57, 60, 64, 71], F: [41, 57, 60, 65, 69], Fmaj7: [41, 57, 60, 64, 65], C: [48, 55, 60, 64, 67],
  Cadd9: [36, 55, 60, 62, 64], G: [43, 55, 59, 62, 67], GB: [47, 55, 59, 62, 67], Em: [40, 55, 59, 64, 67],
  Dm: [38, 57, 62, 65, 69], E: [40, 56, 59, 64, 68],
};
// Each scene: its progression (one chord a bar, from the scene's first frame), its figure, its touch and the strings.
const SCENE = {
  ask:       { prog: ['Am', 'Fmaj7', 'C', 'G', 'Am'], fig: 'roll', vel: .42, strings: 0 },
  schematic: { prog: ['F', 'G', 'Am'], fig: 'broken', vel: .45, strings: 0 },
  blocks:    { prog: ['Am', 'G'], fig: 'broken', vel: .5, strings: .3 },
  testbench: { prog: ['F', 'C', 'G'], fig: 'broken', vel: .55, strings: .5 },
  spec:      { prog: ['Dm', 'Am', 'F', 'G'], fig: 'flow', vel: .58, strings: .6 },
  optimize:  { prog: ['Am', 'F', 'C', 'G', 'Am', 'F', 'Dm', 'E', 'Am', 'F'], fig: 'flow', vel: .64, strings: .8 },
  layout:    { prog: ['C', 'GB', 'Am', 'F', 'G'], fig: 'flow', vel: .7, strings: .9, lift: 12 },
  signoff:   { prog: ['Fmaj7'], fig: 'hold', vel: .45, strings: .4 },
  chip3d:    { prog: ['F', 'G', 'C'], fig: 'broken', vel: .78, strings: 1, lift: 12 },
  any:       { prog: ['Am', 'F'], fig: 'sparkle', vel: .5, strings: .4 },
  demo:      { prog: ['Dm', 'G'], fig: 'broken', vel: .48, strings: .3 },
  end:       { prog: ['Cadd9'], fig: 'end', vel: .55, strings: .5 },
};
const BEAT = .75, BAR = 4 * BEAT, EIGHTH = BEAT / 2;
// The robot ending replaces the end card's music: the score stops where the robot comes.
const stop = robot ? end : Infinity;
const starts = Object.entries(scenes).sort((a, b) => a[1] - b[1]);
const melody = [4, 3, 2, 3, 4, 2, 1, 2];  // which right-hand tone the melody takes, bar after bar
let bars = 0;
for (const [s, [id, from]] of starts.entries()) {
  const sc = SCENE[id] ?? SCENE.ask, to = Math.min(s + 1 < starts.length ? starts[s + 1][1] : length + 2, stop);
  for (let b = 0; from + b * BAR < to - .2; b++, bars++) {
    const t0 = from + b * BAR, barEnd = Math.min(t0 + BAR, to), [root, ...rh] = CH[sc.prog[b % sc.prog.length]], v = sc.vel, held = barEnd - t0;
    const swell = Math.min(1, .85 + .05 * b);
    if (sc.fig === 'roll' || sc.fig === 'hold' || sc.fig === 'end') {
      const ringFor = sc.fig === 'end' ? 6 : held + .2;
      piano(t0, root - 12 * (root > 40), v, ringFor);
      rh.forEach((n, i) => piano(t0 + .09 * (i + 1), n, v * .8, ringFor - .09 * (i + 1)));
      if (sc.fig === 'roll' && held > 2) piano(t0 + 2 * BEAT, rh[melody[bars % 8] % rh.length] + 12, v * .9, held - 2 * BEAT + .3);
      if (sc.fig === 'end') [76, 79, 84].forEach((n, i) => piano(t0 + 1.2 + i * .55, n, v * (.8 - .1 * i), 5));
      continue;
    }
    // Left hand: the root on the bar, its octave halfway.
    piano(t0, root, v * swell, held / 2 + .2);
    if (held > BAR / 2) piano(t0 + BAR / 2, root + 12, v * .75 * swell, held / 2 + .1);
    // Right hand: broken chords in eighths, or high sparkles, or arpeggios with a melody on top.
    const pattern = sc.fig === 'sparkle' ? [0, 2, 3, 1, 3, 2, 3, 1] : [0, 1, 2, 3, 2, 1, 2, 3], lift = sc.lift ?? 0;
    for (let k = 0; k < 8 && t0 + k * EIGHTH < barEnd - .05; k++) {
      const n = rh[pattern[k] % rh.length] + lift + (sc.fig === 'sparkle' ? 12 : 0);
      piano(t0 + k * EIGHTH + .012 * Math.sin(k * 2.3), n, v * (k % 2 ? .55 : .7) * swell, EIGHTH * 2.5, { verb: .45 });
    }
    if (sc.fig === 'flow') for (const [beat, len] of [[0, 1.5], [1.5, 1], [2.5, 1.5]]) {
      const t = t0 + beat * BEAT; if (t >= barEnd - .05) break;
      const n = rh[(melody[(bars + beat * 2) % 8]) % rh.length] + 12 + lift;
      piano(t, n, Math.min(1, v * 1.15), Math.min(len * BEAT, barEnd - t) + .2);
    }
  }
  // Strings: the scene's chord held soft under the piano, three detuned saws a tone through a low-pass, slow bow.
  if (sc.strings) for (let b = 0; from + b * BAR < to - .2; b++) {
    const t0 = from + b * BAR, dur = Math.min(BAR, to - t0) + .5, [root, ...rh] = CH[sc.prog[b % sc.prog.length]];
    for (const [j, note] of [root + 12, ...rh.slice(0, 3)].entries()) for (const det of [-.06, .06]) {
      let lp = 0; const f = hz(note + det), a = 2 * Math.PI * 700 / RATE / (1 + 2 * Math.PI * 700 / RATE);
      voice(t0, dur, t => { lp += a * (saw(f * t + j * .13) - lp); return lp * Math.min(1, t / .9) * Math.min(1, (dur - t) / .5); },
        { gain: .022 * sc.strings, pan: det * 8, verb: .7 });
    }
  }
}

// The robot ending (--robot), on the frames of AltEndScene (WAKE and ARM in src/Story.tsx, 30 frames a second): a low
// trembling hum as the eyes wake, the crackle and whine of an old television switching on, and soft servo ticks while
// each joint turns, a muted clunk where it stops.
// Under them the robot's own cue, a different colour from the score: a wobbling tape drone a semitone off the score's
// key, a detuned cluster pad with a slow tremolo, and a low lo-fi pulse that walks two notes, until the symbol opens
// in E major with a shimmer and the bell.
if (robot) {
  const f = n => end + n / 30, cueEnd = length + 2;
  { let lp = 0; const a = 2 * Math.PI * 220 / RATE;
    voice(f(6), cueEnd - f(6), t => { const w = 1 + .006 * Math.sin(2 * Math.PI * .6 * t); lp += a * (saw(hz(29) * w * t) - lp); return lp * Math.min(1, t / 2) * Math.min(1, (cueEnd - f(6) - t) / 2); }, { gain: .18, verb: .5 }); }
  for (const [j, note] of [51, 52, 58, 63].entries()) for (const det of [-.12, .12]) {
    let lp = 0; const a = 2 * Math.PI * 650 / RATE / (1 + 2 * Math.PI * 650 / RATE), dur = f(150) - f(36) + 1;
    voice(f(36), dur, t => { lp += a * (saw(hz(note + det) * t * (1 + .003 * Math.sin(2 * Math.PI * .5 * t)) + j * .2) - lp); return lp * (.7 + .3 * Math.sin(2 * Math.PI * 5.5 * t)) * Math.min(1, t / 1.2) * Math.min(1, (dur - t) / .8); }, { gain: .03, pan: det * 4, verb: .6 });
  }
  for (let k = 0; f(36) + k * .5 < f(150); k++) { const fr = hz(k % 4 < 2 ? 40 : 41); let lp = 0; const a = 2 * Math.PI * 400 / RATE;
    voice(f(36) + k * .5, .45, t => { lp += a * (Math.round(4 * Math.sign(Math.sin(2 * Math.PI * fr * t)) * env(t, .005, .16)) / 4 - lp); return lp; }, { gain: .14, verb: .3 }); }
  for (const [j, note] of [52, 56, 59, 66, 71].entries()) for (const det of [-.05, .05])
    voice(f(150), cueEnd - f(150), t => Math.sin(2 * Math.PI * hz(note + det) * t) * (1 + .3 * Math.sin(2 * Math.PI * 4 * t + j)) * Math.min(1, t / .8) * Math.min(1, (cueEnd - f(150) - t) / 1.5), { gain: .035, pan: det * 8, verb: .8 });
  const WAKE = { eyes: 6, on: 36 }, ARM = [[84, 105], [105, 135], [135, 141]];
  voice(f(WAKE.eyes), 2.4, t => { const p = 2 * Math.PI * (70 + 40 * Math.min(1, t / .5)) * t;
    return (Math.sin(p) + .3 * Math.sin(2 * p + .4 * Math.sin(2 * Math.PI * 7 * t))) * (.65 + .35 * Math.sin(2 * Math.PI * 22 * t)) * env(t, .08, .9); }, { gain: .32, verb: .3 });
  { let lp = 0; voice(f(WAKE.eyes), 1.6, t => { lp += .08 * (noise() - lp); return lp * (.5 + .5 * Math.sin(2 * Math.PI * 18 * t)) * env(t, .05, .5); }, { gain: .5, verb: .4 }); }
  voice(f(WAKE.on), .4, t => Math.sin(2 * Math.PI * (55 + 40 * Math.exp(-t / .03)) * t) * env(t, .002, .09), { gain: .45 });
  { let lp = 0, hp = 0; voice(f(WAKE.on), 1.4, t => { const n = noise(); lp += .5 * (n - lp); hp += .1 * (lp - hp); const crackle = noise() > .985 ? noise() : 0;
    return ((lp - hp) * .6 + crackle) * env(t, .003, .35); }, { gain: .16, verb: .3 }); }
  voice(f(WAKE.on), 1.5, t => Math.sin(2 * Math.PI * 7800 * t) * env(t, .01, .4), { gain: .012 });
  for (const [from, to] of ARM) {
    for (let k = from; k < to; k += 2) voice(f(k), .03, t => (Math.sin(2 * Math.PI * 1900 * t) * .6 + noise() * .4) * env(t, .0005, .006), { gain: .05, pan: .4 });
    voice(f(to), .2, t => Math.sin(2 * Math.PI * (110 + 60 * Math.exp(-t / .01)) * t) * env(t, .001, .05), { gain: .16, pan: .4 });
  }
}
// With the robot, the bell as its symbol lights.
if (robot) for (const [t0, g] of [[end + 150 / 30, 1], [end + 226 / 30, .6]]) for (const [ratio, amp, d] of [[1, 1, 1.6], [2.76, .4, .7], [5.4, .15, .3]])
  voice(t0, 4, t => Math.sin(2 * Math.PI * hz(76) * ratio * t) * env(t, .002, d) * amp, { gain: .09 * g, verb: .7 });

// Reverb: four combs and two all-passes (Schroeder) on the send, a little wider on the right.
const verb = (delays, input) => {
  const outv = new Float32Array(N);
  for (const d of delays) { const n = Math.round(d * RATE), buf = new Float32Array(n); let j = 0, lp = 0;
    for (let i = 0; i < N; i++) { const y = buf[j]; lp += .4 * (y - lp); buf[j] = input[i] + lp * .82; outv[i] += y / delays.length; j = (j + 1) % n; } }
  for (const d of [.005, .0017]) { const n = Math.round(d * RATE), buf = new Float32Array(n); let j = 0;
    for (let i = 0; i < N; i++) { const y = buf[j], x = outv[i]; buf[j] = x + y * .5; outv[i] = y - x * .5; j = (j + 1) % n; } }
  return outv;
};
const wl = verb([.0297, .0371, .0411, .0437], VERB), wr = verb([.0301, .0377, .0419, .0441], VERB);
let peak = 0;
for (let i = 0; i < N; i++) { L[i] += .55 * wl[i]; R[i] += .55 * wr[i]; peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); }

// 16-bit PCM WAV, peak at -1 dBFS.
const g = 10 ** (-1 / 20) / peak, data = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) { data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g)) * 32767), i * 4); data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g)) * 32767), i * 4 + 2); }
const head = Buffer.alloc(44);
head.write('RIFF', 0); head.writeUInt32LE(36 + data.length, 4); head.write('WAVE', 8); head.write('fmt ', 12); head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20); head.writeUInt16LE(2, 22);
head.writeUInt32LE(RATE, 24); head.writeUInt32LE(RATE * 4, 28); head.writeUInt16LE(4, 32); head.writeUInt16LE(16, 34); head.write('data', 36); head.writeUInt32LE(data.length, 40);
writeFileSync(out, Buffer.concat([head, data]));
console.log(`${(N / RATE).toFixed(1)} s, ${Object.keys(scenes).length} scenes -> ${out}`);
