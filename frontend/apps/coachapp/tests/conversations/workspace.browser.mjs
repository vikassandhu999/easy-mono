import {mkdir, readFile} from 'node:fs/promises';
import {chromium, expect, request} from '@playwright/test';
import {expectStoredMedia, observeChatUploads} from './storage.mjs';

const api = await request.newContext({baseURL: process.env.COACHAPP_API_URL || 'http://localhost:4400'});
const browser = await chromium.launch();
await mkdir('tests/conversations/artifacts', {recursive: true});
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()} ${await response.text()}`).toBe(true);
  return response.status() === 204 ? null : response.json();
}
async function setup(unique) {
  const email = `conversation-coach-${unique}@example.test`;
  await send('post', '/v1/auth/signup', {email, full_name: 'Taylor'});
  const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
  await send(
    'post',
    '/v1/businesses',
    {full_name: 'Taylor', name: 'Everyday Coaching', handle: `conversation-${unique}`},
    guest.access_token,
  );
  const tokens = await send('post', '/v1/auth/token', {
    grant_type: 'refresh_token',
    refresh_token: guest.refresh_token,
    role: 'coach',
  });
  const clientEmail = `conversation-client-${unique}@example.test`;
  const person = (
    await send('post', '/v1/coach/clients', {full_name: 'Maya Morgan', email: clientEmail}, tokens.access_token)
  ).data;
  const invitation_token = new URL(person.invite_url).pathname.split('/').at(-1);
  await send('post', '/v1/auth/accept-invite', {email: clientEmail, invitation_token});
  const clientTokens = await send('post', `/v1/auth/invites/${invitation_token}/accept`, {
    email: clientEmail,
    invitation_token,
    otp: '123456',
  });
  const conversation = (
    await send('get', `/v1/coach/clients/${person.id}/conversation`, undefined, tokens.access_token)
  ).data;
  await send('post', '/v1/client/conversation/messages', {body: 'Can we adjust Thursday?'}, clientTokens.access_token);
  const otherEmail = `conversation-other-${unique}@example.test`;
  const other = (
    await send('post', '/v1/coach/clients', {full_name: 'Jordan River', email: otherEmail}, tokens.access_token)
  ).data;
  const otherInvite = new URL(other.invite_url).pathname.split('/').at(-1);
  await send('post', '/v1/auth/accept-invite', {email: otherEmail, invitation_token: otherInvite});
  const otherTokens = await send('post', `/v1/auth/invites/${otherInvite}/accept`, {
    email: otherEmail,
    invitation_token: otherInvite,
    otp: '123456',
  });
  await send('post', '/v1/client/conversation/messages', {body: 'A second client waiting.'}, otherTokens.access_token);
  return {tokens, clientTokens, person, other, conversation};
}
try {
  for (const width of [375, 1280]) {
    const data = await setup(`${Date.now()}-${width}`);
    const {tokens, clientTokens, person, other, conversation} = data;
    const context = await browser.newContext({
      baseURL: process.env.COACHAPP_URL || 'http://localhost:2022',
      viewport: {width, height: 1000},
    });
    context.setDefaultTimeout(15000);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/login');
    await page.evaluate(async (tokens) => {
      const {saveSession} = await import('/src/api/session.ts');
      saveSession(tokens);
    }, tokens);
    await page.goto('/messages');
    await expect(page.getByRole('heading', {name: 'Messages', exact: true})).toBeVisible();
    await page.getByLabel('Search conversations', {exact: true}).fill('Maya Morgan');
    await page
      .getByRole('list', {name: 'conversations', exact: true})
      .getByRole('link', {name: /Maya Morgan/})
      .click();
    const body = page.getByLabel('Message Maya Morgan', {exact: true});
    await expect(page.getByText('Can we adjust Thursday?', {exact: true})).toBeVisible();
    await body.fill('I’ll make the change tomorrow.');
    await page.goto(`/clients/${other.id}/conversation`);
    await expect(page.getByRole('heading', {name: 'Jordan River', exact: true})).toBeVisible();
    await page.goto(`/clients/${person.id}/conversation`);
    await expect(body).toHaveValue('I’ll make the change tomorrow.');
    await page.reload();
    await expect(body).toHaveValue('I’ll make the change tomorrow.');
    // A newly arriving message must survive a reply composed against earlier context.
    await send(
      'post',
      '/v1/client/conversation/messages',
      {body: 'Also, I have a new question.'},
      clientTokens.access_token,
    );
    await page.getByRole('button', {name: 'Refresh messages', exact: true}).click();
    await expect(page.getByText('Also, I have a new question.', {exact: true})).toHaveCount(1);
    const endpoint = `/v1/coach/conversations/${conversation.id}/messages`;
    await page.route(`**${endpoint}`, async (route) => {
      await route.fetch();
      await route.abort('failed');
    });
    await page.getByRole('button', {name: 'Send message', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Retry send', exact: true})).toBeVisible();
    const savedAttempt = await page.evaluate(() => {
      const key = Object.keys(localStorage).find(
        (key) =>
          key.startsWith('coachapp.conversation-draft.v1:') &&
          JSON.parse(localStorage.getItem(key)).state === 'uncertain',
      );
      sessionStorage.setItem('fail-draft-read-once', 'yes');
      return {key, raw: localStorage.getItem(key)};
    });
    await page.addInitScript(() => {
      const get = Storage.prototype.getItem;
      Storage.prototype.getItem = function (key) {
        if (
          key.startsWith('coachapp.conversation-draft.v1:') &&
          get.call(sessionStorage, 'fail-draft-read-once') === 'yes'
        ) {
          sessionStorage.removeItem('fail-draft-read-once');
          throw new DOMException('Temporary storage failure', 'SecurityError');
        }
        return get.call(this, key);
      };
    });
    const historyEndpoint = `**/v1/coach/conversations/${conversation.id}/history?**`;
    let releaseHistory;
    const historyReady = new Promise((resolve) => {
      releaseHistory = resolve;
    });
    await page.route(historyEndpoint, async (route) => {
      await historyReady;
      await route.continue();
    });
    await page.reload();
    await expect(page.getByRole('button', {name: 'Retry draft recovery', exact: true})).toBeVisible();
    expect(await page.evaluate((key) => localStorage.getItem(key), savedAttempt.key)).toBe(savedAttempt.raw);
    await page.getByRole('button', {name: 'Retry draft recovery', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Retry send', exact: true})).toBeVisible();
    await expect(page.getByRole('button', {name: 'Retry send', exact: true})).toBeDisabled();
    releaseHistory();
    await page.unroute(historyEndpoint);
    await page.unroute(`**${endpoint}`);
    await page.getByRole('button', {name: 'Retry send', exact: true}).click();
    await expect(body).toHaveValue('');
    const history = await send(
      'get',
      `/v1/coach/conversations/${conversation.id}/history?cursor=start`,
      undefined,
      tokens.access_token,
    );
    expect(history.data.filter((message) => message.body === 'I’ll make the change tomorrow.')).toHaveLength(1);
    await page.screenshot({path: `tests/conversations/artifacts/conversation-${width}.png`, fullPage: true});
    const photoBytes = await readFile(`tests/conversations/artifacts/conversation-${width}.png`);
    const uploadsPath = `**/v1/coach/clients/${person.id}/uploads`;
    await page.route(uploadsPath, (route) => route.fulfill({status: 503, json: {}}));
    await page
      .getByLabel('Attach a file', {exact: true})
      .setInputFiles({name: 'Interrupted photo.png', mimeType: 'image/png', buffer: photoBytes});
    await expect(page.getByRole('button', {name: 'Retry upload', exact: true})).toBeVisible();
    await page.reload();
    await expect(
      page.getByText('Upload was interrupted. Remove this file and attach it again.', {exact: true}),
    ).toBeVisible();
    await page.getByRole('button', {name: 'Remove Interrupted photo.png', exact: true}).click();
    await page.unroute(uploadsPath);
    const uploads = await observeChatUploads(page, person.id, {failFirst: true});
    await page
      .getByLabel('Attach a file', {exact: true})
      .setInputFiles({name: 'Coaching photo.png', mimeType: 'image/png', buffer: photoBytes});
    await expect(page.getByRole('button', {name: 'Retry upload', exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'Retry upload', exact: true}).click();
    await expect(page.getByText('Ready to send', {exact: true})).toBeVisible();
    await page.reload();
    await expect(page.getByText('Ready to send', {exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'Send message', exact: true}).click();
    await page.getByRole('button', {name: 'Open photo', exact: true}).click();
    const photo = page.getByRole('img', {name: 'Message attachment', exact: true});
    await expect(photo).toBeVisible();
    await expect.poll(() => photo.evaluate((node) => node.naturalWidth)).toBeGreaterThan(0);
    await expectStoredMedia(page, photo, photoBytes);
    expect(uploads).toHaveLength(1);
    await page.evaluate((key) => localStorage.setItem(key, '{unreadable-draft'), savedAttempt.key);
    await page.reload();
    await expect(page.getByRole('button', {name: 'Retry draft recovery', exact: true})).toBeVisible();
    expect(await page.evaluate((key) => localStorage.getItem(key), savedAttempt.key)).toBe('{unreadable-draft');
    await expect(page.getByRole('button', {name: 'Send message', exact: true})).toHaveCount(0);
    await page.getByRole('button', {name: 'Discard saved draft', exact: true}).click();
    await expect(body).toHaveValue('');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
    await context.close();
    console.log(
      `Conversation search, draft restoration, uncertain-send recovery and media upload retry passed at ${width}px.`,
    );
  }
} finally {
  await browser.close();
  await api.dispose();
}
