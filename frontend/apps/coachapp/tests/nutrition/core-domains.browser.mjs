import {mkdir, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium, expect, request} from '@playwright/test';

const repo = fileURLToPath(new URL('../../../../../', import.meta.url));
const screens = `${repo}/frontend/apps/coachapp/tests/nutrition/artifacts`;
await mkdir(screens, {recursive: true});
const api = await request.newContext({baseURL: 'http://localhost:4000'});
const browser = await chromium.launch();
const errors = [];
const failures = [];
const suffix = String(Date.now());
let coach;
let clientPage;
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()} ${await response.text()}`).toBe(true);
  return response.status() === 204 ? null : response.json();
}
function dateAfter(date, days) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
async function select(page, label, option, scope = page) {
  await scope.getByRole('button', {name: new RegExp(label)}).click();
  await page.getByRole('option', {name: option, exact: true}).click();
}
async function shot(page, name) {
  await page.locator('h1').first().click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForFunction(() => window.scrollY === 0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path: `${screens}/${name}.png`, fullPage: true});
}
async function login(page, email) {
  await page.goto('/login');
  await page.getByLabel('Email', {exact: true}).fill(email);
  await page.getByRole('button', {name: 'Continue with email'}).click();
  await page.getByLabel('Verification code').fill('123456');
  await page.getByRole('button', {name: 'Verify and continue'}).click();
}
async function pickClientFood(name) {
  await clientPage.getByLabel('Search library', {exact: true}).fill(name);
  await clientPage.getByRole('button', {name: 'Search', exact: true}).click();
  await clientPage.getByRole('button', {name: `Choose ${name}`, exact: true}).click();
}

async function runNutritionJourney({token, today, person, foodId, clientContext}) {
  await coach.goto('/nutrition-plans/new');
  await coach.getByLabel('Plan name', {exact: true}).fill('Slice Two Fuel');
  await coach.getByLabel('Plan Calories minimum', {exact: true}).fill('1800');
  await coach.getByLabel('Plan Calories maximum', {exact: true}).fill('1900');
  await coach.getByRole('button', {name: 'Add meal', exact: true}).click();
  await coach.getByLabel('Meal name', {exact: true}).fill('Fuel bowl');
  await coach.getByRole('button', {name: 'Add foods or recipes', exact: true}).click();
  await coach.getByLabel('Search foods', {exact: true}).fill('S2 ');
  await coach.getByRole('button', {name: 'Select S2 Oats', exact: true}).click();
  await coach.getByRole('button', {name: 'Select S2 Yogurt', exact: true}).click();
  await coach.getByRole('button', {name: 'Add 2 items', exact: true}).click();
  await coach.getByLabel('Day pattern name', {exact: true}).fill('Training day');
  await coach.getByRole('checkbox', {name: 'Use different targets for this pattern', exact: true}).focus();
  await coach.keyboard.press('Space');
  await coach.getByLabel('Training day Calories minimum', {exact: true}).fill('2200');
  await coach.getByLabel('Training day Calories maximum', {exact: true}).fill('2400');
  for (const [index, name] of ['Morning fuel', 'Evening fuel'].entries()) {
    await coach.getByRole('button', {name: 'Add slot', exact: true}).click();
    await coach.getByLabel('Slot name', {exact: true}).nth(index).fill(name);
    await coach.getByRole('checkbox', {name: 'Fuel bowl', exact: true}).nth(index).focus();
    await coach.keyboard.press('Space');
  }
  await coach.getByRole('button', {name: 'Add day pattern', exact: true}).click();
  await coach.getByLabel('Day pattern name', {exact: true}).fill('Rest day');
  await coach.getByRole('button', {name: 'Add slot', exact: true}).click();
  await coach.getByLabel('Slot name', {exact: true}).fill('Rest fuel');
  await coach.getByRole('checkbox', {name: 'Fuel bowl', exact: true}).focus();
  await coach.keyboard.press('Space');
  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const todayIndex = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7;
  for (const [index, weekday] of weekdays.entries()) {
    await select(coach, `${weekday} pattern`, index === todayIndex ? 'Training day' : 'Rest day');
  }
  await shot(coach, '03-builder-375');
  await coach.setViewportSize({width: 1280, height: 900});
  await shot(coach, '04-builder-1280');
  let documentWrites = 0;
  coach.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/v1/coach/nutrition-plans')) {
      documentWrites++;
    }
  });
  await coach.getByRole('button', {name: 'Save nutrition plan', exact: true}).click();
  await expect(coach).toHaveURL(/nutrition-plans\/[0-9a-f-]{36}$/);
  expect(documentWrites).toBe(1);
  const templateId = new URL(coach.url()).pathname.split('/').at(-1);
  await coach.goto(`/clients/${person.id}/nutrition-plans/assign/${templateId}`);
  await coach.getByLabel('Start date', {exact: true}).fill(today);
  await coach.getByRole('button', {name: 'Assign nutrition plan', exact: true}).click();
  await expect(coach).toHaveURL(new RegExp(`/clients/${person.id}$`));
  let plan = (await send('get', `/v1/coach/clients/${person.id}/nutrition-plans`, undefined, token)).data[0];
  await coach.goto(`/clients/${person.id}/nutrition-plans/${plan.id}/edit`);
  await coach.getByRole('button', {name: 'Training day', exact: true}).click();
  await coach.getByLabel('Training day Calories minimum', {exact: true}).fill('2300');
  await coach.getByLabel('Training day Calories maximum', {exact: true}).fill('2500');
  await coach.getByRole('button', {name: 'Publish from today', exact: true}).click();
  await expect(coach.getByText('Revision published from today.', {exact: true})).toBeVisible();
  plan = (await send('get', `/v1/coach/nutrition-plans/${plan.id}`, undefined, token)).data;
  const copied = plan.content.meals[0].items[0];
  expect(copied.grams).toBe(50);
  expect(copied.nutrients.energy_kcal).toBe(200);
  const publishedId = plan.current_revision.id;
  await coach.getByLabel('Effective date', {exact: true}).fill(dateAfter(today, 3));
  await coach.getByRole('button', {name: 'Schedule revision', exact: true}).click();
  await expect(coach.getByText(/An edit from today applies until/)).toBeVisible();
  await shot(coach, '05-publish-1280');
  await coach.setViewportSize({width: 375, height: 812});
  await shot(coach, '06-publish-375');
  await coach.getByRole('button', {name: 'Withdraw scheduled revision', exact: true}).click();
  await expect(coach.getByRole('button', {name: 'Withdraw scheduled revision', exact: true})).toHaveCount(0);
  await clientPage.goto('/');
  await expect(clientPage.getByText(/Morning fuel: Not recorded/)).toBeVisible();
  await shot(clientPage, '07-client-today-375');
  await clientPage.getByRole('link', {name: 'Today’s meals', exact: true}).click();
  await clientPage.getByRole('link', {name: /Morning fuel/}).click();
  await clientPage.getByRole('button', {name: 'Record all listed items', exact: true}).click();
  await clientPage.getByRole('button', {name: 'Replace S2 Yogurt', exact: true}).click();
  await pickClientFood('S2 Banana');
  await clientPage.getByRole('button', {name: 'Add food or recipe', exact: true}).click();
  await clientPage.getByLabel('Search library', {exact: true}).fill('S2 Oats');
  await clientPage.getByRole('button', {name: 'Search', exact: true}).click();
  await clientPage.getByText('Portion & item details', {exact: true}).click();
  await expect(clientPage.getByText('For Bowl (50 g)', {exact: true})).toBeVisible();
  await expect(clientPage.getByText(/Energy: 200 kcal/)).toBeVisible();
  await clientPage.getByRole('button', {name: 'Choose S2 Oats', exact: true}).click();
  await clientPage.getByRole('button', {name: 'Quick add', exact: true}).click();
  await clientPage.getByLabel('Quick add name', {exact: true}).fill('Quick lunch');
  await clientPage.getByLabel('Calories (kcal)', {exact: true}).fill('250');
  await clientPage.getByRole('button', {name: 'Add quick entry', exact: true}).click();
  await clientPage.getByLabel('Notes for S2 Banana', {exact: true}).fill('Swapped fruit');
  await clientContext.setOffline(true);
  await clientPage.getByLabel('Note to coach', {exact: true}).fill('Fuel after training');
  await expect(clientPage.getByText('Draft saved on this device.', {exact: true})).toBeVisible();
  await clientContext.setOffline(false);
  await clientPage.reload();
  await expect(clientPage.getByLabel('Note to coach', {exact: true})).toHaveValue('Fuel after training');
  await shot(clientPage, '08-client-meal-375');
  const mealWrites = [];
  clientPage.on('request', (request) => {
    if (request.method() === 'PATCH' && request.url().includes('/nutrition-days/')) {
      mealWrites.push(request.postDataJSON());
    }
  });
  let lostResponse = false;
  await clientPage.route('**/v1/client/nutrition-days?*', async (route) => {
    if (lostResponse) {
      await route.abort('connectionreset');
    } else {
      await route.continue();
    }
  });
  await clientPage.route(`**/v1/client/nutrition-days/${today}`, async (route) => {
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    lostResponse = true;
    await route.abort('connectionreset');
  });
  await clientPage.getByRole('button', {name: 'Save meal', exact: true}).click();
  await expect(clientPage.getByRole('button', {name: 'Check meal save', exact: true})).toBeVisible();
  await clientPage.unroute('**/v1/client/nutrition-days?*');
  await clientPage.unroute(`**/v1/client/nutrition-days/${today}`);
  await clientPage.reload();
  await clientPage.getByRole('button', {name: 'Check meal save', exact: true}).click();
  await expect(clientPage).toHaveURL(/nutrition\?date=.*saved=/);
  expect(mealWrites).toHaveLength(1);
  const day = (await send('get', `/v1/coach/clients/${person.id}/nutrition-days?date=${today}`, undefined, token))
    .data[0];
  expect(day.counts).toEqual({expected: 2, recorded: 1});
  expect(day.target_changed).toBe(true);
  expect(day.targets.energy_kcal).toEqual({min: 2300, max: 2500});
  expect(day.totals.energy_kcal).toEqual({value: 740, known_entries: 4, total_entries: 4});
  expect(day.totals.fiber_g).toEqual({value: null, known_entries: 1, total_entries: 4});
  const savedMeal = day.slots.find((slot) => slot.name === 'Morning fuel').meal;
  expect(savedMeal.entries).toHaveLength(4);
  expect(savedMeal.entries.find((entry) => entry.name === 'Quick lunch').source).toBeNull();
  await coach.goto(`/nutrition-foods/${foodId}`);
  await coach.getByLabel('Calories · kcal', {exact: true}).fill('800');
  await coach.getByRole('button', {name: 'Save food', exact: true}).click();
  await expect(coach.getByText('Food saved.', {exact: true})).toBeVisible();
  const after = (await send('get', `/v1/coach/nutrition-plans/${plan.id}`, undefined, token)).data;
  expect(after.current_revision.id).toBe(publishedId);
  expect(after.content.meals[0].items[0]).toEqual(copied);
  await coach.goto(`/clients/${person.id}/nutrition-history?date=${today}`);
  await expect(coach.getByText('1 of 2 planned meals recorded', {exact: true})).toBeVisible();
  await expect(coach.getByText('Not recorded', {exact: true})).toBeVisible();
  await expect(coach.getByRole('note')).toContainText('Target changed during this day');
  await expect(coach.getByRole('row', {name: /Fiber/})).toContainText('Unknown');
  await expect(coach.getByRole('row', {name: /Fiber/})).toContainText('1 of 4 entries known');
  await expect(coach.getByRole('heading', {name: 'Food metrics', exact: true})).toBeVisible();
  await expect(coach.getByText('2 entries across 1 days · Average 50 g', {exact: true})).toBeVisible();
  await shot(coach, '09-coach-day-375');
  await coach.setViewportSize({width: 1280, height: 900});
  await shot(coach, '10-coach-day-1280');
  await coach.getByRole('button', {name: 'Week view', exact: true}).click();
  await expect(coach.getByText('Not recorded', {exact: true}).first()).toBeVisible();
  await shot(coach, '11-coach-week-1280');
  await coach.setViewportSize({width: 375, height: 812});
  await shot(coach, '12-coach-week-375');
  await writeFile(
    `${screens}/results.json`,
    JSON.stringify(
      {
        passed: true,
        templateId,
        planId: plan.id,
        revisionId: publishedId,
        clientId: person.id,
        mealId: savedMeal.id,
        today,
        documentWrites,
        unknownFiber: true,
        copiedValues: true,
        offlineDraft: true,
        lostResponseRecovery: true,
        errors,
      },
      null,
      2,
    ),
  );
  console.log('Slice 2 Nutrition flow passed: coach 1280/375 and client 375.');
}

try {
  const email = `s2-coach-${suffix}@example.test`;
  await send('post', '/v1/auth/signup', {email, full_name: 'Slice Two Coach'});
  const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
  await send(
    'post',
    '/v1/businesses',
    {full_name: 'Slice Two Coach', name: 'Slice Two Nutrition', handle: `s2-${suffix}`},
    guest.access_token,
  );
  const tokens = await send('post', '/v1/auth/token', {
    grant_type: 'refresh_token',
    refresh_token: guest.refresh_token,
    role: 'coach',
  });
  const token = tokens.access_token;
  const clientEmail = `s2-client-${suffix}@example.test`;
  const person = (await send('post', '/v1/coach/clients', {full_name: 'Slice Two Client', email: clientEmail}, token))
    .data;
  const invitation = new URL(person.invite_url).pathname.split('/').at(-1);
  const coachContext = await browser.newContext({
    baseURL: 'http://localhost:2022',
    viewport: {width: 1280, height: 900},
  });
  const clientContext = await browser.newContext({
    baseURL: 'http://localhost:1315',
    viewport: {width: 375, height: 812},
  });
  coach = await coachContext.newPage();
  clientPage = await clientContext.newPage();
  for (const page of [coach, clientPage]) {
    page.setDefaultTimeout(20000);
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', async (response) => {
      if (response.status() >= 400) {
        failures.push({url: response.url(), status: response.status(), body: await response.text().catch(() => '')});
      }
    });
  }
  await clientPage.goto(`/invite/${invitation}`);
  await clientPage.getByRole('button', {name: 'Continue with email'}).click();
  await clientPage.getByLabel('Verification code').fill('123456');
  await clientPage.getByRole('button', {name: 'Verify and continue'}).click();
  await expect(clientPage.getByRole('heading', {name: 'Today', exact: true})).toBeVisible();
  const today = (await send('get', `/v1/coach/clients/${person.id}`, undefined, token)).data.local_date;
  await login(coach, email);
  await expect(coach).toHaveURL(/\/(clients|welcome)$/);
  await coach.goto('/nutrition-foods/new');
  await coach.getByLabel('Food name', {exact: true}).fill('S2 Oats');
  for (const [label, value] of [
    ['Calories · kcal', '400'],
    ['Protein · g', '10'],
    ['Carbs · g', '65'],
    ['Fat · g', '8'],
    ['Sugar · g', '0'],
  ]) {
    await coach.getByLabel(label, {exact: true}).fill(value);
  }
  await expect(coach.getByLabel('Fiber · g', {exact: true})).toHaveValue('');
  await coach.getByRole('button', {name: 'Add serving size', exact: true}).click();
  await coach.getByLabel('Serving name', {exact: true}).fill('Bowl');
  await coach.getByLabel('Weight · g', {exact: true}).fill('50');
  await shot(coach, '01-food-1280');
  await coach.setViewportSize({width: 375, height: 812});
  await shot(coach, '02-food-375');
  await coach.getByRole('button', {name: 'Save food', exact: true}).click();
  await expect(coach).toHaveURL(/nutrition-foods\/[0-9a-f-]{36}$/);
  const foodId = new URL(coach.url()).pathname.split('/').at(-1);
  const food = (await send('get', `/v1/coach/nutrition-foods/${foodId}`, undefined, token)).data;
  expect(food.nutrients.fiber_g).toBeUndefined();
  expect(food.nutrients.sugar_g).toBe(0);
  for (const [name, energy, fiber] of [
    ['S2 Yogurt', 100, 0],
    ['S2 Banana', 90, 2],
  ]) {
    await send(
      'post',
      '/v1/coach/nutrition-foods',
      {
        name,
        nutrients: {energy_kcal: energy, protein_g: 5, carbs_g: 10, fat_g: 1, fiber_g: fiber, sugar_g: 3},
        servings: [],
      },
      token,
    );
  }
  await runNutritionJourney({token, today, person, foodId, coachContext, clientContext});
  expect(errors).toEqual([]);
} catch (error) {
  await writeFile(`${screens}/failure-responses.json`, JSON.stringify(failures, null, 2));
  for (const [name, page] of [
    ['coach', coach],
    ['client', clientPage],
  ]) {
    if (page) {
      await writeFile(`${screens}/failure-${name}.txt`, await page.locator('body').ariaSnapshot());
      await page.screenshot({path: `${screens}/failure-${name}.png`, fullPage: true});
    }
  }
  throw error;
} finally {
  await browser.close();
  await api.dispose();
}
