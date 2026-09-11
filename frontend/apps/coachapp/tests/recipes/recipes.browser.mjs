import {mkdir} from 'node:fs/promises';
import {chromium, expect, request} from '@playwright/test';

const api = await request.newContext({baseURL: 'http://localhost:4000'});
const browser = await chromium.launch();
await mkdir('tests/recipes/artifacts', {recursive: true});
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()} ${response.ok() ? '' : await response.text()}`).toBe(
    true,
  );
  return response.json();
}
async function account(unique) {
  const email = `recipe-library-${unique}@example.test`;
  await send('post', '/v1/auth/signup', {email, first_name: 'Taylor'});
  const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
  await send('post', '/v1/businesses', {name: 'Everyday Coaching', handle: `rl-${unique}`}, guest.access_token);
  return send('post', '/v1/auth/token', {
    grant_type: 'refresh_token',
    refresh_token: guest.refresh_token,
    role: 'coach',
  });
}
try {
  for (const width of [375, 1280]) {
    const unique = `${Date.now()}-${width}`;
    const tokens = await account(unique);
    const token = tokens.access_token;
    const oats = (
      await send(
        'post',
        '/v1/coach/nutrition-foods',
        {
          name: 'Rolled oats',
          calories_per_100g: 400,
          protein_g_per_100g: 10,
          carbs_g_per_100g: 60,
          fat_g_per_100g: 5,
          fiber_g_per_100g: 8,
          allergens: ['wheat'],
          serving_sizes: [{label: 'bowl', amount: 1, unit: 'bowl', weight_g: 40, is_default: true}],
        },
        token,
      )
    ).data;
    await send('post', '/v1/coach/nutrition-foods', {name: 'Blueberries', calories_per_100g: 50}, token);
    const context = await browser.newContext({baseURL: 'http://localhost:2022', viewport: {width, height: 900}});
    context.setDefaultTimeout(12000);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/login');
    await page.evaluate(async (tokens) => {
      const {saveSession} = await import('/src/api/session.ts');
      saveSession(tokens);
    }, tokens);
    await page.goto('/nutrition-plans');
    await page.getByRole('link', {name: 'Recipe library', exact: true}).click();
    await expect(page.getByText('Create your first recipe', {exact: true})).toBeVisible();
    await page.getByRole('link', {name: 'Create recipe', exact: true}).click();
    const name = page.getByLabel('Recipe name', {exact: true});
    const servings = page.getByLabel('Makes how many servings?', {exact: true});
    const save = page.getByRole('button', {name: 'Save recipe', exact: true});
    const ingredients = page.getByRole('list', {name: 'Recipe ingredients', exact: true});
    const oatsRow = ingredients.getByRole('listitem').filter({hasText: 'Rolled oats'});
    const berriesRow = ingredients.getByRole('listitem').filter({hasText: 'Blueberries'});
    const nutrition = page.getByRole('region', {name: 'Recipe nutrition', exact: true});
    await name.fill(' ');
    await save.click();
    await expect(name).toBeFocused();
    await name.fill('Blueberry breakfast oats');
    await servings.fill('1.5');
    await save.click();
    await expect(page.getByText('Enter a whole number greater than zero.', {exact: true})).toBeVisible();
    await servings.fill('2');
    await page.getByText('Preparation and portion details', {exact: true}).click();
    await page.getByLabel('Finished weight · g (optional)', {exact: true}).fill('350');
    await page.getByText('Preparation and portion details', {exact: true}).click();
    await page.getByRole('button', {name: 'Add ingredients', exact: true}).click();
    await page.getByLabel('Search foods', {exact: true}).fill('Rolled oats');
    await page.getByRole('button', {name: 'Select Rolled oats', exact: true}).click();
    await page.getByLabel('Search foods', {exact: true}).fill('Blueberries');
    await page.getByRole('button', {name: 'Select Blueberries', exact: true}).click();
    await page.getByRole('button', {name: 'Add 2 ingredients', exact: true}).click();
    await expect(page.getByRole('dialog', {includeHidden: true})).toHaveCount(0);
    await oatsRow.getByLabel('Quantity', {exact: true}).fill('2');
    await berriesRow.getByLabel('Quantity', {exact: true}).fill('0');
    await save.click();
    await expect(page.getByText('Enter a positive quantity.', {exact: true})).toBeVisible();
    await berriesRow.getByLabel('Quantity', {exact: true}).fill('100');
    await page.getByRole('button', {name: 'Remove Blueberries', exact: true}).click();
    await expect(ingredients.getByRole('listitem')).toHaveCount(1);
    await page.getByRole('button', {name: 'Undo', exact: true}).click();
    await expect(berriesRow.getByLabel('Quantity', {exact: true})).toHaveValue('100');
    await page.getByText('Preparation and portion details', {exact: true}).click();
    await page.getByLabel('Short description', {exact: true}).fill('A simple breakfast for two.');
    await page
      .getByLabel('Preparation instructions', {exact: true})
      .fill('Cook oats with water. Divide into bowls and top with blueberries.');
    await page.getByRole('link', {name: 'Back to recipes', exact: true}).click();
    await page.getByRole('button', {name: 'Keep editing', exact: true}).click();
    await expect(page.getByRole('dialog', {includeHidden: true})).toHaveCount(0);
    let creates = 0;
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().endsWith('/v1/coach/nutrition-recipes')) {
        creates++;
      }
    });
    await page.route('**/v1/coach/nutrition-recipes', async (route) => {
      if (route.request().method() !== 'POST') {
        return route.continue();
      }
      const response = await route.fetch();
      expect(response.status()).toBe(201);
      return route.abort('connectionfailed');
    });
    await save.click();
    await expect(page.getByRole('button', {name: 'Check saved recipes', exact: true})).toBeVisible();
    await expect(save).toBeDisabled();
    await page.unroute('**/v1/coach/nutrition-recipes');
    await page.getByRole('button', {name: 'Check saved recipes', exact: true}).click();
    await page.getByRole('button', {name: 'Open saved recipe', exact: true}).click();
    await expect(page).toHaveURL(/nutrition-recipes\/[0-9a-f-]+$/);
    await expect(oatsRow.getByLabel('Quantity', {exact: true})).toHaveValue('2');
    await expect(nutrition).toContainText('370 kcal');
    await expect(nutrition).toContainText('Unknown');
    expect(creates).toBe(1);
    const id = page.url().split('/').at(-1);
    const endpoint = `/v1/coach/nutrition-recipes/${id}`;
    let recipe = (await send('get', endpoint, undefined, token)).data;
    expect(recipe.recipe_ingredients[0].portion).toMatchObject({kind: 'serving', amount: 2, unit: 'bowl'});
    expect(recipe.instructions).toContain('Divide into bowls');
    recipe = (
      await send(
        'patch',
        endpoint,
        {expected_revision: recipe.revision, allergens: ['wheat'], dietary_tags: ['vegan']},
        token,
      )
    ).data;
    await page.reload();
    await oatsRow.getByRole('button', {name: /Unit · Rolled oats$/}).click();
    await page.getByRole('option', {name: 'Grams', exact: true}).click();
    await oatsRow.getByLabel('Quantity', {exact: true}).fill('100');
    await expect(nutrition).not.toContainText('370 kcal');
    await page.route(`**${endpoint}`, (route) =>
      route.request().method() === 'PATCH' ? route.fulfill({status: 503, json: {}}) : route.continue(),
    );
    await save.click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(oatsRow.getByLabel('Quantity', {exact: true})).toHaveValue('100');
    await page.unroute(`**${endpoint}`);
    await save.click();
    await expect(page.getByText('Recipe saved.', {exact: true})).toBeVisible();
    await expect(nutrition).toContainText('450 kcal');
    recipe = (await send('get', endpoint, undefined, token)).data;
    expect(recipe.allergens).toEqual(['wheat']);
    expect(recipe.dietary_tags).toEqual(['vegan']);
    await servings.fill('3');
    await send('patch', endpoint, {expected_revision: recipe.revision, name: 'Changed elsewhere'}, token);
    await save.click();
    await expect(page.getByRole('alert')).toContainText('This recipe changed elsewhere.');
    await expect(servings).toHaveValue('3');
    await expect(save).toBeDisabled();
    await page.getByRole('button', {name: 'Review saved version', exact: true}).click();
    await page.getByRole('button', {name: 'Load saved recipe', exact: true}).click();
    await expect(page.getByRole('dialog', {includeHidden: true})).toHaveCount(0);
    await expect(name).toHaveValue('Changed elsewhere');
    await expect(servings).toHaveValue('2');
    await name.fill('Blueberry breakfast oats');
    await save.click();
    await expect(page.getByText('Recipe saved.', {exact: true})).toBeVisible();
    await expect(name).toBeEnabled();
    await page.evaluate(() => {
      document.activeElement?.blur();
      window.scrollTo(0, 0);
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({path: `tests/recipes/artifacts/editor-${width}.png`, fullPage: true});
    await page.route(`**${endpoint}`, (route) => route.fulfill({status: 503, json: {}}));
    await page.reload();
    await expect(page.getByRole('alert')).toBeVisible();
    await page.unroute(`**${endpoint}`);
    await page.getByRole('button', {name: 'Try again', exact: true}).click();
    await expect(name).toHaveValue('Blueberry breakfast oats');
    // The food mutation must invalidate recipes already loaded in this session.
    await page.goto(`/nutrition-foods/${oats.id}`);
    await page.getByLabel('Calories · kcal', {exact: true}).fill('500');
    await page.getByRole('button', {name: 'Save food', exact: true}).click();
    await expect(page.getByText('Food saved.', {exact: true})).toBeVisible();
    await page.getByRole('link', {name: 'Nutrition', exact: true}).click();
    await page.getByRole('link', {name: 'Recipe library', exact: true}).click();
    await page.getByRole('link', {name: /Blueberry breakfast oats/}).click();
    await expect(nutrition).toContainText('550 kcal');
    for (let index = 0; index < 43; index++) {
      await send(
        'post',
        '/v1/coach/nutrition-recipes',
        {name: `Recipe ${String(index).padStart(2, '0')}`, servings_count: 2},
        token,
      );
    }
    await page.getByRole('link', {name: 'Back to recipes', exact: true}).click();
    const rows = page.getByRole('list', {name: 'recipes', exact: true}).locator(':scope > li');
    await page.getByRole('button', {name: 'Refresh recipes', exact: true}).click();
    await expect(page.getByText('44 recipes', {exact: true})).toBeVisible();
    await expect(rows).toHaveCount(20);
    await page.route('**/v1/coach/nutrition-recipes?*', (route) =>
      new URL(route.request().url()).searchParams.get('cursor') !== 'start'
        ? route.fulfill({status: 503, json: {}})
        : route.continue(),
    );
    await page.getByRole('button', {name: 'Load more', exact: true}).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', {name: 'Retry loading more', exact: true})).toBeVisible();
    await expect(rows).toHaveCount(20);
    await page.unroute('**/v1/coach/nutrition-recipes?*');
    await page.getByRole('button', {name: 'Retry loading more', exact: true}).click();
    await expect(rows).toHaveCount(40);
    const row = rows.nth(30).getByRole('link');
    await row.scrollIntoViewIfNeeded();
    const scroll = await page.evaluate(() => scrollY);
    await row.click();
    await expect(name).toBeVisible();
    await page.getByRole('link', {name: 'Back to recipes', exact: true}).click();
    await expect(rows).toHaveCount(40);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(scroll - 150);
    await page.getByLabel('Search recipes', {exact: true}).fill('Blueberry breakfast');
    await expect(rows).toHaveCount(1);
    await rows.getByRole('link').click();
    await page.getByRole('link', {name: 'Back to recipes', exact: true}).click();
    await expect(page.getByLabel('Search recipes', {exact: true})).toHaveValue('Blueberry breakfast');
    await page.reload();
    await expect(rows).toHaveCount(1);
    await page.getByLabel('Search recipes', {exact: true}).fill('not-a-recipe');
    await expect(page.getByText('No matching recipes', {exact: true})).toBeVisible();
    await page.getByLabel('Search recipes', {exact: true}).fill('Blueberry breakfast');
    await expect(rows).toHaveCount(1);
    await page.screenshot({path: `tests/recipes/artifacts/library-${width}.png`, fullPage: true});
    await page.getByRole('link', {name: 'Back to nutrition plans', exact: true}).click();
    await page.getByRole('link', {name: 'Create nutrition plan', exact: true}).click();
    await page.getByLabel('Plan name', {exact: true}).fill('Breakfast plan');
    await page.getByRole('button', {name: 'Add meal', exact: true}).click();
    await page.getByRole('button', {name: 'Add foods or recipes', exact: true}).click();
    await page.getByRole('button', {name: 'Recipes', exact: true}).click();
    await page.getByLabel('Search recipes', {exact: true}).fill('Blueberry breakfast');
    await page.getByRole('button', {name: 'Select Blueberry breakfast oats', exact: true}).click();
    await page.getByRole('button', {name: 'Add 1 item', exact: true}).click();
    await page.getByRole('button', {name: 'Preview meals', exact: true}).click();
    await expect(page.getByRole('dialog', {name: 'Meal preview', exact: true})).toContainText('275 kcal');
    await page.getByRole('button', {name: 'Back to editing', exact: true}).click();
    await page.getByRole('button', {name: 'Save nutrition plan', exact: true}).click();
    await expect(page).toHaveURL(/nutrition-plans\/[0-9a-f-]+$/);
    if (width === 375) {
      await page.goto(`/nutrition-recipes/${id}`);
      await servings.fill('4');
      const held = Promise.withResolvers();
      const release = Promise.withResolvers();
      await page.route(`**${endpoint}`, async (route) => {
        if (route.request().method() !== 'PATCH') {
          return route.continue();
        }
        const response = await route.fetch();
        expect(response.status()).toBe(200);
        held.resolve();
        await release.promise;
        return route.fulfill({response});
      });
      await save.click();
      await held.promise;
      await expect(servings).toBeDisabled();
      const other = await account(`other-${unique}`);
      await page.evaluate(async (tokens) => {
        const {clearSession, saveSession} = await import('/src/api/session.ts');
        clearSession();
        saveSession(tokens);
      }, other);
      release.resolve();
      await page.getByRole('link', {name: 'Clients', exact: true}).click();
      await expect(page.getByText('Invite your first client', {exact: true})).toBeVisible();
      await page.waitForLoadState('networkidle');
      expect(
        await page.evaluate(async (id) => {
          const {queryClient} = await import('/src/api/query-client.ts');
          return queryClient
            .getQueryCache()
            .getAll()
            .some((query) => JSON.stringify(query.state.data ?? '').includes(id));
        }, id),
      ).toBe(false);
    }
    expect(errors).toEqual([]);
    await context.close();
    console.log(
      `Recipe creation, ingredients, recovery, paging, meal reuse and session isolation passed at ${width}px.`,
    );
  }
} finally {
  await browser.close();
  await api.dispose();
}
