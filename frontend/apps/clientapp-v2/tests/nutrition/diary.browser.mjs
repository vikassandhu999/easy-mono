import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require = createRequire(new URL('../../../coachapp-v2/package.json', import.meta.url));
const {chromium} = require('playwright');

// Real screens and query hooks; controlled HTTP responses exercise failure recovery.
const origin = process.env.CLIENT_TEST_ORIGIN ?? 'http://localhost:1314';
const coachOrigin = process.env.COACH_TEST_ORIGIN ?? 'http://localhost:2021';
const nutrients = {calories: 100, protein: 5, carbohydrates: 15, fat: 2, fiber: 1, complete: true};
const portion = {kind: 'gram', grams: 50};
const items = ['Oats', 'Milk'].map((name, i) => ({
  planned_item_ref: `item-${i}`,
  kind: 'food',
  name,
  food_id: `food-${i}`,
  recipe_id: null,
  position: i,
  portion,
  nutrients,
}));
const entries = new Map();
const writes = [];
let failNext = false;
let failReads = false;
let delayRead = false;
let revision = 0;
function day(date = '2026-09-05') {
  const rows = items.map((item) => {
    const entry = entries.get(item.planned_item_ref);
    return {
      ...item,
      ...(entry ?? {}),
      id: item.planned_item_ref,
      entry_id: entry?.entry_id ?? null,
      status: entry ? (entry.food_id === item.food_id ? 'as_planned' : 'swapped') : 'pending',
      notes: entry?.notes ?? null,
    };
  });
  for (const [ref, entry] of entries) {
    if (ref.startsWith('extra-')) {
      rows.push(entry);
    }
  }
  return {
    date,
    applied_timezone: 'Asia/Kolkata',
    plan_id: 'plan',
    write_eligible: true,
    targets: {calories: 2000, protein_g: 100, carbs_g: 200, fat_g: 50, fiber_g: 20},
    slots: [
      {
        meal_slot: 'breakfast',
        meal_id: 'meal',
        revision,
        applied_timezone: 'Asia/Kolkata',
        write_eligible: true,
        planned_calories: 200,
        logged_calories: [...entries.values()].reduce((sum, entry) => sum + entry.nutrients.calories, 0),
        options: [{meal_id: 'meal', meal_name: 'Breakfast', position: 0, items}],
        rows,
      },
    ],
    summary: {
      logged: {...nutrients, calories: [...entries.values()].reduce((sum, entry) => sum + entry.nutrients.calories, 0)},
      planned: {...nutrients, calories: 200},
      has_intake: entries.size > 0,
      adherence: entries.size ? 'under' : 'none',
      counts: {as_planned: entries.size, swapped: 0, added: 0, recorded: 0, pending: 2, skipped: 0},
    },
  };
}

