import {readFile} from 'node:fs/promises';
import {test as base, expect} from '@playwright/test';

const test = base.extend({
  client: async ({browser}, use) => {
    const page = await browser.newPage({viewport: {width: 375, height: 812}});
    await use(page);
    await page.close();
  },
});

async function fixture(scenario, testInfo) {
  const seeds = JSON.parse(await readFile(new URL('./.generated/fixtures.json', import.meta.url), 'utf8'));
  return seeds[`${scenario}-${testInfo.project.name}`];
}

async function login(page, email, origin = 'http://localhost:2421') {
  await page.goto(`${origin}/login`);
  await page.getByRole('textbox', {name: /^Email/}).fill(email);
  await page.getByRole('button', {name: 'Continue with email'}).click();
  await expect(page).toHaveURL(/verify-login/);
  await page.getByRole('textbox').fill('123456');
  await page.getByRole('button', {name: 'Verify', exact: true}).click();
  await expect(page).not.toHaveURL(/login/);
}

async function saveMenu(page) {
  const saved = page.waitForResponse(
    (response) => response.url().endsWith('/menu') && response.request().method() === 'PUT',
  );
  await page.getByRole('button', {name: 'Save menu', exact: true}).click();
  expect((await saved).status()).toBe(200);
  await expect(page.getByText('Menu saved', {exact: true})).toBeVisible();
}

test('build food, recipe and whole menu; reload preserves amounts', async ({page}, testInfo) => {
  const seed = await fixture('build', testInfo);
  await login(page, seed.coach_email);
  await page.goto('/library/foods/create');
  await page.getByRole('textbox', {name: /^Name/}).fill('Breakfast oats');
  await page.getByRole('textbox', {name: 'Calories', exact: true}).fill('200');
  await page.getByRole('button', {name: 'Create food', exact: true}).click();
  await expect(page).toHaveURL(/\/foods\/[a-f0-9-]+$/);
  await page.reload();
  await expect(page.getByRole('heading', {name: 'Breakfast oats', exact: true})).toBeVisible();

  await page.goto('/library/recipes/create');
  await page.getByRole('textbox', {name: /^Name/}).fill('Oat bowl');
  await page.getByRole('textbox', {name: 'Servings', exact: true}).fill('2');
  await page.getByRole('textbox', {name: 'Cooked weight (g)', exact: true}).fill('200');
  await page.getByRole('button', {name: 'Add ingredient', exact: true}).click();
  await page.getByRole('option').filter({hasText: 'Breakfast oats'}).click();
  await page.getByRole('button', {name: 'Add 1 ingredient', exact: true}).click();
  await page.getByRole('textbox', {name: /^Weight \(g\)/}).fill('100');
  await page.getByRole('button', {name: 'Create recipe', exact: true}).click();
  await expect(page).toHaveURL(/\/recipes\/[a-f0-9-]+$/);
  await page.reload();
  await expect(page.getByText('Breakfast oats', {exact: true})).toBeVisible();

  await page.goto('/library/nutrition-plans/create');
  await page.getByRole('textbox', {name: /^Name/}).fill('Built in browser');
  await page.getByRole('button', {name: 'Create plan', exact: true}).click();
  await expect(page.getByText('Menu saved', {exact: true})).toBeVisible();
  await page.getByTestId('nb-add-meal').click();
  await page.getByTestId('nb-create-meal').click();
  await page.getByRole('textbox', {name: 'Meal name', exact: true}).fill('Breakfast');
  await page.getByRole('textbox', {name: 'Meal name', exact: true}).press('Enter');
  await page.getByRole('button', {name: '+ Add food or recipe', exact: true}).click();
  await page.getByRole('option').filter({hasText: 'Breakfast oats'}).click();
  await page.getByRole('button', {name: 'Recipes', exact: true}).click();
  await page.getByRole('option').filter({hasText: 'Oat bowl'}).click();
  await page.getByRole('button', {name: 'Set amounts — 2 items', exact: true}).click();
  await page.getByRole('textbox', {name: /^Amount/}).fill('75');
  await page.getByRole('button', {name: 'Next', exact: true}).click();
  await page.getByRole('textbox', {name: /^Amount/}).fill('1');
  await page.getByRole('button', {name: 'Add 2 items', exact: true}).click();
  await saveMenu(page);
  await page.reload();
  await page.getByRole('button', {name: 'Expand Breakfast', exact: true}).click();
  await expect(page.getByRole('button', {name: /^Breakfast oats/})).toContainText('75');
  await expect(page.getByRole('button', {name: /^Oat bowl/})).toContainText('1 serving');
});

