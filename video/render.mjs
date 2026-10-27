// One command per film:  node render.mjs [--composition GenesisPromo|GenesisPromoFramed|GenesisStory] [--inputs <folder>] [--audio <music.wav>] [--out <file.mp4>] [--concurrency 4] [--theme light]
// GenesisPromo reads a footage folder (clips/manifest.json, clips/*.mp4); GenesisStory a story folder (story.json, layout.json,
// layout/*.png from story/collect.mjs and story/layout_layers.mjs). Both need brand/InterVariable.woff2; renders stay outside git.
// Remotion's own encoder (compositor) needs glibc >= 2.31; the build host has 2.28. So Chrome renders a JPEG sequence and an
// existing FFmpeg (FFMPEG, or imageio-ffmpeg's binary) encodes it. The frame folder is removed after a good encode.
// --audio is muxed as read (never copied): cut to the film's length with a 2 s fade-out, AAC 192 kb/s.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const argv = process.argv.slice(2), arg = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i < 0 ? fallback : argv[i + 1]; };
const composition = arg('composition', 'GenesisPromo');
const inputs = resolve(arg('inputs') ?? (() => { throw new Error('Pass --inputs'); })());
const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
const out = resolve(arg('out', `renders/${composition.startsWith('GenesisStory') ? 'genesis-story' : 'genesis-promo'}-${stamp}.mp4`));
const ffmpeg = process.env.FFMPEG ?? 'ffmpeg';
const needed = composition.startsWith('GenesisStory') ? 'story.json' : 'clips/manifest.json';
if (!existsSync(`${inputs}/${needed}`)) throw new Error(`No ${needed} in ${inputs}`);
if (ffmpeg.includes('/') && !existsSync(ffmpeg)) throw new Error(`No FFmpeg at ${ffmpeg}; set FFMPEG`);
const audio = arg('audio') && resolve(arg('audio'));
if (audio && !existsSync(audio)) throw new Error(`No audio at ${audio}`);

const frames = out.replace(/\.mp4$/, "") + "_frames";
mkdirSync(dirname(out), { recursive: true });
const step = (command, args) => {
  const run = spawnSync(command, args, { stdio: 'inherit', cwd: import.meta.dirname });
  if (run.status !== 0) { console.error(`Failed: ${command} ${args.join(' ')}`); process.exit(run.status ?? 1); }
};
step('npx', ['remotion', 'render', 'src/index.ts', composition, frames, '--sequence', '--image-format=jpeg', '--jpeg-quality=95',
  `--public-dir=${inputs}`, `--concurrency=${arg('concurrency', '4')}`, ...(arg('theme') ? [`--props=${JSON.stringify({ theme: arg('theme') })}`] : [])]);
const seconds = readdirSync(frames).length / 30;
step(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-threads', '4', '-framerate', '30', '-pattern_type', 'glob', '-i', `${frames}/element-*.jpeg`,
  ...(audio ? ['-i', audio, '-map', '0:v', '-map', '1:a', '-af', `afade=t=out:st=${seconds - 2}:d=2`, '-c:a', 'aac', '-b:a', '192k', '-t', String(seconds)] : []),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
rmSync(frames, { recursive: true });
console.log(`Rendered ${out}`);
