// The fund film: the GenesisFundHead part, a cut of the story film in plain words (GenesisFundStory), the GenesisFundTail
// part and the story's end card, joined with short cross-fades; a narration track, if given, is muxed as AAC 48 kHz.
//   node fund.mjs --inputs <folder with brand/InterVariable.woff2, assets/team-*.webp, layout.json, layout/*.png>
//     --story-inputs <story folder> --out <file.mp4> [--audio <narration.wav>] [--gl angle-egl]
// Each part renders to <out>_head.mp4, <out>_story.mp4 and <out>_tail.mp4; a part already there is reused, so one part can
// be rendered again alone by deleting its file. Needs FFMPEG (or ffmpeg on the PATH), as render.mjs.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const argv = process.argv.slice(2), arg = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i < 0 ? fallback : argv[i + 1]; };
const out = resolve(arg('out')), stem = out.replace(/\.mp4$/, ''), audio = arg('audio') && resolve(arg('audio'));
const ffmpeg = process.env.FFMPEG ?? 'ffmpeg';
/** The story's parts kept, in seconds of the story film, in the film's order: the product cut, then the end card. */
// A join dips through the page colour (Y 31, U 139, V 120) with no frame holding both clips (2d, 11-01: no text over text).
const DIP = 'if(gt(P,0.5),A*(2*P-1)+if(eq(PLANE,0),31,if(eq(PLANE,1),139,120))*(2-2*P),B*(1-2*P)+if(eq(PLANE,0),31,if(eq(PLANE,1),139,120))*2*P)';
const PRODUCT = [[1.5, 6], [11, 14], [15.5, 18], [42, 48], [68.5, 71.5], [72.5, 75.5], [77, 80], [88, 91.5]], END = [106.5, 110], XFADE = .5;

const step = (command, args) => {
  const run = spawnSync(command, args, { stdio: 'inherit', cwd: import.meta.dirname });
  if (run.status !== 0) { console.error(`Failed: ${command} ${args.join(' ')}`); process.exit(run.status ?? 1); }
};
const part = (name, composition, inputs) => {
  const file = `${stem}_${name}.mp4`;
  if (!existsSync(file)) step('node', ['render.mjs', '--composition', composition, '--inputs', resolve(inputs), '--out', file, '--concurrency', arg('concurrency', '4'), ...(arg('gl') ? ['--gl', arg('gl')] : [])]);
  return file;
};
const seconds = file => {
  const [, h, m, s] = spawnSync(ffmpeg, ['-hide_banner', '-i', file], { encoding: 'utf8' }).stderr.match(/Duration: (\d+):(\d+):([\d.]+)/);
  return +h * 3600 + +m * 60 + +s;
};
const head = part('head', 'GenesisFundHead', arg('inputs')), tail = part('tail', 'GenesisFundTail', arg('inputs')), story = part('story', 'GenesisFundStory', arg('story-inputs'));

// Both kinds of input carry one frame rate and the same colour tags, so xfade sees one stream format.
const SAME = 'fps=30,setparams=range=tv:color_primaries=bt709:color_trc=bt709:colorspace=bt709';
const segments = [[0, 0, seconds(head)], ...PRODUCT.map(([a, b]) => [1, a, b]), [2, 0, seconds(tail)], [1, ...END]];
const trims = segments.map(([input, a, b], i) => `[${input}:v]trim=${a}:${b},setpts=PTS-STARTPTS,${SAME}[s${i}]`);
let last = 's0', length = segments[0][2] - segments[0][1];
const starts = [0];
const fades = segments.slice(1).map(([, a, b], i) => {
  const into = `x${i + 1}`, f = `[${last}][s${i + 1}]xfade=transition=custom:expr='${DIP}':duration=${XFADE}:offset=${(length - XFADE).toFixed(3)}[${into}]`;
  starts.push(length - XFADE); length += b - a - XFADE; last = into; return f;
});
step(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-threads', '6', '-i', head, '-i', story, '-i', tail, ...(audio ? ['-i', audio] : []), '-filter_complex',
  [...trims, ...fades, `[${last}]format=yuv420p[v]`].join(';'), '-map', '[v]', ...(audio ? ['-map', '3:a', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000'] : []),
  '-t', length.toFixed(3), '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-movflags', '+faststart', out]);
console.log(`Rendered ${out}, ${length.toFixed(2)} s; segments start at ${starts.map(s => s.toFixed(2)).join(', ')} s`);
