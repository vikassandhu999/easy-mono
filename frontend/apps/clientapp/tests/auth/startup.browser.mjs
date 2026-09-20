import {mkdir, writeFile} from 'node:fs/promises';
import {chromium, expect} from '@playwright/test';
import {inviteClient} from './fixtures.mjs';

const browser = await chromium.launch();
const results = [];
await mkdir('tests/auth/artifacts', {recursive: true});
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
      await page.goto(`/invite/${fixture.token}`);
      await page.getByRole('button', {name: 'Continue with email'}).click();
      await page.getByLabel('Verification code').fill('123456');
      await page.getByRole('button', {name: 'Verify and continue'}).click();
      await page.getByRole('link', {name: 'Your account', exact: true}).click();
      await page.getByRole('link', {name: 'Personal details', exact: true}).click();
      await page.getByLabel('First name').fill('Keep my unfinished details');
      await page.reload();
      await expect(page.getByLabel('First name')).toHaveValue('Keep my unfinished details');
      const saved = await page.evaluate(() => ({...localStorage}));
      await context.addInitScript(() => {
        const read = Storage.prototype.getItem;
        Storage.prototype.getItem = function (key) {
          if (this === localStorage && key === 'clientapp.auth.v1' && sessionStorage.startupReadFailure) {
            throw new DOMException('Storage temporarily unavailable', 'SecurityError');
          }
          return read.call(this, key);
        };
      });
      await page.evaluate(() => {
        sessionStorage.startupReadFailure = '1';
      });
      await page.reload();
      const heading = page.getByRole('heading', {name: 'Let’s try opening Easy again'});
      await expect(heading).toBeVisible();
      const retry = page.getByRole('button', {name: 'Try again', exact: true});
      await expect(retry).toBeFocused();
      expect(await retry.evaluate((node) => node.getBoundingClientRect().height)).toBeGreaterThanOrEqual(48);
      expect(await page.locator('main').evaluate((node) => node.getBoundingClientRect().width)).toBeLessThanOrEqual(
        480,
      );
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await retry.click();
      await expect(heading).toBeVisible();
      await expect(retry).toBeFocused();
      expect(await page.evaluate(() => ({...localStorage}))).toEqual(saved);
      await page.screenshot({path: `tests/auth/artifacts/startup-${width}.png`, fullPage: true});
      await page.evaluate(() => {
        delete sessionStorage.startupReadFailure;
      });
      await retry.click();
      await expect(page.getByLabel('First name')).toHaveValue('Keep my unfinished details');
      await expect(page.getByText('Your unsaved details were restored.')).toBeVisible();
      expect(errors).toEqual([]);
      results.push({width, repeatedFailure: true, retryRestoresAccountAndDraft: true});
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  await writeFile('tests/auth/artifacts/startup-results.json', JSON.stringify(results, null, 2));
}
console.log(JSON.stringify(results));