async function mount(page, url, component, coach = false) {
  const main = await (await page.request.get(`${url}/src/main.tsx`)).text();
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
    import {QueryClient, QueryClientProvider} from ${dep('@tanstack_react-query')};
    import {createBrowserRouter, RouterProvider} from ${dep('react-router-dom')};
    import Screen from ${JSON.stringify(component)};
    import '/src/index.css';
    const queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}});
    window.refetchNutrition = () => queryClient.refetchQueries({type: 'active'});
    const router = createBrowserRouter([{path: ${JSON.stringify(coach ? '/clients/:id/nutrition/:date' : '*')}, element: React.createElement(Screen)}]);
    ReactDOM.createRoot(document.getElementById('root')).render(
      React.createElement(QueryClientProvider, {client: queryClient},
        React.createElement('div', {style: {display: 'flex', flexDirection: 'column', height: '100dvh'}}, React.createElement(RouterProvider, {router}))));
  `,
    }),
  );
}

const browser = await chromium.launch({channel: 'chrome', headless: true});
try {
  const page = await browser.newPage({viewport: {width: 375, height: 812}});
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await mount(page, origin, '/src/nutrition/nutrition-today.tsx');
  await page.route('**/v1/client/nutrition-foods**', (route) =>
    route.fulfill({
      json: {
        count: 1,
        data: [
          {
            id: 'banana',
            name: 'Banana',
            serving_sizes: [],
            default_portion: {kind: 'serving', amount: 1, unit: 'banana', label: 'Medium banana'},
            portion_options: [{kind: 'gram', grams: 100}],
            calories_per_100g: 200,
          },
        ],
      },
    }),
  );
  await page.route('**/v1/client/nutrition-days**', async (route) => {
    const request = route.request();
    const method = request.method();
    if (method === 'OPTIONS') {
      return route.fulfill({status: 204});
    }
    if (method === 'GET') {
      if (failReads) {
        return route.fulfill({status: 503, json: {error: {message: 'Offline'}}});
      }
      if (delayRead) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      return route.fulfill({json: {data: [day()], count: 1}});
    }
    const body = request.postDataJSON();
    writes.push({method, body, path: new URL(request.url()).pathname, key: request.headers()['idempotency-key']});
    if (failNext) {
      failNext = false;
      return route.fulfill({status: 503, json: {error: {message: 'Temporary failure'}}});
    }
    assert.equal(method, 'PATCH');
    assert.match(request.url(), /\/nutrition-days\/[^/]+$/);
    assert.equal(request.headers()['idempotency-key'], undefined);
    const [slot] = body.slots;
    if (slot.expected_revision !== revision) {
      return route.fulfill({status: 409, json: {error_code: 'stale_revision', error_message: 'Changed elsewhere'}});
    }
    entries.clear();
    for (const saved of slot.entries) {
      const item = items.find((item) => item.planned_item_ref === saved.planned_item_ref);
      const ref = saved.planned_item_ref ?? `extra-${saved.id}`;
      entries.set(ref, {
        ...saved,
        id: ref,
        entry_id: saved.id,
        kind: 'food',
        name: saved.food_id === 'banana' ? 'Banana' : item.name,
        status: item ? 'as_planned' : 'added',
        nutrients: {
          ...nutrients,
          calories: (saved.portion.kind === 'gram' ? saved.portion.grams : saved.portion.amount * 80) * 2,
        },
      });
    }
    revision++;
    await route.fulfill({status: 200, json: {data: day()}});
  });

  await page.goto(`${origin}/nutrition`);
  await page.getByRole('button', {name: 'Oats 100', exact: true}).click();
  const sheet = page.getByRole('dialog', {name: 'Adjust Oats'});
  await sheet.getByRole('textbox', {name: 'Amount', exact: true}).fill('75');
  await sheet.getByRole('textbox', {name: 'Note for coach'}).fill('Hungry today');
  failNext = true;
  failReads = true;
  await sheet.getByRole('button', {name: 'Log it', exact: true}).click();
  await sheet.getByRole('alert').waitFor();
  assert.equal(await sheet.getByRole('textbox', {name: 'Amount', exact: true}).inputValue(), '75');
  assert.equal(await sheet.getByRole('textbox', {name: 'Note for coach'}).inputValue(), 'Hungry today');
  failReads = false;
  await page.evaluate(() => window.refetchNutrition());
  await page.getByRole('button', {name: 'Retry refresh'}).waitFor({state: 'hidden'});
  assert.equal(await sheet.getByRole('textbox', {name: 'Amount', exact: true}).inputValue(), '75');
  assert.equal(await sheet.getByRole('textbox', {name: 'Note for coach'}).inputValue(), 'Hungry today');
  delayRead = true;
  await sheet.getByRole('button', {name: 'Log it', exact: true}).click();
  await sheet.waitFor({state: 'hidden'});
  await page.getByRole('button', {name: 'Oats 150', exact: true}).waitFor({timeout: 1000});
  delayRead = false;
  assert.equal(writes.length, 2);
  assert.equal(writes[0].body.slots[0].expected_revision, writes[1].body.slots[0].expected_revision);
  assert.equal(writes[1].body.slots[0].entries[0].portion.grams, 75);
  assert.equal(writes[1].body.slots[0].entries[0].notes, 'Hungry today');

  // A second pending row stays loggable after the first write froze the slot.
  await page.getByRole('button', {name: 'Log as eaten', exact: true}).click();
  await page.waitForFunction(() => document.querySelectorAll('button[aria-label="Mark not eaten"]').length === 2);
  assert.equal(writes.at(-1).body.slots[0].entries.at(-1).planned_item_ref, 'item-1');
  await page.getByRole('button', {name: 'Oats 150', exact: true}).click();
  await sheet.getByRole('textbox', {name: 'Amount', exact: true}).fill('100');
  await sheet.getByRole('button', {name: 'Save', exact: true}).click();
  await sheet.waitFor({state: 'hidden'});
  assert.equal(writes.at(-1).method, 'PATCH');
  assert.equal(
    writes.at(-1).body.slots[0].entries.find((entry) => entry.planned_item_ref === 'item-0').portion.grams,
    100,
  );

  await page.getByRole('button', {name: 'Oats 200', exact: true}).click();
  await sheet.getByRole('button', {name: 'Replace', exact: true}).click();
  const picker = page.getByRole('dialog', {name: 'Replace with…'});
  await picker.getByRole('button', {name: /Banana/}).click();
  await picker.waitFor({state: 'hidden'});
  assert.equal(writes.at(-1).method, 'PATCH');
  assert.equal(
    writes.at(-1).body.slots[0].entries.find((entry) => entry.planned_item_ref === 'item-0').food_id,
    'banana',
  );
  assert.deepEqual(
    writes.at(-1).body.slots[0].entries.find((entry) => entry.planned_item_ref === 'item-0').portion,
    {kind: 'serving', amount: 1, unit: 'banana', label: 'Medium banana'},
    'replacement sends backend default portion without converting to grams',
  );
  assert.equal(
    writes.at(-1).body.slots[0].entries.find((entry) => entry.planned_item_ref === 'item-0').notes,
    'Hungry today',
  );

  await page.getByRole('button', {name: 'Mark not eaten', exact: true}).first().click();
  await page.getByRole('button', {name: 'Oats 100', exact: true}).waitFor();
  assert.equal(writes.at(-1).method, 'PATCH');
  assert.equal(writes.at(-1).body.slots[0].entries.length, 1);
  await page.getByRole('button', {name: 'Add food off-plan'}).click();
  const add = page.getByRole('dialog', {name: 'Add food…'});
  failNext = true;
  await add.getByRole('button', {name: /Banana/}).click();
  await page.waitForFunction(() => !document.querySelector('[role="dialog"]').hasAttribute('inert'));
  assert(await add.isVisible(), 'failed picker save keeps selection context');
  await add.getByRole('button', {name: /Banana/}).click();
  await add.waitFor({state: 'hidden'});
  assert.equal(writes.at(-1).body.slots[0].expected_revision, writes.at(-2).body.slots[0].expected_revision);
  assert.equal(writes.at(-1).body.slots[0].entries.at(-1).planned_item_ref, null);
  assert.deepEqual(errors, []);
  assert(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    'client no horizontal overflow',
  );
  await page.screenshot({path: '/tmp/nutrition-diary-375.png'});

  for (const width of [375, 1280]) {
    const coach = await browser.newPage({viewport: {width, height: 900}});
    coach.on('pageerror', (error) => errors.push(error.message));
    await mount(coach, coachOrigin, '/src/clients/client-nutrition-day.tsx', true);
    await coach.route('**/v1/coach/clients/*/nutrition-days**', (route) =>
      route.fulfill({json: {data: [day()], count: 1}}),
    );
    await coach.goto(`${coachOrigin}/clients/client/nutrition/2026-09-05`);
    await coach.getByText('Oats', {exact: true}).waitFor();
    await coach.getByText('Pending', {exact: true}).waitFor();
    await coach.getByText('Banana', {exact: true}).waitFor();
    await coach.getByText('Oats', {exact: true}).scrollIntoViewIfNeeded();
    assert(
      await coach.locator('.easy_page').evaluate((node) => node.getBoundingClientRect().height > 500),
      'coach page has real viewport height',
    );
    assert(
      await coach.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      'coach no horizontal overflow',
    );
    await coach.screenshot({path: `/tmp/nutrition-diary-coach-${width}.png`});
    await coach.close();
  }
  assert.deepEqual(errors, []);
  console.log(
    'PASS: diary 75g create + retry, cached response, pending toggle, edit, replacement, undo, extra retry; coach 375/1280',
  );
} finally {
  await browser.close();
}
