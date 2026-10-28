import { test, expect } from '@playwright/test';

const opacities = page => page.locator('.pc-card').evaluateAll(cards => cards.map(card => +getComputedStyle(card).opacity));
const fullyShown = async page => expect.poll(() => opacities(page)).toEqual([1, 1, 1, 1, 1, 1, 1]);

test('the lead names the claim, both themes work and a phone never scrolls sideways', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('Automated layout for RF and mmWave front-ends.');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Close menu' }).click();
  for (const y of [0, 2000, 4000, 99999]) {
    await page.evaluate(top => scrollTo({ top }), y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

// Islam, 2026-10-28: no shortenings in what a reader sees ("Normal haliyle"). DRC, LVS, RF, mmWave, PDK and GHz are
// terms; DRC and LVS are spelled out where they first appear. Publication titles and venues are cited as published.
const SHORTENINGS = /\b(?:specs?|PEX|vs|info|config|e\.g|i\.e|etc|approx|SPDT|RFIC|AI|ML|UI|FAQ|DC|EM|P1dB|LNA|SOI|CMOS)\b|\b(?:min|max|sec|hrs?)\.?(?=\s|$)/;
test('the page writes no shortenings and spells out DRC and LVS where they first appear', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.locator('#how .pv-sim').waitFor();
  const seen = await page.evaluate(() => {
    const cited = [...document.querySelectorAll('#research .papers li')];
    const text = [...document.querySelectorAll('body *')].filter(el => !cited.some(li => li.contains(el)) && el.childNodes.length)
      .flatMap(el => [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent));
    const labels = [...document.querySelectorAll('[aria-label], [alt], [title]')].flatMap(el => ['aria-label', 'alt', 'title'].map(a => el.getAttribute(a) ?? ''));
    const meta = [...document.querySelectorAll('meta[content]')].map(el => el.getAttribute('content'));
    return { text: text.join(' '), all: [...text, ...labels, ...meta, document.title] };
  });
  for (const string of seen.all) expect(string, string).not.toMatch(SHORTENINGS);
  // No circuit type is named (Islam, 10-28): the designs are design A, design B, ...; only the theme button switches.
  for (const string of seen.all) expect(string, string).not.toMatch(/\b(?:single-pole|double-throw|amplifier)\b|\bswitch(?:es|ed)?\b(?! to (?:light|dark) mode)/i);
  for (const spelled of ['DRC (design rule check)', 'LVS (layout versus schematic)']) {
    const at = seen.text.indexOf(spelled.slice(0, 3));
    expect(seen.text.slice(at, at + spelled.length)).toBe(spelled);
  }
});

test('skip link focuses the page without navigating away', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/');
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.locator('main')).toBeFocused();
});

test('links to the old pages land on the sections that now hold them', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [old, current, section] of [['#/about', '#/explore/team', '#team'], ['#/publications', '#/explore/research', '#research'],
    ['#/explore/flow', '#/explore/how', '#how'], ['#/explore/partnership', '#/explore/membership', '#membership'], ['#/design', '#/', 'h1']]) {
    await page.goto(`/${old}`);
    await expect(page).toHaveURL(new RegExp(`${current.replace(/[/]/g, '\\/')}$`));
    await expect(page.locator(section)).toBeInViewport();
  }
});

test('the header links reach their sections', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  for (const [name, section] of [['How it works', '#how'], ['Membership', '#membership'], ['Research', '#research'], ['Team', '#team']]) {
    await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name, exact: true }).click();
    await expect(page.locator(section)).toBeInViewport();
  }
});

test('the process cards rise into place and every one ends fully shown', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await expect(page.locator('.pc-cards')).toHaveAttribute('data-reveal', 'on');
  expect((await opacities(page)).at(-1)).toBeLessThan(1);
  for (const card of await page.locator('.pc-card').all()) await card.scrollIntoViewIfNeeded();
  await fullyShown(page);
  await expect(page.locator('.pc-visual-layout .pv-gds')).toBeVisible();
});

test('the cards are shown at once with less motion and without IntersectionObserver', async ({ browser }) => {
  const reduced = await browser.newPage();
  await reduced.emulateMedia({ reducedMotion: 'reduce' });
  await reduced.goto('/');
  await expect(reduced.locator('.pc-cards')).not.toHaveAttribute('data-reveal', 'on');
  await fullyShown(reduced);
  const blind = await browser.newPage();
  await blind.addInitScript(() => { delete window.IntersectionObserver; });
  await blind.goto('/');
  await expect(blind.locator('h1')).toBeVisible();
  await fullyShown(blind);
});

test('research opens every publication on request', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/explore/research');
  await expect(page.locator('.papers li')).toHaveCount(3);
  const more = page.locator('.papers-more'), all = Number((await more.textContent()).match(/\d+/)[0]);
  await more.click();
  await expect(page.locator('.papers li')).toHaveCount(all);
});
