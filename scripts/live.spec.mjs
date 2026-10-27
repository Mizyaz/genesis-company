import { test, expect } from '@playwright/test';

// The project name ends in -light or -dark; the theme and the seen-intro flag are set before the page loads.
test.beforeEach(async ({ page }, info) => {
  const theme = info.project.name.endsWith('light') ? 'light' : 'dark';
  await page.addInitScript(t => {
    try { localStorage.setItem('genesis.company.theme', t); localStorage.setItem('genesis-intro-seen', '1'); sessionStorage.setItem('genesis-intro-seen', '1'); } catch { /* storage may be blocked */ }
  }, theme);
});

const settle = page => page.waitForTimeout(400);

async function open(page, hash = '#/explore') {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`./${hash}`);
  await expect(page.locator('h1')).toBeVisible();
  await settle(page);
}

async function scrollThrough(page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 500) { await page.evaluate(v => window.scrollTo(0, v), y); await page.waitForTimeout(60); }
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(500);
}

const CONTROLS = 'main button:visible, main [role=tab]:visible';

test('no console errors or page errors while loading and scrolling to the bottom', async ({ page }) => {
  const problems = [];
  page.on('console', m => { if (m.type() === 'error') problems.push(`console: ${m.text()} ${m.location().url}`); });
  page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
  page.on('requestfailed', r => problems.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`));
  await open(page);
  await scrollThrough(page);
  expect(problems, problems.join('\n')).toEqual([]);
});

// What a click changed: text and attributes of its own panel, a screenshot of that panel, any dialog or URL change.
async function snapshot(page, handle) {
  const box = await handle.evaluateHandle(el => el.closest('.codesign-coil, .portfolio-card, section') || el.parentElement);
  const state = await box.evaluate(el => ({ html: el.innerHTML.replace(/\s+/g, ' '), dialog: !!document.querySelector('[role=dialog]'), url: location.hash }));
  const shot = await box.asElement().screenshot({ animations: 'disabled' }).catch(() => Buffer.alloc(0));
  return { state, shot };
}

test('every button and tab in main changes something visible when clicked', async ({ page }) => {
  await open(page);
  await page.waitForTimeout(1500);
  await scrollThrough(page);
  const count = await page.locator(CONTROLS).count();
  const listing = [];
  console.log(`${count} controls in main`);
  for (let i = 0; i < count; i++) {
    await open(page);
    await scrollThrough(page);
    const control = page.locator(CONTROLS).nth(i);
    if (!await control.waitFor({ timeout: 4000 }).then(() => true, () => false)) { listing.push(`[${i}] missing on reload (control count is not stable)`); continue; }
    const name = ((await control.innerText()) || (await control.getAttribute('aria-label')) || (await control.getAttribute('title')) || (await control.evaluate(el => `unnamed <${el.outerHTML.slice(0, 90)}>`))).trim().replace(/\s+/g, ' ');
    const active = await control.evaluate(el => el.getAttribute('aria-selected') === 'true' || el.getAttribute('aria-pressed') === 'true');
    if (active) { listing.push(`[${i}] ${name}: already active, skipped`); continue; }
    await control.scrollIntoViewIfNeeded();
    await settle(page);
    const handle = await control.elementHandle();
    const before = await snapshot(page, handle);
    await control.click();
    await page.waitForTimeout(500);
    const connected = await handle.evaluate(el => el.isConnected);
    const after = connected ? await snapshot(page, handle) : null;
    // A removed control means the panel was swapped; the snapshot of the old panel is then not comparable, so that counts as a change.
    const changed = !after || before.state.html !== after.state.html || before.state.dialog !== after.state.dialog || before.state.url !== after.state.url || !before.shot.equals(after.shot);
    listing.push(`[${i}] ${name}: ${changed ? 'changed' : 'NO VISIBLE CHANGE'}`);
    expect.soft(changed, `control "${name}" changed nothing visible`).toBe(true);
    if (await page.locator('[role=dialog]').count()) await page.keyboard.press('Escape');
  }
  console.log(listing.join('\n'));
});

test('every plotted curve has a nonzero drawn height', async ({ page }) => {
  await open(page);
  const svgs = page.locator('.codesign-svg, .portfolio-card svg');
  const total = await svgs.count();
  const flat = [];
  let paths = 0;
  for (let i = 0; i < total; i++) {
    const svg = svgs.nth(i);
    await svg.scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    const report = await svg.evaluate(el => {
      const section = el.closest('section')?.id || '?';
      const where = el.closest('.codesign-steps > li')?.querySelector('h3')?.textContent || el.closest('.portfolio-card')?.querySelector('h3')?.textContent || el.getAttribute('class') || 'svg';
      // The curves only: schematic wires and symbols are drawn flat on purpose.
      return [...el.querySelectorAll('path.codesign-curve, polyline')].map(p => ({ section, where, h: p.getBoundingClientRect().height, d: (p.getAttribute('d') || p.getAttribute('points') || '').slice(0, 40) }));
    });
    paths += report.length;
    flat.push(...report.filter(p => !(p.h > 0)));
  }
  console.log(`${total} plot svgs, ${paths} paths, ${flat.length} flat`);
  expect(flat.map(p => `#${p.section} / ${p.where}: height ${p.h.toFixed(2)} d="${p.d}"`), 'flat paths').toEqual([]);
});

test('the film plays: Watch the film starts a video that reaches 2 s', async ({ page }) => {
  await open(page);
  const watch = page.getByRole('button', { name: /watch the film/i });
  expect(await watch.count(), 'no button named "Watch the film" on the home page').toBeGreaterThan(0);
  await watch.first().click();
  const video = page.locator('video').first();
  await expect(video, 'no <video> after clicking Watch the film').toBeAttached({ timeout: 5000 });
  await video.evaluate(v => { if (v.paused) { v.muted = true; return v.play(); } });
  // Three seconds of playing, counted from the moment its clock first moves (the file streams from the site first).
  await expect.poll(() => video.evaluate(v => v.currentTime), { message: 'the film never started', timeout: 20_000 }).toBeGreaterThan(0);
  await page.waitForTimeout(3000);
  const { t, ready } = await video.evaluate(v => ({ t: v.currentTime, ready: v.readyState }));
  expect(t, `currentTime ${t}`).toBeGreaterThan(2);
  expect(ready, `readyState ${ready}`).toBeGreaterThanOrEqual(2);
});

test('pixelated tab: Another design changes the pixel grid and the curve', async ({ page }) => {
  await open(page, '#/explore/methods');
  const coil = page.locator('.codesign-coil').first();
  await coil.scrollIntoViewIfNeeded();
  await coil.getByRole('tab', { name: /pixelated/i }).click();
  const read = () => coil.locator('svg.codesign-svg').first().evaluate(svg => ({
    grid: [...svg.querySelectorAll('rect')].map(r => `${r.getAttribute('x')},${r.getAttribute('y')},${r.getAttribute('fill')}`).join('|'),
    curve: [...svg.querySelectorAll('path')].map(p => p.getAttribute('d')).join('|'),
  }));
  const another = coil.getByRole('button', { name: /another design/i });
  await expect(another, 'no "Another design" button in the pixelated tab').toBeVisible();
  const before = await read();
  await another.click();
  const after = await read();
  expect(after.grid, 'pixel grid unchanged').not.toBe(before.grid);
  expect(after.curve, 'curve path d unchanged').not.toBe(before.curve);
});

const STEPS = ['spec', 'sizing', 'simulate', 'objective'];
const stepContent = (page, id) => page.locator(`.codesign [data-step="${id}"]`).evaluate(el => ({ svg: [...el.querySelectorAll('svg')].map(v => v.innerHTML).join('|'), text: el.innerText }));
const runNumber = page => page.locator('.codesign-run strong').first().innerText();

async function openBoard(page) {
  await open(page, '#/explore/methods');
  const board = page.locator('.codesign').first();
  await board.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  return board;
}

test('run play and pause: Pause holds the design number, Play advances it', async ({ page }) => {
  const board = await openBoard(page);
  const button = board.locator('.codesign-play');
  expect(await button.count(), 'no .codesign-play button in the board').toBe(1);
  if ((await button.getAttribute('aria-pressed')) === 'true') await button.click();
  await expect(button, 'button should read Play when paused').toHaveAttribute('aria-pressed', 'false');
  const held = await runNumber(page);
  await page.waitForTimeout(500);
  expect(await runNumber(page), 'design number moved while paused').toBe(held);
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => runNumber(page), { message: 'design number did not advance after Play', timeout: 5000 }).not.toBe(held);
  await button.click();
  const again = await runNumber(page);
  await page.waitForTimeout(500);
  expect(await runNumber(page), 'Pause did not hold').toBe(again);
});

