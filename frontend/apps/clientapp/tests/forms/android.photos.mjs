import {mkdir, writeFile} from 'node:fs/promises';
import {_android, expect} from '@playwright/test';
import {api, inviteClient} from '../auth/fixtures.mjs';

_android.setDefaultTimeout(15_000);
const device = (await _android.devices()).find(
  (device) => device.serial() === (process.env.ANDROID_SERIAL || 'emulator-5554'),
);
if (!device) {
  throw new Error('Start the client app Android emulator and forward port 4100 before running this test.');
}
const results = [];
await mkdir('tests/forms/artifacts', {recursive: true});
const app = 'com.easy.client';
const recoverPicker = process.env.CLIENTAPP_PICKER_RESTART === '1';
const pageForApp = async () => (await device.webView({pkg: app})).page();
try {
  const fixture = await inviteClient({firstName: ''});
  const assignment = (await api(`/v1/coach/clients/${fixture.clientId}/intake`, {token: fixture.coachToken})).data;
  await api(`/v1/coach/form-templates/${assignment.form_template_id}`, {
    method: 'PATCH',
    token: fixture.coachToken,
    body: {
      name: 'Android progress photo',
      expected_revision: assignment.form_template.revision,
      sections: [
        {
          questions: [
            {id: 'goal', label: 'Your goal', type: 'text', required: true},
            {id: 'photos', label: 'Progress views', type: 'photo', required: true},
          ],
        },
      ],
    },
  });
  await device.push(new URL('./photo.png', import.meta.url).pathname, '/sdcard/Pictures/easy-clientapp-photo.png');
  await device.shell(
    'am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file:///sdcard/Pictures/easy-clientapp-photo.png',
  );
  await device.shell('am force-stop com.google.android.photopicker');
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
  await device.screenshot({path: 'tests/forms/artifacts/android-keyboard.png'});
  await tap(page.getByRole('button', {name: 'Verify and continue'}));
  await tap(page.getByRole('link', {name: 'Forms & check-ins', exact: true}));
  await tap(page.getByRole('link', {name: /Android progress photo/}));
  await tap(page.getByLabel('Your goal', {exact: false}));
  await device.input.type('Photo selection survives interruption');
  await expect(page.getByText('Draft saved on this device.', {exact: true})).toBeVisible();
  await device.input.press('Back');
  await tap(page.getByRole('button', {name: 'Choose photo', exact: true}));
  await device.wait({pkg: 'com.google.android.photopicker'});
  await device.input.press('Back');
  await expect(page.getByLabel('Your goal', {exact: false})).toHaveValue('Photo selection survives interruption');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await tap(page.getByRole('button', {name: 'Choose photo', exact: true}));
  await device.wait({pkg: 'com.google.android.photopicker'});
  const pid = (await device.shell(`pidof ${app}`)).toString().trim();
  if (recoverPicker) {
    if (!/^\d+$/.test(pid)) {
      throw new Error('Expected one app process before picker interruption.');
    }
    // Kill only the background app process; force-stop would cancel the external picker result.
    await device.input.press('Home');
    await device.wait({pkg: 'com.google.android.apps.nexuslauncher'});
    await expect
      .poll(
        async () => {
          await device.shell(`am kill ${app}`);
          return (await device.shell(`pidof ${app}`)).toString().trim();
        },
        {timeout: 20_000},
      )
      .toBe('');
    await device.input.press('AppSwitch');
    await device.screenshot({path: 'tests/forms/artifacts/android-recents.png'});
    await device.tap({res: 'com.google.android.apps.nexuslauncher:id/snapshot', desc: 'Easy'});
    await device.wait({pkg: 'com.google.android.photopicker'});
  }
  await device.tap({pkg: 'com.google.android.photopicker', desc: /Photo taken.*/});
  if (recoverPicker) {
    page = await pageForApp();
    expect((await device.shell(`pidof ${app}`)).toString().trim()).not.toBe(pid);
    await expect(page.getByLabel('Your goal', {exact: false})).toHaveValue('Photo selection survives interruption');
    await expect(page.getByText('Not uploaded yet', {exact: true})).toBeVisible();
    await tap(page.getByRole('button', {name: 'Retry photo 1'}));
  }
  await expect(page.getByText('Photo uploaded', {exact: true})).toBeVisible({timeout: 30_000});
  await tap(page.getByRole('button', {name: 'Send response'}));
  await expect(page.getByRole('link', {name: 'Open photo 1'})).toBeVisible();
  const photo = page.getByRole('img', {name: 'Progress view 1'});
  await expect(photo).toBeVisible();
  await expect.poll(() => photo.evaluate((image) => image.naturalWidth)).toBeGreaterThan(0);
  await device.shell(`am force-stop ${app}`);
  await device.shell(
    `am start -W -n ${app}/.MainActivity -a android.intent.action.VIEW -d easy://app/forms/${assignment.id}`,
  );
  page = await pageForApp();
  await expect(page.getByText('Photo selection survives interruption', {exact: true})).toBeVisible();
  await expect
    .poll(() => page.getByRole('img', {name: 'Progress view 1'}).evaluate((image) => image.naturalWidth))
    .toBeGreaterThan(0);
  await device.screenshot({path: 'tests/forms/artifacts/android-saved-photo.png'});
  results.push({
    scenario: recoverPicker
      ? 'native picker cancellation and process death, recovered photo and draft, deliberate upload and saved image after restart'
      : 'native photo cancellation, selection, real upload and saved image after restart',
    passed: true,
  });
} catch (error) {
  await device.screenshot({path: 'tests/forms/artifacts/android-photo-failure.png'});
  throw error;
} finally {
  await device.close();
  await writeFile(
    `tests/forms/artifacts/android-photo-${recoverPicker ? 'recovery' : 'upload'}-results.json`,
    JSON.stringify(results, null, 2),
  );
}
console.log(JSON.stringify(results));
process.exit(0);
