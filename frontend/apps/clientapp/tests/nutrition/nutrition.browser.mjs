import {mkdir, writeFile} from 'node:fs/promises';
import {chromium, expect} from '@playwright/test';
import {api, inviteClient} from '../auth/fixtures.mjs';

const browser = await chromium.launch();
const results = [];
await mkdir('tests/nutrition/artifacts', {recursive: true});
async function choose(page, label, option) {
  await page.getByRole('button', {name: new RegExp(`(?:^| )${label}$`)}).click();
  await page.getByRole('option', {name: option, exact: true}).click();
}
try {
  for (const width of [375, 768, 1280]) {
    const fixture = await inviteClient();
    const context = await browser.newContext({
      baseURL: process.env.CLIENT_APP_URL || 'http://localhost:1315',
      viewport: {width, height: 812},
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    try {
      await page.goto(`/invite/${fixture.token}`);
      await page.getByRole('button', {name: 'Continue with email'}).click();
      await page.getByLabel('Verification code').fill('123456');
      await page.getByRole('button', {name: 'Verify and continue'}).click();
      await expect(page.getByRole('heading', {name: 'Today', exact: true})).toBeVisible();
      const token = await page.evaluate(
        () => JSON.parse(localStorage.getItem('clientapp.auth.v1')).tokens.access_token,
      );
      const today = (await api('/v1/client/nutrition-days', {token})).data[0].date;
      const food = async (name, calories) =>
        (
          await api('/v1/coach/nutrition-foods', {
            method: 'POST',
            token: fixture.coachToken,
            body: {
              name,
              calories_per_100g: calories,
              protein_g_per_100g: 10,
              carbs_g_per_100g: 50,
              fat_g_per_100g: 5,
              fiber_g_per_100g: 3,
            },
          })
        ).data;
      const oats = await food('Rolled oats with a deliberately long descriptive product name', 300);
      const berries = await food('Mixed berries', 60);
      const yogurt = await food('Greek yogurt', 80);
      if (width === 375) {
        for (let index = 0; index < 22; index++) {
          await food(`Test extra ${String(index).padStart(2, '0')}`, 100);
        }
      }
      const recipe = (
        await api('/v1/coach/nutrition-recipes', {
          method: 'POST',
          token: fixture.coachToken,
          body: {
            name: 'Berry oat bowl',
            servings_count: 2,
            recipe_ingredients: [
              {food_id: oats.id, portion: {kind: 'gram', grams: 100}},
              {food_id: berries.id, portion: {kind: 'gram', grams: 100}},
            ],
          },
        })
      ).data;
      let plan = (
        await api('/v1/coach/nutrition-plans', {
          method: 'POST',
          token: fixture.coachToken,
          body: {name: 'Everyday meals', target_calories: 2000},
        })
      ).data;
      const first = crypto.randomUUID();
      const second = crypto.randomUUID();
      const pattern = crypto.randomUUID();
      const menu = {
        meals: [
          {
            id: first,
            name: 'Oats and berries',
            meal_items: [
              {id: crypto.randomUUID(), kind: 'food', food_id: oats.id, portion: {kind: 'gram', grams: 50}},
              {id: crypto.randomUUID(), kind: 'food', food_id: berries.id, portion: {kind: 'gram', grams: 100}},
            ],
          },
          {
            id: second,
            name: 'Yogurt breakfast',
            meal_items: [
              {id: crypto.randomUUID(), kind: 'food', food_id: yogurt.id, portion: {kind: 'gram', grams: 100}},
            ],
          },
        ],
        day_patterns: [{id: pattern, name: 'Everyday', slots: [{meal_slot: 'breakfast', meal_ids: [first, second]}]}],
        schedule: Object.fromEntries(
          ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => [day, pattern]),
        ),
      };
      plan = (
        await api(`/v1/coach/nutrition-plans/${plan.id}/menu`, {
          method: 'PUT',
          token: fixture.coachToken,
          body: {expected_revision: plan.revision, menu},
        })
      ).data;
      await api(`/v1/coach/clients/${fixture.clientId}/nutrition-plans/${plan.id}/assign`, {
        method: 'POST',
        token: fixture.coachToken,
        body: {expected_revision: plan.revision, start_date: today},
      });
      await page.getByRole('link', {name: 'Nutrition', exact: true}).click();
      await expect(page.getByRole('link', {name: /Breakfast/})).toBeVisible();
      await page.screenshot({path: `tests/nutrition/artifacts/day-${width}.png`, fullPage: true});
      await page.getByRole('button', {name: 'Previous day', exact: true}).click();
      await expect(page.getByText('No meals are planned or recorded for this day.', {exact: true})).toBeVisible();
      await page.getByRole('button', {name: 'Next day', exact: true}).click();
      await expect(page.getByRole('link', {name: /Breakfast/})).toBeVisible();
      await page.getByRole('link', {name: /Breakfast/}).click();
      await expect(page.getByRole('heading', {name: oats.name, exact: true})).toBeVisible();
      await page.getByRole('button', {name: 'Record all listed items'}).click();
      await page.getByLabel('Portion (g)', {exact: true}).first().fill('75');
      await page.getByText('Add a note', {exact: true}).first().click();
      await page.getByLabel(`Notes for ${oats.name}`, {exact: true}).fill('Breakfast after the morning walk.');
      await expect(page.getByText('Draft saved on this device.', {exact: true})).toBeVisible();
      await page.reload();
      await expect(page.getByLabel('Portion (g)', {exact: true}).first()).toHaveValue('75');
      await page.getByText('Add a note', {exact: true}).first().click();
      await expect(page.getByLabel(`Notes for ${oats.name}`, {exact: true})).toHaveValue(
        'Breakfast after the morning walk.',
      );
      let writes = 0;
      await page.route(`**/v1/client/nutrition-days/${today}`, async (route) => {
        if (route.request().method() !== 'PATCH') {
          return route.continue();
        }
        const response = await route.fetch();
        expect(response.status()).toBe(200);
        writes++;
        await route.abort('connectionreset');
      });
      await page.getByRole('button', {name: 'Save meal', exact: true}).click();
      await expect(page.getByText('Meal saved.', {exact: true})).toBeVisible();
      expect(writes).toBe(1);
      await page.unroute(`**/v1/client/nutrition-days/${today}`);
      let day = (await api('/v1/client/nutrition-days', {token})).data[0];
      expect(day.summary.logged.calories).toBe(285);
      expect(day.slots[0].revision).toBe(1);
      await expect(page.getByText('Recorded: 285 kcal', {exact: true})).toBeVisible();
      await page.getByRole('link', {name: /Breakfast/}).click();
      await page.getByLabel('Portion (g)', {exact: true}).first().fill('90');
      await expect(page.getByText('Draft saved on this device.', {exact: true})).toBeVisible();
      if (width === 375) {
        let failPage = true;
        await page.route('**/v1/client/nutrition-foods?**', (route) => {
          const cursor = new URL(route.request().url()).searchParams.get('cursor');
          return failPage && cursor && cursor !== 'start'
            ? route.fulfill({status: 503, json: {error_message: 'Unavailable'}})
            : route.continue();
        });
        await page.getByRole('button', {name: 'Add food or recipe', exact: true}).click();
        await page.getByLabel('Search library').fill('Test extra');
        await page.getByRole('button', {name: 'Search', exact: true}).click();
        await expect(page.getByText('22 foods', {exact: true})).toBeVisible();
        const choices = page.getByRole('button', {name: /^Choose Test extra/});
        await expect(choices).toHaveCount(20);
        await page.getByRole('button', {name: 'Load more', exact: true}).scrollIntoViewIfNeeded();
        await expect(page.getByRole('button', {name: 'Retry loading more', exact: true})).toBeVisible();
        await expect(choices).toHaveCount(20);
        failPage = false;
        await page.getByRole('button', {name: 'Retry loading more', exact: true}).click();
        await expect(choices).toHaveCount(22);
        await expect(page.getByText('22 foods', {exact: true})).toBeVisible();
        await page.getByRole('button', {name: 'Close', exact: true}).click();
        await expect(page.getByLabel('Portion (g)', {exact: true}).first()).toHaveValue('90');
        await page.unroute('**/v1/client/nutrition-foods?**');
      }
      const saved = day.slots[0];
      const entries = saved.rows
        .filter((row) => row.entry_id)
        .map((row) => ({
          id: row.entry_id,
          planned_item_ref: row.planned_item_ref,
          food_id: row.food_id,
          recipe_id: row.recipe_id,
          portion: {...row.portion, grams: 120},
          notes: row.notes,
        }));
      await api(`/v1/client/nutrition-days/${today}`, {
        method: 'PATCH',
        token,
        body: {slots: [{meal_slot: 'breakfast', meal_id: saved.meal_id, expected_revision: saved.revision, entries}]},
      });
      await page.getByRole('button', {name: 'Save meal', exact: true}).click();
      await expect(page.getByRole('heading', {name: 'Meal changed', exact: true})).toBeVisible();
      await expect(page.getByLabel('Portion (g)', {exact: true}).first()).toHaveValue('90');
      await page.getByRole('button', {name: 'Review my draft instead'}).click();
      await page.getByRole('dialog').getByRole('button', {name: 'Keep draft for review'}).click();
      await expect(page.getByLabel('Portion (g)', {exact: true}).first()).toHaveValue('90');
      await page.getByRole('button', {name: 'Save meal', exact: true}).click();
      await expect(page.getByText('Meal saved.', {exact: true})).toBeVisible();
      day = (await api('/v1/client/nutrition-days', {token})).data[0];
      expect(day.slots[0].revision).toBe(3);
      expect(day.summary.logged.calories).toBe(330);
      await page.getByRole('link', {name: /Breakfast/}).click();
      await choose(page, 'Meal alternative', 'Yogurt breakfast');
      await page.getByRole('dialog').getByRole('button', {name: 'Change alternative'}).click();
      await page.getByRole('button', {name: 'Record all listed items'}).click();
      await page.getByRole('button', {name: 'Add food or recipe', exact: true}).click();
      await expect(page.getByRole('dialog', {name: 'Choose food or recipe'})).toBeVisible();
      expect(
        await page
          .getByRole('button', {name: 'Save meal', exact: true})
          .evaluate((node) => Boolean(node.closest('[inert]'))),
      ).toBe(true);
      await choose(page, 'Item type', 'Recipes');
      await expect(page.getByRole('button', {name: 'Choose Berry oat bowl', exact: true})).toBeVisible();
      await page.screenshot({path: `tests/nutrition/artifacts/food-picker-${width}.png`});
      await page.getByRole('button', {name: 'Choose Berry oat bowl', exact: true}).click();
      await page.getByRole('button', {name: 'Save meal', exact: true}).click();
      await expect(page.getByText('Meal saved.', {exact: true})).toBeVisible();
      day = (await api('/v1/client/nutrition-days', {token})).data[0];
      expect(day.slots[0].rows.filter((row) => row.entry_id)).toHaveLength(2);
      expect(day.summary.logged.calories).toBe(260);
      await page.getByRole('link', {name: /Breakfast/}).click();
      await page.getByRole('button', {name: 'Replace Greek yogurt', exact: true}).click();
      await page.getByLabel('Search library').fill('Mixed berries');
      await page.getByRole('button', {name: 'Search', exact: true}).click();
      await page.getByRole('button', {name: 'Choose Mixed berries', exact: true}).click();
      await page.getByRole('button', {name: 'Remove from intake', exact: true}).last().click();
      await page.getByLabel('Portion (g)', {exact: true}).fill('150');
      await expect(page.getByText('Draft saved on this device.', {exact: true})).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await page.locator('main').evaluate((node) => node.getBoundingClientRect().width)).toBeLessThanOrEqual(
        480,
      );
      await page.screenshot({path: `tests/nutrition/artifacts/meal-${width}.png`, fullPage: true});
      await page.getByRole('button', {name: 'Save meal', exact: true}).click();
      await expect(page.getByText('Meal saved.', {exact: true})).toBeVisible();
      day = (await api('/v1/client/nutrition-days', {token})).data[0];
      expect(day.summary.logged.calories).toBe(90);
      expect(day.slots[0].rows.find((row) => row.entry_id).status).toBe('swapped');
      await page.reload();
      await expect(page.getByText('Recorded: 90 kcal', {exact: true})).toBeVisible();
      if (width === 375) {
        await api(`/v1/coach/nutrition-foods/${berries.id}`, {
          method: 'PATCH',
          token: fixture.coachToken,
          body: {expected_revision: berries.revision, name: 'Changed berry product', calories_per_100g: 600},
        });
        await page.getByRole('link', {name: /Breakfast/}).click();
        await expect(page.getByRole('heading', {name: 'Mixed berries', exact: true})).toBeVisible();
        await page.getByLabel('Portion (g)', {exact: true}).fill('200');
        await page.getByRole('button', {name: 'Save meal', exact: true}).click();
        await expect(page.getByText('Meal saved.', {exact: true})).toBeVisible();
        await expect(page.getByText('Recorded: 120 kcal', {exact: true})).toBeVisible();
        day = (await api('/v1/client/nutrition-days', {token})).data[0];
        expect(day.slots[0].rows.find((row) => row.entry_id).name).toBe('Mixed berries');
      }
      await page.getByRole('link', {name: 'View plan', exact: true}).click();
      await expect(page.getByRole('heading', {name: 'Everyday meals', exact: true})).toBeVisible();
      await expect(page.getByRole('button', {name: 'Find a plan', exact: true})).toHaveCount(0);
      await expect(page.getByRole('heading', {name: 'Weekly guidance'})).toBeVisible();
      await expect(page.locator('dl dt')).toHaveText([
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
      ]);
      await page.getByText('Oats and berries', {exact: true}).click();
      await expect(page.getByText(oats.name, {exact: true})).toBeVisible();
      await page.screenshot({path: `tests/nutrition/artifacts/plan-${width}.png`, fullPage: true});
      await page.getByRole('link', {name: 'Back', exact: true}).click();
      await expect(page).toHaveURL(/\/nutrition(?:\?|$)/);
      await expect(page.getByRole('link', {name: 'View plan', exact: true})).toBeVisible();
      await page.goto('/nutrition/plans?search=Old%20filter&archived=true');
      await expect(page.getByRole('heading', {name: 'Everyday meals', exact: true})).toBeVisible();
      await expect(page.getByRole('button', {name: 'Find a plan', exact: true})).toHaveCount(0);
      expect(errors).toEqual([]);
      results.push({
        width,
        passed: true,
        lostResponseWrites: writes,
        finalRevision: day.slots[0].revision,
        recipeId: recipe.id,
      });
    } catch (error) {
      await page.screenshot({path: `tests/nutrition/artifacts/failure-${width}.png`, fullPage: true});
      await writeFile(`tests/nutrition/artifacts/failure-${width}.txt`, await page.locator('body').innerText());
      throw error;
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  await writeFile('tests/nutrition/artifacts/results.json', JSON.stringify(results, null, 2));
}
console.log(
  'Nutrition real-API planned meals, portions, alternatives, conflict, lost response, recipe extra, replacement and saved results passed.',
);
