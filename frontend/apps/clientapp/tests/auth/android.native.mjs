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
  const fixture = await inviteClient({firstName: ''});
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
  await tap(page.getByLabel('First name'));
  await device.input.type('Android saved client');
  await expect(page.getByLabel('First name')).toHaveValue('Android saved client');
  await expect(page.getByText('Draft saved on this device.', {exact: true})).toBeVisible();
  await stop();
  await launch();
  page = await pageForApp();
  await tap(page.getByRole('link', {name: 'Your account', exact: true}));
  await tap(page.getByRole('link', {name: 'Personal details', exact: true}));
  await expect(page.getByLabel('First name')).toHaveValue('Android saved client');
  await expect(page.getByText('Your unsaved details were restored.')).toBeVisible();
  await tap(page.getByRole('button', {name: 'Save details'}));
  await expect(page.getByText('Your details are saved.')).toBeVisible();
  await device.input.press('Home');
  await launch();
  await expect(page.getByLabel('First name')).toHaveValue('Android saved client');
  await device.input.press('Back');
  await expect(page.getByRole('heading', {name: 'Your account', exact: true})).toBeVisible();
  await device.input.press('Back');
  await expect(page.getByRole('heading', {name: 'Today', exact: true})).toBeVisible();
  results.push({
    scenario:
      'native invite, OTP keyboard, profile draft after process restart, save, background/resume and Android back',
    passed: true,
  });

  await tap(page.getByRole('navigation', {name: 'Main navigation'}).getByRole('link', {name: 'Training', exact: true}));
  await expect(page.getByText('Your coach hasn’t scheduled a training plan for today.', {exact: true})).toBeVisible();
  await expect(page.getByText('Loading your active workout…', {exact: true})).toHaveCount(0);
  await tap(page.getByRole('button', {name: 'Start freestyle workout'}));
  await expect(page).toHaveURL(/\/training\/sessions\//);
  const workoutId = new URL(page.url()).pathname.split('/').at(-1);
  await tap(page.getByLabel('Exercise name'));
  await device.input.type('Android squat');
  await tap(page.getByRole('textbox', {name: 'Reps', exact: true}));
  await device.input.type('12');
  await expect(page.getByRole('textbox', {name: 'Reps', exact: true})).toHaveValue('12');
  await expect(page.getByText('Draft saved on this device.', {exact: true})).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-keyboard', 'open');
  await device.screenshot({path: 'tests/auth/artifacts/android-training-keyboard.png'});
  await device.input.press('Back');
  await expect(page.getByRole('heading', {name: 'Freestyle workout', exact: true})).toBeVisible();
  await device.shell('svc wifi disable');
  await device.shell('svc data disable');
  await expect(page.getByText("You're offline.", {exact: false})).toBeVisible();
  await stop();
  await device.shell(
    `am start -W -n ${app}/.MainActivity -a android.intent.action.VIEW -d easy://app/training/sessions/${workoutId}`,
  );
  page = await pageForApp();
  await expect(page.getByRole('textbox', {name: 'Reps', exact: true})).toHaveValue('12');
  await expect(page.getByLabel('Exercise name')).toHaveValue('Android squat');
  await expect(page.getByRole('button', {name: 'Save set', exact: true})).toBeDisabled();
  await expect(page.getByText('Showing the copy from', {exact: false})).toBeVisible();
  await device.shell('svc wifi enable');
  await device.shell('svc data enable');
  await expect(page.getByText("You're offline.", {exact: false})).toHaveCount(0, {timeout: 30_000});
  await expect(page.getByRole('button', {name: 'Save set', exact: true})).toBeEnabled();
  await tap(page.getByLabel('Reps', {exact: true}));
  await expect(page.locator('html')).toHaveAttribute('data-keyboard', 'open');
  const setSaveBounds = await page.getByRole('button', {name: 'Save set', exact: true}).boundingBox();
  const keyboardViewport = await page.evaluate(() => ({height: visualViewport.height, top: visualViewport.offsetTop}));
  expect(setSaveBounds.y + setSaveBounds.height).toBeLessThanOrEqual(
    keyboardViewport.height + keyboardViewport.top + 1,
  );
  await tap(page.getByRole('button', {name: 'Save set', exact: true}));
  await expect(page.getByText('Set saved.', {exact: true})).toBeVisible();
  await device.input.press('Home');
  await launch();
  await expect(page.getByRole('list', {name: 'Saved sets'}).getByRole('listitem')).toHaveCount(1);
  await tap(page.getByRole('button', {name: 'Workout notes & soreness', exact: true}));
  await page.getByLabel('Workout notes', {exact: true}).fill('Steady on Android.');
  await tap(page.getByLabel('Workout notes', {exact: true}));
  await expect(page.locator('html')).toHaveAttribute('data-keyboard', 'open');
  expect(
    await page
      .getByRole('button', {name: 'Save set', exact: true})
      .evaluate((node) => Boolean(node.closest('[inert]'))),
  ).toBe(true);
  await tap(page.getByRole('button', {name: 'Save workout notes', exact: true}));
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('Workout notes saved.', {exact: true})).toBeVisible();
  await tap(page.getByRole('button', {name: 'Finish workout', exact: true}));
  await tap(page.getByRole('dialog').getByRole('button', {name: 'Finish and save workout'}));
  await expect(page.getByRole('link', {name: 'Back to workout history'})).toBeVisible();
  await stop();
  await device.shell(
    `am start -W -n ${app}/.MainActivity -a android.intent.action.VIEW -d easy://app/training/sessions/${workoutId}`,
  );
  page = await pageForApp();
  await expect(page.getByText('12 reps', {exact: true})).toBeVisible();
  const workout = (
    await api(`/v1/coach/clients/${fixture.clientId}/training-sessions/${workoutId}`, {token: fixture.coachToken})
  ).data;
  expect(workout.state).toBe('completed');
  expect(workout.performed_sets).toHaveLength(1);
  expect(workout.notes).toBe('Steady on Android.');
  await device.screenshot({path: 'tests/auth/artifacts/android-training-saved.png'});
  results.push({
    scenario:
      'native training keyboard/back, offline draft process restart, explicit set save, background/resume, finish and saved deep link',
    passed: true,
  });
  await tap(page.getByRole('link', {name: 'Back to workout history', exact: true}));
  await expect(page.getByText('1 workout', {exact: true})).toBeVisible();
  await expect(page.getByText('Loading your active workout…', {exact: true})).toHaveCount(0);
  await tap(page.getByRole('button', {name: 'Filter workouts'}));
  await expect(page.getByRole('dialog')).toBeVisible();
  await device.input.press('Back');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', {name: 'Training', exact: true})).toBeVisible();
  await tap(page.getByRole('link', {name: 'Your account', exact: true}));
  await tap(page.getByRole('link', {name: 'Personal details', exact: true}));
  await expect(page.getByLabel('First name')).toHaveValue('Android saved client');
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
