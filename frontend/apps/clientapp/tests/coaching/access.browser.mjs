import {mkdir} from 'node:fs/promises';
import {chromium, expect} from '@playwright/test';
import {emptyMessageDraft, messageAttempt} from '../../src/messages/message-draft.ts';

const browser = await chromium.launch();
const context = await browser.newContext({
  baseURL: process.env.CLIENT_APP_URL || 'http://localhost:1315',
  viewport: {width: 375, height: 812},
});
const page = await context.newPage();
const profile = {
  id: 'client-1',
  full_name: 'Alex Client',
  preferred_name: 'Alex',
  email: 'alex@example.test',
  phone: '+15555550123',
  timezone: 'Asia/Kolkata',
  local_date: '2026-10-03',
  unit_system: 'imperial',
  state: 'joined',
  current_term: null,
  terms: [],
  coach: {full_name: 'Sam Coach', preferred_name: 'Sam', business_name: 'Everyday Coaching', phone: null},
};
const writes = [];
const downloads = [];
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await context.addInitScript(() => {
  if (!sessionStorage.getItem('coaching-fixture')) {
    localStorage.clear();
    localStorage.setItem(
      'clientapp.auth.v1',
      JSON.stringify({
        id: 'coaching-session',
        accountId: 'client-1',
        expiresAt: Date.now() + 3_600_000,
        tokens: {
          access_token: 'access',
          refresh_token: 'refresh',
          expires_in: 3600,
          scope: 'client',
          token_type: 'Bearer',
        },
      }),
    );
    sessionStorage.setItem('coaching-fixture', 'ready');
  }
});
await page.route('**/v1/client/**', (route) => {
  const request = route.request();
  const path = new URL(request.url()).pathname;
  if (request.method() !== 'GET') {
    writes.push(path);
    return route.fulfill({json: {data: {}}});
  }
  if (path === '/v1/client/attachments/download-urls') {
    downloads.push(new URL(request.url()).searchParams.getAll('attachment_ids[]'));
    return route.fulfill({
      json: {
        data: [
          {
            id: 'photo-1',
            download_url:
              'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="90"%3E%3Crect width="160" height="90" fill="%23bfe3d0"/%3E%3C/svg%3E',
          },
        ],
      },
    });
  }
  const data =
    path === '/v1/client/me'
      ? profile
      : path === '/v1/client/tracker-today'
        ? {due: [], requests: []}
        : path === '/v1/client/conversation'
          ? {id: 'conversation-1', unread_count: 0}
          : path === '/v1/client/conversation/history'
            ? [
                {
                  id: 'message-1',
                  body: 'Great progress, Alex!',
                  sender_type: 'coach',
                  sender_name: 'Sam',
                  inserted_at: '2026-09-30T09:00:00Z',
                  attachments: [{id: 'photo-1', content_type: 'image/png'}],
                  embed: null,
                },
              ]
            : null;
  return route.fulfill({
    json: {
      data,
      next_cursor: null,
      count: Array.isArray(data) ? data.length : 0,
      ...(path === '/v1/client/conversation/history' ? {latest_message_at: '2026-09-30T09:00:00Z'} : {}),
    },
  });
});

try {
  await mkdir('tests/coaching/artifacts', {recursive: true});
  for (const path of ['/', '/messages', '/trackers', '/account/details']) {
    await page.goto(path);
    await expect(page.getByRole('heading', {name: 'Coaching starts soon', exact: true})).toBeVisible();
    await expect(page.getByRole('button', {name: 'Sign out', exact: true})).toBeVisible();
    await expect(page.getByRole('navigation', {name: 'Main navigation'})).toHaveCount(0);
    await expect(page.getByRole('textbox')).toHaveCount(0);
  }
  await page.screenshot({path: 'tests/coaching/artifacts/joined-375.png', fullPage: true});

  profile.state = 'ended';
  profile.terms = [
    {id: 'term-1', starts_on: '2026-09-01', ends_on: '2026-09-30'},
    {id: 'term-0', starts_on: '2026-08-01', ends_on: '2026-08-15'},
  ];
  const message = {...emptyMessageDraft(), body: 'An unsent message'};
  const drafts = {
    message: {...message, attempt: messageAttempt(message, [])},
    profile: {full_name: 'Unsaved name', preferred_name: 'Unsaved', phone: ''},
  };
  await page.evaluate((drafts) => {
    for (const [resource, draft] of Object.entries(drafts)) {
      localStorage.setItem(`clientapp.private.client-1.draft.${resource}`, JSON.stringify(draft));
    }
  }, drafts);
  await page.goto('/messages');
  await expect(page.getByRole('status').filter({hasText: 'Conversation history'})).toBeVisible();
  await expect(page.getByText('Great progress, Alex!', {exact: true})).toBeVisible();
  await expect(page.getByText('Coaching ended Sep 30', {exact: true})).toBeVisible();
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await expect(page.getByRole('button', {name: /Send|Record|Attach/})).toHaveCount(0);
  await page.getByRole('button', {name: 'Open photo', exact: true}).click();
  await expect(page.getByRole('img', {name: 'Shared in this conversation', exact: true})).toBeVisible();
  await expect(page.getByText('Loading attachment…', {exact: true})).toHaveCount(0);
  expect(downloads).toEqual([['photo-1']]);
  await page.screenshot({path: 'tests/coaching/artifacts/ended-messages-375.png', fullPage: true});
  await page.goto('/account/details');
  await expect(page.getByText('Alex Client', {exact: true})).toBeVisible();
  await expect(page.getByRole('textbox')).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      Object.fromEntries(
        Object.entries(localStorage)
          .filter(([key]) => key.startsWith('clientapp.private.client-1.draft.'))
          .map(([key, value]) => [key.replace('clientapp.private.client-1.draft.', ''), JSON.parse(value)]),
      ),
    ),
  ).toEqual(drafts);
  expect(writes).toEqual([]);

  profile.state = 'ending_soon';
  profile.current_term = {id: 'term-2', starts_on: '2026-10-03', ends_on: '2026-10-03'};
  await page.goto('/');
  await expect(page.getByRole('heading', {name: 'Today', exact: true})).toBeVisible();
  await expect(page.getByText('Coaching ended Sep 30', {exact: true})).toHaveCount(0);
  await page.evaluate(() => localStorage.removeItem('clientapp.private.client-1.draft.profile'));
  await page.goto('/account/details');
  await expect(page.getByLabel('Full name', {exact: true})).toHaveValue('Alex Client');
  await expect(page.getByLabel('What should we call you?', {exact: true})).toHaveValue('Alex');
  await page.goto('/account');
  await expect(page.getByText('Unit system · Imperial', {exact: true})).toBeVisible();
  await expect(page.getByText('Sam', {exact: true})).toBeVisible();
  profile.state = 'joined';
  profile.current_term = null;
  profile.terms = [];
  await page.reload();
  await expect(page.getByRole('heading', {name: 'Coaching starts soon'})).toBeVisible();
  await page.getByRole('button', {name: 'Sign out', exact: true}).click();
  await expect(page.getByLabel('Email', {exact: true})).toBeVisible();
  expect(errors).toEqual([]);
} finally {
  await context.close();
  await browser.close();
}
console.log('Coaching access: joined deep links, ended history, hidden editors, and active controls passed.');
