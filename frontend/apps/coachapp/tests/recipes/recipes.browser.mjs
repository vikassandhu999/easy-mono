import {mkdir} from 'node:fs/promises';
import {chromium, expect, request} from '@playwright/test';

const api = await request.newContext({baseURL: 'http://localhost:4000'});
const browser = await chromium.launch();
const screens = '../../../.scratch/core-domains/build/s2-screens';
await mkdir(screens, {recursive: true});
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()} ${await response.text()}`).toBe(true);
  return response.status() === 204 ? null : response.json();
}
try {
  for (const width of [375, 1280]) {
    const suffix = `${Date.now()}-${width}`;
    const email = `s2-recipe-${suffix}@example.test`;
    await send('post', '/v1/auth/signup', {email, full_name: 'Recipe Coach'});
    const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
    await send(
      'post',
      '/v1/businesses',
      {full_name: 'Recipe Coach', name: 'Recipe Test', handle: `s2r-${suffix}`},
      guest.access_token,
    );
    const tokens = await send('post', '/v1/auth/token', {
      grant_type: 'refresh_token',
      refresh_token: guest.refresh_token,
      role: 'coach',
    });
    const token = tokens.access_token;
    const servingId = crypto.randomUUID();
    const oats = (
      await send(
        'post',
        '/v1/coach/nutrition-foods',
        {
          name: 'Recipe oats',
          nutrients: {energy_kcal: 400, sugar_g: 0},
          servings: [{id: servingId, label: 'Bowl', grams: 40}],
          default_serving_id: servingId,
          allergens: ['wheat'],
        },
        token,
      )
    ).data;
    await send(
      'post',
      '/v1/coach/nutrition-foods',
      {name: 'Recipe berries', nutrients: {energy_kcal: 50, fiber_g: 4}, servings: []},
      token,
    );
    const context = await browser.newContext({baseURL: 'http://localhost:2022', viewport: {width, height: 900}});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/login');
    await page.evaluate(async (tokens) => {
      const {saveSession} = await import('/src/api/session.ts');
      saveSession(tokens);
    }, tokens);
    await page.goto('/nutrition-recipes/new');
    await page.getByLabel('Recipe name', {exact: true}).fill('Breakfast bowls');
    await page.getByLabel('Makes how many servings?', {exact: true}).fill('2');
    await page.getByText('Preparation and portion details', {exact: true}).click();
    await page.getByLabel('Finished weight · g (optional)', {exact: true}).fill('350');
    await page.getByLabel('Preparation instructions', {exact: true}).fill('Cook and divide into two bowls.');
    await page.getByRole('button', {name: 'Add ingredients', exact: true}).click();
    await page.getByLabel('Search foods', {exact: true}).fill('Recipe oats');
    await page.getByRole('button', {name: 'Select Recipe oats', exact: true}).click();
    await page.getByLabel('Search foods', {exact: true}).fill('Recipe berries');
    await page.getByRole('button', {name: 'Select Recipe berries', exact: true}).click();
    await page.getByRole('button', {name: 'Add 2 ingredients', exact: true}).click();
    const ingredients = page.getByRole('list', {name: 'Recipe ingredients', exact: true});
    const oatsRow = ingredients.getByRole('listitem').filter({hasText: 'Recipe oats'});
    const berriesRow = ingredients.getByRole('listitem').filter({hasText: 'Recipe berries'});
    await oatsRow.getByLabel('Quantity', {exact: true}).fill('2');
    await berriesRow.getByLabel('Quantity', {exact: true}).fill('100');
    await page.getByRole('button', {name: 'Remove Recipe berries', exact: true}).click();
    await page.getByRole('button', {name: 'Undo', exact: true}).click();
    await expect(berriesRow.getByLabel('Quantity', {exact: true})).toHaveValue('100');
    await page.getByText('Allergens and dietary tags', {exact: true}).click();
    await page.getByText('wheat', {exact: true}).click();
    await page.getByText('vegan', {exact: true}).click();
    const save = page.getByRole('button', {name: 'Save recipe', exact: true});
    await save.click();
    await expect(page).toHaveURL(/nutrition-recipes\/[0-9a-f-]+$/);
    const id = page.url().split('/').at(-1);
    const endpoint = `/v1/coach/nutrition-recipes/${id}`;
    let recipe = (await send('get', endpoint, undefined, token)).data;
    expect(recipe.ingredients).toEqual([
      {food_id: oats.id, portion: {type: 'serving', serving_id: servingId, amount: 2}},
      expect.objectContaining({portion: {type: 'grams', grams: 100}}),
    ]);
    expect(recipe.nutrients.energy_kcal).toBeCloseTo((370 / 350) * 100, 4);
    expect(recipe.nutrients.fiber_g).toBeUndefined();
    expect(recipe.allergens).toEqual(['wheat']);
    expect(recipe.dietary_tags).toEqual(['vegan']);
    await expect(page.getByRole('region', {name: 'Recipe nutrition'})).toContainText('Unknown');
    await oatsRow.getByLabel('Quantity', {exact: true}).fill('3');
    await page.route(`**${endpoint}`, (route) =>
      route.request().method() === 'PATCH' ? route.fulfill({status: 503, json: {}}) : route.continue(),
    );
    await save.click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(oatsRow.getByLabel('Quantity', {exact: true})).toHaveValue('3');
    await page.unroute(`**${endpoint}`);
    await save.click();
    await expect(page.getByText('Recipe saved.', {exact: true})).toBeVisible();
    recipe = (await send('get', endpoint, undefined, token)).data;
    expect(recipe.ingredients[0].portion.amount).toBe(3);
    expect(recipe.nutrients.energy_kcal).toBeCloseTo((530 / 350) * 100, 4);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(() => {
      document.activeElement?.blur();
      window.scrollTo(0, 0);
    });
    await page.screenshot({path: `${screens}/recipe-editor-${width}.png`, fullPage: true});
    expect(errors).toEqual([]);
    await context.close();
    console.log(`Recipe portions, unknown nutrients, tags and failed-save recovery passed at ${width}px.`);
  }
} finally {
  await browser.close();
  await api.dispose();
}
