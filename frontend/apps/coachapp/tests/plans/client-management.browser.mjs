import {mkdir} from 'node:fs/promises';
import {expect as baseExpect, chromium, request} from '@playwright/test';
import {chooseOption, selectTrigger} from '../select-helpers.mjs';

const expect = baseExpect.configure({timeout: 15000});
const baseURL = process.env.COACH_APP_URL || 'http://localhost:2022';
const api = await request.newContext({baseURL: process.env.COACH_API_URL || 'http://localhost:4000'});
const browser = await chromium.launch();
await mkdir('tests/plans/artifacts', {recursive: true});
async function send(method, path, data, token) {
  const res = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(res.ok(), `${method} ${path}: ${res.status()} ${res.ok() ? '' : await res.text()}`).toBe(true);
  return res.status() === 204 ? null : res.json();
}
async function account(unique) {
  const email = `client-plan-${unique}@example.test`;
  await send('post', '/v1/auth/signup', {email, first_name: 'Taylor'});
  const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
  await send('post', '/v1/businesses', {name: 'Everyday Coaching', handle: `cp-${unique}`}, guest.access_token);
  return send('post', '/v1/auth/token', {
    grant_type: 'refresh_token',
    refresh_token: guest.refresh_token,
    role: 'coach',
  });
}
function shift(date, days) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
async function lifecycle(resource, plan, action, token) {
  return send(
    'post',
    `/v1/coach/${resource}-plans/${plan.id}/${action}${resource === 'nutrition' ? `?expected_revision=${plan.revision}` : ''}`,
    resource === 'training' ? {expected_revision: plan.revision} : undefined,
    token,
  );
}
try {
  for (const width of [375, 1280]) {
    const unique = `${Date.now()}-${width}`;
    const tokens = await account(unique);
    const token = tokens.access_token;
    const email = `client-plan-person-${unique}@example.test`;
    const person = (
      await send('post', '/v1/coach/clients/invite', {first_name: 'Alex', last_name: 'Morgan', email}, token)
    ).data;
    const invitation_token = new URL(person.invite_url).pathname.split('/').at(-1);
    await send('post', '/v1/auth/accept-invite', {email, invitation_token});
    const clientTokens = await send('post', '/v1/auth/accept-invite/verify', {email, invitation_token, otp: '123456'});
    const today = (await send('get', `/v1/coach/clients/${person.id}/nutrition-days`, undefined, token)).data[0].date;
    const context = await browser.newContext({baseURL, viewport: {width, height: 900}});
    context.setDefaultTimeout(15000);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/login');
    await page.evaluate(async (value) => {
      const {saveSession} = await import('/src/api/session.ts');
      saveSession(value);
    }, tokens);
    let isolationPlan = '';
    for (const resource of ['training', 'nutrition']) {
      const base = `/v1/coach/${resource}-plans`;
      let template = (
        await send(
          'post',
          base,
          {name: `Foundation ${resource}`, ...(resource === 'nutrition' ? {target_calories: 2400} : {})},
          token,
        )
      ).data;
      if (resource === 'training') {
        const exercise = (await send('post', '/v1/coach/training-exercises', {name: 'Daily squat'}, token)).data;
        template = (
          await send(
            'put',
            `${base}/${template.id}/prescription`,
            {
              expected_revision: template.revision,
              workouts: [
                {
                  local_ref: 'daily',
                  name: 'Daily strength',
                  position: 0,
                  prescribed_exercises: [
                    {
                      local_ref: 'squat',
                      exercise_id: exercise.id,
                      position: 0,
                      prescribed_sets: [{reps: '8', set_type: 'working'}],
                    },
                  ],
                },
              ],
              schedule: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(
                (weekday) => ({weekday, workout_ref: 'daily'}),
              ),
            },
            token,
          )
        ).data;
      }
      async function assign(start, end) {
        return (
          await send(
            'post',
            `/v1/coach/clients/${person.id}/${resource}-plans/${template.id}/assign`,
            {
              expected_revision: template.revision,
              ...(start ? {start_date: start} : {}),
              ...(end ? {end_date: end} : {}),
            },
            token,
          )
        ).data;
      }
      let plan = await assign(shift(today, -10), shift(today, 10));
      const endpoint = `${base}/${plan.id}`;
      let history;
      if (resource === 'training') {
        history = (
          await send(
            'post',
            '/v1/client/training-sessions',
            {training_workout_id: plan.workouts[0].id},
            clientTokens.access_token,
          )
        ).data;
        await send('post', `/v1/client/training-sessions/${history.id}/complete`, {}, clientTokens.access_token);
      } else {
        const food = (await send('post', '/v1/coach/nutrition-foods', {name: 'Oats', calories_per_100g: 380}, token))
          .data;
        history = (
          await send(
            'patch',
            `/v1/client/nutrition-days/${today}`,
            {
              slots: [
                {
                  meal_slot: 'breakfast',
                  meal_id: null,
                  expected_revision: 0,
                  entries: [
                    {
                      id: crypto.randomUUID(),
                      planned_item_ref: null,
                      food_id: food.id,
                      recipe_id: null,
                      portion: {kind: 'gram', grams: 100},
                      notes: 'Recorded breakfast',
                    },
                  ],
                },
              ],
            },
            clientTokens.access_token,
          )
        ).data;
      }
      for (let index = 0; index < 43; index++) {
        const item = await assign(shift(today, -1000 - index * 4), shift(today, -998 - index * 4));
        await send(
          'patch',
          `${base}/${item.id}`,
          {expected_revision: item.revision, name: `Previous block ${index}`},
          token,
        );
      }
      await page.goto(`/clients/${person.id}`);
      await page.getByRole('link', {name: `All ${resource} plans`, exact: true}).click();
      const listPath = `/clients/${person.id}/${resource}-plans`;
      await expect(page).toHaveURL(new RegExp(`${listPath}\\?status=all`));
      const rows = page.getByRole('list', {name: 'client plans', exact: true}).locator(':scope > li');
      await expect(page.getByText('44 client plans', {exact: true})).toBeVisible();
      await expect(rows).toHaveCount(20);
      const listEndpoint = `/v1/coach${listPath}`;
      await page.route(`**${listEndpoint}?*`, (route) =>
        new URL(route.request().url()).searchParams.get('cursor') !== 'start'
          ? route.fulfill({status: 503, json: {}})
          : route.continue(),
      );
      await page.getByRole('button', {name: 'Load more', exact: true}).scrollIntoViewIfNeeded();
      await expect(page.getByRole('button', {name: 'Retry loading more', exact: true})).toBeVisible();
      await page.unroute(`**${listEndpoint}?*`);
      await page.getByRole('button', {name: 'Retry loading more', exact: true}).click();
      await expect(rows).toHaveCount(40);
      await page.getByRole('button', {name: 'Load more', exact: true}).scrollIntoViewIfNeeded();
      await expect(rows).toHaveCount(44);
      await page.getByLabel('Search assigned plans', {exact: true}).fill('Foundation');
      await expect(page.getByText('1 client plan', {exact: true})).toBeVisible();
      await page.getByRole('link', {name: new RegExp(`Foundation ${resource}`)}).click();
      const start = page.getByLabel('Start date', {exact: true});
      const end = page.getByLabel('End date', {exact: true});
      const save = page.getByRole('button', {name: 'Save dates', exact: true});
      const dialog = page.getByRole('dialog');
      await expect(start).toHaveValue(shift(today, -10));
      await end.fill(shift(today, -11));
      await save.click();
      await expect(page.getByText('Choose an end date on or after the start date.', {exact: true})).toBeVisible();
      await end.fill(shift(today, -1));
      await save.click();
      await expect(page.getByText('Plan dates saved.', {exact: true})).toBeVisible();
      await expect(page.getByText('Ended', {exact: true})).toBeVisible();
      await page.getByRole('link', {name: 'Back to assigned plans', exact: true}).click();
      await expect(page).toHaveURL(/search=Foundation/);
      await page.getByRole('link', {name: new RegExp(`Foundation ${resource}`)}).click();
      await end.fill('');
      await save.click();
      await expect(page.getByText('Plan dates saved.', {exact: true})).toBeVisible();
      expect((await send('get', endpoint, undefined, token)).data.end_date).toBeNull();
      await end.fill(shift(today, 10));
      await save.click();
      await expect(save).toBeDisabled();
      await assign(shift(today, 11), shift(today, 20));
      await end.fill(shift(today, 12));
      await save.click();
      await expect(page.getByText(/overlap/).first()).toBeVisible();
      await expect(start).toBeFocused();
      await expect(end).toHaveValue(shift(today, 12));
      await end.fill(shift(today, 9));
      await save.click();
      await expect(page.getByText('Plan dates saved.', {exact: true})).toBeVisible();
      // The draft remains while the coach decides whether to leave.
      await end.fill(shift(today, 8));
      await page.getByRole('link', {name: 'Personalize plan', exact: true}).click();
      await dialog.getByRole('button', {name: 'Keep editing', exact: true}).click();
      await expect(end).toHaveValue(shift(today, 8));
      plan = (await send('get', endpoint, undefined, token)).data;
      await send('patch', endpoint, {expected_revision: plan.revision, description: 'A newer coach edit'}, token);
      await save.click();
      await expect(page.getByRole('alert')).toContainText('This plan changed');
      await expect(page.getByRole('alert')).toBeFocused();
      await page.screenshot({path: `tests/plans/artifacts/date-error-${resource}-${width}.png`, fullPage: true});
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', {name: 'Load saved dates', exact: true})).toBeFocused();
      await expect(end).toHaveValue(shift(today, 8));
      await page.getByRole('button', {name: 'Load saved dates', exact: true}).click();
      await dialog.getByRole('button', {name: 'Load saved dates', exact: true}).click();
      await expect(end).toHaveValue(shift(today, 9));
      await page.route(`**${endpoint}`, async (route) => {
        if (route.request().method() === 'PATCH') {
          await route.fetch();
          await route.abort('failed');
        } else {
          await route.continue();
        }
      });
      await end.fill(shift(today, 7));
      await save.click();
      await expect(page.getByText('Plan dates saved.', {exact: true})).toBeVisible();
      await page.unroute(`**${endpoint}`);
      await page.getByRole('heading', {level: 1}).click();
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
      await page.screenshot({path: `tests/plans/artifacts/client-${resource}-${width}.png`, fullPage: true});
      await page.getByRole('button', {name: 'Archive plan', exact: true}).click();
      await dialog.getByRole('button', {name: 'Archive plan', exact: true}).click();
      await expect(page.getByText('Archived', {exact: true})).toBeVisible();
      const replacement = await assign(today, shift(today, 5));
      await page.getByRole('button', {name: 'Restore plan', exact: true}).click();
      await dialog.getByRole('button', {name: 'Restore plan', exact: true}).click();
      await expect(dialog.getByRole('alert')).toBeVisible();
      await expect(dialog.getByRole('button', {name: 'Restore plan', exact: true})).toBeDisabled();
      await expect(dialog.getByRole('alert')).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(dialog.getByRole('button', {name: 'Close and review', exact: true})).toBeFocused();
      await dialog.getByRole('button', {name: 'Close and review', exact: true}).click();
      expect((await send('get', endpoint, undefined, token)).data.lifecycle).toBe('archived');
      await lifecycle(resource, replacement, 'archive', token);
      await page.getByRole('button', {name: 'Load saved dates', exact: true}).click();
      await dialog.getByRole('button', {name: 'Load saved dates', exact: true}).click();
      await page.getByRole('button', {name: 'Restore plan', exact: true}).click();
      await dialog.getByRole('button', {name: 'Restore plan', exact: true}).click();
      await expect(page.getByText('Current', {exact: true})).toBeVisible();
      await page.getByRole('button', {name: 'Delete plan', exact: true}).click();
      await dialog.getByRole('button', {name: 'Delete plan', exact: true}).click();
      await expect(page.getByText(`${template.name} deleted.`, {exact: true})).toBeVisible();
      expect((await send('get', `${base}/${template.id}`, undefined, token)).data).toEqual(
        resource === 'nutrition' ? {...template, assigned_client_count: 1} : template,
      );
      if (resource === 'training') {
        const record = (
          await send('get', `/v1/coach/clients/${person.id}/training-sessions/${history.id}`, undefined, token)
        ).data;
        expect(record.prescription_snapshot).toEqual(history.prescription_snapshot);
      } else {
        const day = (await send('get', `/v1/coach/clients/${person.id}/nutrition-days?date=${today}`, undefined, token))
          .data[0];
        expect(day.targets).toEqual(history.targets);
        expect(day.summary.logged.calories).toBe(380);
      }
      await chooseOption(selectTrigger(page, 'Status'), 'Archived');
      await expect(page.getByText('1 client plan', {exact: true})).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (resource === 'nutrition') {
        isolationPlan = (await assign(shift(today, 30), shift(today, 35))).id;
      }
      console.log(`${resource} client-plan dates, history and lifecycle passed at ${width}px`);
    }
    const isolationEndpoint = `/v1/coach/nutrition-plans/${isolationPlan}`;
    await page.goto(`/clients/${person.id}/nutrition-plans/${isolationPlan}/manage`);
    await page.getByLabel('End date', {exact: true}).fill(shift(today, 36));
    await page.route(`**${isolationEndpoint}`, (route) =>
      route.request().method() === 'GET' ? route.fulfill({status: 503, json: {}}) : route.continue(),
    );
    await page.getByRole('button', {name: 'Load saved dates', exact: true}).click();
    await page.getByRole('dialog').getByRole('button', {name: 'Load saved dates', exact: true}).click();
    await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', {name: 'Cancel', exact: true}).click();
    await expect(page.getByLabel('End date', {exact: true})).toHaveValue(shift(today, 36));
    await page.unroute(`**${isolationEndpoint}`);
    const other = await account(`${Date.now()}-other-${width}`);
    const held = Promise.withResolvers();
    const release = Promise.withResolvers();
    const finished = Promise.withResolvers();
    await page.route(`**${isolationEndpoint}`, async (route) => {
      if (route.request().method() !== 'PATCH') {
        await route.continue();
        return;
      }
      const response = await route.fetch();
      held.resolve();
      await release.promise;
      await route.fulfill({response});
      finished.resolve();
    });
    await page.getByRole('button', {name: 'Save dates', exact: true}).click();
    await held.promise;
    await page.evaluate(async (value) => {
      const {clearSession, saveSession} = await import('/src/api/session.ts');
      clearSession();
      saveSession(value);
    }, other);
    release.resolve();
    await finished.promise;
    await page.goto('/nutrition-plans');
    await expect(page.getByRole('heading', {name: 'Create your first nutrition plan', exact: true})).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(
      await page.evaluate(async (id) => {
        const {queryClient} = await import('/src/api/query-client.ts');
        return queryClient
          .getQueryCache()
          .getAll()
          .some((query) => JSON.stringify(query.state.data ?? '').includes(id));
      }, isolationPlan),
    ).toBe(false);
    expect(errors).toEqual([]);
    await context.close();
  }
} finally {
  await browser.close();
  await api.dispose();
}
