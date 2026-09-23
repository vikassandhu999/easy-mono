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

async function login(page, email) {
  await page.goto('http://localhost:2421/login');
  await page.getByLabel('Email', {exact: true}).fill(email);
  await page.getByRole('button', {name: 'Continue with email', exact: true}).click();
  await page.getByLabel('Verification code', {exact: true}).fill('123456');
  await page.getByRole('button', {name: 'Verify and continue', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Clients', exact: true})).toBeVisible();
}

async function loginClient(page, email) {
  const origin = 'http://localhost:2414';
  await page.goto(`${origin}/login`);
  await page.getByRole('textbox', {name: /^Email/}).fill(email);
  await page.getByRole('button', {name: 'Continue with email'}).click();
  await expect(page).toHaveURL(/verify-login/);
  await page.getByRole('textbox').fill('123456');
  await page.getByRole('button', {name: 'Verify', exact: true}).click();
  await expect(page).not.toHaveURL(/login/);
}

async function saveMenu(page, clientId) {
  const saved = page.waitForResponse(
    (response) => response.url().endsWith('/menu') && response.request().method() === 'PUT',
  );
  await page.getByRole('button', {name: clientId ? 'Save client plan' : 'Save nutrition plan', exact: true}).click();
  expect((await saved).status()).toBe(200);
  if (clientId) {
    await expect(page).toHaveURL(new RegExp(`/clients/${clientId}$`));
  } else {
    await expect(page.getByText('All changes saved', {exact: true})).toBeVisible();
  }
}

test('build food, recipe and whole menu; reload preserves amounts', async ({page}, testInfo) => {
  const seed = await fixture('build', testInfo);
  await login(page, seed.coach_email);
  await page.goto('/nutrition-foods/new');
  await page.getByLabel('Food name', {exact: true}).fill('Breakfast oats');
  await page.getByLabel('Calories · kcal', {exact: true}).fill('200');
  await page.getByRole('button', {name: 'Save food', exact: true}).click();
  await expect(page).toHaveURL(/\/nutrition-foods\/[a-f0-9-]+$/);
  await page.reload();
  await expect(page.getByLabel('Food name', {exact: true})).toHaveValue('Breakfast oats');

  await page.goto('/nutrition-recipes/new');
  await page.getByLabel('Recipe name', {exact: true}).fill('Oat bowl');
  await page.getByLabel('Makes how many servings?', {exact: true}).fill('2');
  await page.getByText('Preparation and portion details', {exact: true}).click();
  await page.getByLabel('Finished weight · g (optional)', {exact: true}).fill('200');
  await page.getByRole('button', {name: 'Add ingredients', exact: true}).click();
  await page.getByLabel('Search foods', {exact: true}).fill('Breakfast oats');
  await page.getByRole('button', {name: 'Select Breakfast oats', exact: true}).click();
  await page.getByRole('button', {name: 'Add 1 ingredient', exact: true}).click();
  await page
    .getByRole('list', {name: 'Recipe ingredients', exact: true})
    .getByLabel('Quantity', {exact: true})
    .fill('100');
  await page.getByRole('button', {name: 'Save recipe', exact: true}).click();
  await expect(page).toHaveURL(/\/nutrition-recipes\/[a-f0-9-]+$/);
  await page.reload();
  await expect(
    page.getByRole('list', {name: 'Recipe ingredients', exact: true}).getByLabel('Quantity', {exact: true}),
  ).toHaveValue('100');

  await page.goto('/nutrition-plans/new');
  await page.getByLabel('Plan name', {exact: true}).fill('Built in browser');
  await page.getByRole('button', {name: 'Add meal', exact: true}).click();
  await page.getByLabel('Meal name', {exact: true}).fill('Breakfast');
  await page.getByRole('button', {name: 'Add foods or recipes', exact: true}).click();
  const picker = page.getByRole('dialog', {name: 'Add foods or recipes', exact: true});
  await picker.getByLabel('Search foods', {exact: true}).fill('Breakfast oats');
  await picker.getByRole('button', {name: 'Select Breakfast oats', exact: true}).click();
  await picker.getByRole('button', {name: 'Recipes', exact: true}).click();
  await picker.getByRole('button', {name: 'Select Oat bowl', exact: true}).click();
  await picker.getByRole('button', {name: 'Add 2 items', exact: true}).click();
  await page.getByLabel('Breakfast oats portion', {exact: true}).fill('75');
  await page.getByLabel('Oat bowl portion', {exact: true}).fill('1');
  await saveMenu(page);
  await expect(page).toHaveURL(/\/nutrition-plans\/[a-f0-9-]+$/);
  await page.reload();
  await expect(page.getByLabel('Breakfast oats portion', {exact: true})).toHaveValue('75');
  await expect(page.getByLabel('Oat bowl portion', {exact: true})).toHaveValue('1');
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
  await page.goto(`/clients/${seed.client_id}/nutrition-history?date=${seed.date}`);
  const logged = calories === 'unknown' ? '—' : `${calories} kcal`;
  await expect(
    page
      .getByRole('table', {name: 'Logged nutrition and daily targets', exact: true})
      .getByRole('row', {name: `Calories ${logged} 2000 kcal`, exact: true}),
  ).toBeVisible();
}

test('assign a menu; client logs it; coach sees persisted intake', async ({page, client}, testInfo) => {
  const seed = await fixture('assign', testInfo);
  await login(page, seed.coach_email);
  await page.goto(`/clients/${seed.client_id}/nutrition-plans/assign/${seed.plan_id}`);
  await page.getByLabel('Start date', {exact: true}).fill(seed.date);
  await page.getByRole('button', {name: 'Assign nutrition plan', exact: true}).click();
  await expect(page).toHaveURL(new RegExp(`/clients/${seed.client_id}$`));

  await loginClient(client, seed.client_email);
  await openDiary(client, seed);
  await logOats(client);
  const day = await openDiary(client, seed);
  expect(day.summary.logged.calories).toBe(100);
  expect(day.slots[0].rows[0].notes).toBe('Logged from the real client app');
  await expect(client.getByRole('button', {name: 'Oats 100', exact: true})).toBeVisible();
  await coachDiary(page, seed, 100);
  await expect(page.getByRole('listitem').getByText('50 g', {exact: true})).toBeVisible();
});

test('correct, replace and remove intake; both apps agree after reload', async ({page, client}, testInfo) => {
  const seed = await fixture('corrections', testInfo);
  await loginClient(client, seed.client_email);
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
  await expect(page.getByText('Not logged yet', {exact: true})).toBeVisible();
  await expect(page.getByText('Banana', {exact: true})).toHaveCount(0);
});

test('concurrent menu saves reject stale edits; failed reload retains draft', async ({page, browser}, testInfo) => {
  const seed = await fixture('conflict', testInfo);
  await login(page, seed.coach_email);
  const other = await browser.newPage();
  try {
    await login(other, seed.coach_email);
    const path = `/nutrition-plans/${seed.plan_id}`;
    await page.goto(path);
    await other.goto(path);
    await page.getByLabel('Day menu name', {exact: true}).fill('My retained draft');
    await other.getByLabel('Day menu name', {exact: true}).fill('Saved elsewhere');
    await saveMenu(other);

    const stale = page.waitForResponse((r) => r.url().endsWith('/menu') && r.status() === 409);
    await page.getByRole('button', {name: 'Save nutrition plan', exact: true}).click();
    await stale;
    await expect(page.getByText(/This plan changed elsewhere/)).toBeVisible();
    await expect(page.getByLabel('Day menu name', {exact: true})).toHaveValue('My retained draft');
    const planUrl = `**/v1/coach/nutrition-plans/${seed.plan_id}`;
    await page.route(planUrl, (route) => route.abort('connectionfailed'));
    await page.getByRole('button', {name: 'Review saved version', exact: true}).click();
    await page.getByRole('button', {name: 'Load saved plan', exact: true}).click();
    await expect(page.getByRole('alert')).toContainText('Could not load the saved plan. Your draft is still here.');
    await expect(page.getByLabel('Day menu name', {exact: true})).toHaveValue('My retained draft');
    await page.unroute(planUrl);
    await page.getByRole('button', {name: 'Review saved version', exact: true}).click();
    await page.getByRole('button', {name: 'Load saved plan', exact: true}).click();
    await expect(page.getByText('Saved version loaded.', {exact: true})).toBeVisible();
    await expect(page.getByLabel('Day menu name', {exact: true})).toHaveValue('Saved elsewhere');
    await page.getByLabel('Day menu name', {exact: true}).fill('Recovered and saved');
    await saveMenu(page);
    await other.reload();
    await expect(other.getByLabel('Day menu name', {exact: true})).toHaveValue('Recovered and saved');
  } finally {
    await other.close();
  }
});

test('recorded nutrition stays frozen after food and assigned menu edits', async ({page, client}, testInfo) => {
  const seed = await fixture('history', testInfo);
  await loginClient(client, seed.client_email);
  await openDiary(client, seed);
  await logOats(client);
  const before = await openDiary(client, seed);
  await login(page, seed.coach_email);
  await page.goto(`/nutrition-foods/${seed.food_id}`);
  await page.getByLabel('Food name', {exact: true}).fill('Changed oats');
  await page.getByLabel('Calories · kcal', {exact: true}).fill('800');
  const savedFood = page.waitForResponse(
    (r) => r.url().endsWith(`/nutrition-foods/${seed.food_id}`) && r.request().method() === 'PATCH',
  );
  await page.getByRole('button', {name: 'Save food', exact: true}).click();
  expect((await savedFood).status()).toBe(200);
  await page.goto(`/clients/${seed.client_id}/nutrition-plans/${seed.plan_id}/edit`);
  await page.getByLabel('Changed oats portion', {exact: true}).fill('200');
  await saveMenu(page, seed.client_id);
  const after = await openDiary(client, seed);
  expect(after.slots).toEqual(before.slots);
  expect(after.summary).toEqual(before.summary);
  await expect(client.getByRole('button', {name: 'Oats 100', exact: true})).toBeVisible();
  await coachDiary(page, seed, 100);
  await expect(page.getByRole('heading', {name: 'Oats', exact: true})).toBeVisible();
  await expect(page.getByRole('listitem').getByText('50 g', {exact: true})).toBeVisible();
});
