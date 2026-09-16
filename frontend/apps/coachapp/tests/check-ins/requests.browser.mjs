import {mkdir} from 'node:fs/promises';
import {chromium, expect, request} from '@playwright/test';
import {chooseOption, selectTrigger} from '../select-helpers.mjs';

const api = await request.newContext({baseURL: 'http://localhost:4000'});
const browser = await chromium.launch();
await mkdir('tests/check-ins/artifacts', {recursive: true});
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()} ${await response.text()}`).toBe(true);
  return response.status() === 204 ? null : response.json();
}
const dateAfter = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
try {
  for (const width of [375, 1280]) {
    const suffix = `${Date.now()}-${width}`;
    const email = `request-coach-${suffix}@example.test`;
    await send('post', '/v1/auth/signup', {email, first_name: 'Test Coach'});
    const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
    await send('post', '/v1/businesses', {name: 'Test Requests', handle: `requests-${suffix}`}, guest.access_token);
    const tokens = await send('post', '/v1/auth/token', {
      grant_type: 'refresh_token',
      refresh_token: guest.refresh_token,
      role: 'coach',
    });
    const token = tokens.access_token;
    const clientEmail = `request-client-${suffix}@example.test`;
    const person = (
      await send('post', '/v1/coach/clients/invite', {first_name: 'Test Alex', email: clientEmail}, token)
    ).data;
    const invitation_token = new URL(person.invite_url).pathname.split('/').at(-1);
    await send('post', '/v1/auth/accept-invite', {email: clientEmail, invitation_token});
    const clientTokens = await send('post', '/v1/auth/accept-invite/verify', {
      email: clientEmail,
      invitation_token,
      otp: '123456',
    });
    const endpoint = `/v1/coach/clients/${person.id}/check-in-requests`;
    const path = `/clients/${person.id}/check-ins/requests`;
    async function form(name) {
      return (
        await send(
          'post',
          '/v1/coach/form-templates',
          {
            name,
            purpose: 'check_in',
            sections: [
              {title: 'Your week', questions: [{id: 'goal', type: 'text', label: 'What went well?', required: true}]},
            ],
          },
          token,
        )
      ).data;
    }
    async function assign(template, status) {
      const value = (
        await send('post', `/v1/coach/clients/${person.id}/form-assignments`, {form_template_id: template.id}, token)
      ).data;
      if (status) {
        await send('patch', `/v1/coach/form-assignments/${value.id}`, {status}, token);
      }
      return value;
    }
    const targetForm = await form(`Test Remote ${'CheckInName'.repeat(15)}`);
    const schedule = (
      await send(
        'post',
        `/v1/coach/clients/${person.id}/check-in-schedules`,
        {form_template_id: targetForm.id, frequency: 'once', next_due_on: dateAfter(0)},
        token,
      )
    ).data;
    const target = (await send('get', `${endpoint}?search=Remote`, undefined, token)).data[0];
    expect(target).toBeDefined();
    const bulk = await form('Test Weekly progress');
    for (let index = 0; index < 42; index++) {
      await assign(bulk);
    }
    const missed = await assign(await form('Test Missed request'), 'missed');
    const dismissed = await assign(await form('Test Dismissed request'), 'dismissed');
    const answered = await assign(await form('Test Answered request'));
    await send(
      'post',
      `/v1/client/form-assignments/${answered.id}/submit`,
      {answers: {goal: 'I walked every day.'}},
      clientTokens.access_token,
    );
    const context = await browser.newContext({baseURL: 'http://localhost:2022', viewport: {width, height: 900}});
    context.setDefaultTimeout(15000);
    await context.addInitScript(() => {
      delete window.IntersectionObserver;
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const row = (name) => page.getByRole('article', {name, exact: true});
    const count = (n) =>
      page.getByRole('status').filter({hasText: new RegExp(`^${n} check-in requests?(?: · Updating…)?$`)});
    const targetRow = row(targetForm.name);
    const manage = page.getByRole('dialog', {name: 'Manage request', exact: true});
    const patchPath = `/v1/coach/form-assignments/${target.id}`;
    async function targetList(status = 'outstanding') {
      await page.goto(`${path}?status=${status}&search=Remote`);
      await expect(targetRow).toBeVisible();
    }
    try {
      await page.goto('/login');
      await page.evaluate(async (value) => {
        const {saveSession} = await import('/src/api/session.ts');
        saveSession(value);
      }, tokens);
      let initialFailure = true;
      await page.route(`**${endpoint}?**`, (route) =>
        initialFailure ? route.fulfill({status: 503, json: {error: 'Test initial read failure'}}) : route.continue(),
      );
      await page.goto(`/clients/${person.id}/check-ins?status=stopped&search=Remote`);
      await page.getByRole('link', {name: 'View requested check-ins', exact: true}).click();
      await expect(page.getByRole('heading', {name: 'Requested check-ins', exact: true})).toBeVisible();
      await expect(page.getByRole('button', {name: 'Try again', exact: true})).toBeVisible();
      initialFailure = false;
      await page.getByRole('button', {name: 'Try again', exact: true}).click();
      await page.unroute(`**${endpoint}?**`);
      await expect(count(44)).toBeVisible();
      await expect(page.getByRole('article')).toHaveCount(20);
      let failPage = true;
      await page.route(`**${endpoint}?**`, (route) => {
        if (failPage && new URL(route.request().url()).searchParams.get('cursor') !== 'start') {
          return route.fulfill({status: 503, json: {error: 'Test read failure'}});
        }
        return route.continue();
      });
      await page.getByRole('button', {name: 'Load more', exact: true}).click();
      await expect(page.getByRole('button', {name: 'Retry loading more', exact: true})).toBeVisible();
      await expect(page.getByRole('article')).toHaveCount(20);
      failPage = false;
      await page.getByRole('button', {name: 'Retry loading more', exact: true}).click();
      await expect(page.getByRole('article')).toHaveCount(40);
      await page.getByRole('button', {name: 'Load more', exact: true}).click();
      await expect(page.getByRole('article')).toHaveCount(44);
      await expect(targetRow).toBeVisible();
      await page.unroute(`**${endpoint}?**`);
      await page.getByLabel('Search requests', {exact: true}).fill('Remote');
      await expect(count(1)).toBeVisible();
      await page.reload();
      await expect(targetRow).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByRole('link', {name: 'Back to schedules', exact: true}).click();
      await expect(selectTrigger(page, 'Show')).toContainText('Stopped');
      await expect(page.getByLabel('Search schedules', {exact: true})).toHaveValue('Remote');
      await page.goBack();
      await expect(page.getByLabel('Search requests', {exact: true})).toHaveValue('Remote');

      await targetRow.getByRole('button', {name: 'Manage request', exact: true}).click();
      await manage.getByLabel('Due date', {exact: true}).fill(dateAfter(7));
      await chooseOption(selectTrigger(manage, 'Priority'), 'High');
      await manage.getByRole('button', {name: 'Cancel', exact: true}).click();
      await page.getByRole('button', {name: 'Keep editing', exact: true}).click();
      await expect(manage.getByLabel('Due date', {exact: true})).toHaveValue(dateAfter(7));
      expect(await manage.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
      await page.screenshot({path: `tests/check-ins/artifacts/request-edit-${width}.png`, animations: 'disabled'});
      await manage.getByRole('button', {name: 'Save request', exact: true}).click();
      await expect(page.getByText('Request details saved.', {exact: true})).toBeFocused();
      await expect(targetRow).toContainText(dateAfter(7));
      const saved = (await send('get', `${endpoint}?search=Remote`, undefined, token)).data[0];
      expect(saved.priority).toBe('high');
      expect(saved.due_date).toBe(dateAfter(7));
      await targetRow.getByRole('button', {name: 'Dismiss request', exact: true}).click();
      const dismissal = page.getByRole('dialog', {name: 'Dismiss this request?', exact: true});
      await expect(dismissal.getByRole('button', {name: 'Cancel', exact: true})).toBeFocused();
      await dismissal.getByRole('button', {name: 'Dismiss request', exact: true}).click();
      await expect(page.getByText('Request dismissed. Its schedule is unchanged.', {exact: true})).toBeFocused();
      await expect(count(0)).toBeVisible();
      const clientDismissed = await api.post(`/v1/client/form-assignments/${target.id}/submit`, {
        data: {answers: {goal: 'Cannot submit'}},
        headers: {authorization: `Bearer ${clientTokens.access_token}`},
      });
      expect(clientDismissed.ok()).toBe(false);
      await chooseOption(selectTrigger(page, 'Show'), 'Dismissed');
      await expect(targetRow).toBeVisible();
      await targetRow.getByRole('button', {name: 'Reopen request', exact: true}).click();
      await page
        .getByRole('dialog', {name: 'Reopen this request?', exact: true})
        .getByRole('button', {name: 'Reopen request', exact: true})
        .click();
      await expect(page.getByText('Request reopened for your client.', {exact: true})).toBeFocused();
      expect(
        (await send('get', `/v1/coach/clients/${person.id}/check-in-schedules`, undefined, token)).data.find(
          (item) => item.id === schedule.id,
        ).active,
      ).toBe(false);
      await targetList();
      await targetRow.getByRole('button', {name: 'Manage request', exact: true}).click();
      await manage.getByLabel('Due date', {exact: true}).fill(dateAfter(8));
      await page.route(`**${patchPath}`, (route) => route.fulfill({status: 503, json: {error: 'Test write failure'}}));
      await manage.getByRole('button', {name: 'Save request', exact: true}).click();
      await expect(manage.getByRole('alert').locator('..')).toBeFocused();
      await expect(manage.getByRole('button', {name: 'Save request', exact: true})).toHaveCount(0);
      await page.unroute(`**${patchPath}`);
      await page.route(`**${endpoint}?**`, (route) =>
        route.fulfill({status: 503, json: {error: 'Test refresh failure'}}),
      );
      await manage.getByRole('button', {name: 'Refresh requests', exact: true}).click();
      await expect(
        manage.getByText('Could not refresh requests. Your draft is still here; try again when connected.'),
      ).toBeVisible();
      await page.unroute(`**${endpoint}?**`);
      await manage.getByRole('button', {name: 'Refresh requests', exact: true}).click();
      await expect(
        page.getByText('Requests refreshed. Review the current status before making another change.', {exact: true}),
      ).toBeFocused();
      await expect(targetRow).toContainText(dateAfter(7));
      await targetRow.getByRole('button', {name: 'Manage request', exact: true}).click();
      await manage.getByLabel('Due date', {exact: true}).fill(dateAfter(9));
      let writes = 0;
      await page.route(`**${patchPath}`, async (route) => {
        writes++;
        await route.fetch();
        await route.abort('failed');
      });
      await manage.getByRole('button', {name: 'Save request', exact: true}).click();
      await expect(manage.getByRole('button', {name: 'Refresh requests', exact: true})).toBeVisible();
      await page.unroute(`**${patchPath}`);
      await manage.getByRole('button', {name: 'Refresh requests', exact: true}).click();
      await expect(targetRow).toContainText(dateAfter(9));
      expect(writes).toBe(1);
      await targetRow.getByRole('button', {name: 'Dismiss request', exact: true}).click();
      await send(
        'post',
        `/v1/client/form-assignments/${target.id}/submit`,
        {answers: {goal: 'My final progress update.'}},
        clientTokens.access_token,
      );
      await dismissal.getByRole('button', {name: 'Dismiss request', exact: true}).click();
      await expect(dismissal.getByRole('alert')).toContainText('This request changed');
      await dismissal.getByRole('button', {name: 'Refresh requests', exact: true}).click();
      await expect(count(0)).toBeVisible();
      await chooseOption(selectTrigger(page, 'Show'), 'Completed');
      await expect(targetRow.getByRole('button', {name: 'Manage request', exact: true})).toHaveCount(0);
      await targetRow.getByRole('link', {name: 'Read response', exact: true}).click();
      await expect(page.getByText('My final progress update.', {exact: true})).toBeVisible();
      await page.getByRole('link', {name: 'Back to requests', exact: true}).click();
      await expect(selectTrigger(page, 'Show')).toContainText('Completed');
      await expect(page.getByLabel('Search requests', {exact: true})).toHaveValue('Remote');
      await page.screenshot({
        path: `tests/check-ins/artifacts/requests-completed-${width}.png`,
        animations: 'disabled',
      });
      await page.goto(`${path}?status=dismissed`);
      await expect(row('Test Dismissed request')).toBeVisible();
      await page.getByRole('link', {name: 'Back to schedules', exact: true}).click();
      await expect(page.getByRole('heading', {name: 'Check-ins for Test Alex', exact: true})).toBeVisible();
      await page.goto(`${path}?status=missed`);
      await expect(row('Test Missed request')).toBeVisible();
      await row('Test Missed request').getByRole('button', {name: 'Manage request', exact: true}).click();
      await manage.getByLabel('Due date', {exact: true}).fill(dateAfter(10));
      let release;
      let started;
      const held = new Promise((resolve) => {
        release = resolve;
      });
      const pending = new Promise((resolve) => {
        started = resolve;
      });
      await page.route(`**/v1/coach/form-assignments/${missed.id}`, async (route) => {
        const response = await route.fetch();
        started();
        await held;
        await route.fulfill({response});
      });
      await manage.getByRole('button', {name: 'Save request', exact: true}).click();
      await pending;
      await expect(manage.getByRole('button', {name: 'Cancel', exact: true})).toBeDisabled();
      await page.keyboard.press('Escape');
      await expect(manage).toBeVisible();
      await page.evaluate(async () => {
        const {clearSession} = await import('/src/api/session.ts');
        clearSession();
      });
      await expect(page).toHaveURL(/\/login/);
      const delivered = page.waitForEvent(
        'requestfinished',
        (value) => new URL(value.url()).pathname === `/v1/coach/form-assignments/${missed.id}`,
      );
      release();
      await delivered;
      await expect
        .poll(async () =>
          page.evaluate(async () => {
            const {queryClient} = await import('/src/api/query-client.ts');
            return queryClient.getQueryCache().getAll().length;
          }),
        )
        .toBe(0);
      expect(errors).toEqual([]);
      console.log(
        `Request list, three pages/search, edits, dismiss/reopen, client submission, recovery, response return and logout passed at ${width}px. Fixture ${dismissed.id}.`,
      );
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  await api.dispose();
}
