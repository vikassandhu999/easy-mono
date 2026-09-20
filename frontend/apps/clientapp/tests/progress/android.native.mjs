import {mkdir, writeFile} from 'node:fs/promises';
import {_android, expect} from '@playwright/test';
import {api, inviteClient} from '../auth/fixtures.mjs';

_android.setDefaultTimeout(15_000);
const device = (await _android.devices()).find(
  (item) => item.serial() === (process.env.ANDROID_SERIAL || 'emulator-5554'),
);
if (!device) {
  throw new Error('Start the client app Android emulator and forward port 4100.');
}
const app = 'com.easy.client';
await mkdir('tests/progress/artifacts', {recursive: true});
let page;
const results = [];
try {
  const fixture = await inviteClient();
  const today = (await api(`/v1/coach/clients/${fixture.clientId}/nutrition-days`, {token: fixture.coachToken})).data[0]
    .date;
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
  const read = async () =>
    (
      await api(`/v1/coach/clients/${fixture.clientId}/weight-progress?from=${today}&to=${today}&unit=kg`, {
        token: fixture.coachToken,
      })
    ).data[0] ?? null;
  await open(`/progress/weight/${today}`);
  const value = () => page.getByRole('textbox', {name: 'Weight', exact: true});
  await tap(page.getByRole('button', {name: /Weight unit/}));
  await expect(page.getByRole('listbox')).toBeVisible();
  await device.input.press('Back');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await expect(value()).toBeVisible();
  await tap(value());
  await device.input.type('74.25');
  await expect(value()).toHaveValue('74.25');
  await expect(page.locator('html')).toHaveAttribute('data-keyboard', 'open');
  await expect(page.getByText('Draft saved on this device.', {exact: true})).toBeVisible();
  const save = page.getByRole('button', {name: 'Save weight', exact: true});
  const bounds = await save.boundingBox();
  const viewport = await page.evaluate(() => ({height: visualViewport.height, offset: visualViewport.offsetTop}));
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height + viewport.offset + 1);
  await device.screenshot({path: 'tests/progress/artifacts/android-weight-keyboard.png'});
  await device.input.press('Back');
  await expect(page.getByRole('heading', {name: 'Record weight', exact: true})).toBeVisible();
  await device.shell('svc wifi disable');
  await device.shell('svc data disable');
  await expect(page.getByText("You're offline.", {exact: false})).toBeVisible();
  await device.shell(`am force-stop ${app}`);
  await open(`/progress/weight/${today}`);
  await connect();
  await expect(value()).toHaveValue('74.25');
  await expect(page.getByRole('button', {name: 'Save weight', exact: true})).toBeDisabled();
  await device.screenshot({path: 'tests/progress/artifacts/android-weight-offline.png'});
  await device.shell('svc wifi enable');
  await device.shell('svc data enable');
  await expect(page.getByText("You're offline.", {exact: false})).toHaveCount(0, {timeout: 30_000});
  await expect(page.getByRole('button', {name: 'Save weight', exact: true})).toBeEnabled();
  expect(await read()).toBeNull();
  await tap(value());
  await expect(page.locator('html')).toHaveAttribute('data-keyboard', 'open');
  await tap(page.getByRole('button', {name: 'Save weight', exact: true}));
  await expect(page.getByText('Your weight is saved.', {exact: true})).toBeVisible();
  expect(Number((await read()).value)).toBe(74.25);
  // Save navigates while the software keyboard is closing. Wait for native resize
  // before converting the next control's web bounds into device coordinates.
  await expect(page.locator('html')).not.toHaveAttribute('data-keyboard', 'open');
  await tap(page.getByRole('button', {name: 'Date range & units'}));
  await expect(page.getByRole('dialog', {name: 'Your progress view'})).toBeVisible();
  await device.input.press('Back');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', {name: 'Weight & progress'})).toBeVisible();
  await device.input.press('Home');
  await device.shell(`am start -W -n ${app}/.MainActivity`);
  await expect(page.getByText('1 weight record', {exact: true})).toBeVisible();
  await device.shell(`am force-stop ${app}`);
  await open(`/progress/weight/${today}`);
  await connect();
  await expect(value()).toHaveValue('74.25');
  await device.screenshot({path: 'tests/progress/artifacts/android-weight-saved.png'});
  expect((await read()).revision).toBe(1);
  results.push({
    scenario:
      'Native decimal keyboard and reachable save, offline process restart, deliberate save, sheet Android Back, background/resume and saved cold link',
    passed: true,
  });
} catch (error) {
  await device.screenshot({path: 'tests/progress/artifacts/android-weight-failure.png'});
  if (page) {
    await writeFile(
      'tests/progress/artifacts/android-weight-failure.txt',
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
  await writeFile('tests/progress/artifacts/android-results.json', JSON.stringify(results, null, 2));
}
console.log(JSON.stringify(results));
process.exit(0);
