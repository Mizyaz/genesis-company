import { test, expect } from '@playwright/test';

const selected = page => page.locator('.pc-rail [aria-selected="true"]');

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
// "DC" as the bottom of a frequency range ("DC to 170 GHz", Islam 10-29) is a term too.
const SHORTENINGS = /\b(?:specs?|PEX|vs|info|config|e\.g|i\.e|etc|approx|SPDT|RFIC|AI|ML|UI|FAQ|DC(?! to \d)|EM|P1dB|LNA|SOI|CMOS)\b|\b(?:min|max|sec|hrs?)\.?(?=\s|$)/;
test('the page writes no shortenings and spells out DRC and LVS where they first appear', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.locator('#how .pipeline').waitFor();
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

test('the film powers on, and the steps advance on screen, hold under the pointer and follow a click', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  // The film powers on and settles: the square pixels are gone within the entrance.
  await expect(page.locator('.power')).toHaveClass(/is-powering/);
  await expect(page.locator('.film-mosaic')).toHaveCount(0, { timeout: 4000 });
  // The home page holds the process in one line; it opens the page of every step.
  await page.locator('#how .pipeline').click();
  await expect(page).toHaveURL(/#\/process$/);
  await page.mouse.move(0, 0);
  await expect(page.locator('.pc-stages')).toHaveAttribute('data-run', 'on');
  await expect(selected(page)).toHaveText(/Schematic/, { timeout: 9000 });
  await page.locator('.pc-panel:not([hidden])').hover();
  await expect(page.locator('.pc-stages')).toHaveAttribute('data-run', 'off');
  await page.getByRole('tab', { name: /Layout/ }).click();
  await expect(page.locator('.pc-visual-layout .pv-gds')).toBeVisible();
  await expect(page.locator('.pc-panel:not([hidden])')).toHaveCount(1);
});

test('with motion stopped the film is there and the steps wait; without IntersectionObserver a click still picks a step', async ({ browser }) => {
  const reduced = await browser.newPage();
  // Motion stopped with the header button (the system setting alone does not stop the entrance, Islam 10-29).
  await reduced.addInitScript(() => localStorage.setItem('genesis.company.motion.v2', 'paused'));
  await reduced.goto('/');
  // Motion stopped: the film is simply there, with no power-on and no square pixels, and no step advances on its own.
  await expect(reduced.locator('.power')).not.toHaveClass(/is-powering/);
  await expect(reduced.locator('.film-mosaic')).toHaveCount(0);
  expect(await reduced.locator('.film-take').evaluate(el => +getComputedStyle(el).opacity)).toBe(1);
  await reduced.goto('/#/process');
  await reduced.waitForTimeout(8000);
  await expect(selected(reduced)).toHaveText(/Performance targets/);
  await expect(reduced.locator('.pc-panel:not([hidden]) .pv-spec')).toBeVisible();
  const blind = await browser.newPage();
  await blind.addInitScript(() => { delete window.IntersectionObserver; });
  await blind.goto('/#/process');
  await expect(blind.locator('h1')).toBeVisible();
  await blind.getByRole('tab', { name: /Verification/ }).click();
  await expect(blind.locator('.pc-panel:not([hidden]) .pv-verify')).toBeVisible();
});

test('the collaboration page opens from the header and leads back home', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Collaboration', exact: true }).click();
  await expect(page.locator('h1')).toHaveText('Collaboration');
  await expect(page.locator('.collab-kinds li')).toHaveCount(3);
  await page.getByRole('link', { name: /Back to the home page/ }).click();
  await expect(page.locator('#how .pipeline')).toBeAttached();
});

test('research opens every publication on request', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/explore/research');
  await expect(page.locator('.papers li')).toHaveCount(3);
  const more = page.locator('.papers-more'), all = Number((await more.textContent()).match(/\d+/)[0]);
  await more.click();
  await expect(page.locator('.papers li')).toHaveCount(all);
});
