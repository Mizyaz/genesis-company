import { test, expect } from '@playwright/test';

test('2D is a separate theme-adaptive film with resizing, shared seeking and the original MP4 download', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 844, height: 390 });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#/');
  await page.getByRole('button', { name: 'Watch the GENESIS introduction', exact: true }).click();
  const film = page.locator('.company-film'), surface = film.locator('canvas'), progress = film.getByRole('slider');
  await expect(film).toHaveAttribute('data-scene', 'ready');
  await progress.fill('12');
  await film.getByRole('button', { name: '2D', exact: true }).click();
  await expect(surface).toHaveAttribute('data-renderer', 'canvas2d');
  await expect(surface).toHaveAttribute('data-time', '12.00');
  await expect(film.locator('.film-scene-labels')).toBeEmpty();
  const geometry = () => surface.evaluate(c => [c.dataset.fingers, c.dataset.coilSize, c.dataset.pixelWidth]);
  const initial = await geometry();
  await progress.fill('15');
  await expect(surface).toHaveAttribute('data-time', '15.00');
  const changed = await geometry();
  expect(changed.every((value, i) => value !== initial[i])).toBe(true);
  await expect(film.locator('.film-caption h3')).toHaveAttribute('aria-label', 'The search adjusts transistor sizes and passive geometry together.');
  const corner = () => surface.evaluate(c => Array.from(c.getContext('2d').getImageData(0, 0, 1, 1).data).slice(0, 3));
  await page.evaluate(() => document.documentElement.dataset.theme = 'light');
  await expect.poll(async () => Math.min(...await corner())).toBeGreaterThan(220);
  await page.evaluate(() => document.documentElement.dataset.theme = 'dark');
  await expect.poll(async () => Math.max(...await corner())).toBeLessThan(60);
  const download = film.getByRole('link', { name: 'Download 3D film' });
  await expect(download).toHaveAttribute('download', 'GENESIS-3D-30s.mp4');
  expect((await page.request.head(await download.getAttribute('href'))).ok()).toBe(true);
  // Both controls remain usable on a phone in landscape.
  for (const control of [download, film.getByRole('button', { name: '2D', exact: true })]) {
    const bounds = await control.boundingBox();
    expect(bounds.y).toBeGreaterThanOrEqual(0); expect(bounds.y + bounds.height).toBeLessThanOrEqual(390);
  }
  await film.getByRole('button', { name: '3D', exact: true }).click();
  await expect(surface).toHaveAttribute('data-renderer', 'webgl');
  await expect(surface).toHaveAttribute('data-time', '15.00');
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
});

test('the 2D alternative plays without WebGL and remains synchronized when paused', async ({ page }) => {
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) { return kind.startsWith('webgl') ? null : get.call(this, kind, ...args); };
  });
  await page.goto('/#/');
  await page.getByRole('button', { name: 'Watch the GENESIS introduction', exact: true }).click();
  const film = page.locator('.company-film'), progress = film.getByRole('slider');
  await expect(film).toHaveAttribute('data-scene', 'unavailable');
  await film.getByRole('button', { name: '2D', exact: true }).click();
  await expect(film).toHaveAttribute('data-running', 'true');
  await expect.poll(async () => Number(await progress.inputValue())).toBeGreaterThan(.2);
  await film.getByRole('button', { name: 'Pause introduction' }).click();
  await progress.fill('23');
  await expect(film.locator('canvas')).toHaveAttribute('data-time', '23.00');
  await page.waitForTimeout(150);
  await expect(progress).toHaveValue('23');
  await page.keyboard.press('Escape');
});

