import {mkdir} from 'node:fs/promises';
import {chromium, expect, request} from '@playwright/test';
import {chooseOption, selectTrigger} from '../select-helpers.mjs';

const api = await request.newContext({baseURL: 'http://localhost:4000'});
const browser = await chromium.launch();
await mkdir('tests/check-ins/artifacts', {recursive: true});
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()}`).toBe(true);
  return response.status() === 204 ? null : response.json();
}
const dateAfter = (days) => {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};
try {
  for (const width of [375, 1280]) {
    const suffix = `${Date.now()}-${width}`;
    const email = `delete-schedule-coach-${suffix}@example.test`;
    await send('post', '/v1/auth/signup', {email, first_name: 'Test Coach'});
    const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
    await send(
      'post',
      '/v1/businesses',
      {name: 'Test Schedule Removal', handle: `schedule-delete-${suffix}`},
      guest.access_token,
    );
    const tokens = await send('post', '/v1/auth/token', {
      grant_type: 'refresh_token',
      refresh_token: guest.refresh_token,
      role: 'coach',
    });
    const token = tokens.access_token;
    const clientEmail = `delete-schedule-client-${suffix}@example.test`;
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
    const path = `/clients/${person.id}/check-ins`;
    const endpoint = `/v1/coach/clients/${person.id}/check-in-schedules`;
    async function create(name, {used = false, stopped = false} = {}) {
      const form = (
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
      const schedule = (
        await send(
          'post',
          endpoint,
          {form_template_id: form.id, frequency: 'weekly', next_due_on: dateAfter(used ? 0 : 30)},
          token,
        )
      ).data;
      if (stopped) {
        await send('patch', `/v1/coach/check-in-schedules/${schedule.id}`, {active: false}, token);
      }
      return {...schedule, form_template: form};
    }
    const context = await browser.newContext({baseURL: 'http://localhost:2022', viewport: {width, height: 900}});
    context.setDefaultTimeout(15000);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const dialog = page.getByRole('dialog', {name: 'Delete this schedule?', exact: true});
    const remove = dialog.getByRole('button', {name: 'Delete schedule', exact: true});
    const row = (schedule) => page.getByRole('article', {name: schedule.form_template.name, exact: true});
    async function open(schedule) {
      await page.goto(path);
      await row(schedule).getByRole('button', {name: 'Delete schedule', exact: true}).click();
      await expect(dialog.getByRole('button', {name: 'Keep schedule', exact: true})).toBeFocused();
      await expect(dialog).toContainText(schedule.form_template.name);
    }
    try {
      await page.goto('/login');
      await page.evaluate(async (value) => {
        const {saveSession} = await import('/src/api/session.ts');
        saveSession(value);
      }, tokens);
      const normal = await create('Test unused weekly check-in');
      await open(normal);
      await dialog.getByRole('button', {name: 'Keep schedule', exact: true}).click();
      await expect(row(normal).getByRole('button', {name: 'Delete schedule', exact: true})).toBeFocused();
      expect((await send('get', endpoint, undefined, token)).count).toBe(1);
      await row(normal).getByRole('button', {name: 'Delete schedule', exact: true}).click();
      const deletionPath = `/v1/coach/check-in-schedules/${normal.id}`;
      let release;
      let started;
      const pending = new Promise((resolve) => {
        started = resolve;
      });
      const held = new Promise((resolve) => {
        release = resolve;
      });
      await page.route(`**${deletionPath}`, async (route) => {
        started();
        await held;
        await route.continue();
      });
      await remove.click();
      await pending;
      await expect(dialog.getByRole('button', {name: 'Keep schedule', exact: true})).toBeDisabled();
      await page.keyboard.press('Escape');
      await expect(dialog).toBeVisible();
      release();
      await expect(page.getByText('Schedule deleted.', {exact: true})).toBeFocused();
      await expect(row(normal)).toHaveCount(0);
      expect((await send('get', endpoint, undefined, token)).count).toBe(0);
      await page.unroute(`**${deletionPath}`);

      const long = await create(`Test ${'LongScheduleName'.repeat(12)}`, {stopped: true});
      await page.goto(path);
      await chooseOption(selectTrigger(page, 'Show'), 'Stopped');
      await page.getByLabel('Search schedules', {exact: true}).fill(long.form_template.name);
      await row(long).getByRole('button', {name: 'Delete schedule', exact: true}).click();
      expect(await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({path: `tests/check-ins/artifacts/delete-schedule-${width}.png`, animations: 'disabled'});
      await remove.click();
      await expect(page.getByText('Schedule deleted.', {exact: true})).toBeFocused();
      await expect(page.getByRole('heading', {name: 'No matching schedules', exact: true})).toBeVisible();
      expect(new URL(page.url()).searchParams.get('status')).toBe('stopped');
      await expect(page.getByLabel('Search schedules', {exact: true})).toHaveValue(long.form_template.name);

      const used = await create('Test existing history', {used: true});
      const assignments = (await send('get', `/v1/client/form-assignments`, undefined, clientTokens.access_token)).data;
      const assignment = assignments.find((item) => item.form_template.id === used.form_template_id);
      expect(assignment).toBeDefined();
      await send(
        'post',
        `/v1/client/form-assignments/${assignment.id}/submit`,
        {answers: {goal: 'I completed three walks.'}},
        clientTokens.access_token,
      );
      await open(used);
      await remove.click();
      await expect(dialog.getByRole('alert')).toContainText('must be kept with their history');
      await expect(dialog.getByRole('alert').locator('..')).toBeFocused();
      await expect(remove).toHaveCount(0);
      await dialog.getByRole('button', {name: 'Stop scheduling instead', exact: true}).click();
      const stop = page.getByRole('dialog', {name: 'Stop scheduling this check-in?', exact: true});
      await stop.getByRole('button', {name: 'Stop scheduling', exact: true}).click();
      await expect(row(used)).toContainText('Stopped');
      const preserved = (
        await send('get', `/v1/client/form-assignments/${assignment.id}`, undefined, clientTokens.access_token)
      ).data;
      expect(preserved.status).toBe('completed');
      await row(used).getByRole('button', {name: 'Delete schedule', exact: true}).click();
      await remove.click();
      await expect(dialog.getByRole('alert')).toContainText('Scheduling is already stopped');
      await dialog.getByRole('button', {name: 'Keep schedule', exact: true}).click();

      const failed = await create('Test retry removal');
      await open(failed);
      const failedPath = `/v1/coach/check-in-schedules/${failed.id}`;
      await page.route(`**${failedPath}`, (route) => route.fulfill({status: 503, json: {}}));
      await remove.click();
      await expect(dialog.getByRole('button', {name: 'Retry deletion', exact: true})).toBeVisible();
      await page.unroute(`**${failedPath}`);
      await dialog.getByRole('button', {name: 'Retry deletion', exact: true}).click();
      await expect(page.getByText('Schedule deleted.', {exact: true})).toBeFocused();
      await expect(row(failed)).toHaveCount(0);

      const lost = await create('Test interrupted deletion');
      await open(lost);
      let deletes = 0;
      const lostPath = `/v1/coach/check-in-schedules/${lost.id}`;
      await page.route(`**${lostPath}`, async (route) => {
        deletes++;
        expect((await route.fetch()).status()).toBe(204);
        await route.abort('connectionfailed');
      });
      await remove.click();
      await expect(dialog.getByRole('button', {name: 'Retry deletion', exact: true})).toBeVisible();
      expect(deletes).toBe(1);
      await page.unroute(`**${lostPath}`);
      await dialog.getByRole('button', {name: 'Retry deletion', exact: true}).click();
      await expect(page.getByText('This schedule is no longer available.', {exact: true})).toBeFocused();
      await expect(row(lost)).toHaveCount(0);
      expect((await send('get', endpoint, undefined, token)).count).toBe(1);

      const late = await create('Test late deletion');
      await open(late);
      const lateStarted = Promise.withResolvers();
      const lateRelease = Promise.withResolvers();
      await page.route(`**/v1/coach/check-in-schedules/${late.id}`, async (route) => {
        const response = await route.fetch();
        lateStarted.resolve();
        await lateRelease.promise;
        await route.fulfill({response});
      });
      await remove.click();
      await lateStarted.promise;
      await page.evaluate(async () => {
        const {clearSession} = await import('/src/api/session.ts');
        clearSession();
      });
      await expect(page).toHaveURL(/\/login/);
      lateRelease.resolve();
      await page.unrouteAll({behavior: 'wait'});
      await expect(page).toHaveURL(/\/login/);
      expect(
        await page.evaluate(async () => {
          const {queryClient} = await import('/src/api/query-client.ts');
          return queryClient.getQueryCache().getAll().length;
        }),
      ).toBe(0);
      expect(errors).toEqual([]);
      console.log(
        `Schedule deletion, confirmation/focus, filters/counts, history protection, retry/lost response and logout isolation passed at ${width}px.`,
      );
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  await api.dispose();
}
