import {mkdir, writeFile} from 'node:fs/promises';
import {chromium, expect} from '@playwright/test';
import {api, inviteClient} from '../auth/fixtures.mjs';

const browser = await chromium.launch();
const context = await browser.newContext({
  baseURL: process.env.CLIENTAPP_OFFLINE_URL || 'http://localhost:1316',
  viewport: {width: 375, height: 812},
});
const page = await context.newPage();
const results = [];
await mkdir('tests/nutrition/artifacts', {recursive: true});
try {
  const fixture = await inviteClient();
  await api('/v1/coach/nutrition-foods', {
    method: 'POST',
    token: fixture.coachToken,
    body: {name: 'Recovery rice', calories_per_100g: 130},
  });
  await page.goto(`/invite/${fixture.token}`);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', resolve, {once: true}),
      );
    }
  });
  await page.getByRole('button', {name: 'Continue with email'}).click();
  await page.getByLabel('Verification code').fill('123456');
  await page.getByRole('button', {name: 'Verify and continue'}).click();
  await expect(page.getByRole('heading', {name: 'Today', exact: true})).toBeVisible();
  const token = await page.evaluate(() => JSON.parse(localStorage.getItem('clientapp.auth.v1')).tokens.access_token);
  const read = async () => (await api('/v1/client/nutrition-days', {token})).data[0];
  const today = (await read()).date;
  await page.getByRole('link', {name: 'Nutrition', exact: true}).click();
  await expect(page.getByText('No meals are planned or recorded for this day.')).toBeVisible();
  await page.getByRole('button', {name: 'Record another meal'}).click();
  await page.getByRole('link', {name: 'Lunch', exact: true}).click();
  await page.getByRole('button', {name: 'Add food or recipe'}).click();
  await page.getByRole('button', {name: 'Choose Recovery rice'}).click();
  await page.getByLabel('Portion (g)').fill('125');
  await expect(page.getByText('Draft saved on this device.', {exact: true})).toBeVisible();
  await page.waitForFunction((date) => {
    const key = Object.keys(localStorage).find((key) => key.endsWith('.snapshot'));
    return (
      key &&
      JSON.parse(localStorage.getItem(key)).state.queries.some(
        (query) => query.queryKey[0] === 'nutrition' && query.queryKey.at(-1) === date,
      )
    );
  }, today);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByLabel('Portion (g)')).toHaveValue('125');
  await expect(page.getByText('Showing the copy from', {exact: false})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Save meal', exact: true})).toBeDisabled();
  await page.getByLabel('Portion (g)').fill('150');
  await expect(page.getByText('Draft saved on this device.', {exact: true})).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Portion (g)')).toHaveValue('150');
  await context.setOffline(false);
  await expect(page.getByRole('button', {name: 'Save meal', exact: true})).toBeEnabled();
  expect((await read()).slots).toHaveLength(0);
  await page.evaluate(() => {
    const set = Storage.prototype.setItem;
    window.restoreStorage = () => {
      Storage.prototype.setItem = set;
    };
    Storage.prototype.setItem = function (key, value) {
      if (key.includes('.draft.nutrition.')) {
        throw new DOMException('Storage full', 'QuotaExceededError');
      }
      return set.call(this, key, value);
    };
  });
  await page.getByRole('button', {name: 'Save meal', exact: true}).click();
  await expect(page.getByText('No save was sent.', {exact: false})).toBeVisible();
  expect((await read()).slots).toHaveLength(0);
  await page.evaluate(() => window.restoreStorage());
  let writes = 0;
  let blockReads = false;
  await page.route('**/v1/client/nutrition-days?*', async (route) => {
    if (blockReads) {
      return route.abort('connectionreset');
    }
    return route.continue();
  });
  await page.route(`**/v1/client/nutrition-days/${today}`, async (route) => {
    writes++;
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    blockReads = true;
    await route.abort('connectionreset');
  });
  await page.getByRole('button', {name: 'Save meal', exact: true}).click();
  await expect(page.getByText('The save could not be confirmed.', {exact: false})).toBeVisible();
  await expect(page.getByLabel('Portion (g)')).toBeDisabled();
  await page.reload();
  await expect(page.getByRole('button', {name: 'Check meal save'})).toBeVisible();
  await page.unroute('**/v1/client/nutrition-days?*');
  await page.unroute(`**/v1/client/nutrition-days/${today}`);
  await page.reload();
  await expect(page.getByRole('button', {name: 'Check meal save'})).toBeEnabled();
  await page.getByRole('button', {name: 'Check meal save'}).click();
  await expect(page.getByText('Meal saved.', {exact: true})).toBeVisible();
  expect(writes).toBe(1);
  expect((await read()).slots[0].revision).toBe(1);
  expect((await read()).summary.logged.calories).toBe(195);
  results.push({
    scenario:
      'Offline draft restart, explicit reconnect, durable storage failure and lost response plus failed read-back recover without duplicate writes',
    passed: true,
  });
  await page.getByRole('link', {name: /Lunch/}).click();
  await page.getByLabel('Portion (g)').fill('225');
  await expect(page.getByText('Draft saved on this device.', {exact: true})).toBeVisible();
  await page.getByRole('button', {name: 'Discard local changes', exact: true}).click();
  await page.getByRole('dialog').getByRole('button', {name: 'Discard local changes'}).click();
  await expect(page.getByLabel('Portion (g)')).toHaveValue('150');
  await page.reload();
  await expect(page.getByLabel('Portion (g)')).toHaveValue('150');
  await page.getByLabel('Portion (g)').fill('0');
  await page.getByRole('button', {name: 'Save meal', exact: true}).click();
  await expect(page.getByText('Enter a portion greater than zero', {exact: false})).toBeVisible();
  expect((await read()).slots[0].revision).toBe(1);
  await page.getByLabel('Portion (g)').fill('175');
  await page.getByRole('button', {name: 'Save meal', exact: true}).click();
  await expect(page.getByText('Meal saved.', {exact: true})).toBeVisible();
  const past = new Date(`${today}T12:00:00Z`);
  past.setUTCDate(past.getUTCDate() - 10);
  await page.getByLabel('Nutrition day').fill(past.toISOString().slice(0, 10));
  await expect(page.getByText('This day is read-only.', {exact: false})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Record another meal'})).toHaveCount(0);
  await page.goto(`/nutrition/days/${today}/lunch`);
  await expect(page.getByLabel('Portion (g)')).toHaveValue('175');
  await page.evaluate(() => {
    const key = Object.keys(localStorage).find((key) => key.includes('.draft.nutrition.') && key.endsWith('.lunch'));
    localStorage.setItem(key, JSON.stringify({version: 1, date: 'wrong', attempt: {entries: []}}));
  });
  await page.reload();
  await page.getByRole('button', {name: 'Discard unreadable draft'}).click();
  await page.getByRole('dialog').getByRole('button', {name: 'Use saved meal'}).click();
  await expect(page.getByLabel('Portion (g)')).toHaveValue('175');
  results.push({
    scenario:
      'Discard resets visible fields and durable draft, invalid portion blocks write, ineligible date is read-only, corrupt draft has explicit recovery',
    passed: true,
  });
  await page.screenshot({path: 'tests/nutrition/artifacts/recovery-375.png', fullPage: true});
  await page.getByRole('link', {name: 'Your account'}).click();
  await page.getByRole('button', {name: 'Sign out', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Welcome back', exact: true})).toBeVisible();
  expect(
    await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('clientapp.private.'))),
  ).toEqual([]);
  results.push({scenario: 'Explicit sign-out clears meal drafts and cached nutrition', passed: true});
} catch (error) {
  await writeFile(
    'tests/nutrition/artifacts/recovery-cache.json',
    JSON.stringify(
      await page.evaluate(() =>
        Object.fromEntries(
          Object.keys(localStorage)
            .filter((key) => key.endsWith('.snapshot'))
            .map((key) => [key, JSON.parse(localStorage.getItem(key)).state.queries.map((query) => query.queryKey)]),
        ),
      ),
      null,
      2,
    ),
  );
  await page.screenshot({path: 'tests/nutrition/artifacts/recovery-failure.png', fullPage: true});
  await writeFile('tests/nutrition/artifacts/recovery-failure.txt', await page.locator('body').innerText());
  throw error;
} finally {
  await context.close();
  await browser.close();
  await writeFile('tests/nutrition/artifacts/recovery-results.json', JSON.stringify(results, null, 2));
}
console.log(JSON.stringify(results));
