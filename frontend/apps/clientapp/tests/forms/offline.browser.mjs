import {mkdir, writeFile} from 'node:fs/promises';
import {chromium, expect} from '@playwright/test';
import {api, inviteClient} from '../auth/fixtures.mjs';

const browser = await chromium.launch();
const results = [];
await mkdir('tests/forms/artifacts', {recursive: true});
const context = await browser.newContext({
  baseURL: process.env.CLIENTAPP_OFFLINE_URL || 'http://localhost:1316',
  viewport: {width: 375, height: 812},
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
try {
  const fixture = await inviteClient();
  const assignment = (await api(`/v1/coach/clients/${fixture.clientId}/intake`, {token: fixture.coachToken})).data;
  const update = (revision, label) =>
    api(`/v1/coach/form-templates/${assignment.form_template_id}`, {
      method: 'PATCH',
      token: fixture.coachToken,
      body: {
        name: 'Offline check-in',
        expected_revision: revision,
        sections: [
          {
            questions: [
              {id: 'goal', type: 'text', label, required: true},
              {id: 'photos', type: 'photo', label: 'Progress views'},
            ],
          },
        ],
      },
    });
  await update(assignment.form_template.revision, 'Your goal');
  await page.goto(`/invite/${fixture.token}`);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', resolve, {once: true}),
      );
    }
  });
  await page.getByRole('button', {name: 'Continue with email'}).click();
  await page.getByLabel('Verification code').fill('123456');
  await page.getByRole('button', {name: 'Verify and continue'}).click();
  await page.getByRole('link', {name: 'Forms & check-ins', exact: true}).click();
  await page.getByRole('link', {name: /Offline check-in/}).click();
  await expect(page.getByRole('button', {name: 'Send response'})).toBeEnabled();
  await page.getByLabel('Your goal', {exact: false}).fill('Keep moving while travelling');
  await expect(page.getByText('Draft saved on this device.', {exact: true})).toBeVisible();
  await page.waitForFunction((id) => {
    const key = Object.keys(localStorage).find((key) => key.endsWith('.snapshot'));
    return key && JSON.parse(localStorage.getItem(key)).state.queries.some((query) => query.queryKey.at(-1) === id);
  }, assignment.id);
  const snapshot = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((key) => key.endsWith('.snapshot'));
    return {key, value: localStorage.getItem(key)};
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText("You're offline.", {exact: false})).toBeVisible();
  await expect(page.getByText('Showing the copy from', {exact: false})).toBeVisible();
  await expect(page.getByLabel('Your goal', {exact: false})).toHaveValue('Keep moving while travelling');
  await expect(page.getByRole('button', {name: 'Send response'})).toBeDisabled();
  await page.getByLabel('Your goal', {exact: false}).fill('Edited without a connection');
  await expect(page.getByText('Draft saved on this device.', {exact: true})).toBeVisible();
  let uploadRequests = 0;
  page.on('request', (request) => {
    if (request.url().endsWith('/v1/client/uploads')) {
      uploadRequests += 1;
    }
  });
  await page.getByLabel('Choose Progress views').setInputFiles({
    name: 'offline.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==',
      'base64',
    ),
  });
  await expect(page.getByRole('button', {name: 'Retry photo 1'})).toBeDisabled();
  await page.reload();
  await expect(page.getByLabel('Your goal', {exact: false})).toHaveValue('Edited without a connection');
  await expect(page.getByRole('img', {name: 'Progress views, photo 1'})).toBeVisible();
  await page.screenshot({path: 'tests/forms/artifacts/offline-editor.png', fullPage: true});
  await page.getByRole('link', {name: 'Back', exact: true}).click();
  await expect(page.getByRole('link', {name: /Offline check-in/})).toBeVisible();
  await expect(page.getByText('1 request', {exact: true})).toBeVisible();
  await page.goto('/forms/00000000-0000-4000-8000-000000000001');
  await expect(page.getByText('This form is not available offline.', {exact: false})).toBeVisible();
  await page.goto(`/forms/${assignment.id}`);
  results.push({
    scenario:
      'production shell, profile/list/detail and draft survive full offline reload; unopened form explains connection requirement; no offline send',
    passed: true,
  });

  await update(assignment.form_template.revision + 1, 'Your goal this month');
  await context.setOffline(false);
  await expect(page.getByLabel('Your goal this month', {exact: false})).toBeVisible();
  await expect(page.getByText('Your coach updated this form.', {exact: false})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Retry photo 1'})).toBeEnabled();
  expect(uploadRequests, 'Reconnection must not automatically upload an offline photo').toBe(0);
  await page.getByRole('button', {name: 'Remove photo 1'}).click();
  await page.getByText('Answers from the earlier form', {exact: true}).click();
  await expect(page.getByText('Edited without a connection', {exact: true})).toBeVisible();
  const before = await api(`/v1/coach/form-assignments/${assignment.id}/submissions`, {token: fixture.coachToken});
  expect(before.data).toHaveLength(0);
  await page.getByLabel('Your goal this month', {exact: false}).fill('Continue the routine after reconnecting');
  await page.getByRole('button', {name: 'Send response'}).click();
  await expect(page.getByText(/Response saved/)).toBeVisible();
  await page.waitForFunction((id) => {
    const key = Object.keys(localStorage).find((key) => key.endsWith('.snapshot'));
    return JSON.parse(localStorage.getItem(key)).state.queries.some(
      (query) => query.queryKey.at(-1) === id && query.state.data.data.status === 'completed',
    );
  }, assignment.id);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('Continue the routine after reconnecting', {exact: true})).toBeVisible();
  await expect(page.getByText(/Response saved/)).toBeVisible();
  results.push({
    scenario:
      'reconnection reconciles changed template without auto-send; deliberate submit and saved reader survive offline reload',
    passed: true,
  });

  await page.evaluate(({key, value}) => {
    const packet = JSON.parse(value);
    packet.state.queries.forEach((query) => {
      query.state.dataUpdatedAt = Date.now() - 8 * 24 * 60 * 60 * 1000;
    });
    localStorage.setItem(key, JSON.stringify(packet));
  }, snapshot);
  await page.reload();
  await expect(page.getByText('This form is not available offline.', {exact: false})).toBeVisible();
  await page.evaluate(({key}) => {
    localStorage.setItem(key, '{broken');
  }, snapshot);
  await page.reload();
  await expect(page.getByText('This form is not available offline.', {exact: false})).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByText('Continue the routine after reconnecting', {exact: true})).toBeVisible();
  const token = await page.evaluate(() => JSON.parse(localStorage.getItem('clientapp.auth.v1')).tokens.access_token);
  await api('/v1/client/me', {method: 'PATCH', token, body: {first_name: 'Updated on the server'}});
  await page.goto('/account');
  await expect(page.getByLabel('First name')).toHaveValue('Updated on the server');
  await context.setOffline(true);
  await page.getByLabel('First name').fill('Offline account draft');
  await expect(page.getByText('Draft saved on this device.', {exact: true})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Save details'})).toBeDisabled();
  await page.reload();
  await expect(page.getByLabel('First name')).toHaveValue('Offline account draft');
  await page.getByRole('button', {name: 'Sign out', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Welcome back'})).toBeVisible();
  expect(
    await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('clientapp.private.'))),
  ).toEqual([]);
  const cachePaths = await page.evaluate(async () =>
    (
      await Promise.all(
        (
          await caches.keys()
        ).map(async (name) => (await (await caches.open(name)).keys()).map((request) => new URL(request.url).pathname)),
      )
    ).flat(),
  );
  expect(cachePaths.every((path) => path === '/index.html' || path.startsWith('/assets/'))).toBe(true);
  await page.reload();
  await expect(page.getByRole('heading', {name: 'Welcome back'})).toBeVisible();
  results.push({
    scenario:
      'expired/malformed snapshots recover online; offline account draft reload; logout clears private snapshots/drafts; shell cache contains public assets only',
    passed: true,
  });
  await context.setOffline(false);
  const second = await inviteClient();
  await page.goto(`/invite/${second.token}`);
  await page.getByRole('button', {name: 'Continue with email'}).click();
  await page.getByLabel('Verification code').fill('123456');
  await page.getByRole('button', {name: 'Verify and continue'}).click();
  await page.getByRole('link', {name: 'Forms & check-ins', exact: true}).click();
  await expect(page.getByRole('link', {name: /Intake/})).toBeVisible();
  await page.evaluate(({key, value}) => {
    localStorage.setItem(key, value);
  }, snapshot);
  await page.evaluate(() => {
    const setItem = Storage.prototype.setItem;
    let fail = true;
    Storage.prototype.setItem = function (key, value) {
      if (fail && key.endsWith('.snapshot')) {
        fail = false;
        throw new DOMException('Storage full', 'QuotaExceededError');
      }
      return setItem.call(this, key, value);
    };
  });
  await page.getByRole('button', {name: 'Refresh requests'}).click();
  await expect(page.getByText('This device could not keep a copy for offline use.', {exact: false})).toBeVisible();
  await expect(page.getByRole('link', {name: /Intake/})).toBeVisible();
  await page.getByRole('button', {name: 'Refresh requests'}).click();
  await expect(page.getByText('This device could not keep a copy for offline use.', {exact: false})).toHaveCount(0);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('link', {name: /Intake/})).toBeVisible();
  await expect(page.getByRole('link', {name: /Offline check-in/})).toHaveCount(0);
  await page.goto(`/forms/${assignment.id}`);
  await expect(page.getByText('This form is not available offline.', {exact: false})).toBeVisible();
  await expect(page.getByText('Edited without a connection', {exact: true})).toHaveCount(0);
  results.push({
    scenario:
      'snapshot write failure is visible without blocking online reads; retry recovers; another client cannot restore retained snapshots from a different account',
    passed: true,
  });
  expect(errors).toEqual([]);
} finally {
  await context.close();
  await browser.close();
  await writeFile('tests/forms/artifacts/offline-results.json', JSON.stringify(results, null, 2));
}
console.log(JSON.stringify(results));