test('the logo opens a finite introduction with pause, seek, replay and focus restoration', async ({ page }) => {
  test.setTimeout(30_000); // Two cold WebGL opens, including shader compilation on software CI.
  await page.addInitScript(() => {
    const NativeAudio = window.Audio;
    window.filmMedia = [];
    window.Audio = function (...args) {
      const media = new NativeAudio(...args); window.filmMedia.push(media); return media;
    };
  });
  await page.goto('/#/');
  const launcher = page.getByRole('button', { name: 'Watch the GENESIS introduction' });
  await launcher.click();
  const film = page.locator('.company-film');
  const progress = film.getByRole('slider');
  await expect(film).toBeVisible();
  await expect(film).toHaveAttribute('data-audio', 'ready');
  await expect(film).toHaveAttribute('data-running', 'true');
  await expect.poll(async () => Number(await progress.inputValue())).toBeGreaterThan(.2);
  await film.getByRole('button', { name: 'Pause introduction' }).click();
  const stopped = await progress.inputValue();
  await expect(film).toHaveAttribute('data-running', 'false');
  await page.waitForTimeout(250);
  await expect(progress).toHaveValue(stopped);
  await film.getByRole('button', { name: 'Mute music' }).click();
  await expect(film).toHaveAttribute('data-muted', 'true');
  await film.getByRole('button', { name: 'Unmute music' }).click();
  await expect(film).toHaveAttribute('data-muted', 'false');
  await progress.focus();
  await page.keyboard.press('End');
  await expect(progress).toHaveValue('30');
  await expect(film.locator('.film-ending')).toHaveCSS('opacity', '1');
  await expect(film.locator('.film-ending strong')).toHaveText('GENESIS');
  await expect(film.locator('.film-signature')).toHaveText('Generative Evolution of Silicon Intelligent Systems');
  await expect(film.locator('.film-time')).toHaveText('0:30 / 0:30');
  await film.getByRole('button', { name: 'Replay introduction' }).click();
  await expect.poll(async () => Number(await progress.inputValue())).toBeLessThan(2);
  await expect(film.locator('.film-ending')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(film).toHaveCount(0);
  await expect(launcher).toBeFocused();
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(await page.evaluate(() => window.filmMedia.every(media => media.paused && !media.getAttribute('src')))).toBe(true);
  await launcher.click();
  await expect(page.locator('.company-film')).toHaveAttribute('data-audio', 'ready');
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => window.filmMedia.length)).toBe(2);
  expect(await page.evaluate(() => window.filmMedia.every(media => media.paused && !media.getAttribute('src')))).toBe(true);
});

test('the film expands from its launcher before its clock starts, and an early close cleans up', async ({ page }) => {
  await page.goto('/#/');
  const launcher = page.getByRole('button', { name: 'Watch the GENESIS introduction', exact: true });
  await expect(launcher).toBeVisible();
  await page.locator('.silicon-gate').waitFor({ state: 'detached' });
  // Click and inspect in the same task, before the entrance animation can finish.
  const start = await launcher.evaluate(button => {
    button.click();
    return new Promise(resolve => requestAnimationFrame(() => {
      const film = document.querySelector('.company-film');
      const animation = film.getAnimations().find(animation => animation.id === 'film-expand');
      resolve({ entering: film.dataset.entering, running: film.dataset.running,
        time: film.querySelector('input').value, frames: animation.effect.getKeyframes().map(frame => frame.clipPath) });
    }));
  });
  expect(start.entering).toBe('true'); expect(start.running).toBe('false'); expect(start.time).toBe('0');
  expect(start.frames[0]).not.toBe(start.frames[1]);
  await page.keyboard.press('Escape');
  await expect(page.locator('.company-film')).toHaveCount(0);
  await expect(launcher).toBeFocused();
  await launcher.click();
  const film = page.locator('.company-film');
  await expect(film).toHaveAttribute('data-entering', 'false');
  await expect(film).toHaveAttribute('data-running', 'true');
  await expect(film.locator('.film-opening')).toHaveCount(0);
  await page.keyboard.press('Escape');
});

test('LLM click and thinking seek deterministically, and the paused WebGL scene adapts to the shared theme', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/');
  await page.getByRole('button', { name: 'Watch the GENESIS introduction', exact: true }).click();
  const film = page.locator('.company-film'), surface = film.locator('canvas');
  await expect(film).toHaveAttribute('data-scene', 'ready');
  await expect(film).toHaveAttribute('data-entering', 'false');
  await expect(film.locator('.film-opening')).toHaveCount(0);
  for (const [time, phase] of [[1, 'request'], [2.2, 'pressed'], [2.5, 'thinking'], [1, 'request']]) {
    await film.getByRole('slider').fill(String(time));
    await expect(film.locator('.film-request')).toHaveAttribute('data-phase', phase);
    await expect(surface).toHaveAttribute('data-time', time.toFixed(2));
  }
  await film.getByRole('slider').fill('21');
  await expect(film.locator('.film-request')).toHaveCount(0);
  const background = () => surface.evaluate(canvas => {
    const gl = canvas.getContext('webgl2');
    return Array.from(gl.getParameter(gl.COLOR_CLEAR_VALUE)).slice(0, 3);
  });
  await page.evaluate(() => document.documentElement.dataset.theme = 'light');
  await expect.poll(async () => Math.min(...await background())).toBeGreaterThan(.8);
  await expect(film.locator('.film-caption h3')).toHaveCSS('color', 'rgb(241, 248, 255)');
  await page.evaluate(() => document.documentElement.dataset.theme = 'dark');
  await expect.poll(async () => Math.max(...await background())).toBeLessThan(.25);
  await expect(film.locator('.film-caption h3')).toHaveCSS('color', 'rgb(241, 248, 255)');
  await expect(surface).toHaveAttribute('data-time', '21.00');
  await expect(surface).toHaveAttribute('data-renderer', 'webgl');
  await page.keyboard.press('Escape');
});