test('co-design scrubber: designs 1 and 290 differ in every step, and the pixel grid follows the run', async ({ page }) => {
  const board = await openBoard(page);
  const slider = board.getByRole('slider');
  expect(await slider.count(), 'no slider (input[type=range]) in .codesign').toBeGreaterThan(0);
  const button = board.locator('.codesign-play');
  if ((await button.getAttribute('aria-pressed')) === 'true') await button.click();
  const readAll = async () => {
    const out = { num: await runNumber(page) };
    for (const id of STEPS) out[id] = await stepContent(page, id);
    out.grid = await board.locator('[data-step="passives"] svg').first().evaluate(svg => [...svg.querySelectorAll('rect')].map(r => `${r.getAttribute('x')},${r.getAttribute('y')},${r.getAttribute('fill')}`).join('|'));
    return out;
  };
  await slider.first().fill('1');
  const first = await readAll();
  await slider.first().fill('290');
  const last = await readAll();
  expect(first.num, 'design number at 1').toBe('1');
  expect(last.num, 'design number at 290').toBe('290');
  for (const id of STEPS) {
    expect.soft(last[id].svg !== first[id].svg || last[id].text !== first[id].text, `step "${id}" is identical at design 1 and 290`).toBe(true);
  }
  expect.soft(last.grid !== first.grid, 'pixel grid in step "passives" is identical at design 1 and 290').toBe(true);
});

