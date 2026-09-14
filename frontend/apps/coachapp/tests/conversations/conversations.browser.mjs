import {mkdir, readFile} from 'node:fs/promises';
import {chromium, expect, request} from '@playwright/test';
import {chooseOption, selectTrigger} from '../select-helpers.mjs';
import {checkConversationFeatures} from './conversation-features.mjs';

const api = await request.newContext({baseURL: process.env.COACHAPP_API_URL || 'http://localhost:4000'});
const appUrl = process.env.COACHAPP_URL || 'http://localhost:2022';
const browser = await chromium.launch({
  channel: 'chromium',
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});
await mkdir('tests/conversations/artifacts', {recursive: true});
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()} ${response.ok() ? '' : await response.text()}`).toBe(
    true,
  );
  return response.status() === 204 ? null : response.json();
}
async function account(unique) {
  const email = `chat-coach-${unique}@example.test`;
  await send('post', '/v1/auth/signup', {email, first_name: 'Taylor'});
  const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
  await send('post', '/v1/businesses', {name: 'Everyday Coaching', handle: `chat-${unique}`}, guest.access_token);
  return send('post', '/v1/auth/token', {
    grant_type: 'refresh_token',
    refresh_token: guest.refresh_token,
    role: 'coach',
  });
}
async function client(unique, token, name) {
  const email = `chat-client-${unique}@example.test`;
  const person = (await send('post', '/v1/coach/clients/invite', {first_name: name, last_name: 'Morgan', email}, token))
    .data;
  const invitation_token = new URL(person.invite_url).pathname.split('/').at(-1);
  await send('post', '/v1/auth/accept-invite', {email, invitation_token});
  const clientToken = (await send('post', '/v1/auth/accept-invite/verify', {email, invitation_token, otp: '123456'}))
    .access_token;
  const conversation = (await send('get', `/v1/coach/clients/${person.id}/conversation`, undefined, token)).data;
  return {person, clientToken, conversation};
}
try {
  for (const width of [375, 1280]) {
    const unique = `${Date.now()}-${width}`;
    const tokens = await account(unique);
    const token = tokens.access_token;
    const {person, clientToken, conversation} = await client(unique, token, 'Alex');
    const otherClient = await client(`other-${unique}`, token, 'Jordan');
    const path = `/clients/${person.id}/conversation`;
    const history = `/v1/coach/conversations/${conversation.id}/history`;
    const endpoint = `/v1/coach/conversations/${conversation.id}/messages`;
    const incoming = (body) => send('post', '/v1/client/conversation/messages', {body}, clientToken);
    for (let index = 1; index <= 45; index++) {
      await incoming(`Client message ${index}: today's plan is going well.`);
    }
    const context = await browser.newContext({
      baseURL: appUrl,
      permissions: ['microphone'],
      viewport: {width, height: 1000},
    });
    context.setDefaultTimeout(15000);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    let joined = false;
    page.on('websocket', (socket) =>
      socket.on('framereceived', (frame) => {
        if (String(frame.payload).includes('"status":"ok"')) {
          joined = true;
        }
      }),
    );
    await page.goto('/login');
    await expect(page.getByRole('heading', {name: 'Welcome back', exact: true})).toBeVisible();
    await page.evaluate(async (tokens) => {
      const {saveSession} = await import('/src/api/session.ts');
      saveSession({...tokens, expires_in: 1});
    }, tokens);
    await page.goto('/messages');
    await expect(page.getByRole('heading', {name: 'Messages', exact: true})).toBeVisible();
    await expect.poll(() => joined).toBe(true);
    if (process.env.COACHAPP_CONVERSATIONS_FEATURES_ONLY === '1') {
      await checkConversationFeatures({page, context, send, token, person, clientToken, conversation, width});
      expect(errors).toEqual([]);
      await context.close();
      console.log(`Conversation response, voice and team flows passed at ${width}px.`);
      continue;
    }
    // Force small real API pages within the free account's client capacity.
    await page.route('**/v1/coach/conversation-inbox?*', (route) => {
      const url = new URL(route.request().url());
      url.searchParams.set('limit', '1');
      return route.continue({url: url.href});
    });
    await page.reload();
    const inbox = page.getByRole('list', {name: 'conversations', exact: true});
    await expect(page.getByText('2 conversations', {exact: true})).toBeVisible();
    await expect(inbox.getByText('45 unread', {exact: true})).toBeVisible();
    await page.getByLabel('Search conversations', {exact: true}).fill('Jordan');
    await expect(page.getByText('1 conversation', {exact: true})).toBeVisible();
    await expect(inbox.getByRole('heading', {name: 'Jordan Morgan', exact: true})).toBeVisible();
    await page.getByLabel('Search conversations', {exact: true}).fill('');
    await chooseOption(selectTrigger(page, 'Show'), 'Needs reply');
    await expect(page.getByText('1 conversation', {exact: true})).toBeVisible();
    await page.screenshot({path: `tests/conversations/artifacts/inbox-${width}.png`, fullPage: true});
    await page.route(`**${history}?*`, (route) => route.fulfill({status: 503, json: {}}));
    await inbox.getByRole('heading', {name: 'Alex Morgan', exact: true}).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', {name: 'Try again', exact: true}).focus();
    await page.unroute(`**${history}?*`);
    await page.keyboard.press('Enter');
    const rows = page.locator('[data-slot="message-scroller-item"]:has([data-slot="message"])');
    await expect(rows).toHaveCount(20);
    const viewport = page.getByRole('region', {name: 'Conversation history', exact: true});
    await expect(rows.last()).toBeInViewport();
    await expect(page.getByRole('button', {name: 'Refresh messages', exact: true})).toBeEnabled();
    await page.route(`**${history}?*`, (route) =>
      new URL(route.request().url()).searchParams.get('cursor') !== 'start'
        ? route.fulfill({status: 503, json: {}})
        : route.continue(),
    );
    await expect(viewport).not.toHaveAttribute('data-autoscrolling', '');
    await viewport.press('Home');
    await expect(page.getByRole('button', {name: 'Retry older messages', exact: true})).toBeVisible();
    await expect(rows).toHaveCount(20);
    const anchor = await rows.first().getAttribute('data-message-id');
    await page.unroute(`**${history}?*`);
    await page.getByRole('button', {name: 'Retry older messages', exact: true}).click();
    await expect(rows).toHaveCount(40);
    await expect(page.locator(`[data-message-id="${anchor}"]`)).toBeInViewport();
    await expect(viewport).not.toHaveAttribute('data-autoscrolling', '');
    await viewport.press('Home');
    await expect(rows).toHaveCount(45);
    await page.getByRole('button', {name: 'Jump to latest', exact: true}).click();
    await expect(rows.last()).toBeInViewport();
    await page.getByRole('button', {name: 'Mark as read · 45', exact: true}).click();
    await expect(page.getByText('Marked as read for your team.', {exact: true})).toBeVisible();
    await expect(page.getByRole('button', {name: /^Mark as read/})).toHaveCount(0);

    const body = page.getByLabel('Message Alex Morgan', {exact: true});
    await page.getByRole('button', {name: 'Send message', exact: true}).click();
    await expect(page.getByText('Write a message or attach a file.', {exact: true})).toBeVisible();
    await body.fill('Thanks for the update.\nKeep the same plan for tomorrow.');
    await page.getByRole('link', {name: 'View client', exact: true}).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', {name: 'Keep writing', exact: true}).click();
    await page.getByRole('button', {name: 'Send message', exact: true}).click();
    await expect(body).toHaveValue('');
    await expect(page.getByText('Message sent.', {exact: true})).toBeVisible();
    await expect(page.getByRole('button', {name: 'Mark handled', exact: true})).toHaveCount(0);
    await expect(viewport).not.toHaveAttribute('data-autoscrolling', '');
    await viewport.press('Home');
    await expect(rows.first()).toBeInViewport();
    const reading = await rows.first().getAttribute('data-message-id');
    await incoming('Live reply: that works for me.');
    await expect(page.getByText('Live reply: that works for me.', {exact: true})).toHaveCount(1);
    await expect(page.locator(`[data-message-id="${reading}"]`)).toBeInViewport();
    await expect(rows.last()).not.toBeInViewport();
    await page.getByRole('button', {name: 'Jump to latest', exact: true}).click();
    await expect(rows.last()).toBeInViewport();
    await expect(page.getByText('Needs reply', {exact: true})).toBeVisible();
    await page.route(`**/conversations/${conversation.id}/mark-handled`, async (route) => {
      await incoming('One more question before you close this.');
      await route.continue();
    });
    await page.getByRole('button', {name: 'Mark handled', exact: true}).click();
    await expect(
      page.getByText('A new message arrived. Read it before marking this conversation handled.', {exact: true}),
    ).toBeVisible();
    await page.unroute(`**/conversations/${conversation.id}/mark-handled`);
    await page.getByRole('button', {name: 'Mark handled', exact: true}).click();
    await expect(page.getByText('Conversation marked handled.', {exact: true})).toBeVisible();

    await body.fill('A message whose response is lost.');
    await page.route(`**${endpoint}`, async (route) => {
      await route.fetch();
      await route.abort('failed');
    });
    await page.getByRole('button', {name: 'Send message', exact: true}).click();
    await expect(page.getByText(/We couldn't confirm the send/)).toBeVisible();
    await page.unroute(`**${endpoint}`);
    await page.getByRole('button', {name: 'Check latest messages', exact: true}).click();
    await expect(rows.getByText('A message whose response is lost.', {exact: true})).toHaveCount(1);
    await page.getByRole('button', {name: 'Already sent · clear draft', exact: true}).click();
    await expect(body).toHaveValue('');

    await page.route(`**${endpoint}`, (route) => route.fulfill({status: 503, json: {}}));
    await body.fill('Retry this once.');
    await page.getByRole('button', {name: 'Send message', exact: true}).click();
    await expect(page.getByText(/We couldn't confirm the send/)).toBeVisible();
    await page.unroute(`**${endpoint}`);
    await page.getByRole('button', {name: 'Check latest messages', exact: true}).click();
    await page.getByRole('button', {name: 'Send again', exact: true}).click();
    await expect(body).toHaveValue('');
    await expect(rows.getByText('Retry this once.', {exact: true})).toHaveCount(1);

    await page.screenshot({path: `tests/conversations/artifacts/text-thread-${width}.png`, fullPage: true});
    const image = await readFile('tests/weight-progress/artifacts/progress-375.png');
    let failUpload = true;
    await page.route('http://127.0.0.1:44001/**', (route) =>
      route.request().method() === 'PUT'
        ? route.fulfill({status: failUpload ? 503 : 200, body: ''})
        : route.fulfill({status: 200, contentType: 'image/png', body: image}),
    );
    await page
      .getByLabel('Attach a file', {exact: true})
      .setInputFiles({name: 'progress.png', mimeType: 'image/png', buffer: image});
    await expect(page.getByText('Upload failed', {exact: true})).toBeVisible();
    failUpload = false;
    await page.getByRole('button', {name: 'Retry upload', exact: true}).click();
    await expect(page.getByText('Ready to send', {exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'Send message', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Open photo', exact: true})).toBeVisible();
    await page.route('**/v1/coach/attachments/download-urls', (route) => route.fulfill({status: 503, json: {}}));
    await page.getByRole('button', {name: 'Open photo', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Retry attachment', exact: true})).toBeVisible();
    await page.unroute('**/v1/coach/attachments/download-urls');
    await page.getByRole('button', {name: 'Retry attachment', exact: true}).click();
    await expect(page.getByRole('img', {name: 'Message attachment', exact: true})).toBeVisible();
    expect(
      await page.getByRole('img', {name: 'Message attachment', exact: true}).evaluate((node) => node.naturalWidth > 0),
    ).toBe(true);
    await page.screenshot({path: `tests/conversations/artifacts/thread-${width}.png`, fullPage: true});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('link', {name: 'Back to messages', exact: true}).click();
    await expect(selectTrigger(page, 'Show')).toContainText('Needs reply');
    await expect(page.getByText('No clients waiting for a reply', {exact: true})).toBeVisible();
    await chooseOption(selectTrigger(page, 'Show'), 'Unread');
    await expect(page.getByText('1 conversation', {exact: true})).toBeVisible();
    await page.goto(`/clients/${otherClient.person.id}`);
    await page.getByRole('link', {name: 'Message client', exact: true}).click();
    await expect(page.getByText('Start the conversation', {exact: true})).toBeVisible();

    await checkConversationFeatures({page, context, send, token, person, clientToken, conversation, width});

    if (width === 375) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('button', {name: 'Refresh messages', exact: true})).toBeEnabled();
      const held = Promise.withResolvers();
      const release = Promise.withResolvers();
      await page.route(`**${history}?*`, async (route) => {
        const response = await route.fetch();
        held.resolve();
        await release.promise;
        return route.fulfill({response});
      });
      await page.getByRole('button', {name: 'Refresh messages', exact: true}).click();
      await held.promise;
      const sent = Promise.withResolvers();
      await page.route(`**${endpoint}`, async (route) => {
        const response = await route.fetch();
        expect(response.status()).toBe(201);
        sent.resolve();
        await release.promise;
        return route.fulfill({response});
      });
      await body.fill('A send that finishes after account replacement.');
      await page.getByRole('button', {name: 'Send message', exact: true}).click();
      await sent.promise;
      const other = await account(`replacement-${unique}`);
      await page.evaluate(async (tokens) => {
        const {clearSession, saveSession} = await import('/src/api/session.ts');
        clearSession();
        saveSession(tokens);
      }, other);
      release.resolve();
      await page.getByRole('link', {name: 'Messages', exact: true}).click();
      await expect(page.getByText('Your conversations start here', {exact: true})).toBeVisible();
      await page.waitForLoadState('networkidle');
      expect(
        await page.evaluate(async (id) => {
          const {queryClient} = await import('/src/api/query-client.ts');
          return queryClient
            .getQueryCache()
            .getAll()
            .some((query) => JSON.stringify(query.state.data ?? '').includes(id));
        }, person.id),
      ).toBe(false);
    }
    expect(errors).toEqual([]);
    await context.close();
    console.log(
      `Conversations: inbox, live thread, history, read/handled, send recovery, attachments and isolation passed at ${width}px.`,
    );
  }
} finally {
  await browser.close();
  await api.dispose();
}