test('stopping motion during the film entrance does not leave a shutter or clipping behind', async ({ page }) => {
  await page.goto('/#/');
  const launcher = page.getByRole('button', { name: 'Watch the GENESIS introduction', exact: true });
  await launcher.click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const film = page.locator('.company-film');
  await expect(film).toHaveAttribute('data-entering', 'false');
  await expect(film).toHaveAttribute('data-running', 'false');
  await expect(film).toHaveCSS('clip-path', 'none');
  await expect(film.locator('.film-opening')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(launcher).toBeFocused();
});

test('Turkish mobile intro respects reduced motion and stays inside the screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    localStorage.setItem('genesis.company.language', 'tr');
    localStorage.setItem('genesis.company.theme', 'light');
  });
  await page.goto('/#/');
  await page.getByRole('button', { name: 'GENESIS tanıtımını izle' }).click();
  const film = page.locator('.company-film');
  await expect(film).toHaveAttribute('data-scene', 'ready');
  await expect(film).toHaveAttribute('data-running', 'false');
  await expect(film.locator('h2')).toHaveText('GENESIS: RFIC fikrinden şematik ve yerleşime');
  await film.getByRole('slider').focus();
  await page.keyboard.press('End');
  await expect(film.locator('.film-ending')).toHaveCSS('opacity', '1');
  await expect(film.locator('canvas')).toHaveAttribute('data-time', '30.00');
  expect(await film.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  expect(await film.evaluate(node => node.getBoundingClientRect().right <= innerWidth)).toBe(true);
  // The native dialog keeps keyboard focus away from the page behind it.
  await film.getByRole('button', { name: 'Keşfetmeye devam et' }).focus();
  await page.keyboard.press('Tab');
  await expect(film.getByRole('button', { name: 'Tanıtımı kapat' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'GENESIS tanıtımını izle' })).toBeFocused();
});

test('the circuit film works without audio support and freezes with the global motion preference', async ({ page }) => {
  await page.addInitScript(() => { window.Audio = undefined; });
  await page.goto('/#/');
  await page.getByRole('button', { name: 'Watch the GENESIS introduction' }).click();
  const film = page.locator('.company-film');
  await expect(film).toHaveAttribute('data-audio', 'unavailable');
  await expect(film).toHaveAttribute('data-running', 'true');
  await expect(film.getByRole('button', { name: 'Sound unavailable' })).toBeDisabled();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(film).toHaveAttribute('data-running', 'false');
  const time = await film.locator('canvas').getAttribute('data-time');
  await page.waitForTimeout(200);
  expect(await film.locator('canvas').getAttribute('data-time')).toBe(time);
  await page.keyboard.press('Escape');
});

