// Records the promo footage from the running GENESIS workbench, one clip per scene:
//   node record.mjs --base http://127.0.0.1:4311 --out <footage folder> [--scenes S1_prompt,S3_schematic] [--app-commit <sha>]
// Each scene first sets the app up off camera, then films only its own action. Frames come from Chrome's screencast
// as high-quality JPEGs at 2x device scale (2560x1440, so a zoom in the film stays sharp), and FFmpeg turns them into a 30 fps H.264 clip. A frame
// arrives only when the page repaints, so each frame is held until the next one; the last is held to the scene end.
// The clips and clips/manifest.json land in <out>; render.mjs --inputs <out> uses them. Recordings stay outside git.
// Each clip also gets clips/<scene>.evidence.json: the served build's hashes before and after the take (a rebuild during
// the take fails it), every write request the page made, each assistant reply, page errors and the recorder's own hash.
// Writes outside WRITES are refused, so a take can never start a native job. An existing clip is kept unless --replace.
import { chromium } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { recordedScenes } from './record/scenes.mjs';

const argv = process.argv.slice(2), arg = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i < 0 ? fallback : argv[i + 1]; };
const base = arg('base', 'http://127.0.0.1:4311').replace(/\/$/, '');
const out = resolve(arg('out', `footage/${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`));
const wanted = arg('scenes')?.split(',');
const ffmpeg = process.env.FFMPEG ?? 'ffmpeg';
const chrome = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const VIEWPORT = { width: 1280, height: 720 }, SCALE = 2, FPS = 30;
const screencast = view => ({ format: 'jpeg', quality: 92, maxWidth: view.width * SCALE, maxHeight: view.height * SCALE, everyNthFrame: 1 });
// The only writes a take may make: the assistant, the block planner and the live analysis check.
const WRITES = ['/api/assistant', '/api/blocks/plan', '/api/analysis/check'];
const sha256 = data => createHash('sha256').update(data).digest('hex');
const recorder = sha256(readFileSync(new URL(import.meta.url)) + readFileSync(new URL('./record/scenes.mjs', import.meta.url)));
/** Hashes the served page and its scripts, so a take can prove the build did not change under it. */
async function servedBuild(page) {
  const html = await (await page.request.get(`${base}/`)).body();
  const scripts = [...html.toString().matchAll(/<script[^>]+src="([^"]+)"/g)].map(m => new URL(m[1], `${base}/`).href);
  const hashes = {};
  for (const url of scripts) hashes[url] = sha256(await (await page.request.get(url)).body());
  return { html: sha256(html), scripts: hashes };
}
const unknown = wanted?.filter(id => !recordedScenes.some(s => s.id === id)) ?? [];
if (unknown.length) throw new Error(`Unknown scenes: ${unknown.join(', ')}`);

mkdirSync(`${out}/clips`, { recursive: true });
const manifestPath = `${out}/clips/manifest.json`;
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : { clips: [] };
const brand = resolve(arg('brand', new URL('../src/assets/fonts/InterVariable-latin.woff2', import.meta.url).pathname));
mkdirSync(`${out}/brand`, { recursive: true });
if (!existsSync(`${out}/brand/InterVariable.woff2`)) copyFileSync(brand, `${out}/brand/InterVariable.woff2`);

/** Films the page between start() and stop(); stop() returns the encoded clip's duration and its marks. pause()/resume() leave a
 * wait (a model reply, a stage generating) out of the clip: the clip cuts from the last frame before the pause to the
 * first frame after it. */
/** A `stepped` camera films no screencast: the scene takes each frame itself with frame(seconds), a screenshot held that long
 * on the clip, for views that draw too slowly for a screencast (software WebGL on a large chip). */
