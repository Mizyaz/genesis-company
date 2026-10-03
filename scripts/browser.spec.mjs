import { test, expect } from '@playwright/test';

test('the logo opens a finite introduction with pause, seek, replay and focus restoration', async ({ page }) => {
  await page.goto('/#/');
  const launcher = page.getByRole('button', { name: 'Watch the GENESIS introduction' });
  await launcher.click();
  const film = page.locator('.company-film');
  const progress = film.getByRole('slider');
  await expect(film).toBeVisible();
  await expect(film).toHaveAttribute('data-running', 'true');
  await expect.poll(async () => Number(await progress.inputValue())).toBeGreaterThan(.2);
  await film.getByRole('button', { name: 'Pause introduction' }).click();
  const stopped = await progress.inputValue();
  await expect(film).toHaveAttribute('data-running', 'false');
  await page.waitForTimeout(250);
  await expect(progress).toHaveValue(stopped);
  await film.getByRole('button', { name: '05 The handoff' }).click();
  await expect(film.locator('h2')).toHaveText('From schematic to tape-out.');
  await progress.focus();
  await page.keyboard.press('End');
  await expect(progress).toHaveValue('25');
  await film.getByRole('button', { name: 'Replay introduction' }).click();
  await expect(film.locator('h2')).toHaveText('A chip starts with a purpose.');
  await page.keyboard.press('Escape');
  await expect(film).toHaveCount(0);
  await expect(launcher).toBeFocused();
  await expect(page.locator('canvas')).toHaveCount(0);
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
  await expect(film.locator('h2')).toHaveText('Her çip bir ihtiyaca cevap verir.');
  await film.getByRole('button', { name: '04 Kontrol' }).click();
  await expect(film.locator('h2')).toHaveText('Kontrol et. Geliştir. Yeniden dene.');
  expect(await film.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  expect(await film.evaluate(node => node.getBoundingClientRect().right <= innerWidth)).toBe(true);
  // The native dialog keeps keyboard focus away from the page behind it.
  await film.getByRole('button', { name: 'Keşfetmeye devam et' }).focus();
  await page.keyboard.press('Tab');
  await expect(film.getByRole('button', { name: 'Tanıtımı kapat' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'GENESIS tanıtımını izle' })).toBeFocused();
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
