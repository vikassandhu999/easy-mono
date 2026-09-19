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
try {
  const fixture = await inviteClient({firstName: ''});
  const assignment = (await api(`/v1/coach/clients/${fixture.clientId}/intake`, {token: fixture.coachToken})).data;
  await api(`/v1/coach/form-templates/${assignment.form_template_id}`, {
    method: 'PATCH',
    token: fixture.coachToken,
    body: {
      name: 'Android check-in',
      expected_revision: assignment.form_template.revision,
      sections: [
        {
          questions: [
            {id: 'goal', label: 'Your goal', type: 'text', required: true},
            {id: 'photos', label: 'Progress views', type: 'photo'},
          ],
        },
      ],
    },
  });
  await device.shell(`am force-stop ${app}`);
  await device.shell(
    `am start -W -n ${app}/.MainActivity -a android.intent.action.VIEW -d easy://app/invite/${encodeURIComponent(fixture.token)}`,
  );
  let page = await pageForApp();
  const tap = async (locator) => {
    await expect(locator).toBeVisible();
    await locator.scrollIntoViewIfNeeded();
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
  await device.screenshot({path: 'tests/auth/artifacts/android-keyboard.png'});
  await tap(page.getByRole('button', {name: 'Verify and continue'}));
  await tap(page.getByRole('link', {name: 'Your account', exact: true}));
  await tap(page.getByLabel('First name'));
  await device.input.type('Android saved client');
  await expect(page.getByLabel('First name')).toHaveValue('Android saved client');
  await expect(page.getByText('Draft saved on this device.', {exact: true})).toBeVisible();
  await device.shell(`am force-stop ${app}`);
  await launch();
  page = await pageForApp();
  await tap(page.getByRole('link', {name: 'Your account', exact: true}));
  await expect(page.getByLabel('First name')).toHaveValue('Android saved client');
  await expect(page.getByText('Your unsaved details were restored.')).toBeVisible();
  await tap(page.getByRole('button', {name: 'Save details'}));
  await expect(page.getByText('Your details are saved.')).toBeVisible();
  await device.input.press('Home');
  await launch();
  await expect(page.getByLabel('First name')).toHaveValue('Android saved client');
  await device.input.press('Back');
  await expect(page.getByRole('heading', {name: 'Your coaching'})).toBeVisible();
  results.push({
    scenario:
      'native invite, OTP keyboard, profile draft after process restart, save, background/resume and Android back',
    passed: true,
  });

  await tap(page.getByRole('link', {name: 'Forms & check-ins', exact: true}));
  await tap(page.getByRole('link', {name: /Android check-in/}));
  await tap(page.getByLabel('Your goal', {exact: false}));
  await device.input.type('A steady Android routine');
  await expect(page.getByLabel('Your goal', {exact: false})).toHaveValue('A steady Android routine');
  await expect(page.getByText('Draft saved on this device.', {exact: true})).toBeVisible();
  await device.input.press('Back');
  await expect(page.getByRole('heading', {name: 'Android check-in'})).toBeVisible();
  await tap(page.getByRole('button', {name: 'Choose photo', exact: true}));
  await device.wait({pkg: 'com.google.android.photopicker'}, {timeout: 15_000});
  await device.screenshot({path: 'tests/auth/artifacts/android-photo-picker.png'});
  await device.input.press('Back');
  await expect(page.getByLabel('Your goal', {exact: false})).toHaveValue('A steady Android routine');
  await device.shell('svc wifi disable');
  await device.shell('svc data disable');
  await expect(page.getByText("You're offline.", {exact: false})).toBeVisible();
  await device.shell(`am force-stop ${app}`);
  await device.shell(
    `am start -W -n ${app}/.MainActivity -a android.intent.action.VIEW -d easy://app/forms/${assignment.id}`,
  );
  page = await pageForApp();
  await expect(page.getByLabel('Your goal', {exact: false})).toHaveValue('A steady Android routine');
  await expect(page.getByText('Your unsent answers were restored.')).toBeVisible();
  await expect(page.getByRole('button', {name: 'Send response'})).toBeDisabled();
  await expect(page.getByText('Showing the copy from', {exact: false})).toBeVisible();
  await tap(page.getByLabel('Your goal', {exact: false}));
  await page.getByLabel('Your goal', {exact: false}).press('End');
  await device.input.type(' offline');
  await expect(page.getByLabel('Your goal', {exact: false})).toHaveValue('A steady Android routine offline');
  await expect(page.getByText('Draft saved on this device.', {exact: true})).toBeVisible();
  await device.shell(`am force-stop ${app}`);
  await device.shell(
    `am start -W -n ${app}/.MainActivity -a android.intent.action.VIEW -d easy://app/forms/${assignment.id}`,
  );
  page = await pageForApp();
  await expect(page.getByLabel('Your goal', {exact: false})).toHaveValue('A steady Android routine offline');
  await expect(page.getByRole('button', {name: 'Send response'})).toBeDisabled();
  await device.screenshot({path: 'tests/auth/artifacts/android-offline-form.png'});
  await device.shell('svc wifi enable');
  await device.shell('svc data enable');
  await expect(page.getByRole('button', {name: 'Send response'})).toBeEnabled();
  await tap(page.getByRole('button', {name: 'Send response'}));
  await expect(page.getByText(/Response saved/)).toBeVisible();
  await device.shell(`am force-stop ${app}`);
  await device.shell(
    `am start -W -n ${app}/.MainActivity -a android.intent.action.VIEW -d easy://app/forms/${assignment.id}`,
  );
  page = await pageForApp();
  await expect(page.getByText('A steady Android routine offline', {exact: true})).toBeVisible();
  await expect(page.getByRole('link', {name: 'Back to your forms'})).toBeVisible();
  await device.screenshot({path: 'tests/auth/artifacts/android-saved-form.png'});
  results.push({
    scenario:
      'native form draft, gallery cancellation, network disabled across two process restarts, offline editing, reconnection, deliberate save and saved response restart',
    passed: true,
  });
  await tap(page.getByRole('link', {name: 'Your account', exact: true}));
  await expect(page.getByLabel('First name')).toHaveValue('Android saved client');
  await tap(page.getByRole('button', {name: 'Sign out', exact: true}));
  await expect(page.getByRole('heading', {name: 'Welcome back'})).toBeVisible();
  await device.shell(`am force-stop ${app}`);
  await launch();
  page = await pageForApp();
  await expect(page.getByRole('heading', {name: 'Welcome back'})).toBeVisible();
  results.push({scenario: 'logout survives process restart', passed: true});
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
