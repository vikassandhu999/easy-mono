import {mkdir, writeFile} from 'node:fs/promises';
import {_android, expect} from '@playwright/test';
import {inviteClient} from '../auth/fixtures.mjs';

_android.setDefaultTimeout(15_000);
const device = (await _android.devices()).find(
  (item) => item.serial() === (process.env.ANDROID_SERIAL || 'emulator-5554'),
);
if (!device) {
  throw new Error('Start the client app Android emulator and forward port 4100.');
}
const app = 'com.easy.client';
await mkdir('tests/account/artifacts', {recursive: true});
let page;
const results = [];
try {
  const fixture = await inviteClient();
  const open = (path) =>
    device.shell(`am start -W -n ${app}/.MainActivity -a android.intent.action.VIEW -d easy://app${path}`);
  const connect = async () => {
    page = await (await device.webView({pkg: app})).page();
  };
  const tap = async (locator) => {
    await expect(locator).toBeVisible();
    await locator.evaluate((node) => node.scrollIntoView({block: 'center', behavior: 'instant'}));
    await locator.click({trial: true});
    const bounds = await locator.boundingBox();
    if (!bounds) {
      throw new Error('Control has no visible bounds.');
    }
    const view = await device.info({clazz: 'android.webkit.WebView', pkg: app});
    const scale = view.bounds.width / (await page.evaluate(() => innerWidth));
    await device.input.tap({
      x: view.bounds.x + (bounds.x + bounds.width / 2) * scale,
      y: view.bounds.y + (bounds.y + bounds.height / 2) * scale,
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
  await open('/account/goal');
  const value = () => page.getByRole('textbox', {name: 'Goal weight', exact: true});
  await tap(page.getByRole('button', {name: /Goal unit/}));
  await expect(page.getByRole('listbox')).toBeVisible();
  await device.input.press('Back');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await expect(value()).toBeVisible();
  await tap(value());
  await device.input.type('74.25');
  await expect(value()).toHaveValue('74.25');
  await expect(page.locator('html')).toHaveAttribute('data-keyboard', 'open');
  await expect(page.getByText('Draft saved on this device.', {exact: true})).toBeVisible();
  const save = page.getByRole('button', {name: 'Save goal', exact: true});
  const bounds = await save.boundingBox();
  const viewport = await page.evaluate(() => ({height: visualViewport.height, offset: visualViewport.offsetTop}));
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height + viewport.offset + 1);
  await device.screenshot({path: 'tests/account/artifacts/android-goal-keyboard.png'});
  await device.input.press('Back');
  await expect(page.getByRole('heading', {name: 'Weight goal', exact: true})).toBeVisible();
  await device.shell('svc wifi disable');
  await device.shell('svc data disable');
  await expect(page.getByText("You're offline.", {exact: false})).toBeVisible();
  await device.shell(`am force-stop ${app}`);
  await open('/account/goal');
  await connect();
  await expect(value()).toHaveValue('74.25');
  await expect(page.getByRole('button', {name: 'Save goal', exact: true})).toBeDisabled();
  await device.screenshot({path: 'tests/account/artifacts/android-goal-offline.png'});
  await device.shell('svc wifi enable');
  await device.shell('svc data enable');
  await expect(page.getByRole('button', {name: 'Save goal', exact: true})).toBeEnabled();
  await tap(value());
  await expect(page.locator('html')).toHaveAttribute('data-keyboard', 'open');
  await tap(page.getByRole('button', {name: 'Save goal', exact: true}));
  await expect(page.getByText('Your goal is saved.', {exact: true})).toBeVisible();
  await device.input.press('Back');
  await tap(page.getByRole('button', {name: 'Remove goal', exact: true}));
  await expect(page.getByRole('dialog')).toBeVisible();
  await device.input.press('Back');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', {name: 'Weight goal'})).toBeVisible();
  await device.input.press('Home');
  await device.shell(`am start -W -n ${app}/.MainActivity`);
  await expect(value()).toHaveValue('74.25');
  await device.shell(`am force-stop ${app}`);
  await open('/account/goal');
  await connect();
  await expect(value()).toHaveValue('74.25');
  await device.screenshot({path: 'tests/account/artifacts/android-goal-saved.png'});
  results.push({
    scenario:
      'Native decimal keyboard and reachable save, offline process restart, deliberate save, sheet Android Back, background/resume and saved cold link',
    passed: true,
  });
} catch (error) {
  await device.screenshot({path: 'tests/account/artifacts/android-goal-failure.png'});
  if (page) {
    await writeFile(
      'tests/account/artifacts/android-goal-failure.txt',
      await page
        .locator('body')
        .innerText()
        .catch(() => 'WebView unavailable'),
    );
  }
  throw error;
} finally {
  await device.shell('svc wifi enable');
  await device.shell('svc data enable');
  await device.close();
  await writeFile('tests/account/artifacts/android-results.json', JSON.stringify(results, null, 2));
}
console.log(JSON.stringify(results));
process.exit(0);
