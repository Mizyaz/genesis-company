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
  for (const [old, current, section] of [['#/about', '#/explore/about', '#about'], ['#/explore/team', '#/explore/about', '#about'],
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

test('the co-design diagram opens each block\'s recorded numbers on tap, with no video, and fits mobile', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  // No smooth scroll: a block sliding under a resting mouse would open on hover.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/explore/methods');
  const diagram = page.locator('.cdd');
  await expect(diagram.locator('.cdd-block')).toHaveCount(6);
  await diagram.getByRole('button', { name: /Transistor sizing/ }).click();
  await expect(diagram.locator('.cdd-info')).toContainText('no. 223 of 290');
  await expect(diagram.locator('.cdd-info')).toContainText('14.7 µm');
  await diagram.getByRole('button', { name: /Validated layout/ }).click();
  await expect(diagram.locator('.cdd-info')).toContainText('0 errors');
  // The only video is the film, in its player, closed until asked for.
  await expect(page.locator('video')).toHaveCount(1);
  await expect(page.locator('.film-dialog video')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('the flow motion loads near its section, plays on screen and pauses off it', async ({ page }) => {
  await page.goto('/#/explore');
  await expect(page.locator('.flow-motion')).toHaveCount(0);
  await page.locator('#flow').scrollIntoViewIfNeeded();
  const motion = page.locator('.flow-motion');
  await expect(motion).toHaveClass(/is-on/);
  await expect(motion.locator('.fm-steps li')).toHaveCount(7);
  await expect(motion.locator('.fm-verdict')).toContainText('DRC 0');
  await page.locator('#contact').scrollIntoViewIfNeeded();
  await expect(motion).toHaveClass(/is-off/);
});

test('the 3D view loads its layers only after a tap; the design pictures show at once, unfiltered', async ({ page }) => {
  await page.goto('/#/explore/portfolio');
  const picture = page.locator('.portfolio-card img.layout-media').first();
  await expect.poll(() => picture.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  expect(await picture.evaluate(img => [getComputedStyle(img).filter, getComputedStyle(img).mixBlendMode, getComputedStyle(img).opacity])).toEqual(['none', 'normal', '1']);
  const layers = () => page.evaluate(() => performance.getEntriesByType('resource').filter(r => r.name.includes('layers3d/metal_')).length);
  await page.locator('#chip3d').scrollIntoViewIfNeeded();
  expect(await layers()).toBe(0);
  await page.locator('.chip3d-poster').click();
  await expect(page.locator('.layers3d-stack img')).toHaveCount(13);
  await expect.poll(layers).toBe(13);
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
