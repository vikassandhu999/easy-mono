import {mkdir} from 'node:fs/promises';
import {expect as baseExpect, chromium, request} from '@playwright/test';
import {chooseOption, selectTrigger} from '../select-helpers.mjs';

const baseURL = process.env.COACH_APP_URL || 'http://localhost:2022';
const api = await request.newContext({baseURL: process.env.COACH_API_URL || 'http://localhost:4000'});
const expect = baseExpect.configure({timeout: 15000});
const browser = await chromium.launch();
await mkdir('tests/plans/artifacts', {recursive: true});
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()} ${response.ok() ? '' : await response.text()}`).toBe(
    true,
  );
  return response.status() === 204 ? null : response.json();
}
async function account(unique) {
  const email = `plan-management-${unique}@example.test`;
  await send('post', '/v1/auth/signup', {email, first_name: 'Taylor'});
  const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
  await send('post', '/v1/businesses', {name: 'Everyday Coaching', handle: `pm-${unique}`}, guest.access_token);
  return send('post', '/v1/auth/token', {
    grant_type: 'refresh_token',
    refresh_token: guest.refresh_token,
    role: 'coach',
  });
}
try {
  for (const width of [375, 1280]) {
    const tokens = await account(`${Date.now()}-${width}`);
    const token = tokens.access_token;
    const person = (
      await send(
        'post',
        '/v1/coach/clients/invite',
        {first_name: 'Alex', last_name: 'Morgan', email: `pm-client-${Date.now()}@example.test`},
        token,
      )
    ).data;
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
    let sessionTarget = '';
    for (const resource of ['training', 'nutrition']) {
      const library = `/${resource}-plans`;
      const endpoint = `/v1/coach${library}`;
      let plan = (
        await send(
          'post',
          endpoint,
          {
            name: `Foundation ${resource}`,
            description: 'Original coaching guidance',
            ...(resource === 'nutrition' ? {target_calories: 2100} : {}),
          },
          token,
        )
      ).data;
      if (resource === 'training') {
        const exercise = (await send('post', '/v1/coach/training-exercises', {name: 'Foundation squat'}, token)).data;
        plan = (
          await send(
            'put',
            `${endpoint}/${plan.id}/prescription`,
            {
              expected_revision: plan.revision,
              workouts: [
                {
                  local_ref: 'workout',
                  name: 'Strength',
                  position: 0,
                  prescribed_exercises: [
                    {
                      local_ref: 'squat',
                      exercise_id: exercise.id,
                      position: 0,
                      prescribed_sets: [
                        {set_type: 'working', reps: '8', load_value: '12', load_unit: 'kg', rest_seconds: 90},
                      ],
                    },
                  ],
                },
              ],
              schedule: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(
                (weekday) => ({weekday, workout_ref: 'workout'}),
              ),
            },
            token,
          )
        ).data;
      }
      const assigned = (
        await send(
          'post',
          `/v1/coach/clients/${person.id}/${resource}-plans/${plan.id}/assign`,
          {expected_revision: plan.revision, start_date: new Date().toISOString().slice(0, 10)},
          token,
        )
      ).data;
      for (let index = 0; index < 43; index++) {
        await send('post', endpoint, {name: `Library ${resource} ${index}`}, token);
      }
      await page.goto(library);
      await expect(page.getByText(`44 ${resource} templates`, {exact: true})).toBeVisible();
      const rows = page.getByRole('list', {name: `${resource} templates`, exact: true}).locator(':scope > li');
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
      await page.getByRole('button', {name: 'Load more', exact: true}).scrollIntoViewIfNeeded();
      await expect(rows).toHaveCount(44);
      await page.getByLabel(`Search ${resource} plans`, {exact: true}).fill('Foundation');
      await expect(page.getByText(`1 ${resource} template`, {exact: true})).toBeVisible();
      await page.getByRole('link', {name: new RegExp(`Foundation ${resource}`)}).click();
      const draftName = page.getByRole('textbox', {name: /^Plan name/});
      await draftName.fill('Unsaved alternative');
      await page.getByRole('button', {name: 'Manage template', exact: true}).click();
      await page.getByRole('button', {name: 'Keep editing', exact: true}).click();
      await expect(draftName).toHaveValue('Unsaved alternative');
      await page.getByRole('button', {name: 'Manage template', exact: true}).click();
      await page.getByRole('button', {name: 'Discard changes', exact: true}).click();
      const manage = `${library}/${plan.id}/manage`;
      await expect(page).toHaveURL(new RegExp(`${manage}$`));
      await expect(page.getByRole('heading', {name: plan.name, exact: true})).toBeVisible();
      await expect(page.getByRole('button', {name: 'Create copy', exact: true})).toBeEnabled();
      await page.screenshot({path: `tests/plans/artifacts/${resource}-manage-${width}.png`, fullPage: true});
      const dialog = page.getByRole('dialog');
      // Copy actual saved contents, then edit the independent result.
      await page.getByRole('button', {name: 'Create copy', exact: true}).click();
      await dialog.getByRole('button', {name: 'Create copy', exact: true}).click();
      await expect(page).toHaveURL(new RegExp(`${library}/[^/]+$`));
      const copyId = new URL(page.url()).pathname.split('/').at(-1);
      expect(copyId).not.toBe(plan.id);
      if (resource === 'nutrition') {
        sessionTarget = copyId;
      }
      const copy = (await send('get', `${endpoint}/${copyId}`, undefined, token)).data;
      expect(copy.name).toContain('Copy');
      expect(copy.description).toBe(plan.description);
      if (resource === 'training') {
        expect(copy.workout_count).toBe(1);
        expect(copy.workouts[0].workout_elements[0].planned_sets[0].reps).toBe('8');
      } else {
        expect(copy.target_calories).toBe(2100);
      }
      await send(
        'patch',
        `${endpoint}/${copyId}`,
        {name: 'Independent adaptation', expected_revision: copy.revision},
        token,
      );
      expect((await send('get', `${endpoint}/${plan.id}`, undefined, token)).data.name).toBe(plan.name);
      await page.goBack();
      await expect(page).toHaveURL(new RegExp(`${manage}$`));
      // A concurrent edit invalidates the name/revision in the open confirmation.
      await page.getByRole('button', {name: 'Archive template', exact: true}).click();
      plan = (
        await send(
          'patch',
          `${endpoint}/${plan.id}`,
          {expected_revision: plan.revision, description: 'Newer saved guidance'},
          token,
        )
      ).data;
      await dialog.getByRole('button', {name: 'Archive template', exact: true}).click();
      await expect(dialog.getByRole('alert')).toContainText('changed after');
      await expect(dialog.getByRole('alert')).toBeFocused();
      await page.screenshot({path: `tests/plans/artifacts/template-error-${resource}-${width}.png`, fullPage: true});
      await page.keyboard.press('Tab');
      await expect(dialog.getByRole('button', {name: 'Close and review', exact: true})).toBeFocused();
      await expect(dialog.getByRole('button', {name: 'Archive template', exact: true})).toBeDisabled();
      await dialog.getByRole('button', {name: 'Close and review'}).click();
      await expect(page.getByText('Newer saved guidance', {exact: true})).toBeVisible();
      // Lost successful archive response is reconciled using the same resource.
      await page.route(`**${endpoint}/${plan.id}/archive*`, async (route) => {
        await route.fetch();
        await route.abort('failed');
      });
      await page.getByRole('button', {name: 'Archive template', exact: true}).click();
      await dialog.getByRole('button', {name: 'Archive template', exact: true}).click();
      await expect(dialog).toHaveCount(0);
      await expect(page.getByText('Archived', {exact: true})).toBeVisible();
      await page.unroute(`**${endpoint}/${plan.id}/archive*`);
      expect((await send('get', `${endpoint}/${assigned.id}`, undefined, token)).data).toEqual(assigned);
      await page.getByRole('link', {name: `Back to ${resource} plans`, exact: true}).click();
      await expect(page).toHaveURL(/search=Foundation/);
      await expect(page.getByRole('heading', {name: /No matching/})).toBeVisible();
      await chooseOption(selectTrigger(page, 'Status'), 'Archived');
      await expect(page.getByText(`1 ${resource} template`, {exact: true})).toBeVisible();
      await chooseOption(selectTrigger(page, 'Status'), 'All statuses');
      await expect(page.getByText(`1 ${resource} template`, {exact: true})).toBeVisible();
      await page.getByRole('link', {name: new RegExp(plan.name)}).click();
      await expect(page).toHaveURL(new RegExp(`${manage}$`));
      await page.getByRole('button', {name: 'Restore template', exact: true}).click();
      await dialog.getByRole('button', {name: 'Restore template', exact: true}).click();
      await expect(page.getByText('Active template', {exact: true})).toBeVisible();
      // Duplicate is never retried after the server saved it but its response was lost.
      let copies = 0;
      await page.route(`**${endpoint}/${plan.id}/duplicate`, async (route) => {
        copies++;
        await route.fetch();
        await route.abort('failed');
      });
      await page.getByRole('button', {name: 'Create copy', exact: true}).click();
      await dialog.getByRole('button', {name: 'Create copy', exact: true}).click();
      await expect(dialog.getByRole('alert')).toContainText('may have been saved');
      await expect(dialog.getByRole('button', {name: 'Create copy', exact: true})).toBeDisabled();
      await dialog.getByRole('button', {name: 'Close and review'}).click();
      await expect(page.getByRole('button', {name: 'Create copy', exact: true})).toBeDisabled();
      expect(copies).toBe(1);
      await page.unroute(`**${endpoint}/${plan.id}/duplicate`);
      // Deletion reconciles absence and leaves the assigned copy intact.
      await page.route(`**${endpoint}/${plan.id}?*`, async (route) => {
        if (route.request().method() === 'DELETE') {
          await route.fetch();
          await route.abort('failed');
        } else {
          await route.continue();
        }
      });
      await page.getByRole('button', {name: 'Delete template', exact: true}).click();
      await dialog.getByRole('button', {name: 'Delete template', exact: true}).click();
      await expect(page).toHaveURL(new RegExp(`${library}\\?`));
      await expect(page.getByText(`${plan.name} deleted.`, {exact: true})).toBeVisible();
      const surviving = (await send('get', `${endpoint}/${assigned.id}`, undefined, token)).data;
      expect(surviving.name).toBe(assigned.name);
      expect(surviving.source_template_id).toBeNull();
      if (resource === 'training') {
        expect(surviving.workouts).toEqual(assigned.workouts);
      } else {
        expect(surviving.menu).toEqual(assigned.menu);
      }
      await page.unroute(`**${endpoint}/${plan.id}?*`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      console.log(`${resource} template lifecycle passed at ${width}px`);
    }
    // Failed initial read recovers; late copy responses cannot populate another account.
    const sessionEndpoint = `/v1/coach/nutrition-plans/${sessionTarget}`;
    await page.route(`**${sessionEndpoint}`, (route) => route.fulfill({status: 503, json: {}}));
    await page.goto(`/nutrition-plans/${sessionTarget}/manage`);
    await expect(page.getByRole('button', {name: 'Try again', exact: true})).toBeVisible();
    await page.unroute(`**${sessionEndpoint}`);
    await page.getByRole('button', {name: 'Try again', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Create copy', exact: true})).toBeEnabled();
    const other = await account(`${Date.now()}-other-${width}`);
    const held = Promise.withResolvers();
    const release = Promise.withResolvers();
    const finished = Promise.withResolvers();
    await page.route(`**${sessionEndpoint}/duplicate`, async (route) => {
      const response = await route.fetch();
      held.resolve();
      await release.promise;
      await route.fulfill({response});
      finished.resolve();
    });
    await page.getByRole('button', {name: 'Create copy', exact: true}).click();
    await page.getByRole('dialog').getByRole('button', {name: 'Create copy', exact: true}).click();
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
      }, sessionTarget),
    ).toBe(false);
    expect(errors).toEqual([]);
    await context.close();
  }
} finally {
  await browser.close();
  await api.dispose();
}