function camera(page, frames, view, stepped = false) {
  let cdp, shots = [], t0 = 0, paused = false, pausedAt = 0, skipped = 0, marks = {}, clock = 0;
  const now = () => stepped ? clock : Date.now() / 1000 - skipped;
  // A static page sends no frames; nudge a repaint so each filmed stretch starts with a frame.
  const repaint = () => page.evaluate(() => document.body.style.setProperty('outline', `0 solid rgba(0,0,0,${Math.random() / 1000})`));
  return {
    async start() {
      rmSync(frames, { recursive: true, force: true }); mkdirSync(frames, { recursive: true });
      if (stepped) { clock = 0; t0 = 0; return; }
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
    async frame(seconds = 1 / FPS) {
      const file = `${frames}/${String(shots.length).padStart(5, '0')}.jpg`;
      await page.screenshot({ path: file, type: 'jpeg', quality: 92, timeout: 120000 });
      shots.push({ file, t: clock }); clock += seconds;
    },
    mark(name) { marks[name] = Number((now() - t0).toFixed(3)); },
    pause() { paused = true; pausedAt = Date.now() / 1000; },
    // A restarted screencast and a nudged repaint send the current frame, so the clip resumes on what happened during the pause.
    async resume() { await cdp.send('Page.stopScreencast'); skipped += Date.now() / 1000 - pausedAt; paused = false; await cdp.send('Page.startScreencast', screencast(view)); await repaint(); },
    async stop(file) {
      const t1 = now();
      if (!stepped) { await cdp.send('Page.stopScreencast'); await cdp.detach(); }
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

// Software WebGL, so a scene can film a 3D view on a host without a GPU.
const browser = await chromium.launch({ executablePath: chrome, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  for (const scene of recordedScenes.filter(s => !wanted || wanted.includes(s.id))) {
    // A scene can ask for a taller window when its view does not fit the default one.
    const view = scene.viewport ?? VIEWPORT;
    const context = await browser.newContext({ viewport: view, deviceScaleFactor: SCALE, colorScheme: 'dark', reducedMotion: 'no-preference' });
    const page = await context.newPage();
    const rec = camera(page, `${out}/clips/${scene.id}_frames`, view, scene.stepped);
    const file = `clips/${scene.id}.mp4`;
    if (existsSync(`${out}/${file}`) && !argv.includes('--replace')) throw new Error(`${out}/${file} exists; keep the take or pass --replace`);
    const evidence = { scene_id: scene.id, recorder_sha256: recorder, writes: [], replies: [], errors: [] };
    page.on('pageerror', error => evidence.errors.push(String(error)));
    await context.route('**/api/**', route => {
      const request = route.request(), path = new URL(request.url()).pathname;
      if (['GET', 'HEAD'].includes(request.method())) return route.continue();
      evidence.writes.push({ method: request.method(), path });
      if (WRITES.includes(path)) return route.continue();
      evidence.errors.push(`Refused write ${request.method()} ${path}`);
      return route.abort();
    });
    page.on('response', async response => {
      if (new URL(response.url()).pathname !== '/api/assistant' || response.request().method() !== 'POST') return;
      const reply = await response.json().catch(() => null);
      evidence.replies.push({ status: response.status(), model: reply?.model ?? null, message: reply?.message ?? reply?.error ?? null, edits: reply?.edits?.length ?? 0, choices: reply?.choiceCards?.map(c => c.title ?? c.label ?? null) ?? [], elapsed_ms: reply?.elapsedMs ?? null });
    });
    evidence.build_before = await servedBuild(page);
    console.log(`[${scene.id}] setting up`);
    await scene.setup(page, base);
    console.log(`[${scene.id}] recording`);
    await rec.start();
    try { await scene.film(page, base, rec, evidence); } catch (error) {
      // A failed take keeps its evidence and a screenshot of where it stopped; its clip is not written.
      evidence.failure = String(error);
      evidence.page_text = (await page.evaluate(() => document.body.innerText).catch(() => '')).slice(-3000);
      await page.screenshot({ path: `${out}/clips/${scene.id}.failure.png` }).catch(() => {});
      writeFileSync(`${out}/clips/${scene.id}.evidence.json`, JSON.stringify(evidence, null, 2) + '\n');
      throw error;
    }
    const { duration, marks } = await rec.stop(`${out}/${file}`);
    evidence.build_after = await servedBuild(page);
    if (JSON.stringify(evidence.build_after) !== JSON.stringify(evidence.build_before)) evidence.errors.push('The served build changed during the take');
    writeFileSync(`${out}/clips/${scene.id}.evidence.json`, JSON.stringify(evidence, null, 2) + '\n');
    if (evidence.errors.length) throw new Error(`[${scene.id}] take failed, see clips/${scene.id}.evidence.json: ${evidence.errors.join('; ')}`);
    const clip = {
      scene_id: scene.id, file, fps: FPS, width: view.width * SCALE, height: view.height * SCALE,
      duration_s: Number(duration.toFixed(3)), in_s: 0, marks, ui_state: scene.shows, app_commit: arg('app-commit', 'unknown'),
      app_url: base, recorded_at: new Date().toISOString(), sha256: sha256(readFileSync(`${out}/${file}`)),
      evidence_sha256: sha256(readFileSync(`${out}/clips/${scene.id}.evidence.json`)),
    };
    manifest.clips = [...manifest.clips.filter(c => c.scene_id !== scene.id), clip];
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`[${scene.id}] ${duration.toFixed(2)} s -> ${out}/${file}`);
    await context.close();
  }
} finally { await browser.close(); }
