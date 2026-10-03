import {mkdir} from 'node:fs/promises';
import {chromium, expect, request} from '@playwright/test';
import {chooseOption, selectTrigger} from '../select-helpers.mjs';

const appURL = process.env.COACH_APP_URL || 'http://localhost:2022';
const api = await request.newContext({baseURL: process.env.COACH_API_URL || 'http://localhost:4000'});
const browser = await chromium.launch();
await mkdir('tests/training/artifacts', {recursive: true});
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()}`).toBe(true);
  return response.json();
}
try {
  for (const width of [375, 1280]) {
    const unique = `${Date.now()}-${width}`;
    const email = `compact-sets-${unique}@example.test`;
    await send('post', '/v1/auth/signup', {email, full_name: 'Taylor'});
    const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
    await send(
      'post',
      '/v1/businesses',
      {full_name: 'Taylor', name: 'Everyday Coaching', handle: `sets-${unique}`},
      guest.access_token,
    );
    const tokens = await send('post', '/v1/auth/token', {
      grant_type: 'refresh_token',
      refresh_token: guest.refresh_token,
      role: 'coach',
    });
    const token = tokens.access_token;
    await send('post', '/v1/coach/training-exercises', {name: 'Goblet squat'}, token);
    const plan = (await send('post', '/v1/coach/training-plans', {name: 'Full body foundations'}, token)).data;
    const context = await browser.newContext({baseURL: appURL, viewport: {width, height: 900}});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/login');
    await page.evaluate(async (tokens) => {
      const {saveSession} = await import('/src/api/session.ts');
      saveSession(tokens);
    }, tokens);
    await page.goto(`/training-plans/${plan.id}`);
    let writes = 0;
    page.on('request', (request) => {
      if (request.method() === 'PUT' && request.url().endsWith('/prescription')) {
        writes++;
      }
    });
    await page.getByRole('button', {name: 'Add exercises', exact: true}).click();
    await page.getByRole('button', {name: 'Select Goblet squat', exact: true}).click();
    await page.getByRole('button', {name: 'Add 1 exercise', exact: true}).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('textbox', {name: 'Workout name', exact: true}).fill('Full body A');
    const exercise = page.getByRole('region', {name: 'Goblet squat prescription', exact: true});
    const setCount = selectTrigger(exercise, 'Sets');
    await setCount.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('listbox', {name: 'Sets', exact: true})).toBeVisible();
    await page.keyboard.press('End');
    await expect(page.getByRole('option', {name: '30', exact: true})).toBeFocused();
    await expect(page.getByRole('option', {name: '30', exact: true})).toBeInViewport();
    await page.screenshot({path: `tests/training/artifacts/select-sets-${width}.png`});
    await page.keyboard.press('Escape');
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await expect(setCount).toBeFocused();
    await expect(setCount).toHaveText('3');
    await chooseOption(setCount, '3');
    await exercise.getByLabel('Reps per set', {exact: true}).fill('8–10');
    await exercise.getByRole('textbox', {name: 'Load', exact: true}).fill('20');
    await chooseOption(selectTrigger(exercise, 'Load unit'), 'kg');
    await exercise.getByLabel('Rest · seconds', {exact: true}).fill('90');
    expect(writes).toBe(0);
    await exercise.getByRole('button', {name: 'Vary sets & add details', exact: true}).click();
    const composer = page.getByRole('dialog', {name: 'Prescribe sets', exact: true});
    await exercise.getByRole('button', {name: 'Add sets…', exact: true}).click();
    await composer.getByLabel('Number of sets', {exact: true}).fill('0');
    await composer.getByRole('button', {name: 'Add sets', exact: true}).click();
    await expect(composer.getByText('Choose 1 to 30 sets.', {exact: true})).toBeVisible();
    await composer.getByRole('button', {name: 'Cancel', exact: true}).click();
    const rows = exercise.getByRole('group', {name: /^Set \d+$/});
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0).getByLabel('Load', {exact: true})).toHaveValue('20');
    await rows.nth(2).getByLabel('Reps', {exact: true}).fill('6');
    await rows.nth(0).getByRole('button', {name: 'Set 1 actions', exact: true}).click();
    await page.getByRole('menuitem', {name: 'More details', exact: true}).click();
    await rows.nth(0).getByLabel('RPE', {exact: true}).fill('7');
    await rows.nth(0).getByLabel('Set notes', {exact: true}).fill('Controlled descent');
    await rows.nth(0).getByRole('button', {name: 'Done', exact: true}).click();
    await expect(rows.nth(0).getByText('RPE 7 · Controlled descent', {exact: true})).toBeVisible();
    await rows.nth(0).getByRole('button', {name: 'Set 1 actions', exact: true}).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('menuitem', {name: 'Edit matching sets', exact: true}).click();
    const matching = page.getByRole('dialog', {name: 'Edit matching sets', exact: true});
    await matching.getByLabel('Load', {exact: true}).fill('22.5');
    await matching.getByLabel('Rest (seconds)', {exact: true}).fill('0');
    await matching.getByRole('button', {name: 'Update matching sets', exact: true}).click();
    await expect(rows.nth(0).getByLabel('Load', {exact: true})).toHaveValue('22.5');
    await expect(rows.nth(1).getByLabel('Load', {exact: true})).toHaveValue('22.5');
    await expect(rows.nth(2).getByLabel('Load', {exact: true})).toHaveValue('20');
    await expect(rows.nth(2).getByLabel('Rest (seconds)', {exact: true})).toHaveValue('90');
    await expect(rows.nth(0).getByText('RPE 7 · Controlled descent', {exact: true})).toBeVisible();
    await exercise.getByRole('button', {name: 'Repeat last set', exact: true}).click();
    await expect(rows).toHaveCount(4);
    await expect(rows.nth(3).getByLabel('Reps', {exact: true})).toHaveValue('6');
    await exercise.getByRole('button', {name: '+ Warm-up', exact: true}).click();
    await expect(rows).toHaveCount(5);
    await rows.nth(0).getByLabel('Reps', {exact: true}).fill('10');
    await rows.nth(0).getByLabel('Load', {exact: true}).fill('0');
    await rows.nth(0).getByLabel('Rest (seconds)', {exact: true}).fill('60');
    await rows.nth(0).getByRole('button', {name: 'Set 1 actions', exact: true}).click();
    await page.getByRole('menuitem', {name: 'More details', exact: true}).click();
    await expect(selectTrigger(rows.nth(0), 'Set type')).toHaveText('Warm-up');
    await chooseOption(selectTrigger(rows.nth(0), 'Load unit'), 'Bodyweight');
    await rows.nth(0).getByRole('button', {name: 'Done', exact: true}).click();
    await rows.nth(4).getByRole('button', {name: 'Set 5 actions', exact: true}).click();
    await page.getByRole('menuitem', {name: 'Remove set', exact: true}).click();
    await expect(rows).toHaveCount(4);
    const rect = await exercise.boundingBox();
    expect(rect.height).toBeLessThan(700);
    await exercise.scrollIntoViewIfNeeded();
    await page.screenshot({path: `tests/training/artifacts/compact-sets-${width}.png`});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', {name: 'Save plan', exact: true}).click();
    await expect(page.getByText('Training plan saved.', {exact: true})).toBeVisible();
    const saved = (await send('get', `/v1/coach/training-plans/${plan.id}`, undefined, token)).data;
    expect(saved.workouts[0].workout_elements[0].planned_sets).toMatchObject([
      {set_type: 'warmup', load_value: '0', load_unit: 'bodyweight', reps: '10', rest_seconds: 60},
      {set_type: 'working', load_value: '22.5', reps: '8–10', rest_seconds: 0, rpe: '7', notes: 'Controlled descent'},
      {set_type: 'working', load_value: '22.5', reps: '8–10', rest_seconds: 0},
      {set_type: 'working', load_value: '20', reps: '6', rest_seconds: 90},
    ]);
    await page.reload();
    await expect(rows).toHaveCount(4);
    await expect(rows.nth(1).getByText('RPE 7 · Controlled descent', {exact: true})).toBeVisible();
    expect(errors).toEqual([]);
    await context.close();
    console.log(
      `Compact set entry, matching updates, exceptions, repeat, warm-up and persistence passed at ${width}px.`,
    );
  }
} finally {
  await browser.close();
  await api.dispose();
}
