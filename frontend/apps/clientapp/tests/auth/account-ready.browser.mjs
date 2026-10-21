import {chromium, expect} from '@playwright/test';
import {inviteClient} from './fixtures.mjs';

const browser = await chromium.launch();
const context = await browser.newContext({
  baseURL: process.env.CLIENT_APP_URL || 'http://localhost:1315',
  viewport: {width: 375, height: 812},
});
const page = await context.newPage();
try {
  const fixture = await inviteClient();
  let release;
  const wait = new Promise((resolve) => {
    release = resolve;
  });
  await page.route('**/v1/client/me', async (route) => {
    await wait;
    await route.continue();
  });
  await page.goto(`/invite/${fixture.token}`);
  await page.getByRole('button', {name: 'Continue with email'}).click();
  await page.getByLabel('Verification code').fill('123456');
  await page.getByRole('button', {name: 'Verify and continue'}).click();
  await expect(page.getByRole('heading', {name: 'Opening your account'})).toBeVisible();
  await expect(page.getByRole('navigation', {name: 'Main navigation'})).toHaveCount(0);
  await expect(page.getByRole('heading', {name: 'Today', exact: true})).toHaveCount(0);
  release();
  await expect(page.getByRole('heading', {name: 'Today', exact: true})).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('clientapp.auth.v1')).accountId)).toBe(
    fixture.clientId,
  );
  await page.getByRole('link', {name: 'Training', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Training', exact: true})).toBeVisible();
  await page.waitForFunction(() => Object.keys(localStorage).some((key) => key.endsWith('.snapshot')));
} finally {
  await context.close();
  await browser.close();
}
console.log('Authenticated workflows wait for verified account identity and preserve offline snapshots.');
