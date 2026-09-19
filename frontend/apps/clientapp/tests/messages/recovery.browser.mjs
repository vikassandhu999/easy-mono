import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {chromium, expect} from '@playwright/test';
import {api, inviteClient} from '../auth/fixtures.mjs';

const fixture = await inviteClient();
const browser = await chromium.launch();
const context = await browser.newContext({
  baseURL: process.env.CLIENT_PREVIEW_URL || 'http://localhost:1316',
  viewport: {width: 375, height: 812},
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await mkdir('tests/messages/artifacts', {recursive: true});
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==',
  'base64',
);
let writes = 0;
let tickets = 0;
page.on('request', (request) => {
  if (request.method() === 'POST' && request.url().endsWith('/v1/client/conversation/messages')) {
    writes++;
  }
  if (request.method() === 'POST' && request.url().endsWith('/v1/client/uploads')) {
    tickets++;
  }
});
try {
  await page.goto(`/invite/${fixture.token}`);
  await page.getByRole('button', {name: 'Continue with email'}).click();
  await page.getByLabel('Verification code').fill('123456');
  await page.getByRole('button', {name: 'Verify and continue'}).click();
  await expect(page.getByRole('heading', {name: 'Today', exact: true})).toBeVisible();
  const token = await page.evaluate(() => JSON.parse(localStorage.getItem('clientapp.auth.v1')).tokens.access_token);
  await page.getByRole('link', {name: 'Messages', exact: true}).click();
  await expect(page.getByText('Your coach is a message away')).toBeVisible();
  const input = page.getByLabel('Message your coach', {exact: true});
  await input.fill('Please check my technique and voice note.');
  await page.getByRole('button', {name: 'Attach', exact: true}).click();
  await page
    .getByLabel('Choose message photo', {exact: true})
    .setInputFiles({name: 'progress.png', mimeType: 'image/png', buffer: png});
  await expect(page.getByRole('img', {name: 'Attachment 1', exact: true})).toBeVisible();
  await page.getByLabel('Choose message video or audio').setInputFiles({
    name: 'technique.mp4',
    mimeType: 'video/mp4',
    buffer: await readFile(new URL('./clip.mp4', import.meta.url)),
  });
  await expect(page.getByText('technique.mp4 · On this device', {exact: true})).toBeVisible();
  await page.getByLabel('Choose message video or audio').setInputFiles({
    name: 'voice-note.mp3',
    mimeType: 'audio/mpeg',
    buffer: await readFile(new URL('./note.mp3', import.meta.url)),
  });
  await expect(page.getByText('voice-note.mp3 · On this device', {exact: true})).toBeVisible();
  await expect(page.getByText('Draft saved on this device.', {exact: true})).toBeVisible();
  expect(tickets).toBe(0);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect(input).toHaveValue('Please check my technique and voice note.');
  await expect(page.getByRole('button', {name: 'Remove attachment 3'})).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  await expect(input).toHaveValue('Please check my technique and voice note.');
  await input.fill('Offline addition: this was my last set.');
  await expect(page.getByText('Draft saved on this device.', {exact: true})).toBeVisible();
  await page.reload();
  await expect(input).toHaveValue('Offline addition: this was my last set.');
  await expect(page.getByRole('button', {name: 'Send', exact: true})).toBeDisabled();
  expect(writes).toBe(0);
  await context.setOffline(false);
  await expect(page.getByText('Conversation connected', {exact: true})).toBeVisible();
  expect(writes).toBe(0);

  let lostUpload = false;
  const storage = `${process.env.CLIENT_STORAGE_URL || 'http://localhost:9002'}/**`;
  await page.route(storage, async (route) => {
    if (route.request().method() === 'PUT' && !lostUpload) {
      const response = await route.fetch();
      expect(response.ok()).toBe(true);
      lostUpload = true;
      return route.abort('connectionreset');
    }
    return route.continue();
  });
  await page.getByRole('button', {name: 'Send', exact: true}).click();
  await expect(
    page.getByText(
      'The attachment upload stopped. Your file is kept on this device. Try sending again when connected.',
    ),
  ).toBeVisible();
  expect(writes).toBe(0);
  expect(tickets).toBe(1);
  await page.reload();
  await expect(input).toHaveValue('Offline addition: this was my last set.');
  await page.unroute(storage);
  await page.getByRole('button', {name: 'Send', exact: true}).click();
  await expect(page.getByText('Message sent.', {exact: true})).toBeVisible();
  await expect(input).toHaveValue('');
  expect(tickets).toBe(3);
  expect(writes).toBe(1);
  const history = await api('/v1/client/conversation/history', {token});
  expect(history.count).toBe(1);
  expect(history.data[0].attachments.map((attachment) => attachment.content_type)).toEqual([
    'image/png',
    'video/mp4',
    'audio/mpeg',
  ]);

  let failImage = true;
  await page.route(storage, async (route) => {
    if (route.request().method() === 'GET' && new URL(route.request().url()).pathname.endsWith('.png') && failImage) {
      return route.abort('failed');
    }
    return route.continue();
  });
  await page.getByRole('button', {name: 'Open photo', exact: true}).click();
  await expect(page.getByText('This attachment could not load.')).toBeVisible();
  failImage = false;
  await page.getByRole('button', {name: 'Retry attachment', exact: true}).click();
  await expect
    .poll(() =>
      page
        .getByRole('img', {name: 'Shared in this conversation'})
        .evaluate((node) => node.complete && node.naturalWidth > 0),
    )
    .toBe(true);
  await page.getByRole('button', {name: 'Open video', exact: true}).click();
  await expect.poll(() => page.locator('video').evaluate((node) => node.readyState >= 1)).toBe(true);
  await page.getByRole('button', {name: 'Open audio', exact: true}).click();
  await expect.poll(() => page.locator('audio').evaluate((node) => node.readyState >= 1)).toBe(true);
  await page.locator('audio').evaluate(async (node) => {
    await node.play();
    node.pause();
  });
  await page.locator('video').evaluate(async (node) => {
    await node.play();
    node.pause();
  });
  await page.screenshot({path: 'tests/messages/artifacts/media-375.png', fullPage: true});
  await page.reload();
  await expect(page.getByText('Offline addition: this was my last set.', {exact: true})).toBeVisible();
  await expect(input).toHaveValue('');

  await input.fill('Storage failure must not send this.');
  await expect(page.getByText('Draft saved on this device.', {exact: true})).toBeVisible();
  await page.evaluate(() => {
    const setItem = Storage.prototype.setItem;
    window.restoreMessageStorage = () => {
      Storage.prototype.setItem = setItem;
    };
    Storage.prototype.setItem = function (key, value) {
      if (key.endsWith('.draft.message')) {
        throw new DOMException('Full', 'QuotaExceededError');
      }
      return setItem.call(this, key, value);
    };
  });
  await page.getByRole('button', {name: 'Send', exact: true}).click();
  await expect(
    page.getByText('Your message could not be saved on this device. Nothing was sent. Try again.'),
  ).toBeVisible();
  expect(writes).toBe(1);
  await page.evaluate(() => window.restoreMessageStorage());
  await page.getByRole('button', {name: 'Discard', exact: true}).click();
  await page.getByRole('dialog').getByRole('button', {name: 'Discard draft', exact: true}).click();
  await expect(input).toHaveValue('');
  await input.fill('Logout removes my unsent message.');
  await expect(page.getByText('Draft saved on this device.', {exact: true})).toBeVisible();
  await page.getByRole('link', {name: 'Your account', exact: true}).click();
  await page.getByRole('button', {name: 'Sign out', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Welcome back', exact: true})).toBeVisible();
  expect(
    await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('clientapp.private.'))),
  ).toEqual([]);
  expect(errors).toEqual([]);
  await writeFile(
    'tests/messages/artifacts/recovery.json',
    JSON.stringify(
      {
        passed: true,
        writes,
        tickets,
        count: history.count,
        attachments: history.data[0].attachments.map((attachment) => attachment.content_type),
      },
      null,
      2,
    ),
  );
} catch (error) {
  await page.screenshot({path: 'tests/messages/artifacts/recovery-failure.png', fullPage: true});
  await writeFile('tests/messages/artifacts/recovery-failure.txt', await page.locator('body').innerText());
  await writeFile('tests/messages/artifacts/recovery-errors.json', JSON.stringify(errors));
  throw error;
} finally {
  await browser.close();
}
console.log(
  'Production messaging offline drafts, media bytes, lost upload retry, real image/video/audio delivery, storage failure and logout passed.',
);
