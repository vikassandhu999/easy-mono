import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const origin = process.env.COACH_TEST_ORIGIN ?? 'http://localhost:2021';
const gram = {kind: 'gram', grams: 100};
const nutrients = {calories: 100, protein: 5, carbohydrates: 15, fat: 2, fiber: 1, complete: true};
const timestamps = {inserted_at: '2026-09-05T10:00:00Z', updated_at: '2026-09-05T10:00:00Z'};
const sizes = [
  {label: 'Small scoop', amount: 1, unit: 'scoop', weight_g: 15, is_default: false},
  {label: 'Heaped scoop', amount: 1, unit: 'scoop', weight_g: 30, is_default: true},
];
const foodFixture = {
  id: 'food',
  name: 'Oats',
  source: 'custom',
  revision: 3,
  serving_sizes: sizes,
  default_portion: {kind: 'serving', amount: 1, unit: 'scoop', label: 'Heaped scoop'},
  portion_options: [
    gram,
    ...sizes.map((size) => ({kind: 'serving', amount: size.amount, unit: size.unit, label: size.label})),
  ],
  nutrients,
  calories_per_100g: 100,
  protein_g_per_100g: 5,
  carbs_g_per_100g: 15,
  fat_g_per_100g: 2,
  fiber_g_per_100g: 1,
  sugar_g_per_100g: 0,
  media: null,
  category: null,
  notes: null,
  ...timestamps,
};
const client = {
  id: 'client',
  local_date: '2026-09-07',
  first_name: 'Test',
  last_name: 'Client',
  status: 'active',
  email: 'test@example.test',
  required_services: ['nutrition'],
  nutrition_plan_name: 'Current plan',
  training_plan_name: null,
  ...timestamps,
};
function plan(id, name, start, end) {
  return {
    id,
    name,
    kind: 'client_plan',
    revision: 2,
    lifecycle: 'current',
    client_id: client.id,
    client,
    start_date: start,
    end_date: end,
    menu: {meals: [], day_patterns: [], schedule: {}},
    ...timestamps,
  };
}

