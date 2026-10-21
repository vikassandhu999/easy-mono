import {mkdir, writeFile} from 'node:fs/promises';
import {_android, expect} from '@playwright/test';
import {api, inviteClient} from './fixtures.mjs';

_android.setDefaultTimeout(15_000);
const device = (await _android.devices()).find(
  (device) => device.serial() === (process.env.ANDROID_SERIAL || 'emulator-5554'),
);
if (!device) {
  throw new Error('Start the client app Android emulator and forward port 4100 before running this test.');
}
const results = [];
await mkdir('tests/auth/artifacts', {recursive: true});
const app = 'com.easy.client';
const launch = () => device.shell(`am start -W -n ${app}/.MainActivity`);
const pageForApp = async () => (await device.webView({pkg: app})).page();
const stop = async () => {
  await device.shell(`am force-stop ${app}`);
  await expect.poll(() => device.webViews().some((view) => view.pkg() === app), {timeout: 15_000}).toBe(false);
};
try {
  const fixture = await inviteClient({fullName: 'Client'});
  await stop();
  await device.shell(
    `am start -W -n ${app}/.MainActivity -a android.intent.action.VIEW -d easy://app/invite/${encodeURIComponent(fixture.token)}`,
  );
  let page = await pageForApp();
  const tap = async (locator) => {
    await expect(locator).toBeVisible();
    await locator.evaluate((node) => node.scrollIntoView({block: 'center', behavior: 'instant'}));
    await locator.click({trial: true});
    const target = await locator.boundingBox();
    if (!target) {
      throw new Error('The mobile control has no visible bounds.');
    }
    const view = await device.info({clazz: 'android.webkit.WebView', pkg: app});
    const width = await page.evaluate(() => innerWidth);
    const scale = view.bounds.width / width;
    await device.input.tap({
      x: view.bounds.x + (target.x + target.width / 2) * scale,
      y: view.bounds.y + (target.y + target.height / 2) * scale,
    });
  };
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
  await expect(page.getByLabel('Email', {exact: true})).toHaveValue(fixture.email);
  await tap(page.getByRole('button', {name: 'Continue with email'}));
  await tap(page.getByLabel('Verification code'));
  await device.input.type('123456');
  await expect(page.getByLabel('Verification code')).toHaveValue('123456');
  await expect(page.locator('html')).toHaveAttribute('data-keyboard', 'open');
  const verify = await page.getByRole('button', {name: 'Verify and continue'}).boundingBox();
  expect(verify.y + verify.height).toBeLessThanOrEqual(
    await page.evaluate(() => visualViewport.height + visualViewport.offsetTop),
  );
  await device.screenshot({path: 'tests/auth/artifacts/android-keyboard.png'});
  await tap(page.getByRole('button', {name: 'Verify and continue'}));
  await expect(page.getByRole('heading', {name: 'Today', exact: true})).toBeVisible();
  const credentialState = () =>
    page.evaluate(async () => {
      const plugins = window.Capacitor.Plugins;
      const key = 'clientapp.auth.v1';
      const ordinary = await plugins.Preferences.get({key});
      const vault = await plugins.SecureStorage.internalGetItem({prefixedKey: `capacitor-storage_${key}`, sync: false});
      const session = JSON.parse(vault.data);
      return {
        plaintextPresent: ordinary.value !== null,
        accountId: session.accountId,
        authenticated: Boolean(session.tokens?.refresh_token),
      };
    });
  expect(await credentialState()).toEqual({plaintextPresent: false, accountId: fixture.clientId, authenticated: true});
  // Recreate the pre-migration format, with a different value in the secure store.
  await page.evaluate(async () => {
    const plugins = window.Capacitor.Plugins;
    const key = 'clientapp.auth.v1';
    const prefixedKey = `capacitor-storage_${key}`;
    const vault = await plugins.SecureStorage.internalGetItem({prefixedKey, sync: false});
    const expired = {...JSON.parse(vault.data), expiresAt: 1};
    await plugins.DurableStorage.set({key, value: JSON.stringify(expired)});
    await plugins.DurableStorage.remove({key: 'clientapp.credentials.v1'});
    await plugins.SecureStorage.internalSetItem({prefixedKey, data: '{}', sync: false});
  });
  await stop();
  await launch();
  page = await pageForApp();
  await expect(page.getByRole('heading', {name: 'Today', exact: true})).toBeVisible();
  expect(await credentialState()).toEqual({plaintextPresent: false, accountId: fixture.clientId, authenticated: true});
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const {data} = await window.Capacitor.Plugins.SecureStorage.internalGetItem({
            prefixedKey: 'capacitor-storage_clientapp.auth.v1',
            sync: false,
          });
          return JSON.parse(data).expiresAt > Date.now();
        }),
      {timeout: 15_000},
    )
    .toBe(true);
  const encrypted = (
    await device.shell('run-as com.easy.client cat shared_prefs/WSSecureStorageSharedPreferences.xml')
  ).toString();
  expect(encrypted).toContain('capacitor-storage_clientapp.auth.v1');
  expect(encrypted).not.toContain('refresh_token');
  expect(encrypted).not.toContain('access_token');
  expect(encrypted).not.toContain(fixture.clientId);
  results.push({
    scenario: 'encrypted native session, legacy migration/refresh, plaintext cleanup and authenticated restart',
    passed: true,
  });
  await tap(page.getByRole('link', {name: 'Your account', exact: true}));
  await tap(page.getByRole('link', {name: 'Personal details', exact: true}));
  await page.getByLabel('Full name').fill('');
  await tap(page.getByLabel('Full name'));
  await device.input.type('Android saved client');
  await expect(page.getByLabel('Full name')).toHaveValue('Android saved client');
  await expect(page.getByText('Draft saved on this device.', {exact: true})).toBeVisible();
  await stop();
  await launch();
  page = await pageForApp();
  await tap(page.getByRole('link', {name: 'Your account', exact: true}));
  await tap(page.getByRole('link', {name: 'Personal details', exact: true}));
  await expect(page.getByLabel('Full name')).toHaveValue('Android saved client');
  await expect(page.getByText('Your unsaved details were restored.')).toBeVisible();
  await tap(page.getByRole('button', {name: 'Save details'}));
  await expect(page.getByText('Your details are saved.')).toBeVisible();
  await device.input.press('Home');
  await launch();
  await expect(page.getByLabel('Full name')).toHaveValue('Android saved client');
  await device.input.press('Back');
  await expect(page.getByRole('heading', {name: 'Your account', exact: true})).toBeVisible();
  await device.input.press('Back');
  await expect(page.getByRole('heading', {name: 'Today', exact: true})).toBeVisible();
  results.push({
    scenario:
      'native invite, OTP keyboard, profile draft after process restart, save, background/resume and Android back',
    passed: true,
  });

  await tap(page.getByRole('link', {name: 'Your account', exact: true}));
  await tap(page.getByRole('link', {name: 'Personal details', exact: true}));
  await expect(page.getByLabel('Full name')).toHaveValue('Android saved client');
  await tap(page.getByRole('link', {name: 'Back', exact: true}));
  await tap(page.getByRole('button', {name: 'Sign out', exact: true}));
  await expect(page.getByRole('heading', {name: 'Welcome back'})).toBeVisible();
  await stop();
  await launch();
  page = await pageForApp();
  await expect(page.getByRole('heading', {name: 'Welcome back'})).toBeVisible();
  expect(await credentialState()).toEqual({plaintextPresent: false, accountId: undefined, authenticated: false});
  results.push({scenario: 'logout survives process restart and removes usable credentials', passed: true});
} catch (error) {
  await device.screenshot({path: 'tests/auth/artifacts/android-failure.png'});
  throw error;
} finally {
  await device.shell('svc wifi enable');
  await device.shell('svc data enable');
  await device.close();
  await writeFile('tests/auth/artifacts/android-results.json', JSON.stringify(results, null, 2));
}
console.log(JSON.stringify(results));
// Playwright's experimental Android transport retains a socket after device.close().
// All assertions, device cleanup, and evidence writes have completed at this point.
process.exit(0);
