import {mkdir, writeFile} from 'node:fs/promises';
import {chromium, expect, request} from '@playwright/test';

// Real, disposable coaching account; never uses an existing coach's records.
const phase = process.env.HIERARCHY_PHASE || 'after';
const output = `/tmp/coachapp-hierarchy/${phase}`;
await mkdir(output, {recursive: true});
const api = await request.newContext({baseURL: 'http://localhost:4000'});
const browser = await chromium.launch();
let token;
async function send(method, path, data) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()} ${response.ok() ? '' : await response.text()}`).toBe(
    true,
  );
  return response.status() === 204 ? null : response.json();
}
const results = [];
function verifyHierarchy(name, metrics) {
  const order = {
    training: ['Build a stronger foundation', 'Full body A', 'Goblet squat'],
    nutrition: ['Everyday balanced meals', 'Daily targets', '2200'],
    recipe: ['Overnight breakfast oats', 'Ingredients', 'Rolled oats', '2'],
    food: ['Rolled oats', 'Nutrition per 100 g', '380'],
    client: ['Alex Morgan', 'Training'],
    'client-details': ['Alex Morgan', 'Contact details'],
  }[name];
  if (!order) {
    return;
  }
  const sizes = order.map((text) => {
    const metric = metrics.find((value) => value.text === text);
    expect(metric, `${name}: missing ${text}`).toBeTruthy();
    return Number.parseFloat(metric.size);
  });
  for (let i = 1; i < sizes.length; i++) {
    expect(sizes[i - 1], `${name}: ${order[i - 1]} should lead ${order[i]}`).toBeGreaterThan(sizes[i]);
  }
}
try {
  const unique = Date.now();
  const email = `hierarchy-${unique}@example.test`;
  await send('post', '/v1/auth/signup', {email, first_name: 'Test Coach'});
  const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
  token = guest.access_token;
  await send('post', '/v1/businesses', {name: 'Test Everyday Coaching', handle: `hierarchy-${unique}`});
  const tokens = await send('post', '/v1/auth/token', {
    grant_type: 'refresh_token',
    refresh_token: guest.refresh_token,
    role: 'coach',
  });
  token = tokens.access_token;
  const exercises = [];
  for (const name of ['Goblet squat', 'Dumbbell Romanian deadlift', 'Seated cable row']) {
    exercises.push(
      (
        await send('post', '/v1/coach/training-exercises', {
          name,
          instructions: 'Move with control. Keep two repetitions in reserve.',
        })
      ).data,
    );
  }
  let training = (
    await send('post', '/v1/coach/training-plans', {
      name: 'Build a stronger foundation',
      description: 'Three focused sessions each week.',
    })
  ).data;
  training = (
    await send('put', `/v1/coach/training-plans/${training.id}/prescription`, {
      expected_revision: training.revision,
      workouts: ['Full body A', 'Full body B'].map((name, i) => ({
        local_ref: `w${i}`,
        name,
        position: i,
        prescribed_exercises: exercises.map((exercise, position) => ({
          local_ref: `e${i}${position}`,
          exercise_id: exercise.id,
          position,
          prescribed_sets: Array.from({length: 3}, () => ({
            set_type: 'working',
            reps: '8–10',
            load_value: '12',
            load_unit: 'kg',
            rest_seconds: 90,
            notes: '',
          })),
        })),
      })),
      schedule: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((weekday, i) => ({
        weekday,
        ...([0, 2, 4].includes(i) ? {workout_ref: i === 2 ? 'w1' : 'w0'} : {}),
      })),
    })
  ).data;
  const food = (
    await send('post', '/v1/coach/nutrition-foods', {
      name: 'Rolled oats',
      calories_per_100g: 380,
      protein_g_per_100g: 13,
      carbs_g_per_100g: 67,
      fat_g_per_100g: 7,
      fiber_g_per_100g: 10,
    })
  ).data;
  const recipe = (
    await send('post', '/v1/coach/nutrition-recipes', {
      name: 'Overnight breakfast oats',
      servings_count: 2,
      recipe_ingredients: [{food_id: food.id, portion: {kind: 'gram', grams: 100}}],
    })
  ).data;
  const nutrition = (
    await send('post', '/v1/coach/nutrition-plans', {
      name: 'Everyday balanced meals',
      target_calories: 2200,
      target_protein_g: 140,
    })
  ).data;
  const person = (
    await send('post', '/v1/coach/clients/invite', {
      first_name: 'Alex',
      last_name: 'Morgan',
      email: `client-${unique}@example.test`,
    })
  ).data;
  const invitation_token = new URL(person.invite_url).pathname.split('/').at(-1);
  await send('post', '/v1/auth/accept-invite', {email: person.email, invitation_token});
  await send('post', '/v1/auth/accept-invite/verify', {email: person.email, invitation_token, otp: '123456'});
  await send('patch', `/v1/coach/clients/${person.id}`, {
    stage: 'coaching',
    required_services: ['training', 'nutrition'],
    notes: 'Prefers morning sessions.',
  });
  for (const width of [375, 1280]) {
    const context = await browser.newContext({baseURL: 'http://localhost:2022', viewport: {width, height: 960}});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/login');
    await page.evaluate(async (value) => {
      const {saveSession} = await import('/src/api/session.ts');
      saveSession(value);
    }, tokens);
    const screens = [
      ['training', `/training-plans/${training.id}`, 'Plan name · edit anytime'],
      ['nutrition', `/nutrition-plans/${nutrition.id}`, 'Plan name'],
      ['recipe', `/nutrition-recipes/${recipe.id}`, 'Recipe name'],
      ['food', `/nutrition-foods/${food.id}`, 'Food name'],
      ['exercise', `/training-exercises/${exercises[0].id}`, 'Exercise name'],
      ['clients', '/', 'Search clients'],
      ['client', `/clients/${person.id}`, null],
      ['client-details', `/clients/${person.id}/profile`, 'Contact email'],
    ];
    for (const [name, path, label] of screens) {
      await page.goto(path);
      if (label) {
        await expect(page.getByLabel(label, {exact: true})).toBeVisible();
      } else {
        await expect(page.getByRole('heading', {name: 'Alex Morgan', exact: true})).toBeVisible();
      }
      if (name === 'nutrition') {
        await page.getByRole('button', {name: 'Add meal', exact: true}).click();
        await page.getByLabel('Meal name', {exact: true}).fill('Oats and fruit');
        await page.getByRole('button', {name: 'Create day variation', exact: true}).click();
      }
      await page.evaluate(() => {
        document.activeElement?.blur();
        scrollTo(0, 0);
      });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${name} overflow ${width}`,
      ).toBe(true);
      const metrics = await page.locator('main').evaluate((node) =>
        [...node.querySelectorAll('h1,h2,h3,input')]
          .filter((el) => el.getClientRects().length)
          .map((el) => ({
            tag: el.tagName,
            text: el.textContent || el.value,
            size: getComputedStyle(el).fontSize,
            weight: getComputedStyle(el).fontWeight,
          })),
      );
      if (phase !== 'before') {
        verifyHierarchy(name, metrics);
      }
      if (name === 'training') {
        const exercise = page.getByRole('heading', {name: 'Goblet squat', exact: true});
        expect(
          await exercise
            .locator('..')
            .locator('..')
            .evaluate((node) => {
              const style = getComputedStyle(node);
              return [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth];
            }),
        ).toEqual(['0px', '0px', '0px', '0px']);
      }
      await page.screenshot({path: `${output}/${name}-${width}.png`, fullPage: true, animations: 'disabled'});
      await page.screenshot({path: `${output}/${name}-viewport-${width}.png`, animations: 'disabled'});
      results.push({name, path, width, metrics});
    }
    expect(errors).toEqual([]);
    await context.close();
  }
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  const fixtures = [
    `/v1/coach/training-plans/${training.id}?expected_revision=${training.revision}`,
    `/v1/coach/nutrition-plans/${nutrition.id}?expected_revision=${nutrition.revision}`,
    `/v1/coach/nutrition-recipes/${recipe.id}`,
    `/v1/coach/nutrition-foods/${food.id}`,
    ...exercises.map((exercise) => `/v1/coach/training-exercises/${exercise.id}`),
  ];
  for (const path of fixtures) {
    await send('delete', path);
    const response = await api.get(path.split('?')[0], {headers: {authorization: `Bearer ${token}`}});
    expect(response.status(), `Removed fixture ${path}`).toBe(404);
  }
  console.log(`Verified ${results.length} screen/viewport combinations. Evidence: ${output}`);
} finally {
  await browser.close();
  await api.dispose();
}