const browser = await chromium.launch({channel: 'chrome', headless: true});
try {
  for (const width of [375, 1280]) {
    const page = await browser.newPage({viewport: {width, height: 1000}});
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    let food = structuredClone(foodFixture);
    let recipe = {
      id: 'recipe',
      name: 'Breakfast',
      instructions: null,
      servings_count: 2,
      cooked_weight_g: 400,
      revision: 4,
      recipe_ingredients: [
        {food_id: 'food', food, portion: {kind: 'gram', grams: 75}, position: 0},
        {
          food_id: 'milk',
          food: {...food, id: 'milk', name: 'Milk'},
          portion: {kind: 'gram', grams: 200},
          position: 1,
        },
      ],
      nutrients,
      allergens: [],
      dietary_tags: [],
      ...timestamps,
    };
    const coverage = {
      date: client.local_date,
      current: plan('current', 'Current plan', '2026-09-01', null),
      upcoming: [plan('future', 'Future plan', '2026-10-01', '2026-10-31')],
    };
    const writes = [];
    let failRecipe = true;
    let failReads = false;
    let failAssign = true;
    const main = await (await page.request.get(`${origin}/src/main.tsx`)).text();
    const dep = (name) => {
      const path = [...main.matchAll(/"([^"\n]+)"/g)].map((m) => m[1]).find((p) => p.includes(`/deps/${name}.js?`));
      assert(path);
      return JSON.stringify(path);
    };
    await page.route('**/src/main.tsx*', (route) =>
      route.fulfill({
        contentType: 'text/javascript',
        body: `
      import React from ${dep('react')};
      import ReactDOM from ${dep('react-dom_client')};
      import {QueryClientProvider} from ${dep('@tanstack_react-query')};
      import {createBrowserRouter, RouterProvider} from ${dep('react-router-dom')};
      import {queryClient} from '/src/api/query-client.ts';
      import EditRecipe from '/src/library/recipes/edit-recipe.tsx';
      import EditFood from '/src/library/foods/edit-food.tsx';
      import {NutritionTab} from '/src/clients/client-nutrition-tab.tsx';
      import {PlanAddToClientControl} from '/src/library/plan-add-to-client.tsx';
      import {useAssignNutritionPlanMutation} from '/src/api/nutrition-plans.ts';
      import '/src/index.css';
      queryClient.setDefaultOptions({queries: {retry: false}});
      window.refetchNutrition = () => queryClient.refetchQueries({type: 'active'});
      function Assign() {
        const mutation = useAssignNutritionPlanMutation();
        return React.createElement(PlanAddToClientControl, {planKind: 'nutrition', planName: 'Next block', isAssigning: mutation.isPending,
          onAssign: async (client, dates) => mutation.mutateAsync({clientId: client.id, id: 'template', body: {start_date: dates.startDate, end_date: dates.endDate}})});
      }
      function frame(Component) {return () => React.createElement('main', {style: {minHeight: '100dvh', display: 'flex', flexDirection: 'column'}}, React.createElement(Component));}
      const router = createBrowserRouter([
        {path: '/library/recipes/:id/edit', Component: frame(EditRecipe)},
        {path: '/library/foods/:id/edit', Component: frame(EditFood)},
        {path: '/library/recipes/:id', element: React.createElement('p', null, 'Recipe saved')},
        {path: '/library/foods/:id', element: React.createElement('p', null, 'Food saved')},
        {path: '/coverage', Component: () => React.createElement(NutritionTab, {client: ${JSON.stringify(client)}})},
        {path: '/assign', Component: Assign},
      ]);
      ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(QueryClientProvider, {client: queryClient}, React.createElement(RouterProvider, {router})));
    `,
      }),
    );
    await page.route('**/v1/coach/**', async (route) => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({status: 204});
      }
      const url = new URL(request.url());
      const path = url.pathname;
      if (request.method() !== 'GET') {
        const body = request.postDataJSON();
        writes.push({path, method: request.method(), body});
        if (path.endsWith('/nutrition-recipes/recipe')) {
          if (body.expected_revision !== recipe.revision) {
            return route.fulfill({status: 409, json: {error_code: 'stale_revision'}});
          }
          if (failRecipe) {
            failRecipe = false;
            return route.fulfill({status: 503, json: {error: {message: 'Temporary failure'}}});
          }
          recipe = {
            ...recipe,
            ...body,
            recipe_ingredients: body.recipe_ingredients.map((row, position) => ({
              ...row,
              position,
              food: row.food_id === 'food' ? food : {...food, id: 'milk', name: 'Milk'},
            })),
            revision: recipe.revision + 1,
          };
          return route.fulfill({json: {data: recipe}});
        }
        if (path.endsWith('/nutrition-foods/food')) {
          if (body.expected_revision !== food.revision) {
            return route.fulfill({status: 409, json: {error_code: 'stale_revision'}});
          }
          food = {...food, ...body, revision: food.revision + 1};
          return route.fulfill({json: {data: food}});
        }
        if (path.endsWith('/assign')) {
          if (failAssign) {
            failAssign = false;
            return route.fulfill({status: 422, json: {errors: {start_date: ['overlaps another plan']}}});
          }
          return route.fulfill({json: {data: plan('assigned', 'Next block', body.start_date, body.end_date)}});
        }
        assert.equal(path, '/v1/coach/nutrition-plans/current');
        assert.equal(request.method(), 'PATCH', 'ending is a date edit');
        coverage.current = {...coverage.current, ...body, revision: coverage.current.revision + 1};
        return route.fulfill({json: {data: coverage.current}});
      }
      if (failReads) {
        return route.fulfill({status: 503, json: {error: {message: 'Offline'}}});
      }
      if (path.endsWith('/nutrition-recipes/recipe')) {
        return route.fulfill({json: {data: recipe}});
      }
      if (path.endsWith('/nutrition-foods/food')) {
        return route.fulfill({json: {data: food}});
      }
      if (path.endsWith('/nutrition-coverage')) {
        return route.fulfill({json: {data: coverage}});
      }
      if (path.endsWith('/clients')) {
        return route.fulfill({json: {data: url.searchParams.get('status') === 'pending' ? [] : [client], count: 1}});
      }
      return route.fulfill({json: {data: [], count: 0}});
    });
    try {
      await page.goto(`${origin}/library/recipes/recipe/edit`);
      await page.getByRole('textbox', {name: 'Name', exact: false}).first().fill('Breakfast revised');
      await page.getByRole('button', {name: 'Heaped scoop', exact: true}).first().click();
      await page.getByRole('textbox', {name: /^Amount/}).fill('1.5');
      await page.getByRole('button', {name: 'Move Milk up'}).click();
      const weights = page.getByRole('textbox', {name: /^Weight \(g\)/});
      assert.equal(await weights.first().inputValue(), '200');
      assert.equal(await page.getByRole('textbox', {name: /^Amount/}).inputValue(), '1.5');
      await weights.first().fill('');
      await page.getByRole('button', {name: 'Save changes', exact: true}).click();
      assert.equal(writes.length, 0, 'invalid ingredient blocks the whole save');
      await weights.first().fill('250');
      await page.getByRole('button', {name: 'Save changes', exact: true}).click();
      await page.getByText(/Recipe wasn't updated/).waitFor();
      assert.equal(await weights.first().inputValue(), '250', 'failed save retains draft');
      await page.screenshot({path: `/tmp/nutrition-recipe-${width}.png`, fullPage: true});
      await page.getByRole('button', {name: 'Save changes', exact: true}).click();
      await page.getByText('Recipe saved', {exact: true}).waitFor();
      assert.deepEqual(writes[0], writes[1]);
      assert.deepEqual(
        writes[1].body.recipe_ingredients.map((row) => [
          row.food_id,
          row.portion.kind === 'gram' ? row.portion.grams : row.portion.amount,
        ]),
        [
          ['milk', 250],
          ['food', 1.5],
        ],
      );
      assert.deepEqual(writes[1].body.recipe_ingredients[1].portion, {
        kind: 'serving',
        amount: 1.5,
        unit: 'scoop',
        label: 'Heaped scoop',
      });

      await page.goto(`${origin}/library/foods/food/edit`);
      await page.getByRole('textbox', {name: 'Name', exact: false}).first().fill('Oats renamed');
      await page.getByRole('button', {name: 'Save changes', exact: true}).click();
      await page.getByText('Food saved', {exact: true}).waitFor();
      assert.deepEqual(writes.at(-1).body.serving_sizes, sizes, 'ordinary edit preserves serving metadata');
      await page.goto(`${origin}/library/foods/food/edit`);
      await page.getByRole('button', {name: 'Make default', exact: true}).click();
      await page.getByRole('textbox', {name: 'Label', exact: false}).first().fill('Level scoop');
      await page.screenshot({path: `/tmp/nutrition-food-${width}.png`, fullPage: true});
      await page.getByRole('button', {name: 'Save changes', exact: true}).click();
      await page.getByText('Food saved', {exact: true}).waitFor();
      assert.equal(writes.at(-1).body.serving_sizes[0].label, 'Level scoop');
      assert.deepEqual(
        writes.at(-1).body.serving_sizes.map((size) => size.is_default),
        [true, false],
      );

      for (const resource of ['foods', 'recipes']) {
        const id = resource === 'foods' ? 'food' : 'recipe';
        await page.goto(`${origin}/library/${resource}/${id}/edit`);
        const name = page.getByRole('textbox', {name: 'Name', exact: false}).first();
        await name.fill('My retained draft');
        const base = resource === 'foods' ? food.revision : recipe.revision;
        if (resource === 'foods') {
          food = {...food, name: 'Other coach edit', revision: base + 1};
        } else {
          recipe = {...recipe, name: 'Other coach edit', revision: base + 1};
        }
        await page.evaluate(() => window.refetchNutrition());
        assert.equal(await name.inputValue(), 'My retained draft');
        await page.getByRole('button', {name: 'Save changes', exact: true}).click();
        await page.getByText(/Changed elsewhere. Your draft is still here/).waitFor();
        assert.equal(writes.at(-1).body.expected_revision, base, 'draft keeps its original revision');
        failReads = true;
        await page.evaluate(() => window.refetchNutrition());
        assert.equal(await name.inputValue(), 'My retained draft', 'background errors retain editor');
        await page.getByRole('button', {name: 'Discard changes and reload'}).click();
        await page.getByText("Couldn't reload. Your draft is still here.").waitFor();
        assert.equal(await name.inputValue(), 'My retained draft');
        failReads = false;
        await page.getByRole('button', {name: 'Discard changes and reload'}).click();
        await page.waitForFunction(() =>
          [...document.querySelectorAll('input')].some((input) => input.value === 'Other coach edit'),
        );
        await name.fill('Explicitly rebased');
        await page.getByRole('button', {name: 'Save changes', exact: true}).click();
        await page.getByText(resource === 'foods' ? 'Food saved' : 'Recipe saved', {exact: true}).waitFor();
        assert.equal(writes.at(-1).body.expected_revision, base + 1);
      }

      await page.goto(`${origin}/coverage`);
      await page.getByText('Upcoming plans', {exact: true}).waitFor();
      await page.getByText('Future plan', {exact: true}).waitFor();
      await page.getByRole('button', {name: 'End after today', exact: true}).click();
      await page.getByRole('alertdialog').getByRole('button', {name: 'End after today', exact: true}).click();
      await page.getByRole('button', {name: 'End after today', exact: true, disabled: true}).waitFor();
      assert.deepEqual(writes.at(-1).body, {expected_revision: 2, end_date: coverage.date});
      await page.getByRole('alertdialog').waitFor({state: 'hidden'});
      await page.screenshot({path: `/tmp/nutrition-coverage-${width}.png`, fullPage: true});

      await page.goto(`${origin}/assign`);
      await page.getByRole('button', {name: 'Add to client', exact: true}).click();
      await page.getByRole('option').filter({hasText: 'Test Client'}).click();
      await page.getByRole('button', {name: 'Assign to Test Client', exact: true}).waitFor();
      const before = writes.length;
      await page.getByRole('button', {name: 'Assign to Test Client', exact: true}).click();
      await page.getByRole('alert').waitFor();
      await page.getByRole('button', {name: 'Assign to Test Client', exact: true}).click();
      await page.getByRole('button', {name: 'Add to client', exact: true, expanded: false}).waitFor();
      assert.equal(writes.length, before + 2);
      assert.deepEqual(writes.at(-1).body, writes.at(-2).body, 'assignment failure retains chosen dates');
      assert.equal(writes.at(-1).body.start_date, client.local_date, 'assignment starts on server-owned client date');
      assert.deepEqual(errors, []);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      console.log(
        `PASS ${width}px: single recipe draft, complete save/retry, serving round trip/default edit, current/upcoming coverage, date-based ending, covered-client assignment`,
      );
    } catch (error) {
      await page.screenshot({path: '/tmp/nutrition-library-failure.png', fullPage: true});
      console.error(JSON.stringify({width, writes, errors, page: await page.locator('body').innerText()}));
      throw error;
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
