import {mkdir} from 'node:fs/promises';
import {chromium, expect, request} from '@playwright/test';

const appURL = process.env.COACH_APP_URL || 'http://localhost:2022';
const api = await request.newContext({baseURL: process.env.COACH_API_URL || 'http://localhost:4000'});
const browser = await chromium.launch();
const errors = [];
await mkdir('tests/training/artifacts', {recursive: true});

async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()} ${response.ok() ? '' : await response.text()}`).toBe(
    true,
  );
  return response.json();
}

async function account(unique) {
  const email = `training-coach-${unique}@example.test`;
  await send('post', '/v1/auth/signup', {email, first_name: 'Taylor'});
  const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
  await send('post', '/v1/businesses', {name: 'Everyday Coaching', handle: `training-${unique}`}, guest.access_token);
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

try {
  for (const width of [375, 1280]) {
    const unique = `${Date.now()}-${width}`;
    const tokens = await account(unique);
    const token = tokens.access_token;
    const exercise = (await send('post', '/v1/coach/training-exercises', {name: 'Goblet squat'}, token)).data;
    const prescription = {
      workouts: [
        {
          local_ref: 'full-body',
          name: 'Full body A',
          position: 0,
          prescribed_exercises: [
            {
              local_ref: 'squat',
              exercise_id: exercise.id,
              position: 0,
              prescribed_sets: [
                {set_type: 'warmup', reps: '8', load_value: '0', load_unit: 'kg', rest_seconds: 0},
                {
                  set_type: 'working',
                  reps: '8–10',
                  load_value: '12.5',
                  load_unit: 'kg',
                  rest_seconds: 90,
                  rpe: 7,
                  notes: 'Keep the movement controlled.',
                },
              ],
            },
          ],
        },
      ],
      schedule: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((weekday) => ({
        weekday,
        ...(['monday', 'thursday'].includes(weekday) ? {workout_ref: 'full-body'} : {}),
      })),
    };
    const templates = [];
    for (let index = 0; index < 45; index++) {
      let plan = (
        await send(
          'post',
          '/v1/coach/training-plans',
          {
            name: `Plan ${String(index).padStart(2, '0')}`,
            description:
              index < 2
                ? 'Build consistency with two full-body sessions each week.'
                : 'A saved training template for the coaching library.',
          },
          token,
        )
      ).data;
      if (index < 2) {
        plan = (
          await send(
            'put',
            `/v1/coach/training-plans/${plan.id}/prescription`,
            {expected_revision: plan.revision, ...prescription},
            token,
          )
        ).data;
      }
      templates.push(plan);
    }
    const email = `training-client-${unique}@example.test`;
    const person = (
      await send('post', '/v1/coach/clients/invite', {first_name: 'Alex', last_name: 'Morgan', email}, token)
    ).data;
    const invitation_token = new URL(person.invite_url).pathname.split('/').at(-1);
    await send('post', '/v1/auth/accept-invite', {email, invitation_token});
    const clientTokens = await send('post', '/v1/auth/accept-invite/verify', {email, invitation_token, otp: '123456'});
    const clientPath = `/clients/${person.id}`;
    const choosePath = `${clientPath}/training-plans/assign`;
    const assignedPath = `/v1/coach/clients/${person.id}/training-plans`;
    const context = await browser.newContext({baseURL: appURL, viewport: {width, height: 900}});
    context.setDefaultTimeout(15000);
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await signIn(page, tokens);
    await page.goto('/?search=Alex');
    await page.getByRole('link', {name: /Alex Morgan/}).click();
    await expect(page.getByText('No training plans assigned', {exact: true})).toBeVisible();

    await page.route('**/v1/coach/training-plans?*', (route) =>
      route.fulfill({status: 503, json: {error_message: 'Unavailable'}}),
    );
    await page.getByRole('link', {name: 'Assign training plan', exact: true}).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await page.unroute('**/v1/coach/training-plans?*');
    await page.getByRole('button', {name: 'Try again', exact: true}).click();
    const rows = page.getByRole('list', {name: 'training plans', exact: true}).getByRole('listitem');
    await expect(rows).toHaveCount(20);
    await expect(page.getByText('45 training plans', {exact: true})).toBeVisible();
    let failedPages = 0;
    await page.route('**/v1/coach/training-plans?*', (route) => {
      if (new URL(route.request().url()).searchParams.get('cursor') !== 'start') {
        failedPages++;
        return route.fulfill({status: 503, json: {error_message: 'Page unavailable'}});
      }
      return route.continue();
    });
    await page.getByRole('button', {name: 'Load more', exact: true}).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', {name: 'Retry loading more', exact: true})).toBeVisible();
    await expect(rows).toHaveCount(20);
    await page.waitForTimeout(350);
    expect(failedPages).toBe(1);
    await page.unroute('**/v1/coach/training-plans?*');
    await page.getByRole('button', {name: 'Retry loading more', exact: true}).focus();
    await page.keyboard.press('Enter');
    await expect(rows).toHaveCount(40);
    await page.getByRole('button', {name: 'Load more', exact: true}).scrollIntoViewIfNeeded();
    await expect(rows).toHaveCount(45);
    const hrefs = await rows.getByRole('link').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
    expect(new Set(hrefs).size).toBe(45);
    await rows.nth(30).getByRole('link').scrollIntoViewIfNeeded();
    const scroll = await page.evaluate(() => scrollY);
    await rows.nth(30).getByRole('link').click();
    await expect(page.getByRole('heading', {name: 'Plan preview', exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'Cancel', exact: true}).click();
    await expect(rows).toHaveCount(45);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(scroll - 100);
    await page.getByLabel('Search training plans', {exact: true}).fill('not-a-plan');
    await expect(page.getByText('No matching training plans', {exact: true})).toBeVisible();
    await page.getByLabel('Search training plans', {exact: true}).fill('Plan 00');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('1 workout');
    await page.reload();
    await expect(page.getByLabel('Search training plans', {exact: true})).toHaveValue('Plan 00');
    await page.screenshot({path: `tests/training/artifacts/list-${width}.png`, fullPage: true});

    await page.route(`**/v1/coach/training-plans/${templates[0].id}`, (route) =>
      route.fulfill({status: 503, json: {error_message: 'Unavailable'}}),
    );
    await rows.first().getByRole('link').click();
    await expect(page.getByRole('alert')).toBeVisible();
    await page.unroute(`**/v1/coach/training-plans/${templates[0].id}`);
    await page.getByRole('button', {name: 'Try again', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Goblet squat', exact: true})).toBeVisible();
    await expect(page.getByText('monday, thursday', {exact: true})).toBeVisible();
    await expect(page.getByText('0 sec', {exact: true})).toBeVisible();
    await expect(page.getByText('12.5 kg', {exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'Assign plan', exact: true}).click();
    await expect(page.getByText('Enter start date.', {exact: true})).toBeVisible();
    await expect(page.getByLabel('Start date', {exact: true})).toBeFocused();
    await page.getByLabel('Start date', {exact: true}).fill(dateAfter(0));
    await page.getByLabel('End date', {exact: true}).fill(dateAfter(-1));
    await page.getByRole('button', {name: 'Assign plan', exact: true}).click();
    await expect(page.getByText('End date must be on or after the start date.', {exact: true})).toBeVisible();
    await expect(page.getByLabel('End date', {exact: true})).toBeFocused();
    await page.getByLabel('End date', {exact: true}).fill(dateAfter(28));
    await send(
      'patch',
      `/v1/coach/training-plans/${templates[0].id}`,
      {
        expected_revision: templates[0].revision,
        description: 'Reviewed revision: keep two recovery days between workouts.',
      },
      token,
    );
    await page.getByRole('button', {name: 'Assign plan', exact: true}).click();
    await expect(page.getByText(/This template changed while you were reviewing it/)).toBeVisible();
    await expect(page.getByRole('button', {name: 'Assign plan', exact: true})).toBeDisabled();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', {name: 'Refresh preview', exact: true})).toBeFocused();
    await page.route(`**/v1/coach/training-plans/${templates[0].id}`, (route) =>
      route.fulfill({status: 503, json: {error_message: 'Refresh unavailable'}}),
    );
    await page.keyboard.press('Enter');
    await expect(page.getByText('The preview could not be refreshed. Try again.', {exact: true})).toBeFocused();
    await expect(page.getByLabel('Start date', {exact: true})).toHaveValue(dateAfter(0));
    await expect(page.getByLabel('End date', {exact: true})).toHaveValue(dateAfter(28));
    await expect(page.getByRole('button', {name: 'Assign plan', exact: true})).toBeDisabled();
    await page.screenshot({path: `tests/training/artifacts/assignment-refresh-${width}.png`});
    await page.unroute(`**/v1/coach/training-plans/${templates[0].id}`);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', {name: 'Refresh preview', exact: true})).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', {name: 'Plan preview', exact: true})).toBeFocused();
    await expect(
      page.getByText('Reviewed revision: keep two recovery days between workouts.', {exact: true}),
    ).toBeVisible();
    await expect(page.getByLabel('Start date', {exact: true})).toHaveValue(dateAfter(0));
    const assignRoute = `**${assignedPath}/${templates[0].id}/assign`;
    await page.route(assignRoute, (route) => route.fulfill({status: 503, json: {error_message: 'Unavailable'}}));
    await page.getByRole('button', {name: 'Assign plan', exact: true}).click();
    await expect(page.getByRole('link', {name: 'Check client plans', exact: true})).toBeVisible();
    await expect(page.getByRole('alert')).toBeInViewport({ratio: 1});
    await page.unroute(assignRoute);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({path: `tests/training/artifacts/preview-${width}.png`, fullPage: true});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', {name: 'Assign plan', exact: true}).click();
    await expect(page).toHaveURL(new RegExp(`${clientPath}$`));
    await expect(page.getByText('Plan 00 assigned.', {exact: true})).toBeVisible();
    const assignedRows = page.getByRole('list', {name: 'assigned plans', exact: true}).getByRole('listitem');
    await expect(assignedRows).toHaveCount(1);
    await expect(assignedRows.first()).toContainText('Current');
    await page.reload();
    await assignedRows.first().locator('summary').first().click();
    await expect(page.getByText('Keep the movement controlled.', {exact: true})).toBeVisible();
    await page.screenshot({path: `tests/training/artifacts/assigned-${width}.png`, fullPage: true});
    const saved = await send('get', assignedPath, undefined, token);
    expect(saved.count).toBe(1);
    expect(saved.data[0].source_template_id).toBe(templates[0].id);
    expect(saved.data[0].workouts[0].id).not.toBe(templates[0].workouts[0].id);
    expect(saved.data[0].workout_count).toBe(1);
    const clientPlans = await send('get', '/v1/client/training-plans', undefined, clientTokens.access_token);
    expect(clientPlans.data[0].id).toBe(saved.data[0].id);
    expect(clientPlans.data[0].workouts[0].workout_elements[0].exercise.name).toBe('Goblet squat');

    await page.getByRole('link', {name: 'Back to clients', exact: true}).click();
    await expect(page.getByLabel('Search clients', {exact: true})).toHaveValue('Alex');
    await page.getByRole('link', {name: /Alex Morgan/}).click();
    await page.getByRole('link', {name: 'Assign training plan', exact: true}).click();
    await page.getByLabel('Search training plans', {exact: true}).fill('Plan 01');
    await rows.first().getByRole('link').click();
    await page.getByLabel('Start date', {exact: true}).fill(dateAfter(0));
    await page.getByLabel('End date', {exact: true}).fill(dateAfter(28));
    await page.getByRole('button', {name: 'Assign plan', exact: true}).click();
    await expect(page.getByText(/overlaps an existing training plan/)).toBeVisible();
    await expect(page.getByLabel('Start date', {exact: true})).toBeFocused();
    await page.getByLabel('Start date', {exact: true}).fill(dateAfter(29));
    await page.getByLabel('End date', {exact: true}).fill(dateAfter(56));
    await page.getByRole('button', {name: 'Assign plan', exact: true}).click();
    await expect(assignedRows).toHaveCount(2);
    await expect(page.getByText('2 assigned plans', {exact: true})).toBeVisible();
    await expect(assignedRows.first()).toContainText('Upcoming');

    // A committed assignment with a lost response is discoverable without another write.
    await page.goto(`${choosePath}/${templates[0].id}`);
    await page.getByLabel('Start date', {exact: true}).fill(dateAfter(57));
    await page.route(assignRoute, async (route) => {
      const response = await route.fetch();
      expect(response.status()).toBe(201);
      await route.fulfill({status: 503, json: {error_message: 'Response lost'}});
    });
    await page.getByRole('button', {name: 'Assign plan', exact: true}).click();
    await expect(page.getByRole('link', {name: 'Check client plans', exact: true})).toBeVisible();
    await page.getByRole('link', {name: 'Check client plans', exact: true}).click();
    await expect(assignedRows).toHaveCount(3);
    await page.unroute(assignRoute);
    await page.route(`**${assignedPath}?*`, (route) =>
      route.fulfill({status: 503, json: {error_message: 'Read unavailable'}}),
    );
    await page.getByRole('button', {name: 'Refresh assigned plans', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Retry refresh', exact: true})).toBeVisible();
    await expect(assignedRows).toHaveCount(3);
    await page.unroute(`**${assignedPath}?*`);
    await page.getByRole('button', {name: 'Retry refresh', exact: true}).click();
    await expect(page.getByRole('alert')).toHaveCount(0);

    await send(
      'post',
      `/v1/coach/training-plans/${templates[44].id}/archive`,
      {expected_revision: templates[44].revision},
      token,
    );
    await page.goto(`${choosePath}/${templates[44].id}`);
    await expect(
      page.getByText('This training template is no longer available. Choose another plan.', {exact: true}),
    ).toBeVisible();
    await expect(page.getByRole('button', {name: 'Assign plan', exact: true})).toBeDisabled();
    await page.getByRole('link', {name: 'Back to training plans', exact: true}).click();
    await page.route('**/v1/coach/training-plans?*', (route) =>
      route.fulfill({json: {data: [], count: 0, next_cursor: null}}),
    );
    await page.getByRole('button', {name: 'Refresh training plans', exact: true}).click();
    await expect(page.getByText('No training templates yet', {exact: true})).toBeVisible();
    await page.unroute('**/v1/coach/training-plans?*');

    if (width === 375) {
      // Leaving during a pending write must not navigate back when it resolves.
      await page.goto(`${choosePath}/${templates[0].id}`);
      await page.getByLabel('Start date', {exact: true}).fill(dateAfter(-28));
      await page.getByLabel('End date', {exact: true}).fill(dateAfter(-1));
      const held = Promise.withResolvers();
      const release = Promise.withResolvers();
      await page.route(assignRoute, async (route) => {
        const response = await route.fetch();
        expect(response.status()).toBe(201);
        held.resolve();
        await release.promise;
        await route.fulfill({response});
      });
      await page.getByRole('button', {name: 'Assign plan', exact: true}).click();
      await held.promise;
      await page.getByRole('link', {name: 'Back to training plans', exact: true}).click();
      release.resolve();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(new RegExp(`${choosePath}$`));
      await page.unroute(assignRoute);

      const otherTokens = await account(`other-${unique}`);
      await page.goto(`${choosePath}/${templates[0].id}`);
      await page.getByLabel('Start date', {exact: true}).fill(dateAfter(-56));
      await page.getByLabel('End date', {exact: true}).fill(dateAfter(-29));
      const switched = Promise.withResolvers();
      const finish = Promise.withResolvers();
      await page.route(assignRoute, async (route) => {
        const response = await route.fetch();
        expect(response.status()).toBe(201);
        switched.resolve();
        await finish.promise;
        await route.fulfill({response});
      });
      await page.getByRole('button', {name: 'Assign plan', exact: true}).click();
      await switched.promise;
      await page.evaluate(async (tokens) => {
        const {clearSession, saveSession} = await import('/src/api/session.ts');
        clearSession();
        saveSession(tokens);
      }, otherTokens);
      await page.getByRole('link', {name: 'Clients', exact: true}).click();
      await expect(page.getByText('Invite your first client', {exact: true})).toBeVisible();
      finish.resolve();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(`${appURL}/`);
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
    await context.close();
    console.log(
      `Training assignment, cursor lists, preview, revision/date recovery and client access passed at ${width}px.`,
    );
  }
  expect(errors).toEqual([]);
} finally {
  await browser.close();
  await api.dispose();
}
