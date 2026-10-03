import { defineConfig } from '@playwright/test';

const port = Number(process.env.GENESIS_TEST_PORT || 4173);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './scripts',
  testMatch: 'browser.spec.mjs',
  timeout: 20_000,
  workers: 1,
  use: {
    baseURL,
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
    launchOptions: {
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}),
      args: ['--enable-unsafe-swiftshader'], // Software WebGL in headless CI only.
    },
  },
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    timeout: 15_000,
    reuseExistingServer: false,
  },
});
