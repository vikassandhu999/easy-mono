import {mkdir, writeFile} from 'node:fs/promises';
import {chromium, expect} from '@playwright/test';
import {api, inviteClient} from '../auth/fixtures.mjs';

const browser = await chromium.launch();
const results = [];
await mkdir('tests/account/artifacts', {recursive: true});
try {
  for (const width of [375, 768, 1280]) {
    const fixture = await inviteClient();
    const context = await browser.newContext({
      baseURL: process.env.CLIENT_APP_URL || 'http://localhost:1315',
      viewport: {width, height: 812},
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const retiredRequests = [];
    page.on('request', (request) => {
      if (/\/v1\/client\/weight[-_]/.test(request.url())) {
        retiredRequests.push(request.url());
      }
    });
    try {
      await page.goto(`/invite/${fixture.token}`);
      await page.getByRole('button', {name: 'Continue with email'}).click();
      await page.getByLabel('Verification code').fill('123456');
      await page.getByRole('button', {name: 'Verify and continue'}).click();
      await page.getByRole('link', {name: 'Your account', exact: true}).click();
      await expect(page.getByRole('heading', {name: 'Your account'})).toBeVisible();
      await page.screenshot({path: `tests/account/artifacts/account-${width}.png`, fullPage: true});
      const token = await page.evaluate(
        () => JSON.parse(localStorage.getItem('clientapp.auth.v1')).tokens.access_token,
      );
      const profile = async () => (await api('/v1/client/me', {token})).data;
      await expect(page.getByRole('link', {name: /Weight goal|Weight & progress/})).toHaveCount(0);
      await page.getByRole('link', {name: 'Personal details', exact: true}).click();
      const fullName = page.getByLabel('Full name');
      await fullName.fill('Sam');
      await page.getByLabel('Phone', {exact: true}).fill('+15555550123');
      await expect(page.getByText('Draft saved on this device.', {exact: true})).toBeVisible();
      await page.reload();
      await expect(fullName).toHaveValue('Sam');
      await expect(page.getByLabel('Phone', {exact: true})).toHaveValue('+15555550123');
      await context.setOffline(true);
      await expect(page.getByRole('button', {name: 'Save details'})).toBeDisabled();
      await context.setOffline(false);
      await expect(page.getByRole('button', {name: 'Save details'})).toBeEnabled();
      let writes = 0;
      await page.route('**/v1/client/me', async (route) => {
        if (route.request().method() !== 'PATCH') {
          return route.continue();
        }
        writes++;
        expect(route.request().postDataJSON()).toEqual({full_name: 'Sam', preferred_name: '', phone: '+15555550123'});
        if (writes === 1) {
          return route.fulfill({status: 503, json: {error_message: 'Temporarily unavailable'}});
        }
        return route.continue();
      });
      await page.getByRole('button', {name: 'Save details'}).click();
      await expect(page.locator('form').getByRole('alert')).toBeVisible();
      await expect(fullName).toHaveValue('Sam');
      await page.getByRole('button', {name: 'Save details'}).click();
      await expect(page.getByText('Your details are saved.')).toBeVisible();
      expect((await profile()).full_name).toBe('Sam');
      expect((await profile()).phone).toBe('+15555550123');
      expect(writes).toBe(2);
      await page.unroute('**/v1/client/me');
      await page.reload();
      await expect(fullName).toHaveValue('Sam');
      await page.getByRole('link', {name: 'Back', exact: true}).click();
      await expect(page.getByRole('heading', {name: 'Your account'})).toBeVisible();
      await expect(page.getByText('Sam', {exact: true})).toBeVisible();
      await expect(page.getByText('Unit system', {exact: false})).toBeVisible();
      await page.getByRole('link', {name: 'Today', exact: true}).click();
      await expect(page.getByRole('navigation', {name: 'Main navigation'}).getByRole('link')).toHaveCount(4);
      await expect(page.getByRole('link', {name: /Weight goal|Weight & progress/})).toHaveCount(0);
      for (const name of ['Training']) {
        await page.getByRole('navigation', {name: 'Main navigation'}).getByRole('link', {name, exact: true}).click();
        await expect(page.getByRole('heading', {level: 1})).toBeVisible();
      }
      await page.getByRole('link', {name: 'Messages', exact: true}).click();
      const input = page.getByLabel('Message your coach', {exact: true});
      await expect(page.getByText('Your coach · Conversation connected', {exact: true})).toBeVisible();
      await input.fill('My training plan looks good.');
      await page.getByRole('button', {name: 'Send', exact: true}).click();
      await expect(page.getByText('Message sent.', {exact: true})).toBeVisible();
      const history = await api('/v1/client/conversation/history', {token});
      expect(history.data.map((message) => message.body)).toEqual(['My training plan looks good.']);
      expect(history.data[0].embed).toBeNull();
      expect(retiredRequests).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await page.locator('main').evaluate((node) => node.getBoundingClientRect().width)).toBeLessThanOrEqual(
        480,
      );
      expect(errors).toEqual([]);
      results.push({width, passed: true, profileSaveAttempts: writes});
    } catch (error) {
      await page.screenshot({path: `tests/account/artifacts/failure-${width}.png`, fullPage: true});
      await writeFile(`tests/account/artifacts/failure-${width}.txt`, await page.locator('body').innerText());
      throw error;
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  await writeFile('tests/account/artifacts/results.json', JSON.stringify(results, null, 2));
}
console.log(JSON.stringify(results));