test('hover: a goal focuses the simulate step and a part focuses one part', async ({ page }) => {
  const board = await openBoard(page);
  const goal = board.locator('.codesign-goal').nth(2);
  await goal.scrollIntoViewIfNeeded();
  await goal.hover({ force: true });
  await expect(board.locator('[data-step="simulate"]'), 'simulate step lacks is-focus after hovering goal 3').toHaveClass(/is-focus/);
  const part = board.locator('[data-part="M2"]').first();
  await part.scrollIntoViewIfNeeded();
  await part.hover({ force: true });
  await expect(board.locator('.codesign-part.is-focus'), 'hovering M2 should focus exactly one part').toHaveCount(1);
});

test('light theme: the co-design screens are light', async ({ page }, info) => {
  test.skip(!info.project.name.endsWith('light'), 'light projects only');
  const board = await openBoard(page);
  expect(await page.locator('html').getAttribute('data-theme')).toBe('light');
  const colours = await board.locator('.codesign-screen').evaluateAll(els => els.map(el => getComputedStyle(el).backgroundColor));
  expect(colours.length, 'no .codesign-screen').toBeGreaterThan(0);
  const lum = c => { const m = c.match(/[\d.]+/g).map(Number); const [r, g, b] = m.slice(0, 3).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return { l: .2126 * r + .7152 * g + .0722 * b, a: m[3] ?? 1 }; };
  const bad = colours.filter(c => { const { l, a } = lum(c); return !(a > 0 && l > .8); });
  expect(bad, `.codesign-screen backgrounds must have luminance > 0.8: ${colours.join(' ; ')}`).toEqual([]);
});

test('SPDT card toggle: Pixelated and Traditional change the image and the plot', async ({ page }) => {
  await open(page);
  const card = page.locator('.portfolio-card', { hasText: /SPDT/i }).first();
  await expect(card, 'no SPDT portfolio card').toBeAttached();
  await card.scrollIntoViewIfNeeded();
  const pix = card.locator('.layout-views').getByRole('button', { name: /pixelated/i }), trad = card.locator('.layout-views').getByRole('button', { name: /traditional/i });
  expect(await pix.count() + await trad.count(), 'SPDT card has no Pixelated/Traditional toggle').toBe(2);
  const read = () => card.evaluate(el => ({
    src: el.querySelector('.layout-media')?.getAttribute('src') || el.querySelector('.layout-media image')?.getAttribute('href'),
    plot: [...el.querySelectorAll('.sparam-plot polyline')].map(p => p.getAttribute('points')).join('|'),
  }));
  await pix.click(); const a = await read();
  await trad.click(); const b = await read();
  expect(b.src, 'image src unchanged').not.toBe(a.src);
  expect(b.plot, 'SPDT card has no plot svg whose path changes with the toggle (only icon paths found)').not.toBe(a.plot);
});
