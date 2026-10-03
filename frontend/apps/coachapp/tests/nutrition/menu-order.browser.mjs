import {mkdir} from 'node:fs/promises';
import {expect as baseExpect, chromium, request} from '@playwright/test';

const expect = baseExpect.configure({timeout: 15000});
const api = await request.newContext({baseURL: process.env.COACH_API_URL || 'http://localhost:4000'});
const browser = await chromium.launch();
await mkdir('tests/nutrition/artifacts', {recursive: true});
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()} ${await response.text()}`).toBe(true);
  return response.json();
}
try {
  for (const width of [375, 1280]) {
    const unique = `${Date.now()}-${width}`;
    const email = `menu-order-${unique}@example.test`;
    await send('post', '/v1/auth/signup', {email, full_name: 'Taylor'});
    const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
    await send(
      'post',
      '/v1/businesses',
      {full_name: 'Taylor', name: 'Everyday Coaching', handle: `menu-${unique}`},
      guest.access_token,
    );
    const tokens = await send('post', '/v1/auth/token', {
      grant_type: 'refresh_token',
      refresh_token: guest.refresh_token,
      role: 'coach',
    });
    const token = tokens.access_token;
    const food = (
      await send(
        'post',
        '/v1/coach/nutrition-foods',
        {
          name: 'Rolled oats',
          calories_per_100g: 380,
          serving_sizes: [{label: 'bowl', amount: 1, unit: 'bowl', weight_g: 40, is_default: true}],
        },
        token,
      )
    ).data;
    const recipeBody = {
      name: 'Overnight oats',
      servings_count: 2,
      cooked_weight_g: 200,
      recipe_ingredients: [{food_id: food.id, portion: {kind: 'gram', grams: 100}}],
    };
    const recipe = (await send('post', '/v1/coach/nutrition-recipes', recipeBody, token)).data;
    const unweighed = (
      await send(
        'post',
        '/v1/coach/nutrition-recipes',
        {...recipeBody, name: 'Quick oats', cooked_weight_g: null},
        token,
      )
    ).data;
    const plan = (await send('post', '/v1/coach/nutrition-plans', {name: 'Everyday meals'}, token)).data;
    const endpoint = `/v1/coach/nutrition-plans/${plan.id}`;
    const main = crypto.randomUUID();
    const extra = crypto.randomUUID();
    const everyday = crypto.randomUUID();
    const weekend = crypto.randomUUID();
    const travel = crypto.randomUUID();
    const menu = {
      meals: [
        {
          id: main,
          name: 'Breakfast',
          notes: 'Prepare ahead.',
          meal_items: [
            {id: crypto.randomUUID(), kind: 'food', food_id: food.id, portion: {kind: 'gram', grams: 50}},
            {id: crypto.randomUUID(), kind: 'recipe', recipe_id: recipe.id, portion: recipe.default_portion},
            {id: crypto.randomUUID(), kind: 'recipe', recipe_id: unweighed.id, portion: unweighed.default_portion},
          ],
        },
        {
          id: extra,
          name: 'Weekend snack',
          notes: 'Enjoy slowly.',
          meal_items: [{id: crypto.randomUUID(), kind: 'food', food_id: food.id, portion: {kind: 'gram', grams: 25}}],
        },
      ],
      day_patterns: [
        {id: everyday, name: 'Everyday', slots: [{meal_slot: 'breakfast', meal_ids: [main]}]},
        {
          id: weekend,
          name: 'Weekend',
          slots: [
            {meal_slot: 'breakfast', meal_ids: [main]},
            {meal_slot: 'afternoon', meal_ids: [extra]},
          ],
        },
        {id: travel, name: 'Travel', slots: [{meal_slot: 'breakfast', meal_ids: [main]}]},
      ],
      schedule: {
        monday: everyday,
        tuesday: everyday,
        wednesday: everyday,
        thursday: everyday,
        friday: everyday,
        saturday: weekend,
        sunday: weekend,
      },
    };
    menu.day_patterns[0].slots[0].meal_ids.push(extra);
    menu.day_patterns[0].slots.push({meal_slot: 'dinner', meal_ids: [extra]});
    await send('put', `${endpoint}/menu`, {expected_revision: plan.revision, menu}, token);
    const context = await browser.newContext({
      baseURL: process.env.COACH_APP_URL || 'http://localhost:2022',
      viewport: {width, height: 900},
    });
    context.setDefaultTimeout(15000);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/login');
    await page.evaluate(async (tokens) => {
      const {saveSession} = await import('/src/api/session.ts');
      saveSession(tokens);
    }, tokens);
    await page.goto(`/nutrition-plans/${plan.id}`);
    const initial = (await send('get', endpoint, undefined, token)).data;
    const arrange = page.getByRole('button', {name: 'Arrange menus', exact: true});
    const dialog = page.getByRole('dialog', {name: 'Arrange menus', exact: true});
    const list = dialog.getByRole('list', {name: 'Current order', exact: true});
    const save = page.getByRole('button', {name: 'Save nutrition plan', exact: true});
    const labels = () =>
      list.getByRole('listitem').evaluateAll((items) => items.map((item) => item.getAttribute('aria-label')));
    await arrange.click();
    await expect(dialog.getByRole('button', {name: 'Apply order', exact: true})).toBeDisabled();
    await expect(dialog.getByRole('button', {name: 'Move Everyday up', exact: true})).toBeDisabled();
    await dialog.getByRole('button', {name: 'Move Weekend up', exact: true}).focus();
    await page.keyboard.press('Enter');
    await expect(list.getByRole('listitem', {name: 'Weekend', exact: true})).toBeFocused();
    expect(await labels()).toEqual(['Weekend', 'Everyday', 'Travel']);
    await dialog.getByRole('button', {name: 'Cancel', exact: true}).click();
    await expect(arrange).toBeFocused();
    await expect(save).toBeDisabled();
    await arrange.click();
    expect(await labels()).toEqual(['Everyday', 'Weekend', 'Travel']);
    await dialog.getByRole('button', {name: 'Move Weekend up', exact: true}).click();
    await dialog.getByRole('button', {name: 'Arrange Everyday', exact: true}).click();
    await expect(dialog.getByRole('heading', {name: 'Everyday', exact: true})).toBeFocused();
    expect(await labels()).toEqual(['breakfast', 'dinner']);
    await expect(dialog.getByRole('button', {name: /^Move /})).toHaveCount(0);
    await dialog.getByRole('button', {name: 'Arrange breakfast', exact: true}).click();
    expect(await labels()).toEqual(['Breakfast', 'Weekend snack']);
    await dialog.getByRole('button', {name: 'Move Weekend snack up', exact: true}).click();
    expect(await labels()).toEqual(['Weekend snack', 'Breakfast']);
    await dialog.getByRole('button', {name: 'Arrange Breakfast', exact: true}).click();
    expect(await labels()).toEqual(['Rolled oats', 'Overnight oats', 'Quick oats']);
    await dialog.getByRole('button', {name: 'Move Quick oats up', exact: true}).click();
    await dialog.getByRole('button', {name: 'Move Quick oats up', exact: true}).click();
    expect(await labels()).toEqual(['Quick oats', 'Rolled oats', 'Overnight oats']);
    await expect(list.getByRole('listitem', {name: 'Quick oats', exact: true})).toBeFocused();
    await expect(dialog.getByRole('button', {name: 'Move Quick oats up', exact: true})).toBeDisabled();
    await page.screenshot({path: `tests/nutrition/artifacts/arrange-items-${width}.png`});
    await dialog.getByRole('button', {name: 'Back', exact: true}).click();
    expect(await labels()).toEqual(['Weekend snack', 'Breakfast']);
    await dialog.getByRole('button', {name: 'Back', exact: true}).click();
    expect(await labels()).toEqual(['breakfast', 'dinner']);
    await dialog.getByRole('button', {name: 'Back', exact: true}).click();
    expect(await labels()).toEqual(['Weekend', 'Everyday', 'Travel']);
    await page.screenshot({path: `tests/nutrition/artifacts/arrange-menus-${width}.png`});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await dialog.getByRole('button', {name: 'Apply order', exact: true}).click();
    await expect(dialog).toHaveCount(0);
    const menus = page.getByRole('group', {name: 'Day menus', exact: true});
    await expect(menus.getByRole('button')).toHaveText(['Weekend', 'Everyday', 'Travel']);
    expect(
      await page
        .getByRole('region', {name: 'breakfast options', exact: true})
        .getByLabel('Meal name', {exact: true})
        .evaluateAll((inputs) => inputs.map((input) => input.value)),
    ).toEqual(['Weekend snack', 'Breakfast']);
    expect((await send('get', endpoint, undefined, token)).data.menu).toEqual(initial.menu);
    await page.getByRole('button', {name: 'Preview meals', exact: true}).click();
    const preview = page.getByRole('dialog', {name: 'Meal preview', exact: true});
    await preview.getByRole('button', {name: 'Everyday', exact: true}).click();
    await expect(preview.getByRole('heading', {level: 3})).toHaveText(['breakfast', 'dinner']);
    await expect(preview.getByRole('heading', {level: 4})).toHaveText(['Weekend snack', 'Breakfast', 'Weekend snack']);
    await expect(preview.getByRole('list').nth(1).getByRole('listitem').locator('span').nth(0)).toHaveText(
      'Quick oats',
    );
    await preview.getByRole('button', {name: 'Back to editing', exact: true}).click();
    await page.route(`**${endpoint}/menu`, (route) => route.fulfill({status: 503, json: {}}));
    await save.click();
    await expect(page.getByRole('alert')).toBeVisible();
    await arrange.click();
    expect(await labels()).toEqual(['Weekend', 'Everyday', 'Travel']);
    await dialog.getByRole('button', {name: 'Cancel', exact: true}).click();
    await page.unroute(`**${endpoint}/menu`);
    await save.click();
    await expect(page.getByText('Nutrition plan saved.', {exact: true})).toBeVisible();
    const saved = (await send('get', endpoint, undefined, token)).data;
    expect(saved.menu.day_patterns.map((day) => day.id)).toEqual([weekend, everyday, travel]);
    expect(saved.menu.day_patterns.find((day) => day.id === everyday).slots).toEqual([
      {meal_slot: 'breakfast', meal_ids: [extra, main]},
      {meal_slot: 'dinner', meal_ids: [extra]},
    ]);
    expect(saved.menu.day_patterns.find((day) => day.id === weekend)).toEqual(
      initial.menu.day_patterns.find((day) => day.id === weekend),
    );
    expect(saved.menu.schedule).toEqual(initial.menu.schedule);
    const originalMeal = initial.menu.meals.find((meal) => meal.id === main);
    const savedMeal = saved.menu.meals.find((meal) => meal.id === main);
    expect(savedMeal).toEqual({
      ...originalMeal,
      meal_items: [originalMeal.meal_items[2], originalMeal.meal_items[0], originalMeal.meal_items[1]],
    });
    await page.reload();
    await expect(menus.getByRole('button')).toHaveText(['Weekend', 'Everyday', 'Travel']);
    await arrange.click();
    await dialog.getByRole('button', {name: 'Arrange Everyday', exact: true}).click();
    expect(await labels()).toEqual(['breakfast', 'dinner']);
    await dialog.getByRole('button', {name: 'Arrange breakfast', exact: true}).click();
    expect(await labels()).toEqual(['Weekend snack', 'Breakfast']);
    await dialog.getByRole('button', {name: 'Arrange Breakfast', exact: true}).click();
    expect(await labels()).toEqual(['Quick oats', 'Rolled oats', 'Overnight oats']);
    await dialog.getByRole('button', {name: 'Cancel', exact: true}).click();
    expect(errors).toEqual([]);
    await context.close();
    console.log(
      `Day-menu, alternative and food order with fixed meal times, keyboard focus, cancellation, preview, failed-save recovery and persistence passed at ${width}px.`,
    );
  }
} finally {
  await browser.close();
  await api.dispose();
}
