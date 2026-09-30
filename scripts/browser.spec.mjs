import { test, expect } from '@playwright/test';

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
