import {execFileSync} from 'node:child_process';
import {mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium, expect, request} from '@playwright/test';

const repo = fileURLToPath(new URL('../../../../../', import.meta.url));
const fixturePath = `${repo}/frontend/apps/clientapp/tests/today/artifacts/fixture.json`;
const artifacts = `${repo}/frontend/apps/clientapp/tests/today/artifacts/nutrition`;
await mkdir(artifacts, {recursive: true});
await Promise.all(
  ['failure.txt', 'failure.png', 'results.json'].map((name) => rm(`${artifacts}/${name}`, {force: true})),
);
execFileSync('rtk', ['proxy', 'mix', 'run', `${repo}/frontend/apps/clientapp/tests/today/fixtures.exs`], {
  cwd: `${repo}/backend`,
  stdio: 'inherit',
});
const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));
const api = await request.newContext({baseURL: process.env.API_URL ?? 'http://localhost:4000'});
const browser = process.env.PLAYWRIGHT_CDP_URL
  ? await chromium.connectOverCDP(process.env.PLAYWRIGHT_CDP_URL)
  : await chromium.launch();
const context = await browser.newContext({
  baseURL: process.env.CLIENT_APP_URL ?? 'http://localhost:1315',
  viewport: {width: 375, height: 812},
});
const page = await context.newPage();
const errors = [];
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
  const creatine = initial.nutrition_schedules.find(
    (s) => initial.presets.find((p) => p.id === s.nutrition_preset_id)?.food?.name === 'Creatine monohydrate',
  );
  expect(breakfast && creatine).toBeTruthy();
  await expect(page.getByRole('group', {name: 'Day', exact: true}).getByRole('button')).toHaveCount(7);
  await expect(page.getByRole('region', {name: 'Targets: Training day', exact: true})).toContainText('2500–2700 kcal');
  await expect(page.getByRole('heading', {name: 'Trackers', exact: true})).toBeVisible();
  await expect(page.getByRole('link', {name: 'Check-ins', exact: true})).toBeVisible();
  await shot('today');
  await selectDay(shift(1));
  await expect(page.getByText('This is your plan. You can record it on the day.', {exact: true})).toBeVisible();
  await expect(page.getByRole('button', {name: /^Mark .* taken$/})).toHaveCount(0);
  await card('Breakfast');
  await expect(page.getByRole('dialog', {name: 'Breakfast', exact: true})).toContainText('You choose one of these:');
  await shot('future-meal');
  await page.keyboard.press('Escape');
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
  results.push('day strip, targets, retained home content, future/past meal preview');

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

  expect(errors).toEqual([]);
  await writeFile(
    `${artifacts}/results.json`,
    `${JSON.stringify({passed: true, width: 375, results, errors}, null, 2)}\n`,
  );
  console.log(`Today nutrition passed at 375px against the real API: ${results.length} flow groups.`);
} catch (error) {
  await writeFile(`${artifacts}/failure.txt`, await page.locator('body').ariaSnapshot());
  await page.screenshot({path: `${artifacts}/failure.png`, fullPage: true});
  throw error;
} finally {
  await context.close();
  await browser.close();
  await api.dispose();
}
