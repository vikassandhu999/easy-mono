import {mkdir, writeFile} from 'node:fs/promises';
import {chromium, expect} from '@playwright/test';
import {api, inviteClient} from '../auth/fixtures.mjs';

const browser = await chromium.launch();
const results = [];
await mkdir('tests/progress/artifacts', {recursive: true});
try {
  for (const width of [375, 768, 1280]) {
    const fixture = await inviteClient();
    const context = await browser.newContext({baseURL: 'http://localhost:1315', viewport: {width, height: 812}});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    try {
      await page.goto(`/invite/${fixture.token}`);
      await page.screenshot({path: `tests/progress/artifacts/invitation-${width}.png`, fullPage: true});
      await page.getByRole('button', {name: 'Continue with email'}).click();
      await page.getByLabel('Verification code').fill('123456');
      await page.getByRole('button', {name: 'Verify and continue'}).click();
      await expect(page.getByRole('heading', {name: 'Today', exact: true})).toBeVisible();
      await expect(page.getByRole('link', {name: 'Move at your pace'})).toBeVisible();
      await page.screenshot({path: `tests/progress/artifacts/today-${width}.png`, fullPage: true});
      const token = await page.evaluate(
        () => JSON.parse(localStorage.getItem('clientapp.auth.v1')).tokens.access_token,
      );
      const today = (await api('/v1/client/me', {token})).data.local_date;
      const day = () => api(`/v1/client/weight-entry?date=${today}`, {token});
      await page.getByRole('link', {name: 'Weight & progress', exact: true}).click();
      await expect(page.getByText('0 weight records', {exact: true})).toBeVisible();
      await page.getByRole('link', {name: 'Record weight', exact: true}).click();
      const value = page.getByRole('textbox', {name: 'Weight', exact: true});
      await expect(value).toHaveValue('');
      await page.getByRole('button', {name: 'Save weight', exact: true}).click();
      await expect(page.getByText('Enter weight.', {exact: true})).toBeVisible();
      await value.fill('72,4');
      await page.getByRole('textbox', {name: 'Note', exact: true}).fill('Morning check-in');
      await expect(page.getByText('Draft saved on this device.', {exact: true})).toBeVisible();
      await page.reload();
      await expect(value).toHaveValue('72,4');
      await expect(page.getByRole('textbox', {name: 'Note', exact: true})).toHaveValue('Morning check-in');
      await page.screenshot({path: `tests/progress/artifacts/editor-${width}.png`, fullPage: true});
      // The backend commits but its response is lost: read-back must confirm one record.
      let writes = 0;
      await page.route('**/v1/client/weight_entries', async (route) => {
        if (route.request().method() !== 'POST') {
          return route.continue();
        }
        writes++;
        const response = await route.fetch();
        expect(response.ok()).toBe(true);
        await route.abort('connectionreset');
      });
      await page.getByRole('button', {name: 'Save weight', exact: true}).click();
      await expect(page.getByText('Your weight is saved.', {exact: true})).toBeVisible();
      expect(writes).toBe(1);
      expect(Number((await day()).data.value)).toBe(72.4);
      await page.unroute('**/v1/client/weight_entries');
      await expect(page.getByText('1 weight record', {exact: true})).toBeVisible();
      await page.getByRole('link', {name: /^Edit weight/}).click();
      await expect(value).toHaveValue('72.40');
      await value.fill('71.8');
      await page.getByRole('button', {name: 'Save weight', exact: true}).click();
      await expect(page.getByText('Your weight is saved.', {exact: true})).toBeVisible();
      expect(Number((await day()).data.value)).toBe(71.8);
      await page.getByRole('button', {name: 'Date range & units'}).click();
      const sheet = page.getByRole('dialog', {name: 'Your progress view'});
      await expect(sheet).toBeVisible();
      const bounds = await sheet.boundingBox();
      expect(bounds.width).toBeLessThanOrEqual(480);
      await page.getByLabel('From date').fill('');
      await sheet.getByRole('button', {name: 'Apply range'}).click();
      await expect(page.getByText('Enter from date.', {exact: true})).toBeVisible();
      await page.getByLabel('From date').fill(today);
      await page.getByRole('button', {name: 'Display unit'}).click();
      await page.getByRole('option', {name: 'Pounds (lb)'}).click();
      await page.screenshot({path: `tests/progress/artifacts/filters-${width}.png`, fullPage: true});
      await sheet.getByRole('button', {name: 'Apply range'}).click();
      await expect(sheet).toHaveCount(0);
      await expect(page).toHaveURL(/unit=lbs/);
      await expect(page.getByRole('region', {name: 'Weight trend'})).toContainText('lbs');
      await page.reload();
      await expect(page.getByText('1 weight record', {exact: true})).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await page.locator('main').evaluate((node) => node.getBoundingClientRect().width)).toBeLessThanOrEqual(
        480,
      );
      await page.screenshot({path: `tests/progress/artifacts/progress-${width}.png`, fullPage: true});
      await page.getByRole('link', {name: /^Edit weight/}).click();
      await expect(value).toHaveValue('71.80');
      await page.getByRole('button', {name: 'Delete weight', exact: true}).click();
      await page.getByRole('dialog').getByRole('button', {name: 'Delete weight', exact: true}).click();
      await expect(page.getByText('Your weight record was removed.')).toBeVisible();
      expect((await day()).data).toBeNull();
      await expect(page.getByText('0 weight records', {exact: true})).toBeVisible();
      expect(errors).toEqual([]);
      results.push({width, passed: true, lostResponseWrites: writes});
    } catch (error) {
      await page.screenshot({path: `tests/progress/artifacts/failure-${width}.png`, fullPage: true});
      await writeFile(`tests/progress/artifacts/failure-${width}.txt`, await page.locator('body').innerText());
      throw error;
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  await writeFile('tests/progress/artifacts/results.json', JSON.stringify(results, null, 2));
}
console.log(
  'Weight create, draft restart, lost response, edit, sheet validation, unit conversion and delete passed at 375/768/1280px.',
);