async function openDiary(client, seed) {
  // End the previous screen's requests before observing the fresh page's read.
  await client.goto('about:blank');
  const [response] = await Promise.all([
    client.waitForResponse(
      (r) => new URL(r.url()).pathname === '/v1/client/nutrition-days' && r.request().method() === 'GET',
    ),
    client.goto('http://localhost:2414/nutrition'),
  ]);
  expect(response.status()).toBe(200);
  const day = (await response.json()).data.find((day) => day.date === seed.date);
  expect(day).toBeDefined();
  return day;
}

async function logOats(client, grams = '50') {
  await client.getByRole('button', {name: /^Oats \d/}).click();
  await client.getByRole('textbox', {name: 'Amount', exact: true}).fill(grams);
  await client.getByRole('textbox', {name: 'Note for coach'}).fill('Logged from the real client app');
  await client.getByRole('button', {name: 'Log it', exact: true}).click();
  await expect(client.getByRole('dialog')).toHaveCount(0);
}

async function coachDiary(page, seed, calories) {
  await page.goto(`/clients/${seed.client_id}/nutrition/${seed.date}`);
  await expect(page.getByRole('progressbar', {name: `Calories: ${calories} of 2000 kcal`, exact: true})).toBeVisible();
}

test('assign a menu; client logs it; coach sees persisted intake', async ({page, client}, testInfo) => {
  const seed = await fixture('assign', testInfo);
  await login(page, seed.coach_email);
  await page.goto(`/library/nutrition-plans/${seed.plan_id}`);
  await page.getByRole('button', {name: 'Add to client', exact: true}).click();
  await page.getByRole('option').filter({hasText: 'Test Client'}).click();
  await page.getByRole('button', {name: 'Assign to Test Client', exact: true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await login(client, seed.client_email, 'http://localhost:2414');
  await openDiary(client, seed);
  await logOats(client);
  const day = await openDiary(client, seed);
  expect(day.summary.logged.calories).toBe(100);
  expect(day.slots[0].rows[0].notes).toBe('Logged from the real client app');
  await expect(client.getByRole('button', {name: 'Oats 100', exact: true})).toBeVisible();
  await coachDiary(page, seed, 100);
  await expect(page.getByText('50 g', {exact: true})).toBeVisible();
});

test('correct, replace and remove intake; both apps agree after reload', async ({page, client}, testInfo) => {
  const seed = await fixture('corrections', testInfo);
  await login(client, seed.client_email, 'http://localhost:2414');
  await openDiary(client, seed);
  await logOats(client);
  await client.getByRole('button', {name: 'Oats 100', exact: true}).click();
  await client.getByRole('textbox', {name: 'Amount', exact: true}).fill('75');
  await client.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(client.getByRole('dialog')).toHaveCount(0);
  expect((await openDiary(client, seed)).summary.logged.calories).toBe(150);
  await login(page, seed.coach_email);
  await coachDiary(page, seed, 150);
  await expect(page.getByText('75 g', {exact: true})).toBeVisible();

  await client.getByRole('button', {name: 'Oats 150', exact: true}).click();
  await client.getByRole('button', {name: 'Replace', exact: true}).click();
  await client.getByRole('button', {name: /^Banana/}).click();
  await expect(client.getByRole('dialog')).toHaveCount(0);
  expect((await openDiary(client, seed)).summary.logged.calories).toBe(90);
  await coachDiary(page, seed, 90);
  await expect(page.getByText('Banana', {exact: true})).toBeVisible();
  await expect(page.getByText('Swapped', {exact: true})).toBeVisible();

  await client.getByRole('button', {name: /^Banana.*90$/}).click();
  await client.getByRole('button', {name: 'Not eaten', exact: true}).click();
  await expect(client.getByRole('dialog')).toHaveCount(0);
  const day = await openDiary(client, seed);
  expect(day.summary.has_intake).toBe(false);
  expect(day.summary.logged.calories).toBeNull();
  expect(day.slots[0].rows[0].entry_id).toBeNull();
  expect(day.slots[0].rows[0].status).toBe('pending');
  await expect(client.getByRole('button', {name: 'Log as eaten', exact: true})).toBeVisible();
  await coachDiary(page, seed, 'unknown');
  await expect(page.getByText('Pending', {exact: true})).toBeVisible();
  await expect(page.getByText('Banana', {exact: true})).toHaveCount(0);
});

test('concurrent menu saves reject stale edits; failed reload retains draft', async ({page, browser}, testInfo) => {
  const seed = await fixture('conflict', testInfo);
  await login(page, seed.coach_email);
  const other = await browser.newPage();
  try {
    await login(other, seed.coach_email);
    const path = `/library/nutrition-plans/${seed.plan_id}`;
    await page.goto(path);
    await other.goto(path);
    await page.getByRole('button', {name: 'Rename', exact: true}).click();
    await page.getByRole('textbox', {name: 'Day name'}).fill('My retained draft');
    await page.getByRole('textbox', {name: 'Day name'}).press('Enter');
    await other.getByRole('button', {name: 'Rename', exact: true}).click();
    await other.getByRole('textbox', {name: 'Day name'}).fill('Saved elsewhere');
    await other.getByRole('textbox', {name: 'Day name'}).press('Enter');
    await saveMenu(other);

    const stale = page.waitForResponse((r) => r.url().endsWith('/menu') && r.status() === 409);
    await page.getByRole('button', {name: 'Save menu', exact: true}).click();
    await stale;
    await expect(page.getByText(/This plan changed elsewhere/)).toBeVisible();
    await expect(page.getByRole('radio', {name: 'My retained draft', exact: true})).toBeVisible();
    const planUrl = `**/v1/coach/nutrition-plans/${seed.plan_id}`;
    await page.route(planUrl, (route) => route.abort('connectionfailed'));
    await page.getByRole('button', {name: 'Discard', exact: true}).click();
    await expect(page.getByText("Couldn't load the saved plan. Your draft is still here.")).toBeVisible();
    await expect(page.getByRole('radio', {name: 'My retained draft', exact: true})).toBeVisible();
    await page.unroute(planUrl);
    await page.getByRole('button', {name: 'Discard', exact: true}).click();
    await expect(page.getByText('Menu saved', {exact: true})).toBeVisible();
    await expect(page.getByRole('radio', {name: 'Saved elsewhere', exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'Rename', exact: true}).click();
    await page.getByRole('textbox', {name: 'Day name'}).fill('Recovered and saved');
    await page.getByRole('textbox', {name: 'Day name'}).press('Enter');
    await saveMenu(page);
    await other.reload();
    await expect(other.getByRole('radio', {name: 'Recovered and saved', exact: true})).toBeVisible();
  } finally {
    await other.close();
  }
});

test('recorded nutrition stays frozen after food and assigned menu edits', async ({page, client}, testInfo) => {
  const seed = await fixture('history', testInfo);
  await login(client, seed.client_email, 'http://localhost:2414');
  await openDiary(client, seed);
  await logOats(client);
  const before = await openDiary(client, seed);
  await login(page, seed.coach_email);
  await page.goto(`/library/foods/${seed.food_id}/edit`);
  await page.getByRole('textbox', {name: /^Name/}).fill('Changed oats');
  await page.getByRole('textbox', {name: 'Calories', exact: true}).fill('800');
  await page.getByRole('button', {name: 'Save changes', exact: true}).click();
  await expect(page).toHaveURL(new RegExp(`/foods/${seed.food_id}$`));
  await page.goto(`/library/nutrition-plans/${seed.plan_id}`);
  await page.getByRole('button', {name: 'Expand Breakfast', exact: true}).click();
  await page.getByRole('button', {name: /^Changed oats/}).click();
  await page.getByRole('textbox', {name: /^Amount/}).fill('200');
  await page.getByRole('button', {name: 'Done', exact: true}).click();
  await saveMenu(page);
  const after = await openDiary(client, seed);
  expect(after.slots).toEqual(before.slots);
  expect(after.summary).toEqual(before.summary);
  await expect(client.getByRole('button', {name: 'Oats 100', exact: true})).toBeVisible();
  await coachDiary(page, seed, 100);
  await expect(page.getByText('Oats', {exact: true})).toBeVisible();
  await expect(page.getByText('50 g', {exact: true})).toBeVisible();
});
