// The fund application's team film: the GenesisFundIntro opening (rendered by render.mjs) and a cut of the story film.
//   node fund.mjs --inputs <folder with brand/InterVariable.woff2 and assets/team-*.webp> --story <story.mp4> --out <file.mp4> [--gl angle-egl]
// The story keeps the ask, the schematic, the optimization (its search shortened), the layout, the validation, the 3D
// view and the end card; the parts join with short cross-fades. Needs FFMPEG (or ffmpeg on the PATH), as render.mjs.
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';

const argv = process.argv.slice(2), arg = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i < 0 ? fallback : argv[i + 1]; };
const story = resolve(arg('story')), out = resolve(arg('out')), intro = out.replace(/\.mp4$/, '') + '_intro.mp4';
const ffmpeg = process.env.FFMPEG ?? 'ffmpeg';
/** The story's parts kept, in seconds of the story film, and the cross-fade between parts. */
const PARTS = [[0, 20.3], [41.5, 51.5], [56.5, 94.0], [104.0, 110.5]], XFADE = .5;

const step = (command, args) => {
  const run = spawnSync(command, args, { stdio: 'inherit', cwd: import.meta.dirname });
  if (run.status !== 0) { console.error(`Failed: ${command} ${args.join(' ')}`); process.exit(run.status ?? 1); }
};
step('node', ['render.mjs', '--composition', 'GenesisFundIntro', '--inputs', resolve(arg('inputs')), '--out', intro, '--concurrency', arg('concurrency', '6'), ...(arg('gl') ? ['--gl', arg('gl')] : [])]);
const trims = PARTS.map(([a, b], i) => `[1:v]trim=${a}:${b},setpts=PTS-STARTPTS[s${i}]`);
let last = 's0', length = PARTS[0][1] - PARTS[0][0];
const fades = PARTS.slice(1).map(([a, b], i) => {
  const into = `x${i + 1}`, f = `[${last}][s${i + 1}]xfade=transition=fade:duration=${XFADE}:offset=${(length - XFADE).toFixed(3)}[${into}]`;
  length += b - a - XFADE; last = into; return f;
});
step(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-threads', '6', '-i', intro, '-i', story, '-filter_complex',
  [...trims, ...fades, `[0:v][${last}]concat=n=2:v=1:a=0,format=yuv420p[v]`].join(';'), '-map', '[v]',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-movflags', '+faststart', out]);
rmSync(intro);
console.log(`Rendered ${out}`);
