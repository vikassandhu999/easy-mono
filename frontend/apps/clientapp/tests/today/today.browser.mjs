import {mkdir, writeFile} from 'node:fs/promises';
import {chromium, expect} from '@playwright/test';
import {inviteClient} from '../auth/fixtures.mjs';

const browser = await chromium.launch();
const results = [];
await mkdir('tests/today/artifacts', {recursive: true});
try {
  for (const width of [375, 768, 1280]) {
    const fixture = await inviteClient();
    const context = await browser.newContext({
      baseURL: process.env.CLIENT_APP_URL || 'http://localhost:1315',
      viewport: {width, height: 812},
    });
    try {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      let release;
      const held = new Promise((resolve) => {
        release = resolve;
      });
      let fail = true;
      await page.route('**/v1/client/tracker-today', async (route) => {
        await held;
        return fail ? route.fulfill({status: 503, json: {error_message: 'Temporary test outage'}}) : route.continue();
      });
      await page.goto(`/invite/${fixture.token}`);
      await page.getByRole('button', {name: 'Continue with email'}).click();
      await page.getByLabel('Verification code').fill('123456');
      await page.getByRole('button', {name: 'Verify and continue'}).click();
      await expect(page.getByText('Loading your Trackers…', {exact: true})).toBeVisible();
      await page.screenshot({path: `tests/today/artifacts/loading-${width}.png`, fullPage: true});
      release();
      await expect(page.getByRole('alert')).toContainText("We couldn't load your Trackers.");
      fail = false;
      await page.getByRole('button', {name: 'Try again', exact: true}).click();
      await expect(page.getByText('Nothing to record today.', {exact: true})).toBeVisible();
      await expect(page.getByRole('link', {name: 'Check-ins', exact: true})).toBeVisible();
      await page.getByRole('link', {name: 'Add something else', exact: true}).click();
      await expect(page).toHaveURL(/\/trackers$/);
      await expect(page.getByRole('heading', {name: 'Trackers', exact: true})).toBeVisible();
      await page.goto('/');
      await expect(page.getByRole('heading', {name: 'Today', exact: true})).toBeVisible();
      await expect(
        page.getByRole('navigation', {name: 'Main navigation'}).getByRole('link', {name: 'Training', exact: true}),
      ).toHaveCount(0);
      await page.screenshot({path: `tests/today/artifacts/today-${width}.png`, fullPage: true});
      expect(errors).toEqual([]);
      results.push({
        width,
        loadingErrorRetry: true,
        trackerNavigation: true,
        trainingRemoved: true,
        passed: true,
      });
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  await writeFile('tests/today/artifacts/results.json', JSON.stringify(results, null, 2));
}
console.log(JSON.stringify(results));
