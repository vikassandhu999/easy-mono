import {mkdir, writeFile} from 'node:fs/promises';
import {chromium, expect} from '@playwright/test';
import {api, inviteClient} from '../auth/fixtures.mjs';

const fixture = await inviteClient();
const intake = (await api(`/v1/coach/clients/${fixture.clientId}/intake`, {token: fixture.coachToken})).data;
await api(`/v1/coach/form-templates/${intake.form_template_id}`, {
  method: 'PATCH',
  token: fixture.coachToken,
  body: {
    expected_revision: intake.form_template.revision,
    name: 'A check on your goals',
    sections: [
      {title: 'Your goals', questions: [{id: 'goal', type: 'text', label: 'What matters to you?', required: true}]},
    ],
  },
});
const browser = await chromium.launch();
const context = await browser.newContext({
  baseURL: process.env.CLIENT_APP_URL || 'http://localhost:1315',
  viewport: {width: 375, height: 812},
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await mkdir('tests/messages/artifacts', {recursive: true});
try {
  await page.goto(`/invite/${fixture.token}`);
  await page.getByRole('button', {name: 'Continue with email'}).click();
  await page.getByLabel('Verification code').fill('123456');
  await page.getByRole('button', {name: 'Verify and continue'}).click();
  await expect(page.getByRole('heading', {name: 'Today', exact: true})).toBeVisible();
  const token = await page.evaluate(() => JSON.parse(localStorage.getItem('clientapp.auth.v1')).tokens.access_token);
  const conversation = (await api('/v1/client/conversation', {token})).data;
  const send = (body) =>
    api(`/v1/coach/conversations/${conversation.id}/messages`, {
      method: 'POST',
      token: fixture.coachToken,
      body: {body},
    });
  for (let n = 1; n <= 65; n++) {
    await send(`Coach guidance ${String(n).padStart(2, '0')}`);
  }
  let failInitial = true;
  let failOlder = true;
  let failedOlder = 0;
  const cursors = new Set();
  await page.route('**/v1/client/conversation/history?*', (route) => {
    const cursor = new URL(route.request().url()).searchParams.get('cursor');
    cursors.add(cursor);
    if (cursor === 'start' && failInitial) {
      return route.fulfill({status: 503, contentType: 'application/json', body: '{}'});
    }
    if (cursor !== 'start' && failOlder) {
      failedOlder++;
      return route.fulfill({status: 503, contentType: 'application/json', body: '{}'});
    }
    return route.continue();
  });
  await page.getByRole('link', {name: 'Messages', exact: true}).click();
  await expect(page.getByText("We couldn't load messages.", {exact: false})).toBeVisible();
  failInitial = false;
  await page.getByRole('button', {name: 'Try again', exact: true}).click();
  await expect(page.getByText('65 messages', {exact: true})).toBeVisible();
  await expect(page.getByText('Coach guidance 65', {exact: true})).toBeVisible();
  await expect(page.getByText('Coach guidance 01', {exact: true})).toHaveCount(0);
  const viewport = page.getByRole('region', {name: 'Conversation history', exact: true});
  await expect(viewport).not.toHaveAttribute('data-autoscrolling', '');
  await viewport.focus();
  await page.keyboard.press('Home');
  await expect(page.getByRole('button', {name: 'Retry older messages'})).toBeVisible();
  expect(failedOlder).toBe(1);
  failOlder = false;
  await page.getByRole('button', {name: 'Retry older messages'}).click();
  await expect(page.getByText('Coach guidance 06', {exact: true})).toHaveCount(1);
  await viewport.focus();
  await page.keyboard.press('Home');
  await expect(page.getByText('Coach guidance 01', {exact: true})).toBeVisible();
  expect(cursors.size).toBeGreaterThanOrEqual(3);
  expect(await page.locator('[data-message-id]').count()).toBe(65);
  await expect(page.getByText('65 messages', {exact: true})).toBeVisible();
  await send('A new question while you read older messages.');
  await expect(page.getByText('66 messages', {exact: true})).toBeVisible();
  expect((await api('/v1/client/conversation', {token})).data.unread_count).toBe(1);
  await page.getByRole('button', {name: 'Jump to latest'}).click();
  await expect.poll(async () => (await api('/v1/client/conversation', {token})).data.unread_count).toBe(0);

  const form = (await api(`/v1/client/form-assignments/${intake.id}`, {token})).data;
  const submission = (
    await api(`/v1/client/form-assignments/${intake.id}/submit`, {
      method: 'POST',
      token,
      body: {expected_revision: form.form_template.revision, answers: {goal: 'Feel stronger every week'}},
    })
  ).data;
  await api(`/v1/coach/conversations/${conversation.id}/messages`, {
    method: 'POST',
    token: fixture.coachToken,
    body: {body: 'Let us build on these goals.', embed: {type: 'form_submission', id: submission.id}},
  });
  await page.getByRole('link', {name: 'View response: A check on your goals'}).click();
  await expect(page.getByText('Feel stronger every week', {exact: true})).toBeVisible();
  await page.getByRole('link', {name: 'Messages', exact: true}).click();
  await expect(page.getByText('Let us build on these goals.', {exact: true})).toBeVisible();
  expect(errors).toEqual([]);
  await writeFile(
    'tests/messages/artifacts/history.json',
    JSON.stringify(
      {passed: true, historyPages: cursors.size, failedOlder, count: 67, sharedSubmission: submission.id},
      null,
      2,
    ),
  );
} catch (error) {
  await page.screenshot({path: 'tests/messages/artifacts/history-failure.png', fullPage: true});
  await writeFile('tests/messages/artifacts/history-failure.txt', await page.locator('body').innerText());
  throw error;
} finally {
  await browser.close();
}
console.log(
  'Message history error/retry, opaque cursor paging, unseen-arrival unread state and shared response return passed.',
);
