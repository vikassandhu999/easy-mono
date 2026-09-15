import {mkdir} from 'node:fs/promises';
import {chromium, expect, request} from '@playwright/test';
import {chooseOption, selectTrigger} from '../select-helpers.mjs';

const api = await request.newContext({baseURL: 'http://localhost:4000'});
const browser = await chromium.launch();
await mkdir('tests/check-ins/artifacts', {recursive: true});
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()} ${response.ok() ? '' : await response.text()}`).toBe(
    true,
  );
  return response.status() === 204 ? null : response.json();
}
async function account(unique) {
  const email = `check-in-schedule-${unique}@example.test`;
  await send('post', '/v1/auth/signup', {email, first_name: 'Taylor'});
  const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
  await send('post', '/v1/businesses', {name: 'Everyday Coaching', handle: `ci-${unique}`}, guest.access_token);
  return send('post', '/v1/auth/token', {
    grant_type: 'refresh_token',
    refresh_token: guest.refresh_token,
    role: 'coach',
  });
}
function dateAfter(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
async function signIn(page, tokens) {
  await page.goto('/login');
  await page.evaluate(async (tokens) => {
    const {saveSession} = await import('/src/api/session.ts');
    saveSession(tokens);
  }, tokens);
}
async function template(name, token, purpose = 'check_in') {
  return (
    await send(
      'post',
      '/v1/coach/form-templates',
      {
        name,
        purpose,
        sections: [
          {
            title: 'Your week',
            questions: [{id: crypto.randomUUID(), type: 'text', label: 'What went well this week?', required: true}],
          },
        ],
      },
      token,
    )
  ).data;
}
async function chooseForm(page, name) {
  await page.getByRole('button', {name: /^(Choose form|Change form)$/}).click();
  const picker = page.getByRole('dialog', {name: 'Choose a check-in form', exact: true});
  await picker.getByLabel('Search check-in forms', {exact: true}).fill(name);
  await picker.getByRole('button', {name: `Choose ${name}`, exact: true}).click();
  await expect(page.getByRole('dialog', {includeHidden: true})).toHaveCount(0);
}
try {
  for (const width of [375, 1280]) {
    const unique = `${Date.now()}-${width}`;
    const tokens = await account(unique);
    const token = tokens.access_token;
    const weeklyName = 'TestWeeklyProgress'.repeat(8);
    const _weekly = await template(weeklyName, token);
    const _recovery = await template('Recovery check-in', token);
    const once = await template('One-time reflection', token);
    const extra = await template('Extra check-in', token);
    const templates = [];
    for (let index = 0; index < 43; index++) {
      templates.push(await template(`Progress ${String(index).padStart(2, '0')}`, token));
    }
    const email = `check-in-client-${unique}@example.test`;
    const person = (
      await send('post', '/v1/coach/clients/invite', {first_name: 'Alex', last_name: 'Morgan', email}, token)
    ).data;
    const invitation_token = new URL(person.invite_url).pathname.split('/').at(-1);
    await send('post', '/v1/auth/accept-invite', {email, invitation_token});
    const clientTokens = await send('post', '/v1/auth/accept-invite/verify', {email, invitation_token, otp: '123456'});
    const endpoint = `/v1/coach/clients/${person.id}/check-in-schedules`;
    const path = `/clients/${person.id}/check-ins`;
    const context = await browser.newContext({baseURL: 'http://localhost:2022', viewport: {width, height: 900}});
    context.setDefaultTimeout(12000);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await signIn(page, tokens);
    await page.goto(`/clients/${person.id}`);
    await page.route(`**${endpoint}?*`, (route) => route.fulfill({status: 503, json: {}}));
    await page.getByRole('link', {name: 'Manage check-ins', exact: true}).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await page.unroute(`**${endpoint}?*`);
    await page.getByRole('button', {name: 'Try again', exact: true}).click();
    await expect(page.getByText('No check-ins scheduled', {exact: true})).toBeVisible();
    await page.getByRole('link', {name: 'Schedule check-in', exact: true}).click();
    const save = page.getByRole('button', {name: 'Save schedule', exact: true});
    const date = page.getByLabel('First due date', {exact: true});
    await save.click();
    await expect(date).toBeFocused();
    await date.fill(dateAfter(7));
    await save.click();
    await expect(page.getByText('Choose a check-in form.', {exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'Choose form', exact: true}).click();
    const picker = page.getByRole('dialog', {name: 'Choose a check-in form', exact: true});
    const formRows = picker.getByRole('list', {name: 'check-in forms', exact: true}).locator(':scope > li');
    await expect(formRows).toHaveCount(20);
    const formPage = await send(
      'get',
      '/v1/coach/form-templates?cursor=start&limit=20&purpose=check_in',
      undefined,
      token,
    );
    await expect(picker.getByText(`${formPage.count} check-in forms`, {exact: true})).toBeVisible();
    await page.route('**/v1/coach/form-templates?*', (route) =>
      new URL(route.request().url()).searchParams.get('cursor') !== 'start'
        ? route.fulfill({status: 503, json: {}})
        : route.continue(),
    );
    await picker.getByRole('button', {name: 'Load more', exact: true}).scrollIntoViewIfNeeded();
    await expect(picker.getByRole('button', {name: 'Retry loading more', exact: true})).toBeVisible();
    await expect(formRows).toHaveCount(20);
    await page.unroute('**/v1/coach/form-templates?*');
    await picker.getByRole('button', {name: 'Retry loading more', exact: true}).click();
    await expect(formRows).toHaveCount(40);
    await picker.getByLabel('Search check-in forms', {exact: true}).fill(weeklyName);
    await picker.getByRole('button', {name: `Choose ${weeklyName}`, exact: true}).click();
    await expect(page.getByRole('dialog', {includeHidden: true})).toHaveCount(0);
    await page.getByRole('button', {name: 'Preview form', exact: true}).click();
    await expect(page.getByRole('dialog', {name: weeklyName, exact: true})).toContainText('What went well this week?');
    await page.getByRole('button', {name: 'Close preview', exact: true}).click();
    await expect(page.getByRole('dialog', {includeHidden: true})).toHaveCount(0);
    await page.getByRole('link', {name: 'Back to check-ins', exact: true}).click();
    await page.getByRole('button', {name: 'Keep editing', exact: true}).click();
    await expect(page.getByRole('dialog', {includeHidden: true})).toHaveCount(0);
    await page.evaluate(() => {
      document.activeElement?.blur();
      scrollTo(0, 0);
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({path: `tests/check-ins/artifacts/create-${width}.png`, fullPage: true});
    let creates = 0;
    await page.route(`**${endpoint}`, async (route) => {
      if (route.request().method() !== 'POST') {
        return route.continue();
      }
      creates++;
      const response = await route.fetch();
      expect(response.status()).toBe(201);
      return route.abort('connectionfailed');
    });
    await save.click();
    await expect(page.getByRole('button', {name: 'Check saved schedules', exact: true})).toBeVisible();
    await expect(save).toBeDisabled();
    await page.unroute(`**${endpoint}`);
    await expect(page.getByRole('alert').locator('..')).toBeFocused();
    await page.keyboard.press('Tab');
    const checkSaved = page.getByRole('button', {name: 'Check saved schedules', exact: true});
    await expect(checkSaved).toBeFocused();
    await page.route(`**${endpoint}?*`, (route) => route.fulfill({status: 503, json: {}}));
    await page.keyboard.press('Enter');
    const saved = page.getByRole('dialog', {name: 'Check saved schedules', exact: true});
    await expect(saved.getByRole('button', {name: 'Try again', exact: true})).toBeVisible();
    await expect(saved.getByRole('button', {name: 'Return and retry', exact: true})).toHaveCount(0);
    await page.unroute(`**${endpoint}?*`);
    await saved.getByRole('button', {name: 'Try again', exact: true}).click();
    await expect(saved.getByText('1 matching schedule', {exact: true})).toBeVisible();
    await expect.poll(() => saved.evaluate((node) => node.contains(document.activeElement))).toBe(true);
    const savedName = saved.getByText(weeklyName, {exact: true});
    expect(await savedName.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
    expect(await saved.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
    await page.screenshot({path: `tests/check-ins/artifacts/saved-recovery-${width}.png`, fullPage: true});
    await page.getByRole('button', {name: 'View saved schedules', exact: true}).click();
    await expect(page).toHaveURL(path);
    expect(creates).toBe(1);
    const schedule = (await send('get', endpoint, undefined, token)).data[0];
    expect(schedule.frequency).toBe('weekly');
    expect(schedule.next_due_on).toBe(dateAfter(7));
    const row = page.getByRole('article', {name: weeklyName, exact: true});
    await row.getByRole('button', {name: 'Edit schedule', exact: true}).click();
    const edit = page.getByRole('dialog', {name: 'Edit schedule', exact: true});
    expect(await edit.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
    await edit.getByLabel('Next due date', {exact: true}).fill(dateAfter(14));
    await chooseOption(selectTrigger(edit, 'Repeat'), 'Every 2 weeks');
    await edit.getByRole('button', {name: 'Cancel', exact: true}).click();
    await page.getByRole('button', {name: 'Keep editing', exact: true}).click();
    await expect(page.getByRole('dialog', {name: 'Discard schedule changes?', includeHidden: true})).toHaveCount(0);
    const updatePath = `/v1/coach/check-in-schedules/${schedule.id}`;
    await page.route(`**${updatePath}`, (route) => route.fulfill({status: 503, json: {}}));
    await edit.getByRole('button', {name: 'Save changes', exact: true}).click();
    await expect(edit.getByRole('alert')).toBeVisible();
    await expect(edit.getByLabel('Next due date', {exact: true})).toHaveValue(dateAfter(14));
    await page.unroute(`**${updatePath}`);
    await edit.getByRole('button', {name: 'Save changes', exact: true}).click();
    await expect(page.getByRole('dialog', {includeHidden: true})).toHaveCount(0);
    await expect(row).toContainText('Every 2 weeks');
    await row.getByRole('button', {name: 'Stop scheduling', exact: true}).click();
    const stop = page.getByRole('dialog', {name: 'Stop scheduling this check-in?', exact: true});
    expect(await stop.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
    expect(
      await stop.getByText(weeklyName, {exact: true}).evaluate((node) => node.scrollWidth <= node.clientWidth),
    ).toBe(true);
    await page.route(`**${updatePath}`, (route) => route.fulfill({status: 503, json: {}}));
    await stop.getByRole('button', {name: 'Stop scheduling', exact: true}).click();
    await expect(stop.getByRole('alert')).toBeVisible();
    await page.unroute(`**${updatePath}`);
    await stop.getByRole('button', {name: 'Stop scheduling', exact: true}).click();
    await expect(page.getByRole('dialog', {includeHidden: true})).toHaveCount(0);
    await expect(row).toContainText('Stopped');
    await chooseOption(selectTrigger(page, 'Show'), 'Active');
    await expect(page.getByText('No matching schedules', {exact: true})).toBeVisible();
    await chooseOption(selectTrigger(page, 'Show'), 'Stopped');
    await expect(row).toBeVisible();
    await row.getByRole('button', {name: 'Resume schedule', exact: true}).click();
    const resume = page.getByRole('dialog', {name: 'Resume schedule', exact: true});
    expect(await resume.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
    await resume.getByRole('button', {name: 'Resume schedule', exact: true}).click();
    await expect(resume.getByLabel('Next due date', {exact: true})).toBeFocused();
    await resume.getByLabel('Next due date', {exact: true}).fill(dateAfter(21));
    await chooseOption(selectTrigger(resume, 'Repeat'), 'Every month');
    await resume.getByRole('button', {name: 'Resume schedule', exact: true}).click();
    await expect(page.getByRole('dialog', {includeHidden: true})).toHaveCount(0);
    await chooseOption(selectTrigger(page, 'Show'), 'All schedules');
    await expect(row).toContainText('Every month');
    await page.getByRole('link', {name: 'Schedule check-in', exact: true}).click();
    await chooseForm(page, weeklyName);
    await date.fill(dateAfter(5));
    await save.click();
    await expect(page.getByRole('alert')).toContainText('already has an active schedule');
    await expect(page.getByRole('button', {name: 'Change form', exact: true})).toBeFocused();
    await chooseForm(page, 'Recovery check-in');
    await page.route(`**${endpoint}`, (route) => route.fulfill({status: 503, json: {}}));
    await save.click();
    await expect(checkSaved).toBeVisible();
    await expect(save).toBeDisabled();
    await expect(date).toBeDisabled();
    await page.unroute(`**${endpoint}`);
    await page.getByRole('link', {name: 'Back to check-ins', exact: true}).click();
    await expect(page.getByRole('dialog')).toContainText('will not remove a schedule that was already saved');
    await page.getByRole('button', {name: 'Keep editing', exact: true}).click();
    await page.getByRole('button', {name: 'Check saved schedules', exact: true}).click();
    await expect(saved.getByText('No matching schedules found.', {exact: true})).toBeVisible();
    await saved.getByRole('button', {name: 'Return and retry', exact: true}).click();
    await expect(saved).toHaveCount(0);
    await expect(date).toBeFocused();
    await expect(date).toHaveValue(dateAfter(5));
    await expect(page.getByRole('region', {name: 'Check-in form', exact: true})).toContainText('Recovery check-in');
    await save.click();
    await expect(page).toHaveURL(path);
    // A one-time due schedule creates an assignment immediately and stops future generation.
    await page.getByRole('link', {name: 'Schedule check-in', exact: true}).click();
    await chooseForm(page, 'One-time reflection');
    await date.fill(dateAfter(-1));
    await chooseOption(selectTrigger(page, 'Repeat'), 'One time');
    await save.click();
    await expect(page).toHaveURL(path);
    const oneTime = page.getByRole('article', {name: 'One-time reflection', exact: true});
    await expect(oneTime).toContainText('Stopped');
    await expect(oneTime).not.toContainText('Completed');
    const assignments = (await send('get', `/v1/coach/clients/${person.id}/form-assignments`, undefined, token)).data;
    const assignment = assignments.find((item) => item.form_template.id === once.id && item.purpose === 'check_in');
    expect(assignment).toBeDefined();
    // Follow the generated assignment through the real client app and back to the coach.
    const clientContext = await browser.newContext({
      baseURL: 'http://localhost:1314',
      viewport: {width: 375, height: 900},
    });
    clientContext.setDefaultTimeout(12000);
    const clientPage = await clientContext.newPage();
    clientPage.on('pageerror', (error) => errors.push(error.message));
    await clientPage.goto('/login');
    await clientPage.evaluate(async (tokens) => {
      const {setTokens} = await import('/src/api/authStorage.ts');
      setTokens(tokens);
    }, clientTokens);
    await clientPage.goto('/check-ins');
    await clientPage.getByRole('button', {name: /One-time reflection/}).click();
    await expect(clientPage).toHaveURL(`/check-ins/${assignment.id}`);
    const submit = clientPage.getByRole('button', {name: 'Submit check-in', exact: true});
    await submit.click();
    await expect(clientPage.getByText('Please answer all required questions.', {exact: true})).toBeVisible();
    const answer = clientPage.getByRole('textbox', {name: /What went well this week/});
    const reflection = 'I made time for three walks and slept better.';
    await answer.fill(reflection);
    const submitPath = `/v1/client/form-assignments/${assignment.id}/submit`;
    await clientPage.route(`**${submitPath}`, (route) => route.fulfill({status: 503, json: {}}));
    await submit.click();
    await expect(clientPage.getByText("Couldn't submit. Please try again.", {exact: true})).toBeVisible();
    await expect(answer).toHaveValue(reflection);
    await clientPage.unroute(`**${submitPath}`);
    await submit.click();
    await expect(clientPage).toHaveURL('/check-ins');
    await expect(clientPage.getByRole('button', {name: /One-time reflection/})).toContainText('Completed');
    await page.getByRole('link', {name: 'View submitted responses', exact: true}).click();
    await page.getByRole('link', {name: 'Read One-time reflection', exact: true}).click();
    await expect(page.getByRole('region', {name: 'Submitted answers', exact: true})).toContainText(reflection);
    await page.getByRole('button', {name: 'Mark reviewed', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Review saved', exact: true})).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', {name: 'Review saved', exact: true})).toBeVisible();
    await page.screenshot({path: `tests/check-ins/artifacts/one-time-reviewed-${width}.png`, fullPage: true});
    await clientPage.reload();
    await expect(clientPage.getByRole('button', {name: /One-time reflection/})).toContainText('Reviewed');
    await clientContext.close();
    await page.goto(path);
    await expect(oneTime).toContainText('Stopped');
    const third = (
      await send('post', endpoint, {form_template_id: extra.id, next_due_on: dateAfter(5), frequency: 'weekly'}, token)
    ).data;
    await page.getByRole('link', {name: 'Schedule check-in', exact: true}).click();
    await chooseForm(page, templates[0].name);
    await date.fill(dateAfter(5));
    await save.click();
    await expect(page.getByRole('alert')).toBeVisible();
    await page.getByRole('link', {name: 'Back to check-ins', exact: true}).click();
    await page.getByRole('button', {name: 'Discard changes', exact: true}).click();
    await expect(page).toHaveURL(path);
    await send('patch', `/v1/coach/check-in-schedules/${third.id}`, {active: false}, token);
    // Inactive history must paginate too. API limits active schedules, not historical rows.
    for (const item of templates) {
      const saved = (
        await send(
          'post',
          endpoint,
          {form_template_id: item.id, next_due_on: dateAfter(30), frequency: 'weekly'},
          token,
        )
      ).data;
      await send('patch', `/v1/coach/check-in-schedules/${saved.id}`, {active: false}, token);
    }
    await page.getByRole('button', {name: 'Refresh check-in schedules', exact: true}).click();
    const rows = page.getByRole('list', {name: 'check-in schedules', exact: true}).locator(':scope > li');
    const total = (await send('get', `${endpoint}?cursor=start`, undefined, token)).count;
    await expect(page.getByText(`${total} check-in schedules`, {exact: true})).toBeVisible();
    await expect(rows).toHaveCount(20);
    await page.route(`**${endpoint}?*`, (route) =>
      new URL(route.request().url()).searchParams.get('cursor') !== 'start'
        ? route.fulfill({status: 503, json: {}})
        : route.continue(),
    );
    await page.getByRole('button', {name: 'Load more', exact: true}).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', {name: 'Retry loading more', exact: true})).toBeVisible();
    await expect(rows).toHaveCount(20);
    await page.unroute(`**${endpoint}?*`);
    await page.getByRole('button', {name: 'Retry loading more', exact: true}).click();
    await expect(rows).toHaveCount(40);
    await rows.nth(30).scrollIntoViewIfNeeded();
    const scroll = await page.evaluate(() => scrollY);
    await page
      .getByRole('link', {name: 'Schedule check-in', exact: true})
      .evaluate((link) => link.focus({preventScroll: true}));
    await page.keyboard.press('Enter');
    await page.getByRole('link', {name: 'Back to check-ins', exact: true}).click();
    await expect(rows).toHaveCount(40);
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(scroll);
    await page.getByLabel('Search schedules', {exact: true}).fill(weeklyName);
    await expect(rows).toHaveCount(1);
    await expect(row).toContainText(dateAfter(21));
    await page.reload();
    await expect(rows).toHaveCount(1);
    await chooseOption(selectTrigger(page, 'Show'), 'Stopped');
    await expect(page.getByText('No matching schedules', {exact: true})).toBeVisible();
    await chooseOption(selectTrigger(page, 'Show'), 'Active');
    await expect(rows).toHaveCount(1);
    await page.screenshot({path: `tests/check-ins/artifacts/schedules-${width}.png`, fullPage: true});
    if (width === 375) {
      await row.getByRole('button', {name: 'Edit schedule', exact: true}).click();
      await edit.getByLabel('Next due date', {exact: true}).fill(dateAfter(28));
      const held = Promise.withResolvers();
      const release = Promise.withResolvers();
      await page.route(`**${updatePath}`, async (route) => {
        const response = await route.fetch();
        expect(response.status()).toBe(200);
        held.resolve();
        await release.promise;
        return route.fulfill({response});
      });
      await edit.getByRole('button', {name: 'Save changes', exact: true}).click();
      await held.promise;
      const other = await account(`other-${unique}`);
      await page.evaluate(async (tokens) => {
        const {clearSession, saveSession} = await import('/src/api/session.ts');
        clearSession();
        saveSession(tokens);
      }, other);
      release.resolve();
      await page.getByRole('link', {name: 'Clients', exact: true}).click();
      await expect(page.getByText('Invite your first client', {exact: true})).toBeVisible();
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
      `Check-in scheduling, recurrence, recovery, cursor history, preview and session isolation passed at ${width}px.`,
    );
  }
} finally {
  await browser.close();
  await api.dispose();
}
