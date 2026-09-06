import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const origin = process.env.COACH_TEST_ORIGIN ?? 'http://localhost:2021';
const nutrients = {calories: 100, protein: 5, carbohydrates: 15, fat: 2, fiber: 1, complete: true};
const timestamps = {inserted_at: '2026-09-05T10:00:00Z', updated_at: '2026-09-05T10:00:00Z'};
function fixture() {
  return {
    id: 'plan',
    kind: 'template',
    name: 'Nutrition test',
    description: null,
    revision: 4,
    archived_at: null,
    status: 'active',
    lifecycle: null,
    assigned_client_count: 0,
    target_calories: 2000,
    target_protein_g: 100,
    target_carbs_g: 200,
    target_fat_g: 60,
    target_fiber_g: 20,
    start_date: null,
    end_date: null,
    client_id: null,
    client: null,
    creator_id: null,
    source_template_id: null,
    menu: {
      meals: [
        {
          id: 'meal',
          name: 'Breakfast',
          notes: null,
          nutrients,
          meal_items: [
            {
              id: 'item',
              name: 'Oats',
              kind: 'food',
              food_id: 'food',
              recipe_id: null,
              portion: {kind: 'gram', grams: 50},
              nutrients,
            },
          ],
        },
      ],
      day_patterns: [
        {
          id: 'day',
          name: 'Every day',
          slots: [{meal_slot: 'breakfast', options: [{id: 'option', nutrition_meal_id: 'meal'}]}],
        },
      ],
      schedule: Object.fromEntries(
        ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => [day, 'day']),
      ),
    },
    ...timestamps,
  };
}
function applyMenu(plan, body) {
  const menu = structuredClone(body.menu);
  for (const meal of menu.meals) {
    meal.nutrients = nutrients;
    for (const item of meal.meal_items) {
      item.nutrients = nutrients;
      item.name = item.kind === 'food' ? 'Oats' : 'Recipe';
    }
  }
  return {...plan, menu, revision: plan.revision + 1};
}

