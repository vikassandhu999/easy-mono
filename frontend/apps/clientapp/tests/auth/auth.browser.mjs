import {mkdir, writeFile} from 'node:fs/promises';
import {chromium, expect} from '@playwright/test';
import {inviteClient} from './fixtures.mjs';

const browser = await chromium.launch();
const results = [];
await mkdir('tests/auth/artifacts', {recursive: true});
try {
  for (const width of [375, 768]) {
    const fixture = await inviteClient();
    const context = await browser.newContext({
      baseURL: process.env.CLIENT_APP_URL || 'http://localhost:1315',
      viewport: {width, height: 812},
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    try {
      await page.goto(`/invite/${fixture.token}`);
      await expect(page.getByRole('heading', {name: 'Join Everyday Coaching'})).toBeVisible();
      await expect(page.getByLabel('Email', {exact: true})).toHaveValue(fixture.email);
      await page.getByRole('button', {name: 'Continue with email'}).click();
      await expect(page.getByRole('heading', {name: 'Check your email'})).toBeVisible();
      await page.reload();
      const otp = page.getByLabel('Verification code');
      await otp.fill('000000');
      await page.getByRole('button', {name: 'Verify and continue'}).click();
      await expect(otp).toBeFocused();
      await expect(page.getByText('Invalid code.', {exact: false})).toBeVisible();
      await otp.fill('123456');
      await page.getByRole('button', {name: 'Verify and continue'}).click();
      await expect(page.getByRole('heading', {name: 'Your coaching'})).toBeVisible();
      await page.getByRole('link', {name: 'Your account', exact: true}).click();
      await page.getByLabel('First name').fill('Alexandria with a long name');
      await page.reload();
      await expect(page.getByLabel('First name')).toHaveValue('Alexandria with a long name');
      await expect(page.getByText('Your unsaved details were restored.')).toBeVisible();
      await page.route('**/v1/client/me', (route) =>
        route.request().method() === 'PATCH'
          ? route.fulfill({status: 503, json: {error_message: 'Unavailable'}})
          : route.continue(),
      );
      await page.getByRole('button', {name: 'Save details'}).click();
      await expect(page.getByRole('alert')).toBeFocused();
      await expect(page.getByLabel('First name')).toHaveValue('Alexandria with a long name');
      await page.unroute('**/v1/client/me');
      await page.getByRole('button', {name: 'Save details'}).click();
      await expect(page.getByText('Your details are saved.')).toBeVisible();
      await page.reload();
      await expect(page.getByLabel('First name')).toHaveValue('Alexandria with a long name');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await page.locator('main').evaluate((node) => node.getBoundingClientRect().width)).toBeLessThanOrEqual(
        480,
      );
      expect(
        await page.getByLabel('First name').evaluate((node) => Number.parseFloat(getComputedStyle(node).fontSize)),
      ).toBeGreaterThanOrEqual(16);
      await page.screenshot({path: `tests/auth/artifacts/account-${width}.png`, fullPage: true});
      await page.getByRole('button', {name: 'Sign out', exact: true}).click();
      expect(
        await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('clientapp.private.'))),
      ).toEqual([]);
      await page.goto('/account');
      await expect(page).toHaveURL(/\/login\?returnTo=%2Faccount/);
      await page.getByLabel('Email', {exact: true}).fill(fixture.email);
      await page.getByRole('button', {name: 'Continue with email'}).click();
      await page.getByLabel('Verification code').fill('123456');
      await page.getByRole('button', {name: 'Verify and continue'}).click();
      await expect(page.getByLabel('First name')).toHaveValue('Alexandria with a long name');
      // Reject refresh temporarily: keep the session so a deliberate retry recovers.
      await page.evaluate(() => {
        const key = 'clientapp.auth.v1';
        const session = JSON.parse(localStorage.getItem(key));
        localStorage.setItem(key, JSON.stringify({...session, expiresAt: 1}));
      });
      await page.route('**/v1/auth/token', (route) =>
        route.fulfill({status: 503, json: {error_message: 'Unavailable'}}),
      );
      await page.reload();
      await expect(page.getByRole('alert')).toBeVisible();
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem('clientapp.auth.v1')).tokens.scope)).toBe(
        'client',
      );
      await page.unroute('**/v1/auth/token');
      await page.getByRole('button', {name: 'Try again'}).click();
      await expect(page.getByLabel('First name')).toHaveValue('Alexandria with a long name');
      let releaseSave;
      let savedOnServer;
      const serverSaved = new Promise((resolve) => {
        savedOnServer = resolve;
      });
      await page.route('**/v1/client/me', async (route) => {
        if (route.request().method() !== 'PATCH') {
          await route.continue();
          return;
        }
        const response = await route.fetch();
        const released = new Promise((resolve) => {
          releaseSave = resolve;
        });
        savedOnServer();
        await released;
        await route.fulfill({response});
      });
      await page.getByLabel('First name').fill('A delayed private change');
      await page.getByRole('button', {name: 'Save details'}).click();
      await serverSaved;
      await page.getByRole('link', {name: 'easy', exact: true}).click();
      await page.getByRole('button', {name: 'Sign out', exact: true}).click();
      await expect(page.getByRole('heading', {name: 'Welcome back'})).toBeVisible();
      releaseSave();
      await expect
        .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('clientapp.auth.v1')).tokens ?? null))
        .toBeNull();
      await expect(page.getByText('A delayed private change')).toHaveCount(0);
      expect(
        await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('clientapp.private.'))),
      ).toEqual([]);
      expect(errors).toEqual([]);
      results.push({width, passed: true, email: fixture.email});
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  await writeFile('tests/auth/artifacts/results.json', JSON.stringify(results, null, 2));
}
console.log(JSON.stringify(results));
