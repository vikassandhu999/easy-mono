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
      await page.getByRole('link', {name: 'Weight goal', exact: true}).click();
      const value = page.getByRole('textbox', {name: 'Goal weight', exact: true});
      await expect(value).toHaveValue('');
      await page.getByRole('button', {name: 'Save goal', exact: true}).click();
      await expect(page.getByText('Enter goal weight.', {exact: true})).toBeVisible();
      await value.fill('1000');
      await page.getByRole('button', {name: 'Save goal', exact: true}).click();
      await expect(value).toBeFocused();
      await expect(page.getByText('Enter a goal greater than 0', {exact: false})).toBeVisible();
      await value.fill('72,5');
      await expect(page.getByText('Draft saved on this device.', {exact: true})).toBeVisible();
      await page.reload();
      await expect(value).toHaveValue('72,5');
      let writes = 0;
      await page.route('**/v1/client/me', async (route) => {
        if (route.request().method() !== 'PATCH') {
          return route.continue();
        }
        writes++;
        expect(route.request().postDataJSON()).toEqual({goal_weight_value: 72.5, goal_weight_unit: 'kg'});
        expect((await route.fetch()).ok()).toBe(true);
        await route.abort('connectionreset');
      });
      await page.getByRole('button', {name: 'Save goal', exact: true}).click();
      await expect(page.getByText('Your goal is saved.', {exact: true})).toBeVisible();
      expect(writes).toBe(1);
      expect(Number((await profile()).goal_weight_value)).toBe(72.5);
      await page.unroute('**/v1/client/me');
      await page.getByRole('button', {name: 'Goal unit'}).click();
      await page.getByRole('option', {name: 'Pounds (lb)'}).click();
      await value.fill('160');
      await page.getByRole('button', {name: 'Save goal', exact: true}).click();
      await expect(page.getByText('Your goal is saved.', {exact: true})).toBeVisible();
      expect((await profile()).goal_weight_unit).toBe('lbs');
      await page.screenshot({path: `tests/account/artifacts/goal-${width}.png`, fullPage: true});
      await page.getByRole('link', {name: 'Back', exact: true}).click();
      await expect(page.getByRole('link', {name: 'Weight goal', exact: true})).toContainText('160');
      await page.getByRole('link', {name: 'Personal details', exact: true}).click();
      await page.getByLabel('First name').fill('Sam');
      await page.getByRole('button', {name: 'Save details'}).click();
      await expect(page.getByText('Your details are saved.')).toBeVisible();
      expect(Number((await profile()).goal_weight_value)).toBe(160);
      await page.getByRole('link', {name: 'Back', exact: true}).click();
      await page.getByRole('link', {name: 'Weight goal', exact: true}).click();
      await expect(value).toHaveValue('160.00');
      await value.fill('158');
      await expect(page.getByText('Draft saved on this device.', {exact: true})).toBeVisible();
      // Keep the incomplete edit while offline, then compare a goal changed elsewhere.
      await context.setOffline(true);
      await expect(page.getByRole('button', {name: 'Save goal', exact: true})).toBeDisabled();
      await value.fill('157,5');
      await expect(page.getByText('Draft saved on this device.', {exact: true})).toBeVisible();
      await context.setOffline(false);
      await api('/v1/client/me', {method: 'PATCH', token, body: {goal_weight_value: 155, goal_weight_unit: 'lbs'}});
      await page.reload();
      await expect(value).toHaveValue('157,5');
      await expect(page.getByRole('button', {name: 'Review my draft'})).toBeVisible();
      await expect(page.getByRole('button', {name: 'Save goal', exact: true})).toBeDisabled();
      await page.getByRole('button', {name: 'Review my draft'}).click();
      await page.getByRole('dialog').getByRole('button', {name: 'Use my draft'}).click();
      await page.getByRole('button', {name: 'Save goal', exact: true}).click();
      await expect(page.getByText('Your goal is saved.', {exact: true})).toBeVisible();
      expect(Number((await profile()).goal_weight_value)).toBe(157.5);
      expect((await profile()).first_name).toBe('Sam');
      await page.getByRole('button', {name: 'Remove goal', exact: true}).click();
      await page.getByRole('dialog').getByRole('button', {name: 'Remove goal', exact: true}).click();
      await expect(page.getByText('Your goal was removed.')).toBeVisible();
      expect((await profile()).goal_weight_value).toBeNull();
      await page.reload();
      await expect(value).toHaveValue('');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await page.locator('main').evaluate((node) => node.getBoundingClientRect().width)).toBeLessThanOrEqual(
        480,
      );
      expect(errors).toEqual([]);
      results.push({width, passed: true, lostResponseWrites: writes});
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
