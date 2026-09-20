import {mkdir, writeFile} from 'node:fs/promises';
import {chromium, expect} from '@playwright/test';
import {api, inviteClient} from '../auth/fixtures.mjs';

const browser = await chromium.launch();
const context = await browser.newContext({baseURL: 'http://localhost:1316', viewport: {width: 375, height: 812}});
const page = await context.newPage();
await mkdir('tests/progress/artifacts', {recursive: true});
try {
  const fixture = await inviteClient();
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
  const date = (await api('/v1/client/me', {token})).data.local_date;
  const read = async () => (await api(`/v1/client/weight-entry?date=${date}`, {token})).data;
  await page.goto(`/progress/weight/${date}`);
  const value = page.getByRole('textbox', {name: 'Weight', exact: true});
  await expect(value).toHaveValue('');
  await value.fill('80');
  await expect(page.getByText('Draft saved on this device.', {exact: true})).toBeVisible();
  await page.waitForFunction((day) => {
    const key = Object.keys(localStorage).find((key) => key.endsWith('.snapshot'));
    return (
      key &&
      JSON.parse(localStorage.getItem(key)).state.queries.some(
        (query) => query.queryKey[0] === 'weight' && query.queryKey.at(-1) === day,
      )
    );
  }, date);
  await context.setOffline(true);
  await page.reload();
  await expect(value).toHaveValue('80');
  await expect(page.getByRole('button', {name: 'Save weight', exact: true})).toBeDisabled();
  await value.fill('79.8');
  await expect(page.getByText('Draft saved on this device.', {exact: true})).toBeVisible();
  await page.reload();
  await expect(value).toHaveValue('79.8');
  await context.setOffline(false);
  await expect(page.getByRole('button', {name: 'Save weight', exact: true})).toBeEnabled();
  expect(await read()).toBeNull();
  await page.evaluate(() => {
    const set = Storage.prototype.setItem;
    window.restoreStorage = () => {
      Storage.prototype.setItem = set;
    };
    Storage.prototype.setItem = function (key, data) {
      if (key.includes('.draft.weight.')) {
        throw new DOMException('Storage full', 'QuotaExceededError');
      }
      return set.call(this, key, data);
    };
  });
  await page.getByRole('button', {name: 'Save weight', exact: true}).click();
  await expect(page.getByText('No save was sent.', {exact: false})).toBeVisible();
  expect(await read()).toBeNull();
  await page.evaluate(() => window.restoreStorage());
  let writes = 0;
  let blockReads = false;
  await page.route('**/v1/client/weight-entry?*', (route) =>
    blockReads ? route.abort('connectionreset') : route.continue(),
  );
  await page.route('**/v1/client/weight_entries', async (route) => {
    writes++;
    const response = await route.fetch();
    expect(response.ok()).toBe(true);
    blockReads = true;
    await route.abort('connectionreset');
  });
  await page.getByRole('button', {name: 'Save weight', exact: true}).click();
  await expect.poll(() => writes).toBe(1);
  await expect(page.getByText('The save could not be confirmed.', {exact: false})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Check save', exact: true})).toBeVisible();
  await expect(value).toBeDisabled();
  await page.reload();
  await expect(value).toHaveValue('79.8');
  await page.unroute('**/v1/client/weight-entry?*');
  await page.unroute('**/v1/client/weight_entries');
  await page.reload();
  await expect(page.getByRole('button', {name: 'Check save', exact: true})).toBeEnabled();
  await page.getByRole('button', {name: 'Check save', exact: true}).click();
  await expect(page.getByText('Your weight is saved.', {exact: true})).toBeVisible();
  expect(writes).toBe(1);
  expect((await read()).revision).toBe(1);
  await page.getByRole('link', {name: /^Edit weight/}).click();
  await expect(value).toHaveValue('79.80');
  await value.fill('79.2');
  await expect(page.getByText('Draft saved on this device.', {exact: true})).toBeVisible();
  await api('/v1/client/weight_entries', {
    token,
    method: 'POST',
    body: {date, value: 80.1, unit: 'kg', note: 'Another device'},
  });
  await page.getByRole('button', {name: 'Save weight', exact: true}).click();
  await expect(page.getByRole('button', {name: 'Review my draft'})).toBeVisible();
  expect(Number((await read()).value)).toBe(80.1);
  await page.getByRole('button', {name: 'Review my draft'}).click();
  await expect(page.getByRole('dialog')).toContainText('80.10 kg');
  await page.getByRole('dialog').getByRole('button', {name: 'Use my draft'}).click();
  await expect(value).toHaveValue('79.2');
  await page.getByRole('button', {name: 'Save weight', exact: true}).click();
  await expect(page.getByText('Your weight is saved.', {exact: true})).toBeVisible();
  expect(Number((await read()).value)).toBe(79.2);
  await page.getByRole('link', {name: /^Edit weight/}).click();
  await value.fill('78');
  await expect(page.getByText('Draft saved on this device.', {exact: true})).toBeVisible();
  await page.getByRole('button', {name: 'Discard draft', exact: true}).click();
  await page.getByRole('dialog').getByRole('button', {name: 'Use saved weight'}).click();
  await expect(value).toHaveValue('79.20');
  await page.reload();
  await expect(value).toHaveValue('79.20');
  await page.evaluate(() => {
    const key = Object.keys(localStorage).find((key) => key.includes('.draft.weight.'));
    localStorage.setItem(key, JSON.stringify({version: 1, date: 'invalid'}));
  });
  await page.reload();
  await page.getByRole('button', {name: 'Discard unreadable draft'}).click();
  await page.getByRole('dialog').getByRole('button', {name: 'Use saved weight'}).click();
  await expect(value).toHaveValue('79.20');
  await page.screenshot({path: 'tests/progress/artifacts/recovery-375.png', fullPage: true});
  let release;
  let committed;
  const savedOnServer = new Promise((resolve) => {
    committed = resolve;
  });
  await page.route('**/v1/client/weight_entries', async (route) => {
    const response = await route.fetch();
    const held = new Promise((resolve) => {
      release = resolve;
    });
    committed();
    await held;
    await route.fulfill({response});
  });
  await value.fill('79.3');
  await page.getByRole('button', {name: 'Save weight', exact: true}).click();
  await savedOnServer;
  await page.getByRole('link', {name: 'Back', exact: true}).click();
  await page.getByRole('link', {name: 'Messages', exact: true}).click();
  release();
  await expect
    .poll(() => page.evaluate(() => Object.keys(localStorage).filter((key) => key.includes('.draft.weight.'))))
    .toEqual([]);
  await expect(page).toHaveURL('/messages');
  expect(Number((await read()).value)).toBe(79.3);
  await page.getByRole('link', {name: 'Your account'}).click();
  await page.getByRole('button', {name: 'Sign out', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Welcome back'})).toBeVisible();
  expect(
    await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('clientapp.private.'))),
  ).toEqual([]);
} catch (error) {
  await page.screenshot({path: 'tests/progress/artifacts/recovery-failure.png', fullPage: true});
  await writeFile('tests/progress/artifacts/recovery-failure.txt', await page.locator('body').innerText());
  throw error;
} finally {
  await context.close();
  await browser.close();
}
console.log(
  'Weight offline restart, storage failure, uncertain save restart, conflict review, discard, corrupt draft and sign-out passed.',
);
