import { test, expect } from '@playwright/test';

test('RF positioning links the product film, supports both themes and fits narrow screens', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/#/explore');
  await expect(page.locator('h1')).toHaveText('From schematicto tape-out.');
  const section = page.locator('.rf-physics');
  await expect(section.locator('h2')).toHaveText('Every physical change has an electrical consequence.');
  await section.getByRole('link', { name: 'Watch the product film' }).click();
  await expect(page.locator('#product-film video')).toBeInViewport();
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('button', { name: 'Türkçe', exact: true }).click();
  await page.getByRole('button', { name: 'Açık temaya geç' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('h1')).toContainText('üretime hazır çipe.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
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

test('the logo opens the product film, which loads on demand, plays its audio and seeks', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const requests = [], errors = [];
  page.on('request', request => requests.push(request.url()));
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#/');
  await page.getByRole('button', { name: 'Watch the product film', exact: true }).click();
  const film = page.locator('#product-film'), video = film.locator('video');
  await expect(video).toBeInViewport();
  await expect(video).toHaveAttribute('preload', 'none');
  expect(requests.some(url => url.includes('genesis-product-73s.mp4'))).toBe(false);
  expect(await video.evaluate(v => v.paused && !v.autoplay && !v.loop && v.controls && v.playsInline)).toBe(true);
  await video.focus();
  await expect(video).toBeFocused();
  await video.press('Space');
  await expect.poll(() => video.evaluate(v => v.currentTime)).toBeGreaterThan(.1);
  const media = await video.evaluate(v => ({ duration: v.duration, width: v.videoWidth, height: v.videoHeight, muted: v.muted, volume: v.volume, audioBytes: v.webkitAudioDecodedByteCount }));
  expect(media.duration).toBeCloseTo(73.2, 1); expect(media.width).toBe(1280); expect(media.height).toBe(720);
  expect(media.muted).toBe(false); expect(media.volume).toBeGreaterThan(0);
  if (typeof media.audioBytes === 'number') expect(media.audioBytes).toBeGreaterThan(0);
  await video.evaluate(v => { v.pause(); v.currentTime = 50; v.textTracks[0].mode = 'showing'; });
  await expect.poll(() => video.evaluate(v => v.seeking)).toBe(false);
  await expect.poll(() => video.evaluate(v => v.textTracks[0].activeCues?.[0]?.text)).toContain('GENESIS checks it with Calibre DRC and LVS');
  await video.evaluate(v => { v.textTracks[0].mode = 'disabled'; v.textTracks[1].mode = 'showing'; });
  await expect.poll(() => video.evaluate(v => v.textTracks[1].activeCues?.[0]?.text)).toContain('Calibre DRC ve LVS ile kontrol eder');
  await video.evaluate(v => { v.muted = true; v.currentTime = 72.8; return v.play(); });
  await expect.poll(() => video.evaluate(v => v.ended)).toBe(true);
  await video.evaluate(v => { v.currentTime = 2; return v.play(); });
  await expect.poll(() => video.evaluate(v => v.currentTime)).toBeGreaterThan(2.1);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => video.evaluate(v => v.paused)).toBe(true);
  const download = film.getByRole('link', { name: 'Download the product film', exact: false }).last();
  expect((await page.request.head(await download.getAttribute('href'))).ok()).toBe(true);
  expect(errors).toEqual([]);
});

test('the product film fits mobile, uses Turkish copy and pauses under another dialog', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => { localStorage.setItem('genesis.company.language', 'tr'); localStorage.setItem('genesis.company.theme', 'light'); });
  await page.goto('/#/explore/product-film');
  const film = page.locator('#product-film'), video = film.locator('video');
  await expect(film.getByRole('heading', { name: 'İhtiyacınıza göre RFIC tasarımı.' })).toBeVisible();
  await expect(video).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const bounds = await video.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  expect(bounds.width / bounds.height).toBeCloseTo(16 / 9, 1);
  await video.evaluate(v => { v.muted = true; return v.play(); });
  await expect.poll(() => video.evaluate(v => v.currentTime)).toBeGreaterThan(.1);
  await page.evaluate(() => { const dialog = document.createElement('dialog'); dialog.id = 'qa-dialog'; document.body.append(dialog); dialog.showModal(); });
  await expect.poll(() => video.evaluate(v => v.paused)).toBe(true);
  await page.evaluate(() => document.getElementById('qa-dialog').remove());
  await film.getByText('Film metnini oku', { exact: true }).click();
  await expect(film.getByText('GENESIS onu bloklara ve bir test düzeneğine dönüştürür: blok grupları ve renkleri, ardından yeniden üretilen bloklar ve test düzeneği.', { exact: true })).toBeVisible();
  await expect(page.locator('#how-it-works-film').getByRole('heading', { name: 'Tek cümleden kontrol edilmiş çipe.' })).toBeVisible();
  await page.setViewportSize({ width: 844, height: 390 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
