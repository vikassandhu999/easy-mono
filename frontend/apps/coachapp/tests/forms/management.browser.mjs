import {mkdir} from 'node:fs/promises';
import {chromium, expect, request} from '@playwright/test';
import {chooseOption, selectTrigger} from '../select-helpers.mjs';

const api = await request.newContext({baseURL: process.env.COACH_API_URL || 'http://localhost:44000'});
const baseURL = process.env.COACH_APP_URL || 'http://localhost:22022';
const browser = await chromium.launch();
await mkdir('tests/forms/artifacts', {recursive: true});
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()} ${response.ok() ? '' : await response.text()}`).toBe(
    true,
  );
  return response.status() === 204 ? null : response.json();
}
async function account(unique) {
  const email = `form-management-${unique}@example.test`;
  await send('post', '/v1/auth/signup', {email, first_name: 'Taylor'});
  const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
  await send('post', '/v1/businesses', {name: 'Everyday Coaching', handle: `fm-${unique}`}, guest.access_token);
  return send('post', '/v1/auth/token', {
    grant_type: 'refresh_token',
    refresh_token: guest.refresh_token,
    role: 'coach',
  });
}
async function create(name, token, purpose = 'check_in') {
  return (
    await send(
      'post',
      '/v1/coach/form-templates',
      {
        name,
        purpose,
        sections: [
          {title: 'Reflection', questions: [{id: crypto.randomUUID(), label: 'How are you feeling?', type: 'text'}]},
        ],
      },
      token,
    )
  ).data;
}
async function confirm(page, label) {
  await page.getByRole('button', {name: label, exact: true}).click();
  await page.getByRole('dialog').getByRole('button', {name: label, exact: true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
async function signIn(page, tokens) {
  await page.goto('/login');
  await page.evaluate(async (value) => {
    const {saveSession} = await import('/src/api/session.ts');
    saveSession(value);
  }, tokens);
}
try {
  for (const width of [375, 1280]) {
    const unique = `${Date.now()}-${width}`;
    const tokens = await account(unique);
    const token = tokens.access_token;
    const first = await create('First intake', token, 'intake');
    // Form ordering uses second-resolution timestamps; give the fallback an unambiguous earlier date.
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const intake = await create('Personal intake', token, 'intake');
    const unused = await create('Unused reflection', token);
    const scheduled = await create('Ongoing reflection', token);
    const endpoint = (id) => `/v1/coach/form-templates/${id}`;
    const person = (
      await send(
        'post',
        '/v1/coach/clients/invite',
        {first_name: 'Alex', email: `fm-client-${unique}@example.test`},
        token,
      )
    ).data;
    const invitation_token = new URL(person.invite_url).pathname.split('/').at(-1);
    const email = `fm-client-${unique}@example.test`;
    await send('post', '/v1/auth/accept-invite', {email, invitation_token});
    await send('post', '/v1/auth/accept-invite/verify', {email, invitation_token, otp: '123456'});
    const due = new Date();
    due.setUTCDate(due.getUTCDate() + 7);
    await send(
      'post',
      `/v1/coach/clients/${person.id}/check-in-schedules`,
      {form_template_id: scheduled.id, next_due_on: due.toISOString().slice(0, 10), frequency: 'weekly'},
      token,
    );
    for (let index = 0; index < 43; index++) {
      await create(`Library ${String(index).padStart(2, '0')}`, token);
    }
    const context = await browser.newContext({baseURL, viewport: {width, height: 900}});
    context.setDefaultTimeout(12000);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await signIn(page, tokens);
    await page.goto('/forms');
    const rows = page.getByRole('list', {name: 'forms', exact: true}).locator(':scope > li');
    await expect(rows).toHaveCount(20);
    await expect(page.getByText('48 forms', {exact: true})).toBeVisible();
    await page.route('**/v1/coach/form-templates?*', (route) =>
      new URL(route.request().url()).searchParams.get('cursor') !== 'start'
        ? route.fulfill({status: 503, json: {}})
        : route.continue(),
    );
    await page.getByRole('button', {name: 'Load more', exact: true}).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', {name: 'Retry loading more', exact: true})).toBeVisible();
    await expect(rows).toHaveCount(20);
    await page.unroute('**/v1/coach/form-templates?*');
    await page.getByRole('button', {name: 'Retry loading more', exact: true}).click();
    await expect(rows).toHaveCount(40);
    await page.getByLabel('Search forms', {exact: true}).fill('Personal intake');
    await expect(rows).toHaveCount(1);
    await page.getByRole('link', {name: /Personal intake/}).click();
    await page.getByRole('link', {name: 'Manage form', exact: true}).click();
    await expect(page.getByText('selected automatically.', {exact: false})).toBeVisible();
    await confirm(page, 'Use as default intake');
    await expect(page.getByText('chosen by your team.', {exact: false})).toBeVisible();
    await confirm(page, 'Use automatic selection');
    await expect(page.getByText('Invitations use First intake', {exact: false})).toBeVisible();
    await confirm(page, 'Use as default intake');
    // An unavailable write keeps the reviewed confirmation; a lost success is recovered by reading the saved form.
    await page.route(`**${endpoint(intake.id)}`, (route) =>
      route.request().method() === 'PATCH' ? route.fulfill({status: 503, json: {}}) : route.continue(),
    );
    await page.getByRole('button', {name: 'Archive form', exact: true}).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', {name: 'Archive form', exact: true}).click();
    await expect(dialog.getByRole('alert')).toBeVisible();
    await page.unroute(`**${endpoint(intake.id)}`);
    await page.route(`**${endpoint(intake.id)}`, async (route) => {
      if (route.request().method() !== 'PATCH') {
        return route.continue();
      }
      expect((await route.fetch()).status()).toBe(200);
      return route.abort('connectionfailed');
    });
    await dialog.getByRole('button', {name: 'Archive form', exact: true}).click();
    await expect(dialog).toHaveCount(0);
    await page.unroute(`**${endpoint(intake.id)}`);
    await expect(page.getByRole('button', {name: 'Restore form', exact: true})).toBeVisible();
    await expect(page.getByText('Invitations use First intake', {exact: false})).toBeVisible();
    await page.getByRole('link', {name: 'Back to forms', exact: true}).click();
    await expect(page.getByLabel('Search forms', {exact: true})).toHaveValue('Personal intake');
    await expect(page.getByText('No matching forms', {exact: true})).toBeVisible();
    await chooseOption(selectTrigger(page, 'Status'), 'Archived');
    await page.getByRole('link', {name: /Personal intake/}).click();
    await page.getByRole('link', {name: 'Manage form', exact: true}).click();
    await confirm(page, 'Restore form');
    await expect(page.getByText('Invitations use First intake', {exact: false})).toBeVisible();
    // A revision conflict never overwrites the newer saved form.
    await page.getByRole('button', {name: 'Archive form', exact: true}).click();
    await send('patch', endpoint(intake.id), {name: 'Personal intake revised'}, token);
    await dialog.getByRole('button', {name: 'Archive form', exact: true}).click();
    await expect(dialog.getByRole('alert')).toContainText('changed after you opened');
    await dialog.getByRole('button', {name: 'Refresh form', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Personal intake revised', exact: true})).toBeVisible();
    await page.getByRole('link', {name: 'Edit questions', exact: true}).click();
    await page.getByLabel('Form name', {exact: true}).fill('Unsaved personal intake');
    await send('patch', endpoint(intake.id), {name: 'Newer saved intake'}, token);
    await page.getByRole('button', {name: 'Save form', exact: true}).click();
    await expect(page.getByLabel('Form name', {exact: true})).toHaveValue('Unsaved personal intake');
    await page.getByRole('button', {name: 'Load saved form', exact: true}).click();
    await dialog.getByRole('button', {name: 'Load latest form', exact: true}).click();
    await expect(page.getByLabel('Form name', {exact: true})).toHaveValue('Newer saved intake');
    await page.getByRole('link', {name: 'Manage form', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Newer saved intake', exact: true})).toBeVisible();
    // Refresh failures retain loaded usage but disable actions until a successful retry.
    await page.route(`**${endpoint(intake.id)}/management`, (route) => route.fulfill({status: 503, json: {}}));
    await page.evaluate(async () => {
      const {queryClient} = await import('/src/api/query-client.ts');
      await queryClient.invalidateQueries({queryKey: ['forms']});
    });
    await expect(page.getByRole('button', {name: 'Retry form', exact: true})).toBeVisible();
    await expect(page.getByRole('heading', {name: 'Newer saved intake', exact: true})).toBeVisible();
    await expect(page.getByRole('button', {name: 'Archive form', exact: true})).toBeDisabled();
    await page.unroute(`**${endpoint(intake.id)}/management`);
    await page.getByRole('button', {name: 'Retry form', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Archive form', exact: true})).toBeEnabled();
    await page.screenshot({path: `tests/forms/artifacts/management-intake-${width}.png`, fullPage: true});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.goto(`/forms/${first.id}/manage`);
    await expect(page.getByRole('button', {name: 'Delete form', exact: true})).toBeDisabled();
    await expect(page.getByText('This form has client assignments.', {exact: false})).toBeVisible();
    await page.goto(`/forms/${scheduled.id}/manage`);
    await expect(page.locator('dt', {hasText: /^Active schedules$/}).locator('..')).toContainText('1');
    await expect(page.getByRole('button', {name: 'Delete form', exact: true})).toBeDisabled();
    await confirm(page, 'Archive form');
    await page.screenshot({path: `tests/forms/artifacts/management-scheduled-${width}.png`, fullPage: true});
    await page.goto(`/clients/${person.id}/check-ins/new`);
    await page.getByRole('button', {name: 'Choose form', exact: true}).click();
    await dialog.getByLabel('Search check-in forms', {exact: true}).fill('Ongoing reflection');
    await expect(dialog.getByRole('button', {name: 'Choose Ongoing reflection', exact: true})).toHaveCount(0);
    await expect(dialog.getByText('No matching check-in forms.', {exact: false})).toBeVisible();
    await page.goto('/forms?search=Weekly');
    await page.getByRole('link', {name: /Weekly check-in/}).click();
    await page.getByRole('link', {name: 'Manage form', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Delete form', exact: true})).toBeDisabled();
    await expect(page.getByText('Built-in forms can be archived, but cannot be deleted.', {exact: true})).toBeVisible();
    await page.goto(`/forms/${unused.id}/manage`);
    let deleted = 0;
    await page.route(`**${endpoint(unused.id)}?*`, async (route) => {
      if (route.request().method() !== 'DELETE') {
        return route.continue();
      }
      deleted++;
      expect((await route.fetch()).status()).toBe(204);
      return route.abort('connectionfailed');
    });
    await confirm(page, 'Delete form');
    await expect(page).toHaveURL('/forms');
    await expect(page.getByText('Unused reflection deleted.', {exact: true})).toBeVisible();
    expect(deleted).toBe(1);
    // Usage can change after the confirmation opens without changing the form revision.
    const newlyUsed = await create('Recently scheduled reflection', token);
    await page.route(`**${endpoint(newlyUsed.id)}/management`, (route) => route.fulfill({status: 503, json: {}}));
    await page.goto(`/forms/${newlyUsed.id}/manage`);
    await expect(page.getByRole('button', {name: 'Retry form', exact: true})).toBeVisible();
    await expect(page.getByRole('button', {name: 'Delete form', exact: true})).toHaveCount(0);
    await page.unroute(`**${endpoint(newlyUsed.id)}/management`);
    await page.getByRole('button', {name: 'Retry form', exact: true}).click();
    await page.getByRole('button', {name: 'Delete form', exact: true}).click();
    await send(
      'post',
      `/v1/coach/clients/${person.id}/check-in-schedules`,
      {form_template_id: newlyUsed.id, next_due_on: due.toISOString().slice(0, 10), frequency: 'weekly'},
      token,
    );
    await dialog.getByRole('button', {name: 'Delete form', exact: true}).click();
    await expect(dialog.getByRole('alert')).toContainText('current usage');
    await dialog.getByRole('button', {name: 'Refresh form', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Delete form', exact: true})).toBeDisabled();
    // A late lifecycle response cannot navigate or populate another account's cache.
    const other = await account(`other-${unique}`);
    await page.goto(`/forms/${intake.id}/manage`);
    await page.getByRole('link', {name: 'Edit questions', exact: true}).click();
    await page.getByRole('link', {name: 'Manage form', exact: true}).click();
    const held = Promise.withResolvers();
    const release = Promise.withResolvers();
    await page.route(`**${endpoint(intake.id)}?*`, async (route) => {
      if (route.request().method() !== 'DELETE') {
        return route.continue();
      }
      const response = await route.fetch();
      held.resolve();
      await release.promise;
      return route.fulfill({response});
    });
    await page.getByRole('button', {name: 'Delete form', exact: true}).click();
    await dialog.getByRole('button', {name: 'Delete form', exact: true}).click();
    await held.promise;
    await page.evaluate(() => history.back());
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(`/forms/${intake.id}/manage`);
    await page.evaluate(async (value) => {
      const {clearSession, saveSession} = await import('/src/api/session.ts');
      clearSession();
      saveSession(value);
    }, other);
    release.resolve();
    await page.goto('/forms');
    await expect(page.getByRole('heading', {name: 'Forms', exact: true})).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(
      await page.evaluate(async (id) => {
        const {queryClient} = await import('/src/api/query-client.ts');
        return queryClient
          .getQueryCache()
          .getAll()
          .some((query) => JSON.stringify(query.state.data ?? '').includes(id));
      }, intake.id),
    ).toBe(false);
    expect(errors).toEqual([]);
    await context.close();
    console.log(
      `Form lifecycle, default selection, cursor filters, usage, stale edits, recovery and account isolation passed at ${width}px.`,
    );
  }
} finally {
  await browser.close();
  await api.dispose();
}
