import {defineConfig, devices} from '@playwright/test';

// The demo page is the fixture. esbuild serves it and rebuilds the bundle on
// each request, so `npm run e2e` needs no build step and no separately started
// server — but it reuses one you already have open from `npm run dev`.
export default defineConfig({
  testDir: './e2e',
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:8027',
    // Chords are keyed on e.code, so the layout the browser reports has to be a
    // US one for KeyJ to be KeyJ. Playwright's default already is.
    locale: 'en-US'
  },
  projects: [{name: 'chromium', use: {...devices['Desktop Chrome']}}],
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:8027',
    reuseExistingServer: true,
    stdout: 'ignore'
  }
});
