import { test, expect } from '@playwright/test';

test('the logo opens a finite introduction with pause, seek, replay and focus restoration', async ({ page }) => {
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
  await expect(progress).toHaveValue('60');
  await expect(film.locator('.film-ending')).toHaveCSS('opacity', '1');
  await expect(film.locator('.film-ending p')).toHaveText('RFIC design, from prompt to schematic and layout.');
  await expect(film.locator('.film-time')).toHaveText('1:00 / 1:00');
  await film.getByRole('button', { name: 'Replay introduction' }).click();
  await expect.poll(async () => Number(await progress.inputValue())).toBeLessThan(2);
  await expect(film.locator('.film-ending')).toHaveCSS('opacity', '0');
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
  await expect(film).toHaveAttribute('data-running', 'false');
  await expect(film.locator('h2')).toHaveText('GENESIS: RFIC fikrinden şematik ve yerleşime');
  await film.getByRole('slider').focus();
  await page.keyboard.press('End');
  await expect(film.locator('.film-ending')).toHaveCSS('opacity', '1');
  await expect(film.locator('canvas')).toHaveAttribute('data-time', '60.00');
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
  expect(score.duration).toBeGreaterThanOrEqual(60); expect(score.duration).toBeLessThan(60.15); expect(score.channels).toBe(2);
  expect(score.peak).toBeGreaterThan(.03); expect(score.peak).toBeLessThan(.95);
  expect(score.rms).toBeGreaterThan(.005);
  await film.getByRole('slider').fill('17');
  await expect.poll(() => page.evaluate(() => window.filmMedia.currentTime)).toBeGreaterThanOrEqual(17);
  expect(await page.evaluate(() => Math.abs(window.filmMedia.currentTime - Number(document.querySelector('.film-transport input').value)))).toBeLessThan(.25);
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
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('button', { name: 'Türkçe', exact: true }).click();
  await page.getByRole('button', { name: 'Açık temaya geç' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('h1')).toContainText('üretime hazır çipe.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('the one-minute film has readable prompt, schematic, pixel synthesis and layout captions in both languages', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const language of ['en', 'tr']) {
    await page.setViewportSize(language === 'tr' ? { width: 390, height: 844 } : { width: 1440, height: 960 });
    await page.goto('/#/');
    await page.evaluate(language => localStorage.setItem('genesis.company.language', language), language);
    await page.reload();
    await page.getByRole('button', { name: language === 'tr' ? 'GENESIS tanıtımını izle' : 'Watch the GENESIS introduction' }).click();
    const film = page.locator('.company-film');
    const captions = language === 'tr'
      ? ['Nasıl bir RFIC istiyorsunuz?', 'Tarifiniz devreye dönüşüyor.', 'Sinyale biçim verin.', 'Devre fiziksel biçimini alıyor.', 'Tasarımı bir bütün olarak geliştirin.']
      : ['Start with your RFIC idea.', 'Your words become a circuit.', 'Shape the signal.', 'A circuit takes physical shape.', 'Refine the design together.'];
    const times = [6, 17, 29, 43, 51], cues = ['prompt', 'schematic', 'passives', 'layout', 'verify'];
    for (let i = 0; i < times.length; i++) {
      await film.getByRole('slider').fill(String(times[i]));
      await expect(film).toHaveAttribute('data-cue', cues[i]);
      await expect(film.getByRole('heading', { name: captions[i], exact: true })).toBeVisible();
      await expect(film.locator('canvas')).toHaveAttribute('data-time', `${times[i]}.00`);
      expect(await film.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
    }
    await page.keyboard.press('Escape');
  }
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
