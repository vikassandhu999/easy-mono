import {mkdir} from 'node:fs/promises';
import {chromium, expect, request} from '@playwright/test';
import {chooseOption, selectTrigger} from '../select-helpers.mjs';

const baseURL = process.env.COACH_APP_URL || 'http://localhost:22022';
const api = await request.newContext({baseURL: process.env.COACH_API_URL || 'http://localhost:44000'});
const browser = await chromium.launch();
await mkdir('tests/nutrition-library/artifacts', {recursive: true});
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${path}: ${response.status()} ${response.ok() ? '' : await response.text()}`).toBe(true);
  return response.status() === 204 ? null : response.json();
}
async function account(unique) {
  const email = `nutrition-management-${unique}@example.test`;
  await send('post', '/v1/auth/signup', {email, first_name: 'Taylor'});
  const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
  await send('post', '/v1/businesses', {name: 'Everyday Coaching', handle: `nm-${unique}`}, guest.access_token);
  return send('post', '/v1/auth/token', {
    grant_type: 'refresh_token',
    refresh_token: guest.refresh_token,
    role: 'coach',
  });
}
async function planUsing(kind, item, name, token) {
  const plan = (await send('post', '/v1/coach/nutrition-plans', {name}, token)).data;
  const mealId = crypto.randomUUID();
  const dayId = crypto.randomUUID();
  return (
    await send(
      'put',
      `/v1/coach/nutrition-plans/${plan.id}/menu`,
      {
        expected_revision: plan.revision,
        menu: {
          meals: [
            {
              id: mealId,
              name: 'Breakfast',
              meal_items: [
                {
                  id: crypto.randomUUID(),
                  kind,
                  [`${kind}_id`]: item.id,
                  portion: kind === 'food' ? {kind: 'gram', grams: 100} : item.default_portion,
                },
              ],
            },
          ],
          day_patterns: [{id: dayId, name: 'Everyday', slots: [{meal_slot: 'breakfast', meal_ids: [mealId]}]}],
          schedule: Object.fromEntries(
            ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => [day, dayId]),
          ),
        },
      },
      token,
    )
  ).data;
}
try {
  for (const width of [375, 1280]) {
    const unique = `${Date.now()}-${width}`;
    const tokens = await account(unique);
    const token = tokens.access_token;
    const food = (
      await send(
        'post',
        '/v1/coach/nutrition-foods',
        {
          name: 'Breakfast oats',
          calories_per_100g: 380,
          notes: 'Original food notes',
          dietary_tags: ['vegan'],
          serving_sizes: [{label: 'bowl', amount: 1, unit: 'bowl', weight_g: 40, is_default: true}],
        },
        token,
      )
    ).data;
    const recipe = (
      await send(
        'post',
        '/v1/coach/nutrition-recipes',
        {
          name: 'Overnight oats',
          servings_count: 2,
          instructions: 'Chill overnight.',
          dietary_tags: ['vegan'],
          recipe_ingredients: [{food_id: food.id, portion: {kind: 'serving', amount: 2, unit: 'bowl', label: 'bowl'}}],
        },
        token,
      )
    ).data;
    // Food uses span more than two actual API pages; oldest match starts beyond page one.
    for (let index = 0; index < 43; index++) {
      await send(
        'post',
        '/v1/coach/nutrition-recipes',
        {
          name: `Breakfast recipe ${String(index).padStart(2, '0')}`,
          servings_count: 1,
          recipe_ingredients: [{food_id: food.id, portion: {kind: 'gram', grams: 50}}],
        },
        token,
      );
    }
    await planUsing('food', food, 'Oats meal plan', token);
    const recipePlan = await planUsing('recipe', recipe, 'Overnight meal plan', token);
    const context = await browser.newContext({baseURL, viewport: {width, height: 900}});
    context.setDefaultTimeout(15000);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/login');
    await page.evaluate(async (value) => {
      const {saveSession} = await import('/src/api/session.ts');
      saveSession(value);
    }, tokens);
    await page.goto('/nutrition-foods?search=Breakfast');
    await page.getByRole('link', {name: /Breakfast oats/}).click();
    const foodName = page.getByLabel('Food name', {exact: true});
    await foodName.fill('Unsaved food name');
    await page.getByRole('button', {name: 'Manage food', exact: true}).click();
    await page.getByRole('button', {name: 'Keep editing', exact: true}).click();
    await expect(foodName).toHaveValue('Unsaved food name');
    await page.getByRole('button', {name: 'Manage food', exact: true}).click();
    await page.getByRole('button', {name: 'Discard changes', exact: true}).click();
    const uses = page.getByRole('list', {name: 'uses', exact: true}).locator(':scope > li');
    const dialog = page.getByRole('dialog');
    const category = selectTrigger(page, 'Show uses in');
    await expect(category).toContainText('Recipes (44)');
    await expect(page.getByText('44 uses', {exact: true})).toBeVisible();
    await expect(uses).toHaveCount(20);
    const usageEndpoint = `/v1/coach/nutrition-foods/${food.id}/usage`;
    await page.route(`**${usageEndpoint}?*`, (route) =>
      new URL(route.request().url()).searchParams.get('cursor') !== 'start'
        ? route.fulfill({status: 503, json: {}})
        : route.continue(),
    );
    await page.getByRole('button', {name: 'Load more', exact: true}).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', {name: 'Retry loading more', exact: true})).toBeVisible();
    await expect(uses).toHaveCount(20);
    await page.unroute(`**${usageEndpoint}?*`);
    await page.getByRole('button', {name: 'Retry loading more', exact: true}).click();
    await expect(uses).toHaveCount(40);
    await page.getByRole('button', {name: 'Load more', exact: true}).scrollIntoViewIfNeeded();
    await expect(uses).toHaveCount(44);
    expect(new Set(await uses.getByRole('link').evaluateAll((links) => links.map((link) => link.href))).size).toBe(44);
    await page.getByLabel('Search uses', {exact: true}).fill('Overnight');
    await expect(uses).toHaveCount(1);
    await expect(page.getByText('1 use', {exact: true})).toBeVisible();
    await uses.getByRole('link').click();
    await expect(page.getByLabel('Recipe name', {exact: true})).toHaveValue(recipe.name);
    await page.getByRole('link', {name: 'Back to food usage', exact: true}).click();
    await expect(page.getByLabel('Search uses', {exact: true})).toHaveValue('Overnight');
    await expect(uses).toHaveCount(1);
    await page.route(`**${usageEndpoint}?*`, (route) => route.fulfill({status: 503, json: {}}));
    await page.getByRole('button', {name: 'Refresh uses', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Retry refresh', exact: true})).toBeVisible();
    await expect(uses).toHaveCount(1);
    await expect(page.getByRole('button', {name: 'Copy food', exact: true})).toBeDisabled();
    await page.unroute(`**${usageEndpoint}?*`);
    await page.getByRole('button', {name: 'Retry refresh', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Copy food', exact: true})).toBeEnabled();
    await chooseOption(category, 'Plan templates (1)');
    await expect(uses.getByRole('link')).toContainText('Oats meal plan');
    await uses.getByRole('link').click();
    await expect(page.getByLabel('Plan name', {exact: true})).toHaveValue('Oats meal plan');
    await page.getByRole('link', {name: 'Back to food usage', exact: true}).click();
    await expect(category).toContainText('Plan templates (1)');
    await expect(page.getByRole('button', {name: 'Delete food', exact: true})).toBeDisabled();
    await page.screenshot({path: `tests/nutrition-library/artifacts/food-usage-${width}.png`, fullPage: true});
    await page.getByRole('button', {name: 'Copy food', exact: true}).click();
    await dialog.getByRole('button', {name: 'Create copy', exact: true}).click();
    await expect(foodName).toHaveValue(food.name);
    const foodCopyId = page.url().split('/').at(-1);
    expect(foodCopyId).not.toBe(food.id);
    let foodCopy = (await send('get', `/v1/coach/nutrition-foods/${foodCopyId}`, undefined, token)).data;
    expect(foodCopy.serving_sizes).toEqual(food.serving_sizes);
    expect(foodCopy.dietary_tags).toEqual(food.dietary_tags);
    await foodName.fill('Oats for a smaller bowl');
    await page.getByRole('button', {name: 'Save food', exact: true}).click();
    await expect(page.getByText('Food saved.', {exact: true})).toBeVisible();
    expect((await send('get', `/v1/coach/nutrition-foods/${food.id}`, undefined, token)).data.name).toBe(food.name);
    await page.getByRole('button', {name: 'Manage food', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Delete food', exact: true})).toBeEnabled();
    // A reference added after the usage read must still block the DELETE.
    const lateRecipe = (
      await send(
        'post',
        '/v1/coach/nutrition-recipes',
        {
          name: 'Late use',
          servings_count: 1,
          recipe_ingredients: [{food_id: foodCopyId, portion: {kind: 'gram', grams: 100}}],
        },
        token,
      )
    ).data;
    await page.getByRole('button', {name: 'Delete food', exact: true}).click();
    await dialog.getByRole('button', {name: 'Delete food', exact: true}).click();
    await expect(dialog.getByRole('alert')).toContainText('now in use');
    await dialog.getByRole('button', {name: 'Review usage', exact: true}).click();
    await expect(uses.getByRole('link')).toContainText('Late use');
    await send('delete', `/v1/coach/nutrition-recipes/${lateRecipe.id}`, undefined, token);
    await page.getByRole('button', {name: 'Refresh uses', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Delete food', exact: true})).toBeEnabled();
    await page.getByRole('button', {name: 'Delete food', exact: true}).click();
    await dialog.getByRole('button', {name: 'Cancel', exact: true}).click();
    foodCopy = (await send('get', `/v1/coach/nutrition-foods/${foodCopyId}`, undefined, token)).data;
    expect(foodCopy.id).toBe(foodCopyId);
    await page.getByRole('button', {name: 'Delete food', exact: true}).click();
    await dialog.getByRole('button', {name: 'Delete food', exact: true}).click();
    await expect(page.getByText('Oats for a smaller bowl deleted.', {exact: true})).toBeVisible();
    await expect(page).toHaveURL(`${baseURL}/nutrition-foods?search=Breakfast`);
    // Recipe usage links and copy retain ingredients and stay independent.
    await page.goto(`/nutrition-recipes/${recipe.id}/manage`);
    await expect(category).toContainText('Plan templates (1)');
    await uses.getByRole('link').click();
    await expect(page).toHaveURL(`${baseURL}/nutrition-plans/${recipePlan.id}`);
    await page.getByRole('link', {name: 'Back to recipe usage', exact: true}).click();
    await expect(category).toContainText('Plan templates (1)');
    await expect(page.getByRole('heading', {level: 1})).toHaveText(recipe.name);
    await page.screenshot({path: `tests/nutrition-library/artifacts/recipe-usage-${width}.png`, fullPage: true});
    await page.getByRole('button', {name: 'Copy recipe', exact: true}).click();
    await dialog.getByRole('button', {name: 'Create copy', exact: true}).click();
    await expect(page.getByLabel('Recipe name', {exact: true})).toHaveValue(/Overnight oats/);
    const recipeCopyId = page.url().split('/').at(-1);
    const recipeCopy = (await send('get', `/v1/coach/nutrition-recipes/${recipeCopyId}`, undefined, token)).data;
    expect(recipeCopyId).not.toBe(recipe.id);
    expect(recipeCopy.recipe_ingredients[0].food_id).toBe(food.id);
    expect(recipeCopy.recipe_ingredients[0].portion).toEqual(recipe.recipe_ingredients[0].portion);
    expect(recipeCopy.dietary_tags).toEqual(recipe.dietary_tags);
    await page.getByLabel('Recipe name', {exact: true}).fill('Overnight oats for one');
    await page.getByRole('button', {name: 'Save recipe', exact: true}).click();
    await expect(page.getByText('Recipe saved.', {exact: true})).toBeVisible();
    expect((await send('get', `/v1/coach/nutrition-recipes/${recipe.id}`, undefined, token)).data.name).toBe(
      recipe.name,
    );
    // Recipe copies add food uses; return through the app to exercise retained caches.
    await page.getByRole('link', {name: 'Nutrition', exact: true}).click();
    await page.getByRole('link', {name: 'Food library', exact: true}).click();
    await page.getByLabel('Search foods', {exact: true}).fill('Breakfast oats');
    await page.getByRole('link', {name: /Breakfast oats/}).click();
    await page.getByRole('button', {name: 'Manage food', exact: true}).click();
    await expect(category).toContainText('Recipes (45)');
    await page.getByRole('link', {name: 'Nutrition', exact: true}).click();
    await page.getByRole('link', {name: 'Recipe library', exact: true}).click();
    await page.getByLabel('Search recipes', {exact: true}).fill('Overnight oats for one');
    await page.getByRole('link', {name: /Overnight oats for one/}).click();
    // Interrupted copy is reviewed explicitly; it never automatically retries POST.
    await page.getByRole('button', {name: 'Manage recipe', exact: true}).click();
    await page.getByRole('button', {name: 'Copy recipe', exact: true}).click();
    let copies = 0;
    let recovered;
    await page.route('**/v1/coach/nutrition-recipes/*/copy', async (route) => {
      copies++;
      const response = await route.fetch();
      expect(response.status()).toBe(201);
      recovered = (await response.json()).data;
      return route.abort('connectionfailed');
    });
    await dialog.getByRole('button', {name: 'Create copy', exact: true}).click();
    await expect(dialog.getByRole('alert')).toContainText('copy could not be confirmed');
    await expect(dialog.getByRole('button', {name: 'Create copy', exact: true})).toHaveCount(0);
    await page.unroute('**/v1/coach/nutrition-recipes/*/copy');
    await dialog
      .getByRole('listitem')
      .filter({has: page.getByText(recovered.name, {exact: true})})
      .getByRole('button', {name: 'Open saved recipe', exact: true})
      .click();
    await expect(page.getByLabel('Recipe name', {exact: true})).toHaveValue(recovered.name);
    expect(copies).toBe(1);
    await page.getByRole('button', {name: 'Manage recipe', exact: true}).click();
    await page.getByRole('button', {name: 'Delete recipe', exact: true}).click();
    await page.route(`**/v1/coach/nutrition-recipes/${recovered.id}`, async (route) => {
      if (route.request().method() !== 'DELETE') {
        return route.continue();
      }
      expect((await route.fetch()).status()).toBe(204);
      return route.abort('connectionfailed');
    });
    await dialog.getByRole('button', {name: 'Delete recipe', exact: true}).click();
    await expect(page.getByText(`${recovered.name} deleted.`, {exact: true})).toBeVisible();
    await page.unroute(`**/v1/coach/nutrition-recipes/${recovered.id}`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // Shared-food controls are read-only; backend tests cover the system-food write boundary.
    const sharedEndpoint = `/v1/coach/nutrition-foods/${food.id}`;
    await page.route(`**${sharedEndpoint}`, (route) => route.fulfill({json: {data: {...food, source: 'system'}}}));
    await page.route(`**${sharedEndpoint}/usage?*`, async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      return route.fulfill({
        json: {...body, item: {...body.item, read_only: true}, delete_blocked_reason: 'shared_food'},
      });
    });
    await page.goto(`/nutrition-foods/${food.id}`);
    await expect(foodName).toBeDisabled();
    await page.getByRole('button', {name: 'Manage food', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Copy food', exact: true})).toBeEnabled();
    await expect(page.getByRole('button', {name: 'Delete food', exact: true})).toBeDisabled();
    await expect(page.getByText('Shared foods belong to the common library.', {exact: false})).toBeVisible();
    await page.unroute(`**${sharedEndpoint}`);
    await page.unroute(`**${sharedEndpoint}/usage?*`);
    // Pending writes cannot dismiss or navigate into another session's data.
    await page.goto(`/nutrition-recipes/${recipe.id}/manage`);
    await page.getByRole('button', {name: 'Copy recipe', exact: true}).click();
    const held = Promise.withResolvers();
    const release = Promise.withResolvers();
    await page.route('**/v1/coach/nutrition-recipes/*/copy', async (route) => {
      const response = await route.fetch();
      expect(response.status()).toBe(201);
      held.resolve();
      await release.promise;
      return route.fulfill({response});
    });
    await dialog.getByRole('button', {name: 'Create copy', exact: true}).click();
    await held.promise;
    await expect(dialog.getByRole('button', {name: 'Cancel', exact: true})).toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    const other = await account(`other-${unique}`);
    await page.evaluate(async (value) => {
      const {clearSession, saveSession} = await import('/src/api/session.ts');
      clearSession();
      saveSession(value);
    }, other);
    release.resolve();
    await page.goto('/');
    await expect(page.getByText('Invite your first client', {exact: true})).toBeVisible();
    await page.waitForLoadState('networkidle');
    expect(
      await page.evaluate(async (id) => {
        const {queryClient} = await import('/src/api/query-client.ts');
        return queryClient
          .getQueryCache()
          .getAll()
          .some((query) => JSON.stringify(query.state.data ?? '').includes(id));
      }, recipe.id),
    ).toBe(false);
    expect(errors).toEqual([]);
    await context.close();
    console.log(`Nutrition library usage, paging, recovery, copy and deletion passed at ${width}px.`);
  }
} finally {
  await browser.close();
  await api.dispose();
}
