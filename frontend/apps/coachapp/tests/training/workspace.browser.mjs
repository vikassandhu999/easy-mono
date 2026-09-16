import {mkdir} from 'node:fs/promises';
import {chromium, expect, request} from '@playwright/test';
import {chooseOption, selectTrigger} from '../select-helpers.mjs';

const appURL = process.env.COACH_APP_URL || 'http://localhost:2022';
const api = await request.newContext({baseURL: process.env.COACH_API_URL || 'http://localhost:4000'});
const browser = await chromium.launch();
await mkdir('tests/training/artifacts', {recursive: true});
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()} ${response.ok() ? '' : await response.text()}`).toBe(
    true,
  );
  return response.json();
}
async function assignDay(page, day, workout) {
  await page.getByRole('button', {name: new RegExp(`^${day}:`)}).click();
  await page.getByRole('dialog').getByRole('button', {name: workout, exact: true}).click();
}
async function replaceMovement(page, index, name, keep) {
  await page.getByRole('button', {name: `exercise ${index} actions`, exact: true}).click();
  await page.getByRole('menuitem', {name: 'Replace movement', exact: true}).click();
  const picker = page.getByRole('dialog', {name: 'Replace movement', exact: true});
  await picker.getByRole('button', {name: `Select ${name}`, exact: true}).click();
  await picker.getByRole('button', {name: 'Choose replacement', exact: true}).click();
  await page.getByRole('button', {name: keep ? 'Keep targets' : 'Reset targets', exact: true}).click();
}
try {
  for (const width of [375, 1280]) {
    const unique = `${Date.now()}-${width}`;
    const email = `worksheet-${unique}@example.test`;
    await send('post', '/v1/auth/signup', {email, first_name: 'Taylor'});
    const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
    await send(
      'post',
      '/v1/businesses',
      {name: 'Everyday Coaching', handle: `worksheet-${unique}`},
      guest.access_token,
    );
    const tokens = await send('post', '/v1/auth/token', {
      grant_type: 'refresh_token',
      refresh_token: guest.refresh_token,
      role: 'coach',
    });
    const token = tokens.access_token;
    for (const name of ['Goblet squat', 'Lat pulldown', 'Dumbbell press', 'Front squat']) {
      await send('post', '/v1/coach/training-exercises', {name, instructions: `Instructions for ${name}.`}, token);
    }
    const context = await browser.newContext({baseURL: appURL, viewport: {width, height: 900}});
    context.setDefaultTimeout(10000);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/login');
    await page.evaluate(async (tokens) => {
      const {saveSession} = await import('/src/api/session.ts');
      saveSession(tokens);
    }, tokens);
    await page.goto('/training-plans/new');
    let creations = 0;
    let prescriptions = 0;
    let details = 0;
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().endsWith('/training-plans')) {
        creations++;
      }
      if (request.method() === 'PUT' && request.url().endsWith('/prescription')) {
        prescriptions++;
      }
      if (request.method() === 'PATCH' && /training-plans\//.test(request.url())) {
        details++;
      }
    });
    await expect(page.getByRole('heading', {name: 'Start with the movements', exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'Add exercises', exact: true}).click();
    const picker = page.getByRole('dialog', {name: 'Add exercises', exact: true});
    await picker.getByLabel('Search exercises', {exact: true}).fill('Lat');
    await expect(picker.getByText('1 exercise', {exact: true})).toBeVisible();
    await picker.getByRole('button', {name: 'Select Lat pulldown', exact: true}).click();
    await picker.getByText('Exercise details', {exact: true}).click();
    await expect(picker.getByText('Instructions for Lat pulldown.', {exact: true})).toBeVisible();
    await picker.getByLabel('Search exercises', {exact: true}).fill('Goblet');
    await expect(picker.getByRole('button', {name: 'Select Lat pulldown', exact: true})).toHaveCount(0);
    await expect(picker.getByText('1 exercise', {exact: true})).toBeVisible();
    await picker.getByRole('button', {name: 'Select Goblet squat', exact: true}).click();
    await picker.getByRole('button', {name: 'Move Goblet squat up', exact: true}).click();
    await expect(
      picker.getByRole('list', {name: 'Selected exercises', exact: true}).locator('li').first(),
    ).toContainText('Goblet squat');
    await page.screenshot({path: `tests/training/artifacts/worksheet-picker-${width}.png`, animations: 'disabled'});
    if (width === 375) {
      await page.setViewportSize({width, height: 480});
      const action = await picker.getByRole('button', {name: 'Add 2 exercises', exact: true}).boundingBox();
      expect(action.y + action.height).toBeLessThanOrEqual(480);
      await page.setViewportSize({width, height: 900});
    }
    await picker.getByRole('button', {name: 'Add 2 exercises', exact: true}).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('textbox', {name: 'Workout name', exact: true})).toHaveValue('Workout A');
    const squat = page.getByRole('region', {name: 'Goblet squat prescription', exact: true});
    const lat = page.getByRole('region', {name: 'Lat pulldown prescription', exact: true});
    await chooseOption(selectTrigger(squat, 'Sets'), '4');
    await squat.getByLabel('Reps per set', {exact: true}).fill('8–10');
    await squat.getByRole('textbox', {name: 'Load', exact: true}).fill('20');
    await chooseOption(selectTrigger(squat, 'Load unit'), 'kg');
    await squat.getByLabel('Rest · seconds', {exact: true}).fill('90');
    await chooseOption(selectTrigger(squat, 'Sets'), '2');
    await squat.getByLabel('Reps per set', {exact: true}).fill('10');
    await squat.getByRole('button', {name: 'Undo', exact: true}).click();
    // Undo restores removed rows, preserving subsequent edits to retained rows.
    await expect(squat.getByRole('group', {name: /^Set \d+$/})).toHaveCount(4);
    await expect(squat.getByRole('group', {name: 'Set 1', exact: true}).getByLabel('Reps', {exact: true})).toHaveValue(
      '10',
    );
    await expect(squat.getByRole('group', {name: 'Set 4', exact: true}).getByLabel('Reps', {exact: true})).toHaveValue(
      '8–10',
    );
    await squat.getByRole('button', {name: 'Set 1 actions', exact: true}).click();
    await page.getByRole('menuitem', {name: 'More details', exact: true}).click();
    await squat
      .getByRole('group', {name: 'Set 1', exact: true})
      .getByLabel('Set notes', {exact: true})
      .fill('Controlled descent');
    await squat.getByRole('button', {name: 'Done', exact: true}).click();
    await lat.getByLabel('Reps per set', {exact: true}).fill('12');
    await lat.getByRole('textbox', {name: 'Load', exact: true}).fill('30');
    await chooseOption(selectTrigger(lat, 'Load unit'), 'kg');
    await lat.getByLabel('Rest · seconds', {exact: true}).fill('60');
    await page.getByLabel('Plan name · edit anytime', {exact: true}).fill('Full body foundations');
    await page.getByRole('textbox', {name: 'Workout name', exact: true}).fill('Full body A');
    await assignDay(page, 'monday', 'Full body A');
    await assignDay(page, 'friday', 'Full body A');
    await page.getByRole('button', {name: 'Create a variation', exact: true}).click();
    await expect(page.getByRole('textbox', {name: 'Workout name', exact: true})).toHaveValue('Full body A (copy)');
    await page.getByRole('textbox', {name: 'Workout name', exact: true}).fill('Full body B');
    await replaceMovement(page, 1, 'Front squat', true);
    const front = page.getByRole('region', {name: 'Front squat prescription', exact: true});
    await expect(front.getByRole('paragraph').getByText('Controlled descent', {exact: true})).toBeVisible();
    await front.getByRole('group', {name: 'Set 1', exact: true}).getByLabel('Load', {exact: true}).fill('22.5');
    await replaceMovement(page, 2, 'Dumbbell press', false);
    const press = page.getByRole('region', {name: 'Dumbbell press prescription', exact: true});
    await expect(press.getByLabel('Reps per set', {exact: true})).toHaveValue('');
    await expect(selectTrigger(press, 'Sets')).toHaveText('3');
    await press.getByLabel('Reps per set', {exact: true}).fill('8–12');
    await chooseOption(selectTrigger(press, 'Load unit'), 'kg');
    await press.getByRole('textbox', {name: 'Load', exact: true}).fill('12.5');
    await chooseOption(selectTrigger(press, 'Load unit'), 'Bodyweight');
    await expect(press.getByRole('textbox', {name: 'Load', exact: true})).toHaveCount(0);
    await chooseOption(selectTrigger(press, 'Load unit'), 'kg');
    await expect(press.getByRole('textbox', {name: 'Load', exact: true})).toHaveValue('');
    await press.getByRole('textbox', {name: 'Load', exact: true}).fill('12.5');
    await assignDay(page, 'wednesday', 'Full body B');
    await assignDay(page, 'sunday', 'Full body B');
    await page.getByRole('button', {name: 'exercise 2 actions', exact: true}).click();
    await page.getByRole('menuitem', {name: 'Remove exercise 2', exact: true}).click();
    await expect(press).toHaveCount(0);
    await page.getByRole('button', {name: 'Undo', exact: true}).click();
    await expect(press.getByLabel('Reps per set', {exact: true})).toHaveValue('8–12');
    await page.getByRole('button', {name: 'workout 2 actions', exact: true}).click();
    await page.getByRole('menuitem', {name: 'Remove workout 2', exact: true}).click();
    await expect(page.getByRole('button', {name: 'wednesday: Rest', exact: true})).toBeVisible();
    await assignDay(page, 'wednesday', 'Full body A');
    await assignDay(page, 'sunday', 'Rest day');
    await page.getByRole('button', {name: 'Undo', exact: true}).click();
    await expect(page.getByRole('button', {name: 'wednesday: Full body A', exact: true})).toBeVisible();
    await expect(page.getByRole('button', {name: 'sunday: Rest', exact: true})).toBeVisible();
    await assignDay(page, 'wednesday', 'Full body B');
    expect(creations).toBe(0);
    expect(prescriptions).toBe(0);
    await page.getByRole('button', {name: 'Client view', exact: true}).click();
    await expect(page.getByRole('textbox')).toHaveCount(0);
    await expect(front.getByText('Set 1 · 10 reps · 22.5 kg · 90s rest', {exact: true})).toBeVisible();
    await expect(press.getByText('3 sets · 8–12 reps · 12.5 kg', {exact: true})).toBeVisible();
    await page.screenshot({
      path: `tests/training/artifacts/worksheet-client-${width}.png`,
      fullPage: true,
      animations: 'disabled',
    });
    await page.getByRole('button', {name: 'Back to editing', exact: true}).click();
    await press.getByLabel('Rest · seconds', {exact: true}).fill('-1');
    await page.getByRole('button', {name: 'Collapse Full body B', exact: true}).click();
    await page.getByRole('button', {name: 'Save plan', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Collapse Full body B', exact: true})).toBeVisible();
    await expect(
      press.getByRole('group', {name: 'Set 1', exact: true}).getByLabel('Rest (seconds)', {exact: true}),
    ).toBeFocused();
    for (const row of await press.getByRole('group', {name: /^Set \d+$/}).all()) {
      await row.getByLabel('Rest (seconds)', {exact: true}).fill('0');
    }
    await page.route('**/v1/coach/training-plans/*/prescription', (route) => route.fulfill({status: 503, json: {}}));
    await page.getByRole('button', {name: 'Save plan', exact: true}).click();
    await expect(page.getByRole('alert')).toContainText("We couldn't confirm the full save.");
    expect(creations).toBe(1);
    await page.unroute('**/v1/coach/training-plans/*/prescription');
    await page.getByRole('button', {name: 'Save plan', exact: true}).click();
    await expect(page).toHaveURL(/training-plans\/[0-9a-f-]+$/);
    expect(creations).toBe(1);
    const endpoint = `/v1/coach/training-plans/${new URL(page.url()).pathname.split('/').at(-1)}`;
    let saved = (await send('get', endpoint, undefined, token)).data;
    expect(saved.workouts.map((workout) => workout.name)).toEqual(['Full body A', 'Full body B']);
    expect(saved.workouts[0].workout_elements.map((exercise) => exercise.exercise.name)).toEqual([
      'Goblet squat',
      'Lat pulldown',
    ]);
    expect(saved.workouts[1].workout_elements.map((exercise) => exercise.exercise.name)).toEqual([
      'Front squat',
      'Dumbbell press',
    ]);
    expect(saved.workouts[0].workout_elements[0].planned_sets[0].load_value).toBe('20');
    expect(saved.workouts[1].workout_elements[0].planned_sets[0]).toMatchObject({
      load_value: '22.5',
      notes: 'Controlled descent',
    });
    expect(saved.workouts[1].workout_elements[0].id).not.toBe(saved.workouts[0].workout_elements[0].id);
    expect(saved.schedule.monday).toBe(saved.workouts[0].id);
    expect(saved.schedule.wednesday).toBe(saved.workouts[1].id);
    expect(saved.schedule.friday).toBe(saved.workouts[0].id);
    await page.getByLabel('Plan name · edit anytime', {exact: true}).fill('Full body strength');
    await page.route(`**${endpoint}/prescription`, (route) => route.fulfill({status: 503, json: {}}));
    await page.getByRole('button', {name: 'Save plan', exact: true}).click();
    await expect(page.getByRole('alert')).toBeVisible();
    expect(details).toBe(1);
    await page.unroute(`**${endpoint}/prescription`);
    await page.getByRole('button', {name: 'Save plan', exact: true}).click();
    await expect(page.getByText('Training plan saved.', {exact: true})).toBeVisible();
    expect(details).toBe(1);
    saved = (await send('get', endpoint, undefined, token)).data;
    expect(saved.name).toBe('Full body strength');
    await page.reload();
    await page.getByRole('button', {name: 'Expand Full body B', exact: true}).click();
    await expect(press.getByLabel('Reps per set', {exact: true})).toHaveValue('8–12');
    const originalElementId = saved.workouts[1].workout_elements[1].id;
    await replaceMovement(page, 2, 'Lat pulldown', true);
    await page.getByRole('button', {name: 'Save plan', exact: true}).click();
    await expect(page.getByText('Training plan saved.', {exact: true})).toBeVisible();
    saved = (await send('get', endpoint, undefined, token)).data;
    expect(saved.workouts[1].workout_elements[1]).toMatchObject({
      id: originalElementId,
      exercise: {name: 'Lat pulldown'},
    });
    expect(saved.workouts[1].workout_elements[1].planned_sets[0]).toMatchObject({reps: '8–12', load_value: '12.5'});
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({
      path: `tests/training/artifacts/worksheet-${width}.png`,
      fullPage: true,
      animations: 'disabled',
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // A lost creation response can be recovered without abandoning the worksheet or creating a duplicate.
    await page.goto('/training-plans/new');
    await page.getByRole('button', {name: 'Add exercises', exact: true}).click();
    await page.getByRole('button', {name: 'Select Goblet squat', exact: true}).click();
    await page.getByRole('button', {name: 'Add 1 exercise', exact: true}).click();
    await page.getByLabel('Plan name · edit anytime', {exact: true}).fill('Interrupted creation');
    await page.getByLabel('Reps per set', {exact: true}).fill('15');
    const beforeCreation = creations;
    await page.route('**/v1/coach/training-plans', async (route) => {
      if (route.request().method() === 'POST') {
        const response = await route.fetch();
        expect(response.ok()).toBe(true);
        return route.fulfill({status: 503, json: {}});
      }
      return route.continue();
    });
    await page.getByRole('button', {name: 'Save plan', exact: true}).click();
    await expect(page.getByRole('alert')).toContainText("We couldn't confirm creation.");
    await expect(page.getByLabel('Plan name · edit anytime', {exact: true})).toBeDisabled();
    await expect(page.getByLabel('Reps per set', {exact: true})).toBeDisabled();
    await expect(selectTrigger(page, 'Sets')).toBeDisabled();
    await expect(page.getByRole('button', {name: 'Create a variation', exact: true})).toBeDisabled();
    await expect(page.getByRole('button', {name: 'Save plan', exact: true})).toBeDisabled();
    await page.unroute('**/v1/coach/training-plans');
    await page.getByRole('button', {name: 'Check training plans', exact: true}).click();
    await page.getByRole('button', {name: 'Check this template', exact: true}).click();
    await page.getByRole('button', {name: 'Use for this draft', exact: true}).click();
    await expect(page.getByLabel('Plan name · edit anytime', {exact: true})).toBeFocused();
    await expect(page.getByLabel('Reps per set', {exact: true})).toHaveValue('15');
    await page.getByRole('button', {name: 'Save plan', exact: true}).click();
    await expect(page).toHaveURL(/training-plans\/[0-9a-f-]+$/);
    expect(creations).toBe(beforeCreation + 1);
    expect(errors).toEqual([]);
    await context.close();
    console.log(
      `Worksheet creation, selection order, variations, replacement, undo, client view, hidden validation and partial-save recovery passed at ${width}px.`,
    );
  }
} finally {
  await browser.close();
  await api.dispose();
}