const browser = await chromium.launch({channel: 'chrome', headless: true});
try {
  for (const width of [375, 1280]) {
    const page = await browser.newPage({viewport: {width, height: 900}});
    page.setDefaultTimeout(10000);
    let plan = fixture();
    let failNextSave = false;
    let failReads = false;
    let conflictNextSave = false;
    const writes = [];
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const main = await (await page.request.get(`${origin}/src/main.tsx`)).text();
    const dep = (name) => {
      const path = [...main.matchAll(/"([^"\n]+)"/g)]
        .map((match) => match[1])
        .find((path) => path.includes(`/deps/${name}.js?`));
      assert(path, `Vite dependency ${name}`);
      return JSON.stringify(path);
    };
    await page.route('**/src/main.tsx*', (route) =>
      route.fulfill({
        contentType: 'text/javascript',
        body: `
      import React from ${dep('react')};
      import ReactDOM from ${dep('react-dom_client')};
      import {QueryClientProvider} from ${dep('@tanstack_react-query')};
      import {createBrowserRouter, RouterProvider, Link} from ${dep('react-router-dom')};
      import {queryClient} from '/src/api/query-client.ts';
      import NutritionPlanBuilderScreen from '/src/library/nutrition-plans/builder/index.tsx';
      import EditNutritionPlan from '/src/library/nutrition-plans/edit-nutrition-plan.tsx';
      import '/src/index.css';
      queryClient.setDefaultOptions({queries: {retry: false}});
      window.refetchNutrition = () => queryClient.refetchQueries({type: 'active'});
      function Screen() {
        return React.createElement('main', {style: {height: '100dvh', display: 'flex', flexDirection: 'column'}},
          React.createElement(Link, {to: '/elsewhere'}, 'Leave builder'),
          React.createElement(NutritionPlanBuilderScreen));
      }
      const router = createBrowserRouter([{path: '/library/nutrition-plans/:id', Component: Screen},
        {path: '/library/nutrition-plans/:id/edit', Component: () => React.createElement('main', {style: {height: '100dvh', display: 'flex'}}, React.createElement(EditNutritionPlan))},
        {path: '/elsewhere', element: React.createElement('p', null, 'Other screen')}]);
      ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(QueryClientProvider, {client: queryClient}, React.createElement(RouterProvider, {router})));
    `,
      }),
    );
    await page.route('**/v1/coach/**', async (route) => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({status: 204});
      }
      const path = new URL(request.url()).pathname;
      if (request.method() === 'GET' && failReads) {
        return route.fulfill({status: 503, json: {error: {message: 'Offline'}}});
      }
      if (path.includes('/foods/')) {
        return route.fulfill({
          json: {
            data: {
              id: 'food',
              name: 'Oats',
              serving_sizes: [],
              default_portion: {kind: 'gram', grams: 100},
              portion_options: [{kind: 'gram', grams: 100}],
            },
          },
        });
      }
      if (request.method() === 'PATCH') {
        const body = request.postDataJSON();
        writes.push(body);
        if (body.expected_revision !== plan.revision) {
          return route.fulfill({status: 409, json: {error_code: 'stale_revision'}});
        }
        plan = {...plan, ...body, revision: plan.revision + 1};
      }
      if (request.method() === 'PUT') {
        const body = request.postDataJSON();
        writes.push(body);
        if (failNextSave) {
          failNextSave = false;
          return route.fulfill({status: 503, json: {error: {message: 'Temporary failure'}}});
        }
        if (conflictNextSave) {
          conflictNextSave = false;
          plan = {...plan, revision: plan.revision + 1};
          return route.fulfill({status: 409, json: {error: {message: 'Stale revision'}}});
        }
        assert.equal(body.expected_revision, plan.revision);
        plan = applyMenu(plan, body);
      }
      return route.fulfill({json: {data: plan}});
    });
    try {
      await page.goto(`${origin}/library/nutrition-plans/plan`);
      await page.getByText('Menu saved', {exact: true}).waitFor();
      await page.getByRole('button', {name: 'Expand Breakfast', exact: true}).click();
      await page.getByRole('button', {name: /^Oats/}).click();
      await page.getByRole('textbox', {name: 'Amount', exact: false}).fill('75');
      await page.getByRole('button', {name: 'Done', exact: true}).click();
      await page.getByText('Unsaved menu changes', {exact: true}).waitFor();
      assert.equal(writes.length, 0, 'amount edits stay local');
      await page.getByRole('link', {name: 'Leave builder'}).click();
      await page.getByRole('button', {name: 'Keep editing'}).click();
      await page.getByRole('button', {name: 'Rename', exact: true}).click();
      await page.getByRole('textbox', {name: 'Day name'}).fill('Training day');
      await page.getByRole('textbox', {name: 'Day name'}).press('Enter');
      assert.equal(writes.length, 0, 'structural edits stay local too');
      failNextSave = true;
      await page.getByRole('button', {name: 'Save menu', exact: true}).click();
      await page.getByRole('alert').waitFor();
      await page.getByRole('button', {name: 'Save menu', exact: true}).click();
      await page.getByText('Menu saved', {exact: true}).waitFor();
      assert.equal(writes.length, 2);
      assert.deepEqual(writes[0], writes[1], 'retry sends the retained draft and revision');
      assert.equal(writes[1].menu.meals[0].meal_items[0].portion.grams, 75);
      assert.equal(plan.menu.day_patterns[0].name, 'Training day');
      await page.getByRole('button', {name: 'Day', exact: true}).click();
      await page.getByText('Unsaved menu changes', {exact: true}).waitFor();
      failReads = true;
      await page.evaluate(() => window.refetchNutrition());
      await page.getByText('Unsaved menu changes', {exact: true}).waitFor();
      await page.getByRole('button', {name: 'Discard', exact: true}).click();
      await page.getByText("Couldn't load the saved plan. Your draft is still here.").waitFor();
      await page.getByText('Unsaved menu changes', {exact: true}).waitFor();
      assert.equal(await page.getByRole('radio', {name: 'New day', exact: true}).count(), 1);
      failReads = false;
      await page.getByRole('button', {name: 'Discard', exact: true}).click();
      await page.getByText('Menu saved', {exact: true}).waitFor();
      assert.equal(await page.getByRole('radio', {name: 'New day', exact: true}).count(), 0);
      assert.equal(writes.length, 2, 'discard does not write');
      await page.getByRole('button', {name: 'Day', exact: true}).click();
      conflictNextSave = true;
      await page.getByRole('button', {name: 'Save menu', exact: true}).click();
      await page.getByText(/This plan changed elsewhere/).waitFor();
      await page.getByText('Unsaved menu changes', {exact: true}).waitFor();
      await page.getByRole('button', {name: 'Discard', exact: true}).click();
      await page.getByText('Menu saved', {exact: true}).waitFor();
      await page.getByRole('button', {name: 'Day', exact: true}).click();
      await page.getByRole('button', {name: 'Save menu', exact: true}).click();
      await page.getByText('Menu saved', {exact: true}).waitFor();
      assert.equal(plan.menu.day_patterns.length, 2, 'new day survives the save');
      const addedDay = plan.menu.day_patterns[1];
      assert.equal(new URL(page.url()).searchParams.get('d'), addedDay.id, 'active day keeps its UUID after save');
      assert.equal(writes.at(-1).menu.day_patterns[1].id, addedDay.id, 'server preserves submitted IDs');
      assert(
        !JSON.stringify(writes.at(-1)).match(/local_ref|meal_local_ref|position|inserted_at/),
        'menu has no persistence protocol',
      );
      await page.reload();
      await page.getByText('Menu saved', {exact: true}).waitFor();
      assert.equal(new URL(page.url()).searchParams.get('d'), addedDay.id, 'active day survives reload');
      await page.getByTestId('nb-add-meal').click();
      await page.getByTestId('nb-create-meal').click();
      await page.getByRole('textbox', {name: 'Meal name', exact: true}).fill('Lunch');
      await page.getByRole('textbox', {name: 'Meal name', exact: true}).press('Enter');
      await page.getByRole('button', {name: 'Save menu', exact: true}).click();
      await page.getByText('Menu saved', {exact: true}).waitFor();
      const createdMeal = plan.menu.meals.find((meal) => meal.name === 'Lunch');
      assert(createdMeal, 'new meal saves');
      assert.equal(writes.at(-1).menu.meals.at(-1).id, createdMeal.id, 'new meal keeps its UUID');
      await page.getByTestId('nb-add-meal').click();
      await page.getByRole('option', {name: 'Breakfast', exact: true}).click();
      await page.getByRole('button', {name: 'Save menu', exact: true}).click();
      await page.getByText('Menu saved', {exact: true}).waitFor();
      assert.equal(plan.menu.meals.length, 2, 'reusing breakfast does not copy the meal');
      assert(
        plan.menu.day_patterns[1].slots.some((slot) =>
          slot.options.some((option) => option.nutrition_meal_id === 'meal'),
        ),
      );
      await page.getByRole('button', {name: 'Delete New day', exact: true}).click();
      await page.getByRole('button', {name: 'Delete', exact: true}).click();
      await page.getByRole('button', {name: 'Save menu', exact: true}).click();
      await page.getByText('Menu saved', {exact: true}).waitFor();
      assert.equal(plan.menu.day_patterns.length, 1, 'day deletion saves');
      assert.equal(plan.menu.meals.length, 2, 'deleting a day preserves its meals');
      assert.deepEqual(errors, []);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      assert.equal(overflow, false, 'no horizontal overflow');
      await page.screenshot({path: `/tmp/nutrition-builder-${width}.png`, fullPage: true});
      plan = {
        ...plan,
        kind: 'client_plan',
        client_id: 'client',
        client: {id: 'client', first_name: 'Test', last_name: 'Client'},
        start_date: '2026-09-05',
        end_date: null,
      };
      await page.goto(`${origin}/library/nutrition-plans/plan/edit`);
      await page.getByText('Coverage dates', {exact: true}).waitFor();
      await page.getByRole('spinbutton', {name: /day.*Start date/i}).press('ArrowUp');
      const draftRevision = plan.revision;
      plan = {...plan, name: 'Changed elsewhere', revision: plan.revision + 1};
      await page.evaluate(() => window.refetchNutrition());
      await page.getByRole('button', {name: 'Save changes', exact: true}).click();
      await page.getByText(/Changed elsewhere. Your draft is still here/).waitFor();
      assert.equal(writes.at(-1).expected_revision, draftRevision);
      assert.equal(writes.at(-1).start_date, '2026-09-06');
      failReads = true;
      await page.getByRole('button', {name: 'Discard changes and reload'}).click();
      await page.getByText("Couldn't reload. Your draft is still here.").waitFor();
      failReads = false;
      await page.getByRole('button', {name: 'Discard changes and reload'}).click();
      await page.getByRole('button', {name: 'Discard changes and reload', disabled: false}).waitFor();
      await page.getByRole('spinbutton', {name: /day.*Start date/i}).press('ArrowUp');
      await page.getByRole('button', {name: 'Save changes', exact: true}).click();
      await page.getByText('Menu saved', {exact: true}).waitFor();
      assert.equal(writes.at(-1).start_date, '2026-09-06', 'coverage edits use the plan details save');
      assert.equal(writes.at(-1).end_date, null, 'open ended coverage is preserved');
      assert.deepEqual(errors, []);
      console.log(
        `PASS ${width}px: local amount + structure edits, navigation guard, save failure/retry, discard, conflict recovery, stable IDs, meal creation/reuse, day deletion`,
      );
    } catch (error) {
      await page.screenshot({path: '/tmp/nutrition-browser-failure.png', fullPage: true});
      console.error(JSON.stringify({width, writes, errors, page: await page.locator('body').innerText()}));
      throw error;
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
