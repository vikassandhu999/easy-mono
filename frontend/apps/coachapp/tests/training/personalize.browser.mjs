import {mkdir} from 'node:fs/promises';
import {chromium, expect, request} from '@playwright/test';

const api = await request.newContext({baseURL: 'http://localhost:4000'});
const browser = await chromium.launch();
const errors = [];
await mkdir('tests/training/artifacts', {recursive: true});
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()} ${await response.text()}`).toBe(true);
  return response.json();
}
async function account(unique) {
  const email = `personalize-${unique}@example.test`;
  await send('post', '/v1/auth/signup', {email, full_name: 'Taylor'});
  const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
  await send(
    'post',
    '/v1/businesses',
    {full_name: 'Taylor', name: 'Everyday Coaching', handle: `personalize-${unique}`},
    guest.access_token,
  );
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
    const exercise = (await send('post', '/v1/coach/training-exercises', {name: 'Goblet squat'}, token)).data;
    let template = (await send('post', '/v1/coach/training-plans', {name: 'Full body foundations'}, token)).data;
    template = (
      await send(
        'put',
        `/v1/coach/training-plans/${template.id}/prescription`,
        {
          expected_revision: template.revision,
          workouts: [
            {
              local_ref: 'a',
              name: 'Full body A',
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
          schedule: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((weekday) => ({
            weekday,
            ...(weekday === 'monday' ? {workout_ref: 'a'} : {}),
          })),
        },
        token,
      )
    ).data;
    const email = `personalize-client-${unique}@example.test`;
    const person = (await send('post', '/v1/coach/clients', {full_name: 'Alex Morgan', email}, token)).data;
    const invitation_token = new URL(person.invite_url).pathname.split('/').at(-1);
    await send('post', '/v1/auth/accept-invite', {email, invitation_token});
    const clientTokens = await send('post', `/v1/auth/invites/${invitation_token}/accept`, {
      email,
      invitation_token,
      otp: '123456',
    });
    const assigned = (
      await send(
        'post',
        `/v1/coach/clients/${person.id}/training-plans/${template.id}/assign`,
        {
          expected_revision: template.revision,
          start_date: new Date().toISOString().slice(0, 10),
        },
        token,
      )
    ).data;
    const endpoint = `/v1/coach/training-plans/${assigned.id}`;
    const clientPath = `/clients/${person.id}`;
    const editPath = `${clientPath}/training-plans/${assigned.id}/edit`;
    const context = await browser.newContext({baseURL: 'http://localhost:2022', viewport: {width, height: 900}});
    context.setDefaultTimeout(12000);
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/login');
    await page.evaluate(async (tokens) => {
      const {saveSession} = await import('/src/api/session.ts');
      saveSession(tokens);
    }, tokens);
    await page.goto('/?search=Alex');
    await page.getByRole('link', {name: /Alex Morgan/}).click();
    const plans = page.getByRole('list', {name: 'assigned plans', exact: true});
    await plans.locator('summary').first().click();
    await page.route(`**${endpoint}`, (route) => route.fulfill({status: 503, json: {}}));
    await page.getByRole('link', {name: 'Personalize plan', exact: true}).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await page.unroute(`**${endpoint}`);
    await page.getByRole('button', {name: 'Try again', exact: true}).click();
    await expect(page.getByText('Training for Alex Morgan', {exact: true})).toBeVisible();
    await expect(
      page.getByText('Changes apply to this client only. Your reusable template stays unchanged.', {exact: true}),
    ).toBeVisible();
    const name = page.getByLabel('Plan name · edit anytime', {exact: true});
    const reps = page.getByLabel('Reps per set', {exact: true});
    const save = page.getByRole('button', {name: 'Save client plan', exact: true});
    await expect(save).toBeDisabled();
    await reps.fill('10–12');
    await page.getByRole('link', {name: 'Back to client', exact: true}).click();
    await expect(page.getByRole('dialog', {name: 'Leave without saving?', exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'Keep editing', exact: true}).click();
    await expect(page.getByRole('dialog', {includeHidden: true})).toHaveCount(0);
    await expect(reps).toHaveValue('10–12');
    await name.fill('Alex’s strength plan');
    await page.route(`**${endpoint}/prescription`, (route) => route.fulfill({status: 503, json: {}}));
    await save.click();
    await expect(page.getByRole('alert')).toContainText("We couldn't confirm the full save.");
    await expect(page.getByRole('alert').locator('..')).toBeFocused();
    await expect(reps).toHaveValue('10–12');
    let persisted = (await send('get', endpoint, undefined, token)).data;
    expect(persisted.name).toBe('Alex’s strength plan');
    expect(persisted.workouts[0].workout_elements[0].planned_sets[0].reps).toBe('8');
    await page.unroute(`**${endpoint}/prescription`);
    await save.click();
    await expect(page).toHaveURL(`http://localhost:2022${clientPath}`);
    await expect(page.getByText('Alex’s strength plan saved for this client.', {exact: true})).toBeVisible();
    await expect(plans).toContainText('Alex’s strength plan');
    await plans.locator('summary').first().click();
    await expect(plans).toContainText('10–12');
    const clientPlan = (
      await send('get', `/v1/client/training-plans/${assigned.id}`, undefined, clientTokens.access_token)
    ).data;
    expect(clientPlan.workouts[0].workout_elements[0].planned_sets[0].reps).toBe('10–12');
    expect((await send('get', `/v1/coach/training-plans/${template.id}`, undefined, token)).data).toEqual(template);
    await page.getByRole('link', {name: 'Back to clients', exact: true}).click();
    await expect(page.getByLabel('Search clients', {exact: true})).toHaveValue('Alex');
    await page.goto(editPath);
    await expect(reps).toHaveValue('10–12');
    await reps.fill('6');
    persisted = (await send('get', endpoint, undefined, token)).data;
    await send('patch', endpoint, {expected_revision: persisted.revision, name: 'Updated by another coach'}, token);
    await save.click();
    await expect(page.getByRole('alert')).toContainText('This plan changed elsewhere.');
    await expect(save).toBeDisabled();
    await expect(reps).toHaveValue('6');
    await page.getByRole('button', {name: 'Review saved version', exact: true}).click();
    await page.getByRole('button', {name: 'Load saved prescription', exact: true}).click();
    await expect(page.getByText('Latest saved version loaded.', {exact: true})).toBeFocused();
    await expect(name).toHaveValue('Updated by another coach');
    await expect(reps).toHaveValue('10–12');
    await reps.fill('9');
    await page.getByRole('button', {name: 'Client view', exact: true}).click();
    await expect(
      page.getByText('Preview of your draft. Your client sees these changes after you save.', {exact: true}),
    ).toBeVisible();
    await page.getByRole('button', {name: 'Back to editing', exact: true}).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      window.scrollTo(0, 0);
    });
    await page.screenshot({path: `tests/training/artifacts/personalize-${width}.png`, fullPage: true});
    await reps.scrollIntoViewIfNeeded();
    await expect(reps).toBeInViewport({ratio: 1});
    await page.screenshot({path: `tests/training/artifacts/personalize-targets-${width}.png`});
    // A lost response must recover from the saved revision, without modifying the template.
    await page.route(`**${endpoint}/prescription`, async (route) => {
      const response = await route.fetch();
      expect(response.status()).toBe(200);
      await route.fulfill({status: 503, json: {}});
    });
    await save.click();
    await expect(page.getByRole('alert')).toBeVisible();
    await page.unroute(`**${endpoint}/prescription`);
    await page.getByRole('button', {name: 'Review saved version', exact: true}).click();
    await page.getByRole('button', {name: 'Load saved prescription', exact: true}).click();
    await expect(page.getByText('Latest saved version loaded.', {exact: true})).toBeFocused();
    await expect(reps).toHaveValue('9');
    await expect(save).toBeDisabled();
    // Route context cannot turn a template or another client's plan into an editable client copy.
    await page.goto(`${clientPath}/training-plans/${template.id}/edit`);
    await expect(page.getByRole('alert')).toContainText('This plan does not belong here.');
    await expect(save).toHaveCount(0);
    await page.goto(`/clients/${crypto.randomUUID()}/training-plans/${assigned.id}/edit`);
    await expect(page.getByRole('alert')).toContainText('This plan does not belong here.');
    await expect(save).toHaveCount(0);
    await page.goto(`/training-plans/${assigned.id}`);
    await expect(page.getByRole('alert')).toContainText('This plan does not belong here.');
    persisted = (await send('get', endpoint, undefined, token)).data;
    await send('post', `${endpoint}/archive`, {expected_revision: persisted.revision}, token);
    await page.goto(editPath);
    await expect(page.getByRole('alert')).toContainText('This plan is archived');
    await expect(save).toBeDisabled();
    await context.close();
    console.log(`Client personalization, copy isolation, recovery and route ownership passed at ${width}px.`);
  }
  expect(errors).toEqual([]);
} finally {
  await browser.close();
  await api.dispose();
}
