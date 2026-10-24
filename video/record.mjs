// Records the promo footage from the running GENESIS workbench, one clip per scene:
//   node record.mjs --base http://127.0.0.1:4311 --out <footage folder> [--scenes S1_prompt,S3_schematic] [--app-commit <sha>]
// Each scene first sets the app up off camera, then films only its own action. Frames come from Chrome's screencast
// as high-quality JPEGs at 2x device scale (2560x1440, so a zoom in the film stays sharp), and FFmpeg turns them into a 30 fps H.264 clip. A frame
// arrives only when the page repaints, so each frame is held until the next one; the last is held to the scene end.
// The clips and clips/manifest.json land in <out>; render.mjs --inputs <out> uses them. Recordings stay outside git.
import { chromium } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { recordedScenes } from './record/scenes.mjs';

const argv = process.argv.slice(2), arg = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i < 0 ? fallback : argv[i + 1]; };
const base = arg('base', 'http://127.0.0.1:4311').replace(/\/$/, '');
const out = resolve(arg('out', `/DATA/isguven/GENESIS_V1/results/video/footage/${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`));
const wanted = arg('scenes')?.split(',');
const ffmpeg = process.env.FFMPEG ?? '/home/isguven/miniconda/envs/pyg-env-cpu.HOLD/lib/python3.10/site-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2';
const chrome = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? '/home/isguven/.cache/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-linux64/chrome-headless-shell';
const VIEWPORT = { width: 1280, height: 720 }, SCALE = 2, FPS = 30;
const screencast = view => ({ format: 'jpeg', quality: 92, maxWidth: view.width * SCALE, maxHeight: view.height * SCALE, everyNthFrame: 1 });
const unknown = wanted?.filter(id => !recordedScenes.some(s => s.id === id)) ?? [];
if (unknown.length) throw new Error(`Unknown scenes: ${unknown.join(', ')}`);

mkdirSync(`${out}/clips`, { recursive: true });
const manifestPath = `${out}/clips/manifest.json`;
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : { clips: [] };
const brand = '/DATA/isguven/GENESIS_V1/results/video/motion_inputs/20261024/brand/InterVariable.woff2';
mkdirSync(`${out}/brand`, { recursive: true });
if (!existsSync(`${out}/brand/InterVariable.woff2`)) copyFileSync(brand, `${out}/brand/InterVariable.woff2`);

/** Films the page between start() and stop(); stop() returns the encoded clip's duration and its marks. pause()/resume() leave a
 * wait (a model reply, a stage generating) out of the clip: the clip cuts from the last frame before the pause to the
 * first frame after it. */
function camera(page, frames, view) {
  let cdp, shots = [], t0 = 0, paused = false, pausedAt = 0, skipped = 0, marks = {};
  const now = () => Date.now() / 1000 - skipped;
  // A static page sends no frames; nudge a repaint so each filmed stretch starts with a frame.
  const repaint = () => page.evaluate(() => document.body.style.setProperty('outline', `0 solid rgba(0,0,0,${Math.random() / 1000})`));
  return {
    async start() {
      rmSync(frames, { recursive: true, force: true }); mkdirSync(frames, { recursive: true });
      cdp = await page.context().newCDPSession(page);
      cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
        if (!paused) {
          const file = `${frames}/${String(shots.length).padStart(5, '0')}.jpg`;
          writeFileSync(file, Buffer.from(data, 'base64'));
          shots.push({ file, t: metadata.timestamp - skipped });
        }
        cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
      });
      await cdp.send('Page.startScreencast', screencast(view));
      t0 = now();
      await repaint();
    },
    /** Names the clip time where a shot starts (storyboard `from`). */
    mark(name) { marks[name] = Number((now() - t0).toFixed(3)); },
    pause() { paused = true; pausedAt = Date.now() / 1000; },
    // A restarted screencast always sends the current frame, so the clip resumes on what happened during the pause.
    async resume() { await cdp.send('Page.stopScreencast'); skipped += Date.now() / 1000 - pausedAt; paused = false; await cdp.send('Page.startScreencast', screencast(view)); },
    async stop(file) {
      const t1 = now();
      await cdp.send('Page.stopScreencast'); await cdp.detach();
      if (!shots.length) throw new Error('The screencast sent no frames');
      shots[0].t = Math.min(shots[0].t, t0);
      const list = shots.map((s, i) => `file '${s.file}'\nduration ${Math.max(.001, (shots[i + 1]?.t ?? t1) - s.t).toFixed(4)}`).join('\n') + `\nfile '${shots.at(-1).file}'\n`;
      writeFileSync(`${frames}/list.txt`, list);
      const run = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', `${frames}/list.txt`,
        '-vf', `fps=${FPS},scale=${view.width * SCALE}:${view.height * SCALE}:flags=lanczos,format=yuv420p`,
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-movflags', '+faststart', file], { stdio: 'inherit' });
      if (run.status !== 0) throw new Error(`FFmpeg failed for ${file}`);
      rmSync(frames, { recursive: true });
      const result = { duration: t1 - Math.min(t0, shots[0].t), marks };
      shots = []; marks = {};
      return result;
    },
  };
}

const browser = await chromium.launch({ executablePath: chrome });
try {
  for (const scene of recordedScenes.filter(s => !wanted || wanted.includes(s.id))) {
    // A scene can ask for a taller window when its view does not fit the default one.
    const view = scene.viewport ?? VIEWPORT;
    const context = await browser.newContext({ viewport: view, deviceScaleFactor: SCALE, colorScheme: 'dark', reducedMotion: 'no-preference' });
    const page = await context.newPage();
    const rec = camera(page, `${out}/clips/${scene.id}_frames`, view);
    const file = `clips/${scene.id}.mp4`;
    console.log(`[${scene.id}] setting up`);
    await scene.setup(page, base);
    console.log(`[${scene.id}] recording`);
    await rec.start();
    await scene.film(page, base, rec);
    const { duration, marks } = await rec.stop(`${out}/${file}`);
    const clip = {
      scene_id: scene.id, file, fps: FPS, width: view.width * SCALE, height: view.height * SCALE,
      duration_s: Number(duration.toFixed(3)), in_s: 0, marks, ui_state: scene.shows, app_commit: arg('app-commit', 'unknown'),
      app_url: base, recorded_at: new Date().toISOString(), sha256: createHash('sha256').update(readFileSync(`${out}/${file}`)).digest('hex'),
    };
    manifest.clips = [...manifest.clips.filter(c => c.scene_id !== scene.id), clip];
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`[${scene.id}] ${duration.toFixed(2)} s -> ${out}/${file}`);
    await context.close();
  }
} finally { await browser.close(); }
