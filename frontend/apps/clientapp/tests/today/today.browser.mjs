import {execFileSync} from 'node:child_process';
import {mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium, expect, request} from '@playwright/test';

const repo = fileURLToPath(new URL('../../../../../', import.meta.url));
const artifacts = `${repo}/frontend/apps/clientapp/tests/today/artifacts`;
await mkdir(artifacts, {recursive: true});
await Promise.all(
  ['failure.txt', 'failure.png', 'workout-writes.json', 'results.json'].map((name) =>
    rm(`${artifacts}/${name}`, {force: true}),
  ),
);
execFileSync('rtk', ['proxy', 'mix', 'run', `${repo}/frontend/apps/clientapp/tests/today/fixtures.exs`], {
  cwd: `${repo}/backend`,
  stdio: 'inherit',
});
const fixture = JSON.parse(await readFile(`${artifacts}/fixture.json`, 'utf8'));
const api = await request.newContext({baseURL: process.env.API_URL ?? 'http://localhost:4000'});
const browser = await chromium.launch();
const context = await browser.newContext({
  baseURL: process.env.CLIENT_APP_URL ?? 'http://localhost:1315',
  viewport: {width: 375, height: 812},
});
const page = await context.newPage();
const errors = [];
const workoutWrites = [];
page.on('request', (req) => {
  if (req.url().includes('/v1/client/workout-logs') && req.method() !== 'GET') {
    workoutWrites.push({path: new URL(req.url()).pathname, method: req.method(), body: req.postDataJSON()});
  }
});
page.on('pageerror', (error) => errors.push(error.message));
const results = [];
let token;
const date = fixture.today;
const shift = (n) => new Date(Date.parse(`${date}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const button = (name, scope = page) => scope.getByRole('button', {name, exact: true});
const radio = (name, scope = page) => scope.getByRole('radio', {name, exact: true}).locator('xpath=ancestor::label');
const plan = () => page.getByRole('list', {name: 'Plan', exact: true});
async function send(method, path, data) {
  const response = await api[method](path, {data, headers: {authorization: `Bearer ${token}`}});
  expect(response.ok(), `${method} ${path}: ${response.status()} ${await response.text()}`).toBe(true);
  return response.json();
}
async function day() {
  return (await send('get', `/v1/client/days/${date}`)).data;
}
async function write(method, path, action) {
  const pending = page
    .waitForResponse((res) => new URL(res.url()).pathname === path && res.request().method() === method)
    .then(
      (response) => ({response}),
      (error) => ({error}),
    );
  await action();
  const result = await pending;
  if ('error' in result) {
    throw result.error;
  }
  const response = result.response;
  expect(response.ok(), `${method} ${path}: ${response.status()} ${await response.text()}`).toBe(true);
  return response.json();
}
async function shot(name) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}: overflow`).toBe(true);
  await page.screenshot({path: `${artifacts}/${name}.png`, fullPage: true});
}
async function home(on = date) {
  await page.goto(`/?date=${on}`);
  await expect(plan()).toBeVisible();
}
async function selectDay(on) {
  const label = new Date(`${on}T12:00:00Z`).toLocaleDateString('en', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
  const item = page.getByRole('group', {name: 'Day', exact: true}).getByRole('button', {name: new RegExp(`^${label}`)});
  if (await item.count()) {
    await item.click();
  } else {
    await home(on);
  }
  await expect(plan()).toBeVisible();
}
async function card(name) {
  await plan()
    .getByRole('button', {name: new RegExp(name)})
    .first()
    .click();
}
async function back(name = 'Today') {
  await button(`Back to ${name}`).click();
  await expect(plan()).toBeVisible();
}
async function chooseFood(name) {
  const sheet = page.getByRole('dialog');
  await sheet.getByLabel('Search foods and supplements', {exact: true}).fill(name);
  await sheet.getByRole('button', {name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)}).click();
  await expect(sheet).toHaveCount(0);
}
async function feedback(rest, pain = false, difficulty = 'Just right') {
  const sheet = page.getByRole('dialog', {name: 'Finish workout', exact: true});
  if (rest) {
    await radio(rest, sheet).click();
  }
  await radio(difficulty, sheet).click();
  await radio(pain ? 'Yes' : 'No', sheet).click();
  if (pain) {
    await sheet.getByLabel('Where, and when? (optional)', {exact: true}).fill('Left knee on the last set');
  }
  return sheet;
}
try {
  await page.goto('/login');
  await page.getByLabel('Email', {exact: true}).fill(fixture.email);
  await button('Continue with email').click();
  await page.getByLabel('Verification code', {exact: true}).fill('123456');
  const auth = page.waitForResponse((res) => res.url().endsWith('/v1/auth/token') && res.request().method() === 'POST');
  await button('Verify and continue').click();
  token = (await (await auth).json()).access_token;
  await home();
  const initial = await day();
  const breakfast = initial.nutrition_schedules.find(
    (s) => initial.presets.find((p) => p.id === s.nutrition_preset_id)?.name === 'Breakfast',
  );
  const lower = initial.workout_schedules.find(
    (s) => initial.workouts.find((w) => w.id === s.workout_id)?.name === 'Lower A',
  );
  const creatine = initial.nutrition_schedules.find(
    (s) => initial.presets.find((p) => p.id === s.nutrition_preset_id)?.food?.name === 'Creatine monohydrate',
  );
  expect(breakfast && lower && creatine).toBeTruthy();
  await expect(page.getByRole('group', {name: 'Day', exact: true}).getByRole('button')).toHaveCount(7);
  await expect(page.getByRole('region', {name: 'Targets: Training day', exact: true})).toContainText('2500–2700 kcal');
  await expect(page.getByRole('heading', {name: 'Trackers', exact: true})).toBeVisible();
  await expect(page.getByRole('link', {name: 'Check-ins', exact: true})).toBeVisible();
  await expect(page.getByText('Sam records this session', {exact: true})).toBeVisible();
  await expect(plan().locator('button.bg-primary')).toHaveCount(1);
  await shot('today');
  await selectDay(shift(1));
  await expect(page.getByText('This is your plan. You can record it on the day.', {exact: true})).toBeVisible();
  await expect(page.getByRole('button', {name: /^Mark .* taken$/})).toHaveCount(0);
  await expect(button('Start Lower A')).toHaveCount(0);
  await card('Breakfast');
  await expect(page.getByRole('dialog', {name: 'Breakfast', exact: true})).toContainText('You choose one of these:');
  await shot('future-meal');
  await page.keyboard.press('Escape');
  await card('Lower A');
  await expect(page.getByRole('heading', {name: 'Lower A', exact: true})).toBeFocused();
  await expect(page.getByText('You can start this on the day.', {exact: true})).toBeVisible();
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await back('Tomorrow');
  await expect(page.locator(`#card-${lower.id}`)).toBeFocused();
  await selectDay(shift(-1));
  await expect(page.getByText('Not recorded', {exact: true}).first()).toBeVisible();
  await shot('past-not-recorded');
  await button('Add food you ate').click();
  await chooseFood('Banana');
  const pastFood = await write('POST', '/v1/client/nutrition-logs', () => button('Save').click());
  expect(pastFood.data.logged_on).toBe(shift(-1));
  expect(pastFood.data.nutrition_schedule_id).toBeNull();
  await write('DELETE', `/v1/client/nutrition-logs/${pastFood.data.id}`, () => button('Undo').click());
  await home();
  results.push('day strip, targets, retained home content, future/past, preview focus');

  const taken = await write('POST', '/v1/client/nutrition-logs', () =>
    button('Mark Creatine monohydrate taken').click(),
  );
  await expect(page.locator(`#card-${creatine.id}`).locator('..')).toContainText('Taken');
  await write('DELETE', `/v1/client/nutrition-logs/${taken.data.id}`, () => button('Undo').click());
  expect((await day()).nutrition_logs).toHaveLength(0);
  await write('POST', '/v1/client/nutrition-logs', () => button('Mark Vitamin D3 2000 IU taken').click());
  await expect(page.getByRole('region', {name: 'Targets: Training day', exact: true})).toContainText(
    'Nutrients not listed',
  );
  results.push('Taken and Undo; unknown nutrients');

  await card('Breakfast');
  await expect(page.getByRole('heading', {name: 'Breakfast', exact: true})).toBeFocused();
  await radio('Oats bowl').click();
  await page.getByLabel('Amount of Rolled oats', {exact: true}).fill('61,5');
  await radio('Eggs on toast').click();
  await button('Keep my changes', page.getByRole('dialog', {name: 'Switch to Eggs on toast?', exact: true})).click();
  await expect(page.getByLabel('Amount of Rolled oats', {exact: true})).toHaveValue('61,5');
  await back();
  await expect(page.locator(`#card-${breakfast.id}`).locator('..')).toContainText('Unsaved changes');
  await page.reload();
  await card('Breakfast');
  await expect(page.getByText('You have unsaved changes.', {exact: true})).toBeVisible();
  await expect(page.getByLabel('Amount of Rolled oats', {exact: true})).toHaveValue('61,5');
  await button('Discard changes').click();
  await radio('Oats bowl').click();
  await expect(page.getByLabel('Amount of Rolled oats', {exact: true})).toHaveValue('60');
  await page.getByLabel('Amount of Rolled oats', {exact: true}).fill('62');
  await radio('Eggs on toast').click();
  await button('Switch to Eggs on toast', page.getByRole('dialog')).click();
  await expect(page.getByLabel('Amount of Egg', {exact: true})).toHaveValue('3');
  await radio('Oats bowl').click();
  await page.getByLabel('Amount of Rolled oats', {exact: true}).fill('61.5');
  await button('Remove Banana').click();
  await expect(page.getByText('Not eaten', {exact: true})).toBeVisible();
  await button('Add back Banana').click();
  await button('Replace Rolled oats').click();
  await chooseFood('Greek yogurt 2%');
  await expect(page.getByText('Instead of Rolled oats', {exact: true})).toBeVisible();
  await button('Add food').click();
  await page.getByRole('dialog').getByLabel('Search foods and supplements', {exact: true}).fill('no-such-food');
  await expect(page.getByText('Nothing matches “no-such-food”.', {exact: true})).toBeVisible();
  await chooseFood('Mixed berries');
  await page.getByLabel('Amount of Mixed berries', {exact: true}).fill('1,5');
  await page.getByLabel('Time eaten', {exact: true}).fill('09:30');
  await shot('meal-edited');
  await page.route('**/v1/client/nutrition-logs', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({status: 503, json: {error_message: 'Could not save. Try again.'}})
      : route.continue(),
  );
  await button('Save').click();
  await expect(page.getByRole('alert')).toContainText('Try Save again.');
  await expect(page.getByLabel('Amount of Mixed berries', {exact: true})).toHaveValue('1,5');
  await page.unroute('**/v1/client/nutrition-logs');
  let releaseMeal;
  const mealHeld = new Promise((resolve) => {
    releaseMeal = resolve;
  });
  await page.route('**/v1/client/nutrition-logs', async (route) => {
    if (route.request().method() === 'POST') {
      await mealHeld;
    }
    await route.continue();
  });
  const savedMeal = await write('POST', '/v1/client/nutrition-logs', async () => {
    await button('Save').click();
    try {
      await expect(page.getByLabel('Amount of Mixed berries', {exact: true})).toBeDisabled();
      await expect(page.getByLabel('Time eaten', {exact: true})).toBeDisabled();
    } finally {
      releaseMeal();
    }
  });
  await page.unroute('**/v1/client/nutrition-logs');
  const meal = savedMeal.data;
  expect(meal.logged_at).toBe('09:30');
  expect(meal.food_logs.find((l) => l.name === 'Mixed berries').amount).toBe(1.5);
  expect(meal.food_logs.find((l) => l.name === 'Greek yogurt 2%').meal_item_id).toBeTruthy();
  await expect(plan()).toBeVisible();
  await expect(page.getByRole('region', {name: 'Targets: Training day', exact: true})).toContainText('incomplete');
  await expect(page.locator(`#card-${breakfast.id}`)).toBeFocused();
  await page.reload();
  await card('Breakfast');
  await expect(page.getByLabel('Amount of Mixed berries', {exact: true})).toHaveValue('1.5');
  await page.getByLabel('Amount of Mixed berries', {exact: true}).fill('2');
  await write('PATCH', `/v1/client/nutrition-logs/${meal.id}`, () => button('Save changes').click());
  await write('POST', '/v1/client/nutrition-logs/restore', () => button('Undo').click());
  expect(
    (await day()).nutrition_logs.find((l) => l.id === meal.id).food_logs.find((l) => l.name === 'Mixed berries').amount,
  ).toBe(1.5);
  await card('Breakfast');
  await button('Delete record').click();
  await expect(page.getByRole('dialog', {name: 'Delete Breakfast?', exact: true})).toContainText('is removed');
  await button('Cancel', page.getByRole('dialog')).click();
  await button('Delete record').click();
  await write('DELETE', `/v1/client/nutrition-logs/${meal.id}`, () =>
    button('Delete record', page.getByRole('dialog')).click(),
  );
  await write('POST', '/v1/client/nutrition-logs/restore', () => button('Undo').click());
  results.push(
    'meal choice, decimals, replace, remove/add back, time, durable drafts, failed save/retry, correction/delete Undo',
  );
  await button('Add food you ate').click();
  await chooseFood('Banana');
  await page.getByLabel('Amount of Banana', {exact: true}).fill('1.5');
  const extra = await write('POST', '/v1/client/nutrition-logs', () => button('Save').click());
  expect(extra.data.type).toBe('food');
  expect(extra.data.nutrition_schedule_id).toBeNull();
  results.push('unplanned food');

  await card('Lower A');
  await expect(page.getByRole('heading', {name: 'Lower A', exact: true})).toBeFocused();
  await expect(button('Start Lower A')).toBeVisible();
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await shot('workout-preview');
  const started = await write('POST', '/v1/client/workout-logs', () => button('Start Lower A').click());
  const workoutId = started.data.id;
  await expect(page.getByLabel('Back squat set 1 Reps', {exact: true})).toHaveValue('5');
  await expect(page.getByLabel('Back squat set 1 kg', {exact: true})).toHaveValue('100');
  await expect(page.getByLabel('Bulgarian split squat set 1 L Reps', {exact: true})).toHaveValue('10');
  await expect(page.getByLabel('Bulgarian split squat set 1 R Reps', {exact: true})).toHaveValue('10');
  await page.getByLabel('Back squat set 1 kg', {exact: true}).fill('101,5');
  await page
    .getByRole('group', {name: 'Sets for Back squat', exact: true})
    .getByRole('button', {name: /^Add set/})
    .click();
  await back();
  expect((await day()).active_workout.sets).toHaveLength(0);
  expect(Object.hasOwn((await day()).active_workout, 'inputs')).toBe(false);
  await expect(button('Start Easy run')).toHaveCount(0);
  await page.reload();
  await card('Lower A');
  await expect(page.getByLabel('Back squat set 1 kg', {exact: true})).toHaveValue('101,5');
  await expect(page.getByLabel('Back squat set 4 kg', {exact: true})).toBeVisible();
  await page.route(`**/v1/client/workout-logs/${workoutId}`, (route) =>
    route.request().method() === 'PATCH'
      ? route.fulfill({status: 503, json: {error_message: 'Service unavailable'}})
      : route.continue(),
  );
  await button('Record set 1 of Back squat').click();
  await expect(page.getByRole('alert')).toContainText('Your changes stay on this device.');
  await expect(button('Set 1 of Back squat recorded. Untick')).toBeVisible();
  await expect(button('Finish workout')).toBeDisabled();
  await page.unroute(`**/v1/client/workout-logs/${workoutId}`);
  let releaseRetry;
  const retryHeld = new Promise((resolve) => {
    releaseRetry = resolve;
  });
  let heldRetry = true;
  await page.route(`**/v1/client/workout-logs/${workoutId}`, async (route) => {
    if (route.request().method() === 'PATCH' && heldRetry) {
      heldRetry = false;
      await retryHeld;
    }
    await route.continue();
  });
  const newerEdit = page
    .waitForResponse(
      (res) =>
        new URL(res.url()).pathname === `/v1/client/workout-logs/${workoutId}` &&
        res.request().method() === 'PATCH' &&
        res
          .request()
          .postDataJSON()
          .sets.some((set) => set.reps === 9),
    )
    .then(
      (response) => ({response}),
      (error) => ({error}),
    );
  await write('PATCH', `/v1/client/workout-logs/${workoutId}`, async () => {
    await button('Retry saving sets').click();
    try {
      await expect(page.getByLabel('Back squat set 1 Reps', {exact: true})).toBeEnabled();
      await page.screenshot({path: `${artifacts}/retry-held.png`, fullPage: true});
      await page.getByLabel('Back squat set 1 Reps', {exact: true}).fill('9');
    } finally {
      releaseRetry();
    }
  });
  const newer = await newerEdit;
  if ('error' in newer) {
    throw newer.error;
  }
  expect(newer.response.ok()).toBe(true);
  await page.unroute(`**/v1/client/workout-logs/${workoutId}`);
  await expect(button('Set 1 of Back squat recorded. Untick')).toBeEnabled();
  expect((await day()).active_workout.sets.find((s) => s.exercise.name === 'Back squat').reps).toBe(9);
  await write('PATCH', `/v1/client/workout-logs/${workoutId}`, () =>
    page.getByLabel('Back squat set 1 Reps', {exact: true}).fill(''),
  );
  expect((await day()).active_workout.sets.find((s) => s.exercise.name === 'Back squat').reps).toBeNull();
  await write('PATCH', `/v1/client/workout-logs/${workoutId}`, () =>
    page.getByLabel('Back squat set 1 Reps', {exact: true}).fill('5'),
  );
  await write('PATCH', `/v1/client/workout-logs/${workoutId}`, () => button('Record set 4 of Back squat').click());
  for (const name of ['Record set 1 L of Bulgarian split squat', 'Record set 1 R of Bulgarian split squat']) {
    await write('PATCH', `/v1/client/workout-logs/${workoutId}`, () => button(name).click());
  }
  await page.route(`**/v1/client/workout-logs/${workoutId}`, (route) =>
    route.request().method() === 'PATCH'
      ? route.fulfill({status: 503, json: {error_message: 'Service unavailable'}})
      : route.continue(),
  );
  await page.getByLabel('Back squat set 1 kg', {exact: true}).fill('106,5');
  await expect(page.getByRole('alert')).toContainText('Your changes stay on this device.');
  await button('Back to Today').click();
  await button('Leave without saving', page.getByRole('dialog')).click();
  await expect(plan()).toBeVisible();
  await page.unroute(`**/v1/client/workout-logs/${workoutId}`);
  await card('Lower A');
  await expect(page.getByLabel('Back squat set 1 kg', {exact: true})).toHaveValue('106,5');
  await expect(button('Finish workout')).toBeDisabled();
  await write('PATCH', `/v1/client/workout-logs/${workoutId}`, () => button('Retry saving sets').click());
  await expect(button('Set 1 of Back squat recorded. Untick')).toBeEnabled();
  expect(
    (await day()).active_workout.sets.find((set) => set.exercise.name === 'Back squat' && set.round === 1).weight_kg,
  ).toBe(106.5);
  await write('PATCH', `/v1/client/workout-logs/${workoutId}`, () =>
    page.getByLabel('Back squat set 1 kg', {exact: true}).fill('101,5'),
  );
  const ticked = (await day()).active_workout;
  expect(ticked.sets.find((s) => s.exercise.name === 'Back squat').weight_kg).toBe(101.5);
  expect(
    ticked.sets
      .filter((s) => s.exercise.name === 'Bulgarian split squat')
      .map((s) => s.side)
      .sort(),
  ).toEqual(['left', 'right']);
  await button('Swap Back squat').click();
  await page
    .getByRole('dialog')
    .getByRole('button', {name: /^Side plank /})
    .click();
  await expect(page.getByRole('dialog', {name: 'Swap to Side plank?', exact: true})).toContainText('sets you recorded');
  await write('PATCH', `/v1/client/workout-logs/${workoutId}`, () =>
    button('Swap and clear sets', page.getByRole('dialog', {name: 'Swap to Side plank?', exact: true})).click(),
  );
  await expect(page.getByLabel('Back squat set 1 kg', {exact: true})).toHaveCount(0);
  await page.getByLabel('Side plank set 1 Seconds', {exact: true}).fill('30');
  await write('PATCH', `/v1/client/workout-logs/${workoutId}`, () => button('Record set 1 of Side plank').click());
  await shot('workout-active-swapped');
  await button('Finish workout').click();
  let finish = await feedback('Finish without them', true, 'Too hard');
  await shot('workout-finish');
  await write('POST', `/v1/client/workout-logs/${workoutId}/finish`, () => button('Save workout', finish).click());
  let completed = (await day()).workout_logs.find((w) => w.id === workoutId);
  expect(completed.sets).toHaveLength(3);
  expect(completed.pain_note).toBe('Left knee on the last set');
  await card('Lower A');
  await expect(page.getByLabel('Side plank set 1 Seconds', {exact: true})).toBeDisabled();
  await write('POST', '/v1/client/workout-logs/restore', () => button('Undo').click());
  await expect(page.getByLabel('Side plank set 1 Seconds', {exact: true})).toBeEnabled();
  await button('Finish workout').click();
  finish = await feedback('Finish without them', true, 'Too hard');
  await write('POST', `/v1/client/workout-logs/${workoutId}/finish`, () => button('Save workout', finish).click());
  await card('Lower A');
  await write('POST', `/v1/client/workout-logs/${workoutId}/reopen`, () => button('Edit').click());
  await write('PATCH', `/v1/client/workout-logs/${workoutId}`, () =>
    page.getByLabel('Bulgarian split squat set 1 L Reps', {exact: true}).fill(''),
  );
  await button('Finish workout').click();
  finish = await feedback('Record them as planned', false);
  await write('POST', `/v1/client/workout-logs/${workoutId}/finish`, () => button('Save workout', finish).click());
  completed = (await day()).workout_logs.find((w) => w.id === workoutId);
  expect(completed.sets.length).toBeGreaterThan(3);
  expect(completed.pain).toBe(false);
  expect(completed.pain_note).toBeNull();
  await card('Lower A');
  await expect(page.getByLabel('Bulgarian split squat set 1 L Reps', {exact: true})).toHaveValue('');
  await shot('workout-completed');
  await button('Delete workout').click();
  await expect(page.getByRole('dialog', {name: 'Delete Lower A?', exact: true})).toContainText(
    'sets and your feedback',
  );
  await button('Cancel', page.getByRole('dialog')).click();
  await button('Delete workout').click();
  await write('DELETE', `/v1/client/workout-logs/${workoutId}`, () =>
    button('Delete workout', page.getByRole('dialog')).click(),
  );
  await write('POST', '/v1/client/workout-logs/restore', () => button('Undo').click());
  await card('Lower A');
  await write('POST', `/v1/client/workout-logs/${workoutId}/reopen`, () => button('Edit').click());
  await button('Discard').click();
  await button('Keep going', page.getByRole('dialog')).click();
  await button('Discard').click();
  await write('POST', `/v1/client/workout-logs/${workoutId}/discard`, () =>
    button('Discard workout', page.getByRole('dialog')).click(),
  );
  await expect(button('Start Lower A')).toBeVisible();
  results.push(
    'workout preview, targets, sides, device-only input/rounds, tick, swap metrics, both finish choices, feedback, edit/delete Undo/discard',
  );
  for (const name of ['Easy run', 'Open practice']) {
    await card(name);
    const active = await write('POST', '/v1/client/workout-logs', () => button(`Start ${name}`).click());
    await button('Mark as done').click();
    finish = await feedback(null, false);
    await write('POST', `/v1/client/workout-logs/${active.data.id}/finish`, () =>
      button('Save workout', finish).click(),
    );
    expect((await day()).workout_logs.find((w) => w.id === active.data.id).state).toBe('completed');
  }
  await card('PT session');
  await expect(page.getByText('Sam records this session.', {exact: true})).toBeVisible();
  await expect(button('Start PT session')).toHaveCount(0);
  await back();
  results.push('video/open feedback and coach-led preview');
  await shot('today-recorded');
  const prototype = await context.newPage();
  await prototype.goto('/prototype/today');
  await prototype.screenshot({path: `${artifacts}/prototype-today.png`, fullPage: true});
  await prototype
    .getByRole('list', {name: 'Plan', exact: true})
    .getByRole('button', {name: /Breakfast/})
    .first()
    .click();
  await radio('Oats bowl', prototype).click();
  await prototype.screenshot({path: `${artifacts}/prototype-meal.png`, fullPage: true});
  await prototype.getByRole('button', {name: 'Back to Today', exact: true}).click();
  await prototype
    .getByRole('group', {name: 'Day', exact: true})
    .getByRole('button', {name: /^Monday/})
    .click();
  await prototype
    .getByRole('list', {name: 'Plan', exact: true})
    .getByRole('button', {name: /Lower A/})
    .first()
    .click();
  await prototype.screenshot({path: `${artifacts}/prototype-workout-preview.png`, fullPage: true});
  await prototype.getByRole('button', {name: 'Start Lower A', exact: true}).click();
  await prototype.screenshot({path: `${artifacts}/prototype-workout-active.png`, fullPage: true});
  await prototype.getByRole('button', {name: 'Finish workout', exact: true}).click();
  await prototype.screenshot({path: `${artifacts}/prototype-workout-finish.png`, fullPage: true});
  await prototype.close();
  expect(errors).toEqual([]);
  await writeFile(
    `${artifacts}/results.json`,
    `${JSON.stringify({passed: true, width: 375, results, errors}, null, 2)}\n`,
  );
  console.log(`Today passed at 375px against the real API: ${results.length} flow groups.`);
} catch (error) {
  await writeFile(`${artifacts}/workout-writes.json`, JSON.stringify(workoutWrites, null, 2));
  await writeFile(`${artifacts}/failure.txt`, await page.locator('body').ariaSnapshot());
  await page.screenshot({path: `${artifacts}/failure.png`, fullPage: true});
  throw error;
} finally {
  await context.close();
  await browser.close();
  await api.dispose();
}
