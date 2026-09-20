import {mkdir, writeFile} from 'node:fs/promises';
import {_android, expect} from '@playwright/test';
import {api, inviteClient} from '../auth/fixtures.mjs';

_android.setDefaultTimeout(15_000);
const device = (await _android.devices()).find(
  (candidate) => candidate.serial() === (process.env.ANDROID_SERIAL || 'emulator-5554'),
);
if (!device) {
  throw new Error('Start the client app Android emulator and forward port 4100 and 9002.');
}
const app = 'com.easy.client';
const results = [];
await mkdir('tests/messages/artifacts', {recursive: true});
let page;
const contexts = new Set();
try {
  const fixture = await inviteClient();
  const conversation = (await api(`/v1/coach/clients/${fixture.clientId}/conversation`, {token: fixture.coachToken}))
    .data;
  const read = () => api(`/v1/coach/conversations/${conversation.id}/history`, {token: fixture.coachToken});
  const open = (path) =>
    device.shell(`am start -W -n ${app}/.MainActivity -a android.intent.action.VIEW -d easy://app${path}`);
  const connect = async () => {
    page = await (await device.webView({pkg: app})).page();
    contexts.add(page.context());
  };
  const tap = async (locator) => {
    await expect(locator).toBeVisible();
    await locator.evaluate((node) => node.scrollIntoView({block: 'center', behavior: 'instant'}));
    await locator.click({trial: true});
    const view = await device.info({clazz: 'android.webkit.WebView', pkg: app});
    const target = await locator.boundingBox();
    if (!target) {
      throw new Error('The control has no visible bounds.');
    }
    const scale = view.bounds.width / (await page.evaluate(() => innerWidth));
    await device.input.tap({
      x: view.bounds.x + (target.x + target.width / 2) * scale,
      y: view.bounds.y + (target.y + target.height / 2) * scale,
    });
  };
  await device.push(new URL('../forms/photo.png', import.meta.url).pathname, '/sdcard/Pictures/Easy-message-photo.png');
  await device.push(new URL('./clip.mp4', import.meta.url).pathname, '/sdcard/Download/Easy-technique.mp4');
  await device.push(new URL('./note.mp3', import.meta.url).pathname, '/sdcard/Download/Easy-note.mp3');
  await device.shell(
    'am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d file:///sdcard/Pictures/Easy-message-photo.png',
  );
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
  await expect(page.getByRole('heading', {name: 'Today', exact: true})).toBeVisible({timeout: 15_000});
  await open('/messages');
  await expect(page.getByRole('button', {name: 'Send', exact: true})).toBeDisabled();
  await tap(page.getByLabel('Message your coach', {exact: true}));
  await device.input.type('My Android message survives a restart');
  await expect(page.getByLabel('Message your coach', {exact: true})).toHaveValue(
    'My Android message survives a restart',
  );
  await expect(page.getByText('Draft saved on this device.', {exact: true})).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-keyboard', 'open');
  const send = await page.getByRole('button', {name: 'Send', exact: true}).boundingBox();
  expect(send.y + send.height).toBeLessThanOrEqual(
    await page.evaluate(() => visualViewport.height + visualViewport.offsetTop),
  );
  await device.screenshot({path: 'tests/messages/artifacts/android-keyboard.png'});
  await device.input.press('Back');
  await expect(page.locator('html')).not.toHaveAttribute('data-keyboard', 'open');
  await expect(page.getByRole('heading', {name: 'Messages', exact: true})).toBeVisible();
  await tap(page.getByRole('button', {name: 'Attach', exact: true}));
  await expect(page.getByRole('dialog', {name: 'Add to your message'})).toBeVisible();
  await device.input.press('Back');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', {name: 'Messages', exact: true})).toBeVisible();
  await tap(page.getByRole('button', {name: 'Attach', exact: true}));
  await tap(page.getByRole('button', {name: 'Choose photo', exact: true}));
  await device.wait({pkg: 'com.google.android.photopicker'});
  await device.input.press('Back');
  await expect(page.getByLabel('Message your coach', {exact: true})).toHaveValue(
    'My Android message survives a restart',
  );
  await tap(page.getByRole('button', {name: 'Choose photo', exact: true}));
  await device.wait({pkg: 'com.google.android.photopicker'});
  await device.tap({pkg: 'com.google.android.photopicker', desc: /Photo taken.*/});
  await expect(page.getByRole('img', {name: 'Attachment 1', exact: true})).toBeVisible();
  await device.shell('svc wifi disable');
  await device.shell('svc data disable');
  await expect(page.getByRole('button', {name: 'Send', exact: true})).toBeDisabled();
  await device.shell(`am force-stop ${app}`);
  await open('/messages');
  await connect();
  await expect(page.getByLabel('Message your coach', {exact: true})).toHaveValue(
    'My Android message survives a restart',
  );
  await expect(page.getByRole('img', {name: 'Attachment 1', exact: true})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Send', exact: true})).toBeDisabled();
  await device.screenshot({path: 'tests/messages/artifacts/android-offline.png'});
  expect((await read()).count).toBe(0);
  await device.shell('svc wifi enable');
  await device.shell('svc data enable');
  await expect(page.getByText('Your coach · Conversation connected', {exact: true})).toBeVisible({timeout: 30_000});
  await expect(page.getByRole('button', {name: 'Send', exact: true})).toBeEnabled();
  expect((await read()).count).toBe(0);
  await tap(page.getByLabel('Message your coach', {exact: true}));
  await expect(page.locator('html')).toHaveAttribute('data-keyboard', 'open');
  const beforeSend = await page.getByRole('button', {name: 'Send', exact: true}).boundingBox();
  expect(beforeSend.y + beforeSend.height).toBeLessThanOrEqual(
    await page.evaluate(() => visualViewport.height + visualViewport.offsetTop),
  );
  await device.screenshot({path: 'tests/messages/artifacts/android-send-keyboard.png'});
  await tap(page.getByRole('button', {name: 'Send', exact: true}));
  await expect(page.getByText('Message sent.', {exact: true})).toBeVisible({timeout: 30_000});
  await expect(page.getByText('Your coach · Conversation connected', {exact: true})).toBeVisible({timeout: 15_000});
  await tap(page.getByRole('button', {name: 'Open photo', exact: true}));
  await expect
    .poll(() => page.getByRole('img', {name: 'Shared in this conversation'}).evaluate((node) => node.naturalWidth), {
      timeout: 15_000,
    })
    .toBeGreaterThan(0);
  await device.input.press('Home');
  await device.shell(`am start -W -n ${app}/.MainActivity`);
  await expect(page.getByText('My Android message survives a restart', {exact: true})).toBeVisible();
  await device.shell(`am force-stop ${app}`);
  await open('/messages');
  await connect();
  await expect(page.getByText('My Android message survives a restart', {exact: true})).toBeVisible();
  await expect(page.getByLabel('Message your coach', {exact: true})).toHaveValue('');
  await tap(page.getByRole('button', {name: 'Open photo', exact: true}));
  await expect
    .poll(() => page.getByRole('img', {name: 'Shared in this conversation'}).evaluate((node) => node.naturalWidth))
    .toBeGreaterThan(0);
  await device.screenshot({path: 'tests/messages/artifacts/android-saved.png'});
  const saved = await read();
  expect(saved.count).toBe(1);
  expect(saved.data[0].attachments).toHaveLength(1);
  results.push({
    scenario:
      'Native keyboard/back, gallery cancellation/selection, offline text/media process restart, deliberate send, background/resume and saved-message cold link',
    passed: true,
    count: saved.count,
  });
  for (const name of ['Easy-technique.mp4', 'Easy-note.mp3']) {
    if (await page.getByRole('button', {name: 'Attach', exact: true}).isVisible()) {
      await tap(page.getByRole('button', {name: 'Attach', exact: true}));
    }
    await tap(page.getByRole('button', {name: 'Video or audio', exact: true}));
    const documents = 'com.google.android.documentsui';
    await device.wait({pkg: documents});
    await device.tap({pkg: documents, desc: 'Show roots'});
    // The breadcrumb behind the drawer also says Downloads; select the drawer row.
    const downloads = {pkg: documents, res: 'android:id/title', text: 'Downloads'};
    await device.wait(downloads);
    await device.tap(downloads);
    await device.wait({pkg: documents, text: name});
    await device.tap({pkg: documents, text: name});
    await expect(page.getByText(`${name} · On this device`, {exact: true})).toBeVisible();
    await expect(page.getByText('Draft saved on this device.', {exact: true})).toBeVisible();
  }
  await device.shell(`am force-stop ${app}`);
  await open('/messages');
  await connect();
  await expect(page.getByText('Easy-technique.mp4 · On this device', {exact: true})).toBeVisible();
  await expect(page.getByText('Easy-note.mp3 · On this device', {exact: true})).toBeVisible();
  await tap(page.getByRole('button', {name: 'Send', exact: true}));
  await expect(page.getByText('Message sent.', {exact: true})).toBeVisible({timeout: 30_000});
  for (const kind of ['video', 'audio']) {
    await tap(page.getByRole('button', {name: `Open ${kind}`, exact: true}));
    await expect.poll(() => page.locator(kind).evaluate((node) => node.readyState)).toBeGreaterThanOrEqual(1);
    await page.locator(kind).evaluate(async (node) => {
      await node.play();
      node.pause();
    });
  }
  const mediaSaved = await read();
  expect(mediaSaved.count).toBe(2);
  expect(mediaSaved.data[0].attachments.map((attachment) => attachment.content_type)).toEqual([
    'video/mp4',
    'audio/mpeg',
  ]);
  await device.screenshot({path: 'tests/messages/artifacts/android-media.png'});
  results.push({
    scenario: 'Native document selection, video/audio bytes after process restart, real upload and playback',
    passed: true,
  });
} catch (error) {
  await device.screenshot({path: 'tests/messages/artifacts/android-failure.png'});
  if (page) {
    await writeFile(
      'tests/messages/artifacts/android-failure.txt',
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
  await Promise.allSettled([...contexts].map((context) => context.close()));
  await device.close();
  await writeFile('tests/messages/artifacts/android-results.json', JSON.stringify(results, null, 2));
}
console.log(JSON.stringify(results));
// Playwright's Android transport retains a socket after device.close().
// All assertions and evidence writes have finished before this successful exit.
process.exit(0);
