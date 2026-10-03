/** Frame-exact review export of the real player. No second animation implementation. */
import { spawn, execFileSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { once } from 'node:events';
import { chromium } from '@playwright/test';

const url = process.env.FILM_URL || 'http://127.0.0.1:4318/#/';
const output = resolve(process.env.FILM_OUTPUT || 'test-results/cinematic/genesis-30s.mp4');
const encoder = process.env.FFMPEG || 'ffmpeg';
const fps = 30;
execFileSync(encoder, ['-version'], { stdio: 'ignore' });
// Conservative all-host RSS accounting covers other sessions as well as this exporter.
const memory = () => execFileSync('ps', ['-eo', 'rss='], { encoding: 'utf8' }).trim()
  .split(/\s+/).reduce((sum, value) => sum + Number(value) * 1024, 0);
if (memory() > 24e9) throw new Error('Insufficient aggregate RAM headroom for film export.');
await mkdir(dirname(output), { recursive: true });
const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}),
  args: ['--enable-unsafe-swiftshader'],
});
let movie, completed = false;
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await page.goto(url);
  await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, process.env.FILM_THEME || 'dark');
  await page.getByRole('button', { name: 'Watch the GENESIS introduction', exact: true }).click();
  const film = page.locator('.company-film');
  await page.locator('.company-film[data-scene="ready"][data-entering="false"]').waitFor();
  if (await film.getAttribute('data-running') === 'true') await film.getByRole('button', { name: 'Pause introduction', exact: true }).click();
  await page.addStyleTag({ content: `
    .company-film { width:1280px!important; height:720px!important; max-height:none!important; border:0!important; border-radius:0!important; inset:0!important; margin:0!important; }
    .film-header,.film-controls { visibility:hidden!important; }
  ` });
  const stage = film.locator('.film-viewport'), slider = film.locator('.film-transport input');
  const seconds = Number(await slider.getAttribute('max'));
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error('The player has no valid duration.');
  await slider.evaluate(node => { node.step = 'any'; });
  const seek = async time => {
    // Native input events call the existing React seek handler, including DOM captions.
    await slider.evaluate((node, value) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, String(value));
      node.dispatchEvent(new Event('input', { bubbles: true }));
    }, time);
    await page.waitForFunction(value => document.querySelector('.film-canvas')?.dataset.time === value, time.toFixed(2));
    await film.evaluate((node, time) => {
      for (const animation of node.getAnimations({ subtree: true })) { animation.pause(); animation.currentTime = time * 1000; }
    }, time);
  };
  // Warm all shaders before the first captured frame.
  await seek(23); await seek(0);
  movie = spawn(encoder, ['-hide_banner', '-loglevel', 'error', '-n',
    '-f', 'image2pipe', '-vcodec', 'png', '-framerate', String(fps), '-i', 'pipe:0',
    '-i', resolve('public/assets/genesis-intro-score.mp3'), '-t', String(seconds), '-shortest',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-threads', '2', '-filter_threads', '1', output],
  { stdio: ['pipe', 'ignore', 'pipe'] });
  let encoderError;
  movie.on('error', error => { encoderError = error; });
  movie.stdin.on('error', error => { encoderError = error; });
  movie.stderr.on('data', data => process.stderr.write(data));
  const finished = once(movie, 'close');
  for (let frame = 0; frame < seconds * fps; frame++) {
    if (encoderError) throw encoderError;
    if (movie.exitCode !== null) throw new Error(`Encoder exited early: ${movie.exitCode}`);
    if (frame % 60 === 0) {
      const bytes = memory();
      if (bytes >= 27e9) throw new Error('Aggregate RAM reached 27 GB; preserving the partial export.');
      console.log(`${frame / fps}/${seconds}s rendered; all-host RSS ${(bytes / 1e9).toFixed(1)} GB`);
    }
    await seek(frame / fps);
    const image = await stage.screenshot({ type: 'png' });
    if (!movie.stdin.write(image)) await once(movie.stdin, 'drain');
  }
  movie.stdin.end();
  const [code] = await finished;
  if (code !== 0) throw new Error(`Encoder failed: ${code}`);
  completed = true;
  console.log(`Saved ${seconds}s, ${fps}fps film with stereo score: ${output}`);
} finally {
  if (movie && !completed) movie.stdin.end();
  await browser.close();
}
