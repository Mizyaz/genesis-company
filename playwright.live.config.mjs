import { defineConfig } from '@playwright/test';

// Tests the site like a user against any deployed or local URL; no web server is started.
const baseURL = (process.env.GENESIS_LIVE_URL || 'https://mizyaz.github.io/genesis-company/').replace(/\/?$/, '/');
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const launchOptions = { ...(executablePath ? { executablePath } : {}), args: ['--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] };

export default defineConfig({
  testDir: './scripts',
  testMatch: 'live.spec.mjs',
  timeout: 900_000,
  workers: 1,
  retries: 0,
  use: { baseURL, trace: 'off', launchOptions },
  projects: [
    { name: 'desktop-dark', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'desktop-light', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'phone-dark', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
    { name: 'phone-light', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
  ],
});
