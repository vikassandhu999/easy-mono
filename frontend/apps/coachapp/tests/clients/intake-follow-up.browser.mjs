import {mkdir} from 'node:fs/promises';
import {chromium, expect, request} from '@playwright/test';
import {chooseOption, selectTrigger} from '../select-helpers.mjs';

const baseURL = process.env.COACH_APP_URL || 'http://localhost:22022';
const api = await request.newContext({baseURL: process.env.COACH_API_URL || 'http://localhost:44000'});
const browser = await chromium.launch();
await mkdir('tests/clients/artifacts', {recursive: true});
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${path}: ${response.status()} ${response.ok() ? '' : await response.text()}`).toBe(true);
  return response.status() === 204 ? null : response.json();
}
async function account(unique) {
  const email = `intake-coach-${unique}@example.test`;
  await send('post', '/v1/auth/signup', {email, first_name: 'Taylor'});
  const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
  await send('post', '/v1/businesses', {name: 'Everyday Coaching', handle: `intake-${unique}`}, guest.access_token);
  return send('post', '/v1/auth/token', {
    grant_type: 'refresh_token',
    refresh_token: guest.refresh_token,
    role: 'coach',
  });
}
try {
  for (const width of [375, 1280]) {
    const unique = `${Date.now()}-${width}`;
    const tokens = await account(unique);
    const token = tokens.access_token;
    const template = (
      await send(
        'post',
        '/v1/coach/form-templates',
        {
          name: 'Getting started',
          purpose: 'intake',
          sections: [
            {
              title: 'Your goals',
              questions: [{id: 'goal', type: 'text', label: 'What would you like to achieve?', required: true}],
            },
          ],
        },
        token,
      )
    ).data;
    await send('put', `/v1/coach/form-templates/${template.id}/default-intake`, undefined, token);
    const email = `intake-client-${unique}@example.test`;
    const person = (
      await send('post', '/v1/coach/clients/invite', {first_name: 'Alex', last_name: 'Morgan', email}, token)
    ).data;
    const context = await browser.newContext({baseURL, viewport: {width, height: 900}});
    context.setDefaultTimeout(12000);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/login');
    await page.evaluate(async (value) => {
      const {saveSession} = await import('/src/api/session.ts');
      saveSession(value);
    }, tokens);
    await page.goto(`/clients/${person.id}`);
    await expect(page.getByRole('heading', {name: 'Intake form', exact: true})).toBeVisible();
    await expect(page.getByRole('button', {name: 'Send intake reminder', exact: true})).toHaveCount(0);
    const invitation_token = new URL(person.invite_url).pathname.split('/').at(-1);
    await send('post', '/v1/auth/accept-invite', {email, invitation_token});
    const clientTokens = await send('post', '/v1/auth/accept-invite/verify', {email, invitation_token, otp: '123456'});
    await page.getByRole('button', {name: 'Refresh status', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Intake pending', exact: true})).toBeVisible();
    const intakePath = `/v1/coach/clients/${person.id}/intake`;
    const assignment = (await send('get', intakePath, undefined, token)).data;
    const updatePath = `/v1/coach/form-assignments/${assignment.id}`;
    const reminderPath = `${updatePath}/remind`;
    const dialog = page.getByRole('dialog');
    await page.getByRole('button', {name: 'Send intake reminder', exact: true}).click();
    await expect(dialog).toContainText(email);
    let reminders = 0;
    await page.route(`**${reminderPath}`, async (route) => {
      reminders++;
      expect((await route.fetch()).status()).toBe(204);
      return route.abort('connectionfailed');
    });
    await dialog.getByRole('button', {name: 'Send reminder', exact: true}).click();
    await expect(dialog.getByRole('alert')).toContainText('may already have been sent');
    expect(reminders).toBe(1);
    await dialog.getByRole('button', {name: 'Close reminder', exact: true}).click();
    await page.unroute(`**${reminderPath}`);
    await page.getByRole('button', {name: 'Send intake reminder', exact: true}).click();
    await dialog.getByRole('button', {name: 'Send reminder', exact: true}).click();
    await expect(page.getByText('Intake reminder requested.', {exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'Manage intake', exact: true}).click();
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + 7);
    const due = date.toISOString().slice(0, 10);
    await dialog.getByLabel('Intake due date', {exact: true}).fill(due);
    await chooseOption(selectTrigger(dialog, 'Intake priority'), 'High');
    await dialog.getByRole('button', {name: 'Cancel', exact: true}).click();
    await page
      .getByRole('dialog', {name: 'Discard intake changes?', exact: true})
      .getByRole('button', {name: 'Keep editing', exact: true})
      .click();
    await page.route(`**${updatePath}`, (route) =>
      route.request().method() === 'PATCH' ? route.fulfill({status: 503, json: {}}) : route.continue(),
    );
    await dialog.getByRole('button', {name: 'Save intake details', exact: true}).click();
    await expect(dialog.getByRole('alert')).toBeVisible();
    await expect(dialog.getByLabel('Intake due date', {exact: true})).toHaveValue(due);
    await page.unroute(`**${updatePath}`);
    await page.screenshot({path: `tests/clients/artifacts/intake-follow-up-${width}.png`, fullPage: false});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await dialog.getByRole('button', {name: 'Save intake details', exact: true}).click();
    await expect(page.getByText('Intake details saved.', {exact: true})).toBeVisible();
    expect((await send('get', intakePath, undefined, token)).data).toMatchObject({priority: 'high', due_date: due});
    await page.getByRole('button', {name: 'Manage intake', exact: true}).click();
    await dialog.getByLabel('Intake due date', {exact: true}).fill('');
    await dialog.getByRole('button', {name: 'Save intake details', exact: true}).click();
    await expect(dialog).toHaveCount(0);
    expect((await send('get', intakePath, undefined, token)).data.due_date).toBeNull();
    const overdue = new Date();
    overdue.setUTCDate(overdue.getUTCDate() - 2);
    await send('patch', updatePath, {due_date: overdue.toISOString().slice(0, 10)}, token);
    // Complete a real overdue-intake task and return to its cached Workbench queue.
    await page.getByRole('link', {name: 'Workbench', exact: true}).click();
    if (width === 375) {
      await chooseOption(selectTrigger(page, 'Task queue'), /^Getting started/);
    } else {
      await page.getByRole('button', {name: /^Getting started/}).click();
    }
    await expect(page.getByText('Alex Morgan', {exact: true})).toBeVisible();
    await page.getByRole('link', {name: 'Follow up', exact: true}).click();
    await page.getByRole('button', {name: 'Manage intake', exact: true}).click();
    await dialog.getByRole('button', {name: 'Dismiss intake instead', exact: true}).click();
    await expect(dialog.getByRole('heading', {name: 'Dismiss this intake?', exact: true})).toBeVisible();
    await page.route(`**${updatePath}`, async (route) => {
      if (route.request().method() !== 'PATCH') {
        return route.continue();
      }
      expect((await route.fetch()).status()).toBe(200);
      return route.abort('connectionfailed');
    });
    await dialog.getByRole('button', {name: 'Dismiss intake', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Intake dismissed', exact: true})).toBeVisible();
    await page.unroute(`**${updatePath}`);
    await expect(page.getByRole('button', {name: 'Send intake reminder', exact: true})).toHaveCount(0);
    await page.getByRole('link', {name: 'Workbench', exact: true}).click();
    if (width === 375) {
      await chooseOption(selectTrigger(page, 'Task queue'), /^Getting started/);
    } else {
      await page.getByRole('button', {name: /^Getting started/}).click();
    }
    await expect(page.getByText('Alex Morgan', {exact: true})).toHaveCount(0);
    expect(
      (await send('get', '/v1/coach/workbench/queues/onboarding?cursor=start&search=Alex', undefined, token)).count,
    ).toBe(0);
    await page.getByRole('link', {name: 'Clients', exact: true}).click();
    await page.getByRole('link', {name: /Alex Morgan/}).click();
    await page.getByRole('button', {name: 'Reopen intake', exact: true}).click();
    await dialog.getByRole('button', {name: 'Reopen intake', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Intake pending', exact: true})).toBeVisible();
    await page.route(`**${intakePath}`, (route) => route.fulfill({status: 503, json: {}}));
    await page.getByRole('button', {name: 'Refresh status', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Retry intake', exact: true})).toBeVisible();
    await expect(page.getByRole('heading', {name: 'Intake pending', exact: true})).toBeVisible();
    await expect(page.getByRole('button', {name: 'Manage intake', exact: true})).toBeDisabled();
    await page.unroute(`**${intakePath}`);
    await page.getByRole('button', {name: 'Retry intake', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Manage intake', exact: true})).toBeEnabled();
    await page.getByRole('button', {name: 'Manage intake', exact: true}).click();
    await dialog.getByRole('button', {name: 'Dismiss intake instead', exact: true}).click();
    const submission = (
      await send(
        'post',
        `/v1/client/form-assignments/${assignment.id}/submit`,
        {answers: {goal: 'Build a sustainable routine.'}},
        clientTokens.access_token,
      )
    ).data;
    await dialog.getByRole('button', {name: 'Dismiss intake', exact: true}).click();
    await expect(dialog.getByRole('alert')).toContainText('intake changed');
    await dialog.getByRole('button', {name: 'Refresh intake', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Intake submitted', exact: true})).toBeVisible();
    await expect(page.getByText('Build a sustainable routine.', {exact: true})).toBeVisible();
    await expect(page.getByRole('button', {name: 'Manage intake', exact: true})).toHaveCount(0);
    await page.getByRole('button', {name: 'Mark intake reviewed', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Intake reviewed', exact: true})).toBeVisible();
    expect(
      (await send('get', `/v1/coach/form-assignments/${assignment.id}/submissions`, undefined, token)).data[0].id,
    ).toBe(submission.id);
    const secondEmail = `intake-second-${unique}@example.test`;
    const second = (await send('post', '/v1/coach/clients/invite', {first_name: 'Sam', email: secondEmail}, token))
      .data;
    const secondInvitation = new URL(second.invite_url).pathname.split('/').at(-1);
    await send('post', '/v1/auth/accept-invite', {email: secondEmail, invitation_token: secondInvitation});
    await send('post', '/v1/auth/accept-invite/verify', {
      email: secondEmail,
      invitation_token: secondInvitation,
      otp: '123456',
    });
    const secondPath = `/v1/coach/clients/${second.id}`;
    await send('patch', secondPath, {email: null}, token);
    await page.goto(`/clients/${second.id}`);
    await expect(page.getByRole('button', {name: 'Send intake reminder', exact: true})).toBeDisabled();
    await expect(page.getByText('Add an email in Client details', {exact: false})).toBeVisible();
    await send('patch', secondPath, {status: 'inactive'}, token);
    await page.getByRole('button', {name: 'Refresh status', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Intake paused', exact: true})).toBeVisible();
    await expect(page.getByRole('button', {name: 'Manage intake', exact: true})).toBeDisabled();
    await send('patch', secondPath, {status: 'active', email: secondEmail}, token);
    await page.getByRole('button', {name: 'Refresh status', exact: true}).click();
    await page.getByRole('button', {name: 'Manage intake', exact: true}).click();
    await chooseOption(selectTrigger(dialog, 'Intake priority'), 'High');
    const held = Promise.withResolvers();
    const release = Promise.withResolvers();
    await page.route('**/v1/coach/form-assignments/*', async (route) => {
      if (route.request().method() !== 'PATCH') {
        return route.continue();
      }
      const response = await route.fetch();
      expect(response.status()).toBe(200);
      held.resolve();
      await release.promise;
      return route.fulfill({response});
    });
    await dialog.getByRole('button', {name: 'Save intake details', exact: true}).click();
    await held.promise;
    const other = await account(`other-${unique}`);
    await page.evaluate(async (value) => {
      const {clearSession, saveSession} = await import('/src/api/session.ts');
      clearSession();
      saveSession(value);
    }, other);
    release.resolve();
    await page.goto('/');
    await expect(page.getByText('Invite your first client', {exact: true})).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(
      await page.evaluate(async (id) => {
        const {queryClient} = await import('/src/api/query-client.ts');
        return queryClient
          .getQueryCache()
          .getAll()
          .some((query) => JSON.stringify(query.state.data ?? '').includes(id));
      }, second.id),
    ).toBe(false);
    expect(errors).toEqual([]);
    await context.close();
    console.log(
      `Intake follow-up, due date/priority, dismissal, reminders, stale submission and retained recovery passed at ${width}px.`,
    );
  }
} finally {
  await browser.close();
  await api.dispose();
}
