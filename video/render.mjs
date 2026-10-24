// One command for the promo:  node render.mjs [--inputs <footage folder>] [--out <file.mp4>] [--concurrency 4]
// The footage folder holds clips/manifest.json, clips/*.mp4 and brand/InterVariable.woff2; renders stay outside git.
// Remotion's own encoder (compositor) needs glibc >= 2.31; nyluma has 2.28. So Chrome renders a JPEG sequence and an
// existing FFmpeg (FFMPEG, or imageio-ffmpeg's binary) encodes it. The frame folder is removed after a good encode.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const argv = process.argv.slice(2), arg = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i < 0 ? fallback : argv[i + 1]; };
const inputs = resolve(arg('inputs', '/DATA/isguven/GENESIS_V1/results/video/motion_inputs/20261024'));
const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
const out = resolve(arg('out', `/DATA/isguven/GENESIS_V1/results/video/renders/genesis-promo-${stamp}.mp4`));
const ffmpeg = process.env.FFMPEG ?? '/home/isguven/miniconda/envs/pyg-env-cpu.HOLD/lib/python3.10/site-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2';
if (!existsSync(`${inputs}/clips/manifest.json`)) throw new Error(`No clips/manifest.json in ${inputs}`);
if (!existsSync(ffmpeg)) throw new Error(`No FFmpeg at ${ffmpeg}; set FFMPEG`);

const frames = out.replace(/\.mp4$/, "") + "_frames";
mkdirSync(dirname(out), { recursive: true });
const step = (command, args) => {
  const run = spawnSync(command, args, { stdio: 'inherit', cwd: import.meta.dirname });
  if (run.status !== 0) { console.error(`Failed: ${command} ${args.join(' ')}`); process.exit(run.status ?? 1); }
};
step('npx', ['remotion', 'render', 'src/index.ts', 'GenesisPromo', frames, '--sequence', '--image-format=jpeg', '--jpeg-quality=95',
  `--public-dir=${inputs}`, `--concurrency=${arg('concurrency', '4')}`]);
step(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-threads', '4', '-framerate', '30', '-pattern_type', 'glob', '-i', `${frames}/element-*.jpeg`,
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
rmSync(frames, { recursive: true });
console.log(`Rendered ${out}`);