test('the score contains stereo music, stays synchronized after seeking and stops in a hidden tab', async ({ page }) => {
  await page.addInitScript(() => {
    const NativeAudio = window.Audio;
    window.Audio = function (...args) {
      const media = new NativeAudio(...args); window.filmMedia = media; return media;
    };
  });
  await page.goto('/#/');
  await page.getByRole('button', { name: 'Watch the GENESIS introduction' }).click();
  const film = page.locator('.company-film');
  await expect(film).toHaveAttribute('data-audio', 'ready');
  await expect(film).toHaveAttribute('data-running', 'true');
  const response = await page.request.get('/assets/genesis-intro-score.mp3');
  expect(response.ok()).toBe(true);
  const score = await page.evaluate(async base64 => {
    const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
    const context = new OfflineAudioContext(2, 1, 44100);
    const buffer = await context.decodeAudioData(bytes.buffer);
    let peak = 0, sum = 0; const samples = buffer.getChannelData(0);
    for (const sample of samples) { peak = Math.max(peak, Math.abs(sample)); sum += sample * sample; }
    return { duration: buffer.duration, channels: buffer.numberOfChannels, peak, rms: Math.sqrt(sum / samples.length) };
  }, (await response.body()).toString('base64'));
  expect(score.duration).toBeGreaterThanOrEqual(30); expect(score.duration).toBeLessThan(30.15); expect(score.channels).toBe(2);
  expect(score.peak).toBeGreaterThan(.03); expect(score.peak).toBeLessThan(.95);
  expect(score.rms).toBeGreaterThan(.005);
  await film.getByRole('slider').fill('17');
  // First use of all materials can compile shaders on software WebGL CI.
  await expect.poll(() => page.evaluate(() => window.filmMedia.currentTime), { timeout: 10_000 }).toBeGreaterThanOrEqual(17);
  await expect.poll(() => page.evaluate(() => Math.abs(window.filmMedia.currentTime - Number(document.querySelector('.film-transport input').value))), { timeout: 10_000 }).toBeLessThan(.25);
  expect(await page.evaluate(() => window.filmMedia.paused)).toBe(false);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(film).toHaveAttribute('data-running', 'false');
  expect(await page.evaluate(() => window.filmMedia.paused)).toBe(true);
  await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
  await expect(film).toHaveAttribute('data-running', 'true');
  await expect.poll(() => page.evaluate(() => window.filmMedia.paused)).toBe(false);
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => window.filmMedia.paused && !window.filmMedia.getAttribute('src'))).toBe(true);
});

test('RF positioning shares the film, supports both themes and fits narrow screens', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/#/explore');
  await expect(page.locator('h1')).toHaveText('From schematicto tape-out.');
  const section = page.locator('.rf-physics');
  await expect(section.locator('h2')).toHaveText('Every physical change has an electrical consequence.');
  await section.getByRole('button', { name: /Watch the introduction/ }).click();
  await expect(page.locator('.company-film')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(section.getByRole('button', { name: /Watch the introduction/ })).toBeFocused();
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('button', { name: 'Türkçe', exact: true }).click();
  await page.getByRole('button', { name: 'Açık temaya geç' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('h1')).toContainText('üretime hazır çipe.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('the thirty-second front-end film has readable assembly and joint-design captions in both languages', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const language of ['en', 'tr']) {
    await page.setViewportSize(language === 'tr' ? { width: 390, height: 844 } : { width: 1440, height: 960 });
    await page.goto('/#/');
    await page.evaluate(language => localStorage.setItem('genesis.company.language', language), language);
    await page.reload();
    await page.getByRole('button', { name: language === 'tr' ? 'GENESIS tanıtımını izle' : 'Watch the GENESIS introduction' }).click();
    const film = page.locator('.company-film');
    await expect(film).toHaveAttribute('data-scene', 'ready');
    const frame = await film.locator('.film-viewport').boundingBox();
    expect(frame.width / frame.height).toBeCloseTo(16 / 9, 2);
    await expect(film.locator('.film-ending')).toHaveCount(0);
    await expect(film.locator('.film-request')).toBeVisible();
    const captions = language === 'tr'
      ? ['Bir fikir devreye dönüşür.', 'Aktif ve pasif elemanlar, tek tasarım.', 'Devreler birleşir, RF ön uç ortaya çıkar.', 'Fikirden fiziksel tasarıma.']
      : ['An idea becomes a circuit.', 'Active. Passive. Designed together.', 'One connected RF front end.', 'From intent to implementation.'];
    const times = [5, 11, 19, 24], cues = ['schematic', 'joint', 'layout', 'verify'];
    for (let i = 0; i < times.length; i++) {
      await film.getByRole('slider').fill(String(times[i]));
      await expect(film).toHaveAttribute('data-cue', cues[i]);
      await expect(film.getByRole('heading', { name: captions[i], exact: true })).toBeVisible();
      await expect(film.locator('canvas')).toHaveAttribute('data-time', `${times[i]}.00`);
      expect(await film.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
      await expect(film.locator('.film-ending')).toHaveCount(0);
    }
    await film.getByRole('slider').fill('29');
    await expect(film.locator('.film-ending strong')).toHaveText('GENESIS');
    await expect(film.locator('.film-signature')).toHaveText('Generative Evolution of Silicon Intelligent Systems');
    await page.keyboard.press('Escape');
  }
});

test('a missing WebGL context stops playback honestly and leaves the close control usable', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type.startsWith('webgl') ? null : original.call(this, type, ...args);
    };
  });
  await page.goto('/#/');
  const launcher = page.getByRole('button', { name: 'Watch the GENESIS introduction', exact: true });
  await launcher.click();
  const film = page.locator('.company-film');
  await expect(film).toHaveAttribute('data-scene', 'unavailable');
  await expect(film).toHaveAttribute('data-running', 'false');
  await expect(film.getByRole('status')).toContainText('WebGL-enabled browser');
  await expect(film.getByRole('button', { name: 'Play introduction' })).toBeDisabled();
  await film.getByRole('button', { name: 'Close introduction' }).click();
  await expect(launcher).toBeFocused();
});

