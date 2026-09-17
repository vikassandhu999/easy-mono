import {mkdir} from 'node:fs/promises';
import {chromium, expect, request, webkit} from '@playwright/test';

const api = await request.newContext({baseURL: process.env.COACH_API_URL || 'http://localhost:4000'});
const engine = process.env.BROWSER_ENGINE || 'chromium';
if (engine !== 'chromium' && engine !== 'webkit') {
  throw new Error(`Unsupported BROWSER_ENGINE: ${engine}`);
}
const browser = await (engine === 'webkit' ? webkit : chromium).launch();
await mkdir('tests/training/artifacts', {recursive: true});
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()}`).toBe(true);
  return response.status() === 204 ? null : response.json();
}
async function fits(page, state, width) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), state).toBe(true);
  const dialog = page.getByRole('dialog');
  if (await dialog.count()) {
    expect(await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth), state).toBe(true);
  }
  if (!(await dialog.count())) {
    await page.evaluate(() => scrollTo(0, 0));
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  }
  await page.screenshot({
    path: `tests/training/artifacts/audit-${state}-${width}.png`,
    fullPage: (await dialog.count()) === 0,
    animations: 'disabled',
  });
}
try {
  for (const width of [375, 1280]) {
    const unique = `${Date.now()}-${width}`;
    const email = `training-audit-${unique}@example.test`;
    await send('post', '/v1/auth/signup', {email, first_name: 'Test Coach'});
    const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
    await send(
      'post',
      '/v1/businesses',
      {name: 'Test Worksheet Coaching', handle: `audit-${unique}`},
      guest.access_token,
    );
    const tokens = await send('post', '/v1/auth/token', {
      grant_type: 'refresh_token',
      refresh_token: guest.refresh_token,
      role: 'coach',
    });
    const token = tokens.access_token;
    const exerciseName = `Test split squat ${'ControlledEccentric'.repeat(8)}`;
    const workoutName = `Test strength ${'LowerBodyFoundation'.repeat(8)}`;
    const planName = `Test plan ${'StrengthProgression'.repeat(8)}`;
    const notes = `Tempo guidance ${'KeepControlThroughoutTheMovement'.repeat(8)}`;
    const exercise = (
      await send('post', '/v1/coach/training-exercises', {name: exerciseName, instructions: notes}, token)
    ).data;
    let plan = (await send('post', '/v1/coach/training-plans', {name: planName, description: notes}, token)).data;
    const endpoint = `/v1/coach/training-plans/${plan.id}`;
    plan = (
      await send(
        'put',
        `${endpoint}/prescription`,
        {
          expected_revision: plan.revision,
          workouts: [
            {
              local_ref: 'a',
              name: workoutName,
              position: 0,
              prescribed_exercises: [
                {
                  local_ref: 'e',
                  exercise_id: exercise.id,
                  position: 0,
                  prescribed_sets: Array.from({length: 3}, () => ({
                    set_type: 'working',
                    reps: '8–10',
                    load_value: '0',
                    load_unit: 'kg',
                    rest_seconds: 0,
                    notes,
                  })),
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
    const context = await browser.newContext({
      baseURL: process.env.COACH_APP_URL || 'http://localhost:2022',
      viewport: {width, height: 900},
    });
    context.setDefaultTimeout(15000);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    let release;
    try {
      await page.goto('/login');
      await page.evaluate(async (tokens) => {
        const {saveSession} = await import('/src/api/session.ts');
        saveSession(tokens);
      }, tokens);
      await expect(page).not.toHaveURL(/\/login$/);
      await page.waitForLoadState('networkidle');
      await page.route(`**${endpoint}`, async (route) => {
        await new Promise((resolve) => {
          release = resolve;
        });
        await route.fulfill({status: 503, json: {}});
      });
      await page.goto(`/training-plans/${plan.id}`);
      await expect(page.getByText('Loading plan…', {exact: true})).toBeVisible();
      release();
      await expect(page.getByRole('button', {name: 'Try again', exact: true})).toBeVisible();
      await page.unroute(`**${endpoint}`);
      await page.getByRole('button', {name: 'Try again', exact: true}).focus();
      await page.keyboard.press('Enter');
      const name = page.getByLabel('Plan name · edit anytime', {exact: true});
      const reps = page.getByLabel('Reps per set', {exact: true});
      await expect(name).toHaveValue(planName);
      await fits(page, 'long-editor', width);
      await page.getByRole('button', {name: /^monday:/}).click();
      await fits(page, 'long-schedule', width);
      await page.getByRole('dialog').getByRole('button', {name: workoutName, exact: true}).click();
      await page.getByRole('button', {name: `Collapse ${workoutName}`, exact: true}).click();
      await fits(page, 'long-collapsed', width);
      await page.getByRole('button', {name: `Expand ${workoutName}`, exact: true}).click();
      await page.getByRole('button', {name: 'Add exercises', exact: true}).click();
      const picker = page.getByRole('dialog', {name: 'Add exercises', exact: true});
      await picker.getByLabel('Search exercises', {exact: true}).fill(exerciseName);
      await expect(picker.getByRole('button', {name: `Select ${exerciseName}`, exact: true})).toBeVisible();
      await expect(picker.getByText('1 exercise', {exact: true})).toBeVisible();
      await picker.getByText('Exercise details', {exact: true}).click();
      await expect(picker.getByText(notes, {exact: true})).toBeVisible();
      await fits(page, 'long-picker', width);
      await picker.getByRole('button', {name: 'Cancel', exact: true}).click();
      await page.getByRole('button', {name: 'Client view', exact: true}).click();
      await expect(page.getByText('3 sets · 8–10 reps · 0 kg · 0s rest', {exact: true})).toBeVisible();
      await fits(page, 'long-client-view', width);
      await page.getByRole('button', {name: 'Back to editing', exact: true}).click();
      await page.getByRole('button', {name: 'workout 1 actions', exact: true}).click();
      await page.getByRole('menuitem', {name: 'Remove workout 1', exact: true}).click();
      await fits(page, 'long-workout-undo', width);
      await page.getByRole('button', {name: 'Undo', exact: true}).click();
      await page.getByRole('button', {name: 'exercise 1 actions', exact: true}).click();
      await page.getByRole('menuitem', {name: 'Remove exercise 1', exact: true}).click();
      await fits(page, 'long-undo', width);
      await page.getByRole('button', {name: 'Undo', exact: true}).click();
      await expect(reps).toHaveValue('8–10');
      await reps.fill('12');
      await page.route(`**${endpoint}/prescription`, (route) => route.fulfill({status: 503, json: {}}));
      await page.getByRole('button', {name: 'Save plan', exact: true}).click();
      await expect(page.getByRole('alert').locator('..')).toBeFocused();
      await expect(reps).toHaveValue('12');
      await page.unroute(`**${endpoint}/prescription`);
      await page.getByRole('button', {name: 'Save plan', exact: true}).click();
      await expect(page.getByText('Training plan saved.', {exact: true})).toBeFocused();
      expect(
        (await send('get', endpoint, undefined, token)).data.workouts[0].workout_elements[0].planned_sets[0].reps,
      ).toBe('12');
      await reps.fill('14');
      await expect(page.getByText('Training plan saved.', {exact: true})).toHaveCount(0);
      await page.getByRole('button', {name: 'Plan actions', exact: true}).click();
      await page.getByRole('menuitem', {name: 'Load saved version', exact: true}).click();
      await page.route(`**${endpoint}`, (route) => route.fulfill({status: 503, json: {}}));
      await page.getByRole('button', {name: 'Load saved prescription', exact: true}).click();
      await expect(page.getByRole('alert').locator('..')).toBeFocused();
      await expect(reps).toHaveValue('14');
      await page.unroute(`**${endpoint}`);
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', {name: 'Review saved version', exact: true})).toBeFocused();
      await page.keyboard.press('Enter');
      await page.getByRole('button', {name: 'Load saved prescription', exact: true}).click();
      await expect(page.getByText('Latest saved version loaded.', {exact: true})).toBeFocused();
      await expect(reps).toHaveValue('12');
      await reps.fill('16');
      await page.getByRole('button', {name: 'Plan actions', exact: true}).click();
      await page.getByRole('menuitem', {name: 'Load saved version', exact: true}).click();
      await page.getByRole('button', {name: 'Load saved prescription', exact: true}).click();
      await expect(page.getByText('Latest saved version loaded.', {exact: true})).toBeFocused();
      await expect(reps).toHaveValue('12');
      await page.reload();
      await expect(reps).toHaveValue('12');
      expect(errors).toEqual([]);
      const latest = (await send('get', endpoint, undefined, token)).data;
      await send('delete', `${endpoint}?expected_revision=${latest.revision}`, undefined, token);
      await send('delete', `/v1/coach/training-exercises/${exercise.id}`, undefined, token);
      expect((await api.get(endpoint, {headers: {authorization: `Bearer ${token}`}})).status()).toBe(404);
      expect(
        (
          await api.get(`/v1/coach/training-exercises/${exercise.id}`, {headers: {authorization: `Bearer ${token}`}})
        ).status(),
      ).toBe(404);
      console.log(
        `Training long-content, loading/retry, error/save/reload focus and persistence passed at ${width}px.`,
      );
    } finally {
      release?.();
      await context.close();
    }
  }
} finally {
  await browser.close();
  await api.dispose();
}
