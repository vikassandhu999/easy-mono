import {mkdir} from 'node:fs/promises';
import {expect as baseExpect, chromium, request} from '@playwright/test';
import {chooseOption, selectTrigger} from '../select-helpers.mjs';

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
    const email = `menu-editing-${unique}@example.test`;
    await send('post', '/v1/auth/signup', {email, first_name: 'Taylor'});
    const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
    await send(
      'post',
      '/v1/businesses',
      {name: 'Everyday Coaching', handle: `menu-editing-${unique}`},
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
    const changeFood = page.getByRole('button', {name: 'Change portion for Rolled oats', exact: true});
    const dialog = page.getByRole('dialog', {name: 'Change portion', exact: true});
    const save = page.getByRole('button', {name: 'Save nutrition plan', exact: true});
    await page.route(`**/v1/coach/nutrition-foods/${food.id}`, (route) => route.fulfill({status: 503, json: {}}));
    await changeFood.click();
    await expect(dialog.getByRole('alert')).toContainText('Could not load available portions');
    await page.unroute(`**/v1/coach/nutrition-foods/${food.id}`);
    await dialog.getByRole('button', {name: 'Try again', exact: true}).click();
    await chooseOption(selectTrigger(dialog, 'Portion type'), 'bowl');
    await expect(dialog.getByLabel('Quantity', {exact: true})).toHaveValue('1');
    await dialog.getByLabel('Quantity', {exact: true}).fill('2');
    await dialog.getByRole('button', {name: 'Cancel', exact: true}).click();
    await expect(changeFood).toBeFocused();
    await expect(save).toBeDisabled();
    await expect(page.getByLabel('Rolled oats portion', {exact: true})).toHaveValue('50');
    await changeFood.click();
    await chooseOption(selectTrigger(dialog, 'Portion type'), 'bowl');
    await dialog.getByLabel('Quantity', {exact: true}).fill('0');
    await dialog.getByRole('button', {name: 'Apply portion', exact: true}).click();
    await expect(dialog.getByText('Enter a quantity greater than zero.', {exact: true})).toBeVisible();
    await dialog.getByLabel('Quantity', {exact: true}).fill('2');
    await page.route(`**/v1/coach/nutrition-foods/${food.id}`, (route) => route.fulfill({status: 503, json: {}}));
    await page.evaluate(async (id) => {
      const {queryClient} = await import('/src/api/query-client.ts');
      const {foodKeys} = await import('/src/api/keys.ts');
      await queryClient.invalidateQueries({queryKey: foodKeys.detail(id)});
    }, food.id);
    await expect(dialog.getByRole('alert')).toContainText('Could not load available portions');
    await expect(dialog.getByLabel('Quantity', {exact: true})).toHaveValue('2');
    await page.unroute(`**/v1/coach/nutrition-foods/${food.id}`);
    await dialog.getByRole('button', {name: 'Try again', exact: true}).click();
    await expect(dialog.getByRole('alert')).toHaveCount(0);
    await expect(dialog.getByLabel('Quantity', {exact: true})).toHaveValue('2');
    await dialog.getByRole('button', {name: 'Apply portion', exact: true}).click();
    await expect(page.getByLabel('Rolled oats portion', {exact: true})).toHaveValue('2');
    await page.getByRole('button', {name: 'Change portion for Overnight oats', exact: true}).click();
    await chooseOption(selectTrigger(dialog, 'Portion type'), 'Grams');
    await dialog.getByRole('textbox', {name: 'Grams', exact: true}).fill('100');
    await page.screenshot({path: `tests/nutrition/artifacts/portion-editor-${width}.png`});
    await dialog.getByRole('button', {name: 'Apply portion', exact: true}).click();
    await page.getByRole('button', {name: 'Change portion for Quick oats', exact: true}).click();
    await selectTrigger(dialog, 'Portion type').click();
    await expect(page.getByRole('option', {name: 'Grams', exact: true})).toHaveCount(0);
    await page.keyboard.press('Escape');
    await dialog.getByRole('button', {name: 'Cancel', exact: true}).click();
    const fraction = page.getByLabel('Quick oats portion', {exact: true});
    await fraction.fill('');
    await fraction.pressSequentially('0.5');
    await expect(fraction).toHaveValue('0.5');
    await page.getByRole('button', {name: 'Remove Rolled oats', exact: true}).click();
    await page.getByLabel('Overnight oats portion', {exact: true}).fill('125');
    await page.getByRole('button', {name: 'Undo item removal', exact: true}).click();
    await expect(page.getByLabel('Rolled oats portion', {exact: true})).toHaveValue('2');
    await expect(page.getByLabel('Overnight oats portion', {exact: true})).toHaveValue('125');
    await save.click();
    await expect(page.getByText('Nutrition plan saved.', {exact: true})).toBeVisible();
    let saved = (await send('get', endpoint, undefined, token)).data;
    expect(saved.menu.meals.find((meal) => meal.id === main).meal_items).toMatchObject([
      {
        food_id: food.id,
        portion: {kind: 'serving', amount: 2, unit: 'bowl', label: 'bowl'},
        nutrients: {calories: 304},
      },
      {recipe_id: recipe.id, portion: {kind: 'gram', grams: 125}},
      {recipe_id: unweighed.id, portion: {kind: 'serving', amount: 0.5}},
    ]);
    await page.reload();
    await changeFood.click();
    await expect(selectTrigger(dialog, 'Portion type')).toContainText('bowl');
    await expect(dialog.getByLabel('Quantity', {exact: true})).toHaveValue('2');
    await dialog.getByRole('button', {name: 'Cancel', exact: true}).click();
    const menus = page.getByRole('group', {name: 'Day menus', exact: true});
    await menus.getByRole('button', {name: 'Weekend', exact: true}).click();
    const removal = page.getByRole('dialog', {name: 'Remove day menu?', exact: true});
    await page.getByRole('button', {name: 'Remove day menu', exact: true}).click();
    await expect(removal).toContainText('saturday, sunday');
    await removal.getByRole('button', {name: 'Keep menu', exact: true}).click();
    await expect(save).toBeDisabled();
    await page.getByRole('button', {name: 'Remove day menu', exact: true}).click();
    await chooseOption(selectTrigger(removal, 'Replacement menu'), 'Everyday');
    await page.screenshot({path: `tests/nutrition/artifacts/remove-menu-${width}.png`});
    await removal.getByRole('button', {name: 'Remove menu', exact: true}).click();
    await expect(menus.getByRole('button', {name: 'Weekend', exact: true})).toHaveCount(0);
    await page.getByText('Assign menus to weekdays', {exact: true}).click();
    await expect(selectTrigger(page, 'saturday menu')).toContainText('Everyday');
    await chooseOption(selectTrigger(page, 'sunday menu'), 'Travel');
    await page.getByLabel('Meal name', {exact: true}).fill('Morning oats');
    await page.getByRole('button', {name: 'Undo menu removal', exact: true}).click();
    await expect(selectTrigger(page, 'saturday menu')).toContainText('Weekend');
    await expect(selectTrigger(page, 'sunday menu')).toContainText('Travel');
    await expect(page.getByLabel('Meal name', {exact: true}).first()).toHaveValue('Morning oats');
    await expect(page.getByRole('region', {name: 'Weekend snack meal', exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'Remove day menu', exact: true}).click();
    await chooseOption(selectTrigger(removal, 'Replacement menu'), 'Everyday');
    await removal.getByRole('button', {name: 'Remove menu', exact: true}).click();
    await page.route(`**${endpoint}/menu`, (route) => route.fulfill({status: 503, json: {}}));
    await save.click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(menus.getByRole('button', {name: 'Weekend', exact: true})).toHaveCount(0);
    expect((await send('get', endpoint, undefined, token)).data.menu.day_patterns).toHaveLength(3);
    await page.unroute(`**${endpoint}/menu`);
    await save.click();
    await expect(page.getByText('Nutrition plan saved.', {exact: true})).toBeVisible();
    saved = (await send('get', endpoint, undefined, token)).data;
    expect(saved.menu.day_patterns.map((day) => day.id)).toEqual([everyday, travel]);
    expect(saved.menu.meals.map((meal) => meal.id)).toEqual([main]);
    expect(saved.menu.meals[0].name).toBe('Morning oats');
    expect(saved.menu.schedule).toMatchObject({saturday: everyday, sunday: travel});
    await page.reload();
    await menus.getByRole('button', {name: 'Travel', exact: true}).click();
    await page.getByRole('button', {name: 'Remove day menu', exact: true}).click();
    await removal.getByRole('button', {name: 'Remove menu', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Remove day menu', exact: true})).toHaveCount(0);
    await save.click();
    await expect(page.getByText('Nutrition plan saved.', {exact: true})).toBeVisible();
    saved = (await send('get', endpoint, undefined, token)).data;
    expect(saved.menu.day_patterns).toHaveLength(1);
    expect(Object.values(saved.menu.schedule)).toEqual(Array.from({length: 7}, () => everyday));
    expect(saved.menu.meals).toHaveLength(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
    await context.close();
    console.log(
      `Food/recipe portions, cancel/retry, quantities, server nutrition, item Undo, menu removal/replacement, selective Undo and persistence passed at ${width}px.`,
    );
  }
} finally {
  await browser.close();
  await api.dispose();
}
