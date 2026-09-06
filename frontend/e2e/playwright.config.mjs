import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '*.browser.mjs',
  fullyParallel: true,
  workers: 2,
  retries: 0,
  timeout: 90_000,
  expect: {timeout: 10_000},
  forbidOnly: true,
  outputDir: './test-results',
  reporter: [['list'], ['html', {outputFolder: './playwright-report', open: 'never'}]],
  use: {
    actionTimeout: 10_000,
    baseURL: 'http://localhost:2421',
    timezoneId: 'UTC',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // The failed-refresh scenario must intercept requests before a service worker.
    serviceWorkers: 'block',
  },
  projects: [
    {name: '375', use: {viewport: {width: 375, height: 900}}},
    {name: '1280', use: {viewport: {width: 1280, height: 900}}},
  ],
  webServer: [
    {
      name: 'Phoenix',
      command: 'rtk proxy bash start-api.sh',
      url: 'http://localhost:4400/api/health',
      timeout: 180_000,
      reuseExistingServer: false,
    },
    ...[
      ['coachapp-v2', 2421],
      ['clientapp-v2', 2414],
    ].map(([app, port]) => ({
      name: app,
      cwd: `../apps/${app}`,
      command: `rtk proxy pnpm build --outDir dist-e2e && rtk proxy pnpm exec vite preview --outDir dist-e2e --port ${port} --host localhost --strictPort`,
      env: {VITE_API_BASE_URL: 'http://localhost:4400'},
      url: `http://localhost:${port}`,
      timeout: 180_000,
      reuseExistingServer: false,
    })),
  ],
});
