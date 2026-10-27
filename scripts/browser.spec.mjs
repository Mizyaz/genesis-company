import { test, expect } from '@playwright/test';

test('the hero leads to what we offer, supports both themes and fits narrow screens', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/#/explore');
  await expect(page.locator('h1')).toHaveText('Automated and non-intuitive RFIC design formillimeter-wave and beyond.');
  await page.locator('.company-hero').getByRole('link', { name: 'What we offer' }).click();
  await expect(page.locator('#membership-title')).toBeInViewport();
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('h1')).toContainText('millimeter-wave and beyond.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

for (const route of ['#/explore']) {
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

test('links to the old pages land on their sections of the one page on direct load', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [old, current, section] of [['#/about', '#/explore/about', '#about'], ['#/about/story', '#/explore/story', '#story'], ['#/explore/team', '#/explore/about', '#about'],
    ['#/publications', '#/explore/research', '#research'], ['#/design', '#/', '.company-hero']]) {
    await page.goto(`/${old}`);
    await expect(page).toHaveURL(new RegExp(`${current.replace(/[/]/g, '\\/')}$`));
    await expect(page.locator('main')).toHaveClass('explore-page');
    await expect(page.locator(section)).toBeInViewport();
  }
});

test('legacy navigation replaces its history entry rather than adding a redirect loop', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/explore');
  await page.evaluate(() => { location.hash = '#/about'; });
  await expect(page).toHaveURL(/#\/explore\/about$/);
  await expect(page.locator('#about')).toBeInViewport();
  await page.goBack();
  await expect(page).toHaveURL(/#\/explore$/);
  await expect(page.locator('main')).toHaveClass('explore-page');
  await page.goForward();
  await expect(page).toHaveURL(/#\/explore\/about$/);
});

test('the co-design board runs the recorded designs and the non-intuitive link lands on passive synthesis', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#/explore');
  await page.locator('.company-hero').getByRole('link', { name: 'non-intuitive' }).click();
  await expect(page.locator('#non-intuitive')).toBeInViewport();
  const board = page.locator('.codesign');
  const design = () => board.locator('.codesign-run strong').first().textContent().then(Number);
  await expect(board).toHaveClass(/is-live/);
  const first = await design();
  await expect.poll(design).toBeGreaterThan(first);
  await expect(board.locator('.codesign-steps > li')).toHaveCount(6);
  await expect(board.locator('.codesign-steps > li.is-lit')).toHaveCount(1);
  await expect(board.getByText('DRC 0 errors')).toBeVisible();
  // The only video is the film, in its player, closed until asked for.
  await expect(page.locator('video')).toHaveCount(1);
  await expect(page.locator('.film-dialog video')).toBeHidden();
  // The passive step steps through pixelated designs on request, and shows the parametric candidates on its other tab.
  const passives = page.locator('#non-intuitive'), grid = () => passives.locator('svg rect[fill]').evaluateAll(cells => cells.map(c => c.getAttribute('x') + c.getAttribute('y') + c.getAttribute('fill')).join());
  const before = await grid();
  await passives.getByRole('button', { name: 'Another design' }).click();
  expect(await grid()).not.toEqual(before);
  await passives.getByRole('tab', { name: 'Parametric' }).click();
  await expect(passives.locator('ol li')).toHaveCount(4);
  // Pause holds the design; the scrubber moves every card with it: the goal bars, the widths, the curves and the error.
  await board.getByRole('button', { name: 'Pause' }).click();
  const held = await design();
  await page.waitForTimeout(500);
  expect(await design()).toBe(held);
  const cards = () => board.evaluate(b => ['spec', 'sizing', 'simulate', 'objective'].map(id => b.querySelector(`[data-step="${id}"] svg`).innerHTML.length + b.querySelector(`[data-step="${id}"]`).textContent).join('|'));
  const scrub = board.getByRole('slider');
  await scrub.fill('1');
  const one = await cards();
  await scrub.fill('290');
  const last = await cards();
  for (let i = 0; i < 4; i++) expect(last.split('|')[i]).not.toEqual(one.split('|')[i]);
  await board.getByRole('button', { name: 'Play the run' }).click();
  await expect(board.getByRole('button', { name: 'Pause' })).toBeVisible();
  // Pointing at a goal lights its curve; pointing at a transistor rings it on the schematic.
  await board.getByRole('button', { name: 'Pause' }).click();
  await board.locator('.codesign-goal').nth(2).hover();
  await expect(board.locator('[data-step="simulate"]')).toHaveClass(/is-focus/);
  await board.locator('[data-part="M2"]').hover({ force: true });
  await expect(board.locator('.codesign-part.is-focus')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('the co-design board rests on the best design under reduced motion and fits mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/explore/methods');
  const board = page.locator('.codesign');
  await expect(board.locator('.codesign-run strong').first()).toHaveText('223');
  await expect(board.locator('.codesign-steps > li.is-lit')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('the flow lights its stages as the reader scrolls, and names the next one', async ({ page }) => {
  await page.goto('/#/explore');
  const journey = page.locator('.journey');
  const scrollTo = part => journey.evaluate((el, part) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + part * (el.offsetHeight - window.innerHeight)), part);
  await scrollTo(.02);
  await expect(journey.locator('.journey-stages li.is-on strong')).toHaveText('Schematic');
  await expect(journey.locator('.journey-next')).toContainText('Layout blocks');
  await scrollTo(.6);
  await expect(journey.locator('.journey-stages li.is-on strong')).toHaveText('Co-design');
  await expect(journey.locator('.journey-stages li.is-done')).toHaveCount(4);
  await scrollTo(.99);
  await expect(journey.locator('.journey-scale')).toHaveClass(/is-on/);
});

test('a first visit follows the system theme, and a picked theme is kept', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/#/explore');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.evaluate(() => localStorage.setItem('genesis.company.theme', 'light'));
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('the research list opens with the newest publications and shows the rest on request', async ({ page }) => {
  await page.goto('/#/explore/research');
  const list = page.locator('.publication-list .publication-item');
  await expect(list).toHaveCount(6);
  await page.getByRole('button', { name: /Show all \d+ publications/ }).click();
  expect(await list.count()).toBeGreaterThan(6);
});