const screens = [
  { name: 'welcome card', route: '#/', trigger: '.story-scene-figure button', panel: '.story-scene-figure .tube-card' },
  { name: 'design-loop card', route: '#/explore', trigger: '.design-story .story-press', panel: '.design-story .tube-card' },
  { name: 'workflow stage', route: '#/explore', trigger: '.workflow-open', panel: '.workflow-detail .stage-screen' },
];

async function openScreen(page, screen) {
  await page.goto(`/${screen.route}`);
  await page.locator(screen.trigger).first().click();
  const panel = page.locator(screen.panel);
  await expect(panel.locator('.stage-screen-close')).toBeVisible();
  return panel;
}

for (const screen of screens) {
  test(`${screen.name} closes if motion stops during dismissal, and reopens`, async ({ page }) => {
    const panel = await openScreen(page, screen);
    // Click the real controls 50 ms apart, within the 500 ms exit animation.
    await page.evaluate(selector => new Promise(resolve => {
      document.querySelector(`${selector} .stage-screen-close`).click();
      setTimeout(() => { document.querySelector('.motion-toggle').click(); resolve(); }, 50);
    }), screen.panel);
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'paused');
    await expect(panel).toHaveCount(0);
    await page.locator(screen.trigger).first().click();
    await expect(panel).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
  });
}

test('a cancelled CSS exit cannot strand a card, and focus returns to its trigger', async ({ page }) => {
  const screen = screens[0];
  const panel = await openScreen(page, screen);
  // No animationend event will fire, even though the user preference is still "playing".
  await page.addStyleTag({ content: '.tube-card[data-off="true"] { animation: none !important; }' });
  await panel.locator('.stage-screen-close').click();
  await expect(panel).toHaveCount(0);
  await expect(page.locator(screen.trigger).first()).toBeFocused();
});

test('changing the OS motion preference during a close also dismisses the card', async ({ page }) => {
  const panel = await openScreen(page, screens[0]);
  await panel.locator('.stage-screen-close').click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(panel).toHaveCount(0);
});

test('Escape uses the current motion preference in an already open workflow', async ({ page }) => {
  const panel = await openScreen(page, screens[2]);
  await page.locator('.motion-toggle').click();
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
});

for (const route of ['#/explore', '#/publications']) {
  test(`skip link focuses ${route} without navigating away`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/${route}`);
    const heading = await page.locator('h1').textContent();
    await page.keyboard.press('Tab');
    await expect(page.locator('.skip-link')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`${route}$`));
    await expect(page.locator('main')).toBeFocused();
    await expect(page.locator('h1')).toHaveText(heading);
  });
}

test('old About, Story and Team links resolve to their current pages on direct load', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [old, current] of [['about', '#/about'], ['story', '#/about/story'], ['team', '#/about']]) {
    await page.goto(`/#/explore/${old}`);
    await expect(page).toHaveURL(new RegExp(`${current}$`));
    await expect(page.locator('h1')).toHaveText('Who are we?');
    if (old === 'story') await expect(page.locator('#story')).toBeInViewport();
  }
});

test('legacy navigation replaces its history entry rather than adding a redirect loop', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/explore');
  await page.evaluate(() => { location.hash = '#/explore/about'; });
  await expect(page).toHaveURL(/#\/about$/);
  await expect(page.locator('h1')).toHaveText('Who are we?');
  await page.goBack();
  await expect(page).toHaveURL(/#\/explore$/);
  await expect(page.locator('main')).toHaveClass('explore-page');
  await page.goForward();
  await expect(page).toHaveURL(/#\/about$/);
});
