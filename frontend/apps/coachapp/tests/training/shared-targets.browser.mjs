import {mkdir} from 'node:fs/promises';
import {expect as baseExpect, chromium, request} from '@playwright/test';
import {chooseOption, selectTrigger} from '../select-helpers.mjs';

const expect = baseExpect.configure({timeout: 15000});
const api = await request.newContext({baseURL: process.env.COACH_API_URL || 'http://localhost:4000'});
const browser = await chromium.launch();
await mkdir('tests/training/artifacts', {recursive: true});
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()} ${await response.text()}`).toBe(true);
  return response.json();
}
try {
  for (const width of [375, 1280]) {
    const unique = `${Date.now()}-${width}`;
    const email = `shared-targets-${unique}@example.test`;
    await send('post', '/v1/auth/signup', {email, full_name: 'Taylor'});
    const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
    await send(
      'post',
      '/v1/businesses',
      {full_name: 'Taylor', name: 'Everyday Coaching', handle: `targets-${unique}`},
      guest.access_token,
    );
    const tokens = await send('post', '/v1/auth/token', {
      grant_type: 'refresh_token',
      refresh_token: guest.refresh_token,
      role: 'coach',
    });
    const token = tokens.access_token;
    const movement = (await send('post', '/v1/coach/training-exercises', {name: 'Rowing intervals'}, token)).data;
    const plan = (await send('post', '/v1/coach/training-plans', {name: 'Conditioning'}, token)).data;
    const endpoint = `/v1/coach/training-plans/${plan.id}`;
    await send(
      'put',
      `${endpoint}/prescription`,
      {
        expected_revision: plan.revision,
        workouts: [
          {
            local_ref: 'intervals',
            name: 'Intervals',
            position: 0,
            prescribed_exercises: [
              {
                local_ref: 'row',
                exercise_id: movement.id,
                position: 0,
                prescribed_sets: Array.from({length: 3}, () => ({
                  set_type: 'working',
                  reps: null,
                  load_unit: null,
                  rest_seconds: 60,
                })),
              },
            ],
          },
        ],
        schedule: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((weekday) => ({
          weekday,
          ...(weekday === 'monday' ? {workout_ref: 'intervals'} : {}),
        })),
      },
      token,
    );
    const context = await browser.newContext({
      baseURL: process.env.COACH_APP_URL || 'http://localhost:2022',
      viewport: {width, height: 900},
    });
    context.setDefaultTimeout(15000);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/login');
    await page.evaluate(async (tokens) => {
      const {saveSession} = await import('/src/api/session.ts');
      saveSession(tokens);
    }, tokens);
    await page.goto(`/training-plans/${plan.id}`);
    const exercise = page.getByRole('region', {name: 'Rowing intervals prescription', exact: true});
    const shared = exercise.getByRole('button', {name: 'Duration, distance & effort', exact: true});
    const dialog = page.getByRole('dialog', {name: 'Targets for all sets', exact: true});
    const save = page.getByRole('button', {name: 'Save plan', exact: true});
    await shared.click();
    await dialog.getByLabel('Duration (seconds)', {exact: true}).fill('120');
    await dialog.getByRole('button', {name: 'Cancel', exact: true}).click();
    await expect(save).toBeDisabled();
    await expect(shared).toBeFocused();
    await shared.click();
    await expect(dialog.getByLabel('Duration (seconds)', {exact: true})).toHaveValue('');
    await dialog.getByLabel('Duration (seconds)', {exact: true}).fill('1.5');
    await dialog.getByLabel('Distance', {exact: true}).fill('-1');
    await dialog.getByLabel('RPE', {exact: true}).fill('11');
    await dialog.getByRole('button', {name: 'Apply to all sets', exact: true}).click();
    await expect(dialog.getByText('Enter whole seconds, zero or greater.', {exact: true})).toBeVisible();
    await expect(dialog.getByText('Enter a positive distance or zero.', {exact: true})).toBeVisible();
    await expect(dialog.getByText('Enter an RPE from 1 to 10.', {exact: true})).toBeVisible();
    await dialog.getByLabel('Duration (seconds)', {exact: true}).fill('90');
    await dialog.getByLabel('Distance', {exact: true}).fill('0.5');
    await chooseOption(selectTrigger(dialog, 'Distance unit'), 'km');
    await dialog.getByLabel('RPE', {exact: true}).fill('7.5');
    await dialog.getByLabel('Set notes', {exact: true}).fill('Keep each interval steady.');
    await expect(dialog.getByLabel('RPE', {exact: true})).not.toHaveAttribute('aria-invalid', 'true');
    await dialog.getByRole('button', {name: 'Apply to all sets', exact: true}).click();
    await expect(dialog).toHaveCount(0);
    await exercise.getByLabel('Rest · seconds', {exact: true}).fill('0');
    await shared.click();
    await expect(dialog.getByLabel('RPE', {exact: true})).toHaveValue('7.5');
    await page.screenshot({path: `tests/training/artifacts/shared-targets-dialog-${width}.png`});
    await dialog.getByRole('button', {name: 'Cancel', exact: true}).click();
    await expect(
      exercise.getByText('0s rest · RPE 7.5 · 90s duration · 0.5 km · Keep each interval steady.', {exact: true}),
    ).toBeVisible();
    expect(
      (await send('get', endpoint, undefined, token)).data.workouts[0].workout_elements[0].planned_sets[0]
        .duration_seconds,
    ).toBeNull();
    await page.route(`**${endpoint}/prescription`, (route) => route.fulfill({status: 503, json: {}}));
    await save.click();
    await expect(page.getByRole('alert')).toContainText("We couldn't confirm the full save.");
    await shared.click();
    await expect(dialog.getByLabel('Duration (seconds)', {exact: true})).toHaveValue('90');
    await expect(dialog.getByLabel('Set notes', {exact: true})).toHaveValue('Keep each interval steady.');
    await dialog.getByRole('button', {name: 'Cancel', exact: true}).click();
    await page.unroute(`**${endpoint}/prescription`);
    await save.click();
    await expect(page.getByText('Training plan saved.', {exact: true})).toBeVisible();
    let saved = (await send('get', endpoint, undefined, token)).data;
    expect(saved.workouts[0].workout_elements[0].planned_sets).toMatchObject(
      Array.from({length: 3}, () => ({
        duration_seconds: 90,
        distance_value: '0.5',
        distance_unit: 'km',
        rpe: '7.5',
        rest_seconds: 0,
        notes: 'Keep each interval steady.',
      })),
    );
    await page.reload();
    await shared.click();
    await expect(dialog.getByLabel('Duration (seconds)', {exact: true})).toHaveValue('90');
    await expect(selectTrigger(dialog, 'Distance unit')).toHaveText('km');
    await dialog.getByLabel('Duration (seconds)', {exact: true}).fill('0');
    await dialog.getByLabel('Distance', {exact: true}).fill('0');
    await chooseOption(selectTrigger(dialog, 'Distance unit'), 'No unit');
    await dialog.getByLabel('RPE', {exact: true}).fill('');
    await dialog.getByLabel('Set notes', {exact: true}).fill('');
    await dialog.getByRole('button', {name: 'Apply to all sets', exact: true}).click();
    await expect(exercise.getByText('0s rest · 0s duration · 0', {exact: true})).toBeVisible();
    await save.click();
    await expect(page.getByText('Training plan saved.', {exact: true})).toBeVisible();
    saved = (await send('get', endpoint, undefined, token)).data;
    expect(saved.workouts[0].workout_elements[0].planned_sets).toMatchObject(
      Array.from({length: 3}, () => ({
        duration_seconds: 0,
        distance_value: '0',
        distance_unit: 'none',
        rpe: null,
        notes: null,
      })),
    );
    await shared.click();
    await dialog.getByLabel('Duration (seconds)', {exact: true}).fill('');
    await dialog.getByLabel('Distance', {exact: true}).fill('');
    await chooseOption(selectTrigger(dialog, 'Distance unit'), 'Not specified');
    await dialog.getByRole('button', {name: 'Apply to all sets', exact: true}).click();
    await exercise.getByRole('button', {name: 'Vary sets & add details', exact: true}).click();
    await exercise.getByRole('button', {name: 'Add sets…', exact: true}).click();
    const composer = page.getByRole('dialog', {name: 'Prescribe sets', exact: true});
    await composer.getByLabel('Number of sets', {exact: true}).fill('2');
    await composer.getByLabel('Duration (seconds)', {exact: true}).fill('180');
    await composer.getByLabel('Distance', {exact: true}).fill('500');
    await chooseOption(selectTrigger(composer, 'Distance unit'), 'Meters');
    await composer.getByLabel('RPE', {exact: true}).fill('8');
    await composer.getByLabel('Set notes', {exact: true}).fill('Finish strong.');
    await composer.getByRole('button', {name: 'Add sets', exact: true}).click();
    await expect(exercise.getByRole('group', {name: /^Set \d+$/})).toHaveCount(5);
    await save.click();
    await expect(page.getByText('Training plan saved.', {exact: true})).toBeVisible();
    saved = (await send('get', endpoint, undefined, token)).data;
    const sets = saved.workouts[0].workout_elements[0].planned_sets;
    expect(sets.slice(0, 3)).toMatchObject(
      Array.from({length: 3}, () => ({duration_seconds: null, distance_value: null, distance_unit: null})),
    );
    expect(sets.slice(3)).toMatchObject(
      Array.from({length: 2}, () => ({
        duration_seconds: 180,
        distance_value: '500',
        distance_unit: 'meters',
        rpe: '8',
        notes: 'Finish strong.',
      })),
    );
    await page.reload();
    await expect(exercise.getByText('RPE 8 · 180 sec · 500 meters · Finish strong.', {exact: true})).toHaveCount(2);
    await exercise.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({path: `tests/training/artifacts/shared-targets-${width}.png`});
    expect(errors).toEqual([]);
    await context.close();
    console.log(
      `Shared targets, cancellation, validation, save recovery, zero/null values and bulk additions passed at ${width}px.`,
    );
  }
} finally {
  await browser.close();
  await api.dispose();
}
