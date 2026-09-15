import {mkdir} from 'node:fs/promises';
import {chromium, expect, request} from '@playwright/test';

const api = await request.newContext({baseURL: process.env.COACHAPP_API_URL || 'http://localhost:4000'});
const browser = await chromium.launch();
const appUrl = process.env.COACHAPP_URL || 'http://localhost:2022';
await mkdir('tests/nutrition/artifacts', {recursive: true});

async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()} ${response.ok() ? '' : await response.text()}`).toBe(
    true,
  );
  return response.status() === 204 ? null : response.json();
}

async function account(unique) {
  const email = `nutrition-history-${unique}@example.test`;
  await send('post', '/v1/auth/signup', {email, first_name: 'Taylor'});
  const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
  await send('post', '/v1/businesses', {name: 'Everyday Coaching', handle: `nh-${unique}`}, guest.access_token);
  return send('post', '/v1/auth/token', {
    grant_type: 'refresh_token',
    refresh_token: guest.refresh_token,
    role: 'coach',
  });
}

function shift(date, days) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function entry({ref = null, foodId = null, recipeId = null, portion, notes = null}) {
  return {id: crypto.randomUUID(), planned_item_ref: ref, food_id: foodId, recipe_id: recipeId, portion, notes};
}

try {
  for (const width of [375, 1280]) {
    const unique = `${Date.now()}-${width}`;
    const tokens = await account(unique);
    const token = tokens.access_token;
    const email = `nutrition-reader-${unique}@example.test`;
    const person = (
      await send('post', '/v1/coach/clients/invite', {first_name: 'Alex', last_name: 'Morgan', email}, token)
    ).data;
    const invitation_token = new URL(person.invite_url).pathname.split('/').at(-1);
    await send('post', '/v1/auth/accept-invite', {email, invitation_token});
    const clientTokens = await send('post', '/v1/auth/accept-invite/verify', {email, invitation_token, otp: '123456'});
    const clientToken = clientTokens.access_token;
    const endpoint = `/v1/coach/clients/${person.id}/nutrition-days`;
    const path = `/clients/${person.id}/nutrition-history`;
    const initialDay = (await send('get', endpoint, undefined, token)).data[0];
    const today = initialDay.date;
    const yesterday = shift(today, -1);
    const context = await browser.newContext({
      baseURL: appUrl,
      viewport: {width, height: 900},
      timezoneId: 'Pacific/Honolulu',
    });
    context.setDefaultTimeout(12000);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/login');
    await page.evaluate(async (tokens) => {
      const {saveSession} = await import('/src/api/session.ts');
      saveSession(tokens);
    }, tokens);
    await page.goto(`/clients/${person.id}`);
    await page.route(`**${endpoint}*`, (route) => route.fulfill({status: 503, json: {}}));
    await page.getByRole('link', {name: 'View nutrition history', exact: true}).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await page.unroute(`**${endpoint}*`);
    await page.getByRole('button', {name: 'Try again', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'No meal records', exact: true})).toBeVisible();
    await expect(page.getByLabel('Date', {exact: true})).toHaveValue(today);
    await expect(
      page.getByText(`Client timezone: ${initialDay.applied_timezone.replaceAll('_', ' ')}`, {exact: true}),
    ).toBeVisible();
    const totals = page.getByRole('table', {name: 'Logged nutrition and daily targets', exact: true});
    await expect(totals.getByRole('row', {name: 'Calories — Not set', exact: true})).toBeVisible();

    async function food(name, calories, more = {}) {
      return (
        await send(
          'post',
          '/v1/coach/nutrition-foods',
          {
            name,
            calories_per_100g: calories,
            protein_g_per_100g: 10,
            carbs_g_per_100g: 50,
            fat_g_per_100g: 5,
            fiber_g_per_100g: 3,
            ...more,
          },
          token,
        )
      ).data;
    }
    const oats = await food('Rolled oats', 300);
    const berries = await food('Mixed berries', 60);
    const yogurt = await food('Greek yogurt', 80);
    const water = await food('Sparkling water', 0, {
      protein_g_per_100g: 0,
      carbs_g_per_100g: 0,
      fat_g_per_100g: 0,
      fiber_g_per_100g: 0,
    });
    const unknown = (
      await send('post', '/v1/coach/nutrition-foods', {name: 'Homemade topping', calories_per_100g: 100}, token)
    ).data;
    const recipe = (
      await send(
        'post',
        '/v1/coach/nutrition-recipes',
        {
          name: 'Berry oat bowl',
          servings_count: 2,
          recipe_ingredients: [
            {food_id: oats.id, portion: {kind: 'gram', grams: 100}},
            {food_id: berries.id, portion: {kind: 'gram', grams: 100}},
          ],
        },
        token,
      )
    ).data;
    let template = (
      await send(
        'post',
        '/v1/coach/nutrition-plans',
        {
          name: 'Everyday meals',
          target_calories: 2000,
          target_protein_g: 100,
          target_carbs_g: 220,
          target_fat_g: 70,
        },
        token,
      )
    ).data;
    const longMealName = 'TestBreakfastOption'.repeat(8);
    const patternId = crypto.randomUUID();
    const breakfastId = crypto.randomUUID();
    const lunchId = crypto.randomUUID();
    const dinnerId = crypto.randomUUID();
    const menu = {
      meals: [
        {
          id: breakfastId,
          name: longMealName,
          meal_items: [
            {id: crypto.randomUUID(), kind: 'food', food_id: oats.id, portion: {kind: 'gram', grams: 50}},
            {id: crypto.randomUUID(), kind: 'food', food_id: berries.id, portion: {kind: 'gram', grams: 100}},
          ],
        },
        {
          id: lunchId,
          name: 'Berry bowl',
          meal_items: [
            {id: crypto.randomUUID(), kind: 'recipe', recipe_id: recipe.id, portion: recipe.default_portion},
          ],
        },
        {
          id: dinnerId,
          name: 'Evening yogurt',
          meal_items: [
            {id: crypto.randomUUID(), kind: 'food', food_id: yogurt.id, portion: {kind: 'gram', grams: 100}},
          ],
        },
      ],
      day_patterns: [
        {
          id: patternId,
          name: 'Everyday',
          slots: [
            {meal_slot: 'breakfast', meal_ids: [breakfastId]},
            {meal_slot: 'lunch', meal_ids: [lunchId]},
            {meal_slot: 'dinner', meal_ids: [dinnerId]},
          ],
        },
      ],
      schedule: Object.fromEntries(
        ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => [day, patternId]),
      ),
    };
    template = (
      await send(
        'put',
        `/v1/coach/nutrition-plans/${template.id}/menu`,
        {expected_revision: template.revision, menu},
        token,
      )
    ).data;
    let assigned = (
      await send(
        'post',
        `/v1/coach/clients/${person.id}/nutrition-plans/${template.id}/assign`,
        {
          expected_revision: template.revision,
          start_date: today,
        },
        token,
      )
    ).data;
    let clientDay = (await send('get', '/v1/client/nutrition-days', undefined, clientToken)).data[0];
    const breakfast = clientDay.slots.find((slot) => slot.meal_slot === 'breakfast');
    const lunch = clientDay.slots.find((slot) => slot.meal_slot === 'lunch');
    clientDay = (
      await send(
        'patch',
        `/v1/client/nutrition-days/${today}`,
        {
          slots: [
            {
              meal_slot: 'breakfast',
              meal_id: breakfast.meal_id,
              expected_revision: breakfast.revision,
              entries: [
                entry({
                  ref: breakfast.rows[0].planned_item_ref,
                  foodId: oats.id,
                  portion: {kind: 'gram', grams: 75},
                  notes: 'Hungry after the morning walk.',
                }),
                entry({
                  ref: breakfast.rows[1].planned_item_ref,
                  foodId: yogurt.id,
                  portion: {kind: 'gram', grams: 125},
                }),
                entry({foodId: unknown.id, portion: {kind: 'gram', grams: 20}}),
                entry({foodId: water.id, portion: {kind: 'gram', grams: 250}}),
              ],
            },
            {
              meal_slot: 'lunch',
              meal_id: lunch.meal_id,
              expected_revision: lunch.revision,
              entries: [
                entry({
                  ref: lunch.rows[0].planned_item_ref,
                  recipeId: recipe.id,
                  portion: {...recipe.default_portion, amount: 1.5},
                }),
              ],
            },
          ],
        },
        clientToken,
      )
    ).data;
    await page.getByRole('button', {name: 'Refresh nutrition day', exact: true}).click();
    const breakfastRegion = page.getByRole('region', {name: 'breakfast', exact: true});
    const lunchRegion = page.getByRole('region', {name: 'lunch', exact: true});
    const dinnerRegion = page.getByRole('region', {name: 'dinner', exact: true});
    await expect(breakfastRegion.getByRole('heading', {name: 'Rolled oats', exact: true})).toBeVisible();
    await expect(breakfastRegion.getByText('75 g', {exact: true})).toBeVisible();
    await expect(breakfastRegion.getByText('Swapped', {exact: true})).toBeVisible();
    await expect(breakfastRegion.getByText('Extra', {exact: true})).toHaveCount(2);
    await expect(breakfastRegion.getByText('Hungry after the morning walk.', {exact: true})).toBeVisible();
    await expect(lunchRegion.getByText('1.5 serving', {exact: true})).toBeVisible();
    await expect(dinnerRegion.getByText('Not logged yet', {exact: true})).toBeVisible();
    await expect(
      totals.getByRole('row', {name: `Calories ${clientDay.summary.logged.calories} kcal 2000 kcal`, exact: true}),
    ).toBeVisible();
    await expect(
      page.getByText('Some foods have incomplete nutrition. Totals include known values only.', {exact: true}),
    ).toBeVisible();
    const waterRow = breakfastRegion
      .getByRole('listitem')
      .filter({has: page.getByRole('heading', {name: 'Sparkling water', exact: true})});
    await waterRow.getByText('Recorded nutrition', {exact: true}).click();
    await expect(waterRow.getByText('0 kcal', {exact: true})).toBeVisible();
    const unknownRow = breakfastRegion
      .getByRole('listitem')
      .filter({has: page.getByRole('heading', {name: 'Homemade topping', exact: true})});
    await unknownRow.getByText('Recorded nutrition', {exact: true}).click();
    await expect(unknownRow.getByText('Unknown', {exact: true})).toHaveCount(4);
    await breakfastRegion.getByText('View meal guidance', {exact: true}).click();
    await expect(breakfastRegion.getByText('50 g', {exact: true})).toBeVisible();
    await expect(breakfastRegion.getByText('Mixed berries', {exact: true})).toBeVisible();
    await expect(
      breakfastRegion.getByText('Guidance saved when your client first recorded this meal.', {exact: true}),
    ).toBeVisible();
    const guidanceName = breakfastRegion.getByRole('heading', {name: longMealName, exact: true});
    await expect(guidanceName).toBeVisible();
    expect(await guidanceName.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await dinnerRegion.getByText('View meal guidance', {exact: true}).click();
    await expect(
      dinnerRegion.getByText('Current guidance. This meal has not been recorded.', {exact: true}),
    ).toBeVisible();

    await send(
      'patch',
      `/v1/coach/nutrition-foods/${oats.id}`,
      {expected_revision: oats.revision, name: 'Renamed oats', calories_per_100g: 400},
      token,
    );
    assigned = (
      await send(
        'patch',
        `/v1/coach/nutrition-plans/${assigned.id}`,
        {expected_revision: assigned.revision, target_calories: 1800},
        token,
      )
    ).data;
    const changedMenu = structuredClone(menu);
    changedMenu.meals[0].name = 'Changed breakfast';
    changedMenu.meals[0].meal_items[0].portion.grams = 200;
    await send(
      'put',
      `/v1/coach/nutrition-plans/${assigned.id}/menu`,
      {expected_revision: assigned.revision, menu: changedMenu},
      token,
    );
    await page.reload();
    await expect(breakfastRegion.getByRole('heading', {name: 'Rolled oats', exact: true})).toBeVisible();
    await expect(
      totals.getByRole('row', {name: `Calories ${clientDay.summary.logged.calories} kcal 2000 kcal`, exact: true}),
    ).toBeVisible();
    await breakfastRegion.getByText('View meal guidance', {exact: true}).click();
    await expect(breakfastRegion.getByText('50 g', {exact: true})).toBeVisible();
    await expect(breakfastRegion.getByText('Changed breakfast', {exact: true})).toHaveCount(0);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({path: `tests/nutrition/artifacts/history-${width}.png`, fullPage: true});

    await page.route(`**${endpoint}*`, (route) => route.fulfill({status: 503, json: {}}));
    await page.getByRole('button', {name: 'Refresh nutrition day', exact: true}).click();
    await expect(page.getByRole('alert')).toContainText('Showing the previously loaded record.');
    await expect(breakfastRegion.getByText('75 g', {exact: true})).toBeVisible();
    await page.unroute(`**${endpoint}*`);
    await page.getByRole('button', {name: 'Refresh nutrition day', exact: true}).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await page.getByRole('button', {name: 'Previous day', exact: true}).click();
    await expect(page.getByLabel('Date', {exact: true})).toHaveValue(yesterday);
    await expect(page.getByRole('heading', {name: 'No meal records', exact: true})).toBeVisible();
    await expect(breakfastRegion).toHaveCount(0);
    await page.reload();
    await expect(page.getByLabel('Date', {exact: true})).toHaveValue(yesterday);
    await send(
      'patch',
      `/v1/client/nutrition-days/${yesterday}`,
      {
        slots: [
          {
            meal_slot: 'breakfast',
            meal_id: null,
            expected_revision: 0,
            entries: [entry({foodId: yogurt.id, portion: {kind: 'gram', grams: 150}, notes: 'Recorded after work.'})],
          },
        ],
      },
      clientToken,
    );
    await page.getByRole('button', {name: 'Refresh nutrition day', exact: true}).click();
    await expect(breakfastRegion.getByText('Recorded after work.', {exact: true})).toBeVisible();
    await expect(breakfastRegion.getByText('Logged', {exact: true})).toBeVisible();
    await expect(breakfastRegion.getByText('View meal guidance', {exact: true})).toHaveCount(0);
    await page.getByRole('button', {name: 'Next day', exact: true}).click();
    await expect(page.getByLabel('Date', {exact: true})).toHaveValue(today);
    await page.getByLabel('Date', {exact: true}).fill(shift(today, -14));
    await page.getByRole('button', {name: 'View day', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'No meal records', exact: true})).toBeVisible();
    await page.getByLabel('Date', {exact: true}).fill('');
    await page.getByRole('button', {name: 'View day', exact: true}).click();
    await expect(page.getByText('Enter date.', {exact: true})).toBeVisible();
    await expect(page.getByLabel('Date', {exact: true})).toBeFocused();
    await page.getByRole('button', {name: 'Today', exact: true}).click();
    await expect(page.getByLabel('Date', {exact: true})).toHaveValue(today);
    await page.getByRole('button', {name: 'Next day', exact: true}).click();
    await expect(page.getByLabel('Date', {exact: true})).toHaveValue(shift(today, 1));
    await expect(page.getByText('No food recorded for this date.', {exact: true})).toBeVisible();
    await expect(totals.getByRole('row', {name: 'Calories — 1800 kcal', exact: true})).toBeVisible();
    await page.goto(`${path}?date=not-a-date`);
    await expect(page.getByRole('alert')).toContainText('Choose a valid date');
    await page.getByRole('button', {name: 'Today', exact: true}).click();
    await expect(breakfastRegion.getByText('75 g', {exact: true})).toBeVisible();
    await page.getByRole('link', {name: 'Back to client', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Alex Morgan', exact: true})).toBeVisible();

    if (width === 375) {
      const held = Promise.withResolvers();
      const release = Promise.withResolvers();
      await page.route(`**${endpoint}*`, async (route) => {
        const response = await route.fetch();
        held.resolve();
        await release.promise;
        return route.fulfill({response});
      });
      await page.goto(path);
      await held.promise;
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
        await page.evaluate(async () => {
          const {queryClient} = await import('/src/api/query-client.ts');
          return queryClient
            .getQueryCache()
            .getAll()
            .some((query) => JSON.stringify(query.state.data ?? '').includes('Rolled oats'));
        }),
      ).toBe(false);
    }
    expect(errors).toEqual([]);
    await context.close();
    console.log(
      `Nutrition history: recorded totals, frozen guidance, units, dates, recovery and account isolation passed at ${width}px.`,
    );
  }
} finally {
  await browser.close();
  await api.dispose();
}
