import {mkdir, writeFile} from 'node:fs/promises';
import {_android, expect} from '@playwright/test';
import {api, inviteClient} from '../auth/fixtures.mjs';

_android.setDefaultTimeout(15_000);
const device = (await _android.devices()).find(
  (device) => device.serial() === (process.env.ANDROID_SERIAL || 'emulator-5554'),
);
if (!device) {
  throw new Error('Start the client app Android emulator and forward port 4100.');
}
const app = 'com.easy.client';
const results = [];
await mkdir('tests/nutrition/artifacts', {recursive: true});
let page;
try {
  const fixture = await inviteClient();
  await api('/v1/coach/nutrition-foods', {
    method: 'POST',
    token: fixture.coachToken,
    body: {name: 'Android rice', calories_per_100g: 130},
  });
  const read = async () =>
    (await api(`/v1/coach/clients/${fixture.clientId}/nutrition-days`, {token: fixture.coachToken})).data[0];
  const today = (await read()).date;
  const open = (path) =>
    device.shell(`am start -W -n ${app}/.MainActivity -a android.intent.action.VIEW -d easy://app${path}`);
  const connect = async () => {
    page = await (await device.webView({pkg: app})).page();
  };
  const tap = async (locator) => {
    await expect(locator).toBeVisible();
    await locator.evaluate((node) => node.scrollIntoView({block: 'center', behavior: 'instant'}));
    await locator.click({trial: true});
    const target = await locator.boundingBox();
    if (!target) {
      throw new Error('The control has no visible bounds.');
    }
    const view = await device.info({clazz: 'android.webkit.WebView', pkg: app});
    const scale = view.bounds.width / (await page.evaluate(() => innerWidth));
    await device.input.tap({
      x: view.bounds.x + (target.x + target.width / 2) * scale,
      y: view.bounds.y + (target.y + target.height / 2) * scale,
    });
  };
  await device.shell(`am force-stop ${app}`);
  await open(`/invite/${encodeURIComponent(fixture.token)}`);
  await connect();
  await expect
    .poll(
      async () =>
        (await page.getByLabel('Email', {exact: true}).isVisible()) ||
        (await page.getByRole('button', {name: 'Sign out to continue'}).isVisible()),
    )
    .toBe(true);
  if (await page.getByRole('button', {name: 'Sign out to continue'}).isVisible()) {
    await tap(page.getByRole('button', {name: 'Sign out to continue'}));
  }
  await tap(page.getByRole('button', {name: 'Continue with email'}));
  await tap(page.getByLabel('Verification code'));
  await device.input.type('123456');
  await tap(page.getByRole('button', {name: 'Verify and continue'}));
  await expect(page.getByRole('heading', {name: 'Today', exact: true})).toBeVisible();
  await open(`/nutrition/days/${today}/lunch`);
  await tap(page.getByRole('button', {name: 'Add food or recipe'}));
  await tap(page.getByLabel('Search library'));
  await device.input.type('Android rice');
  await tap(page.getByRole('button', {name: 'Search', exact: true}));
  await expect(page.getByText('1 food', {exact: true})).toBeVisible();
  await tap(page.getByRole('button', {name: 'Choose Android rice'}));
  await tap(page.getByLabel('Portion (g)'));
  await device.shell('input keyevent 123 67 67 67');
  await device.input.type('150');
  await expect(page.getByLabel('Portion (g)')).toHaveValue('150');
  await expect(page.getByText('Draft saved on this device.', {exact: true})).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-keyboard', 'open');
  await device.screenshot({path: 'tests/nutrition/artifacts/android-meal-keyboard.png'});
  await device.input.press('Back');
  await expect(page.getByRole('heading', {name: 'Lunch', exact: true})).toBeVisible();
  await device.shell('svc wifi disable');
  await device.shell('svc data disable');
  await expect(page.getByText("You're offline.", {exact: false})).toBeVisible();
  await device.shell(`am force-stop ${app}`);
  await open(`/nutrition/days/${today}/lunch`);
  await connect();
  await expect(page.getByLabel('Portion (g)')).toHaveValue('150');
  await expect(page.getByRole('button', {name: 'Save meal', exact: true})).toBeDisabled();
  await expect(page.getByText('Showing the copy from', {exact: false})).toBeVisible();
  await device.screenshot({path: 'tests/nutrition/artifacts/android-meal-offline.png'});
  await device.shell('svc wifi enable');
  await device.shell('svc data enable');
  await expect(page.getByRole('button', {name: 'Save meal', exact: true})).toBeEnabled();
  expect((await read()).slots).toHaveLength(0);
  await tap(page.getByRole('button', {name: 'Save meal', exact: true}));
  await expect(page.getByText('Meal saved.', {exact: true})).toBeVisible();
  await expect(page.getByText('Recorded: 195 kcal', {exact: true})).toBeVisible();
  await device.input.press('Home');
  await device.shell(`am start -W -n ${app}/.MainActivity`);
  await expect(page.getByText('Recorded: 195 kcal', {exact: true})).toBeVisible();
  await device.shell(`am force-stop ${app}`);
  await open(`/nutrition/days/${today}/lunch`);
  await connect();
  await expect(page.getByLabel('Portion (g)')).toHaveValue('150');
  await tap(page.getByText('View saved meal', {exact: true}));
  await expect(page.getByText('Android rice · 150 g', {exact: true})).toBeVisible();
  await device.screenshot({path: 'tests/nutrition/artifacts/android-meal-saved.png'});
  const saved = await read();
  expect(saved.slots[0].revision).toBe(1);
  expect(saved.summary.logged.calories).toBe(195);
  results.push({
    scenario:
      'Native food choice, numeric keyboard/back, offline process restart, explicit reconnect save, background/resume and saved meal cold link',
    passed: true,
  });
} catch (error) {
  await device.screenshot({path: 'tests/nutrition/artifacts/android-meal-failure.png'});
  if (page) {
    await writeFile(
      'tests/nutrition/artifacts/android-meal-failure.txt',
      await page
        .locator('body')
        .innerText()
        .catch(() => 'Webview unavailable'),
    );
  }
  throw error;
} finally {
  await device.shell('svc wifi enable');
  await device.shell('svc data enable');
  await device.close();
  await writeFile('tests/nutrition/artifacts/android-results.json', JSON.stringify(results, null, 2));
}
console.log(JSON.stringify(results));
