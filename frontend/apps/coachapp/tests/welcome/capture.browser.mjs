import {mkdir} from 'node:fs/promises';
import {chromium, expect, request} from '@playwright/test';

// Regenerates shipped previews from this app using only a disposable .test account.
const api = await request.newContext({baseURL: process.env.COACHAPP_API_URL || 'http://localhost:4000'});
const browser = await chromium.launch();
const output = 'public/welcome';
await mkdir(output, {recursive: true});
let token;
async function send(method, path, data, accessToken = token) {
  const response = await api[method](path, {
    data,
    headers: accessToken ? {authorization: `Bearer ${accessToken}`} : {},
  });
  expect(response.ok(), `${method} ${path}: ${response.status()} ${await response.text()}`).toBe(true);
  return response.status() === 204 ? null : response.json();
}
try {
  const unique = Date.now();
  const email = `welcome-preview-${unique}@example.test`;
  await send('post', '/v1/auth/signup', {email, first_name: 'Taylor', last_name: 'Reed'});
  const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
  token = guest.access_token;
  await send('post', '/v1/businesses', {name: 'Everyday Coaching', handle: `welcome-preview-${unique}`});
  const tokens = await send('post', '/v1/auth/token', {
    grant_type: 'refresh_token',
    refresh_token: guest.refresh_token,
    role: 'coach',
  });
  token = tokens.access_token;
  const clients = [];
  for (const [first_name, last_name] of [
    ['Alex', 'Morgan'],
    ['Priya', 'Shah'],
    ['Sam', 'Rivera'],
  ]) {
    const person = (
      await send('post', '/v1/coach/clients/invite', {
        first_name,
        last_name,
        email: `${first_name}-${unique}@example.test`,
      })
    ).data;
    const invitation_token = new URL(person.invite_url).pathname.split('/').at(-1);
    await send('post', '/v1/auth/accept-invite', {email: person.email, invitation_token});
    const session = await send('post', '/v1/auth/accept-invite/verify', {
      email: person.email,
      invitation_token,
      otp: '123456',
    });
    await send('patch', `/v1/coach/clients/${person.id}`, {
      stage: 'coaching',
      required_services: ['training', 'nutrition'],
    });
    clients.push({person, token: session.access_token});
  }
  const alex = clients[0];
  const exercises = [];
  for (const name of ['Goblet squat', 'Dumbbell Romanian deadlift', 'Seated cable row']) {
    exercises.push(
      (
        await send('post', '/v1/coach/training-exercises', {
          name,
          instructions: 'Move with control. Leave two repetitions in reserve.',
        })
      ).data,
    );
  }
  let training = (
    await send('post', '/v1/coach/training-plans', {
      name: 'Stronger every week',
      description: 'Three full-body sessions. Build strength at your pace.',
    })
  ).data;
  training = (
    await send('put', `/v1/coach/training-plans/${training.id}/prescription`, {
      expected_revision: training.revision,
      workouts: ['Full body A', 'Full body B'].map((name, index) => ({
        local_ref: `w${index}`,
        name,
        position: index,
        prescribed_exercises: exercises.map((exercise, position) => ({
          local_ref: `e${index}${position}`,
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
      schedule: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(
        (weekday, index) => ({weekday, ...([0, 2, 4].includes(index) ? {workout_ref: index === 2 ? 'w1' : 'w0'} : {})}),
      ),
    })
  ).data;
  const oats = (
    await send('post', '/v1/coach/nutrition-foods', {
      name: 'Rolled oats',
      calories_per_100g: 380,
      protein_g_per_100g: 13,
      carbs_g_per_100g: 67,
      fat_g_per_100g: 7,
    })
  ).data;
  const yogurt = (
    await send('post', '/v1/coach/nutrition-foods', {
      name: 'Greek yogurt',
      calories_per_100g: 97,
      protein_g_per_100g: 9,
      carbs_g_per_100g: 4,
      fat_g_per_100g: 5,
    })
  ).data;
  let nutrition = (
    await send('post', '/v1/coach/nutrition-plans', {
      name: 'Everyday nourishment',
      target_calories: 2200,
      target_protein_g: 140,
      target_carbs_g: 250,
      target_fat_g: 70,
    })
  ).data;
  const breakfast = crypto.randomUUID();
  const snack = crypto.randomUUID();
  const everyday = crypto.randomUUID();
  const menu = {
    meals: [
      {
        id: breakfast,
        name: 'Overnight oats',
        notes: 'Prepare the night before. Add your favourite berries.',
        meal_items: [
          {id: crypto.randomUUID(), kind: 'food', food_id: oats.id, portion: {kind: 'gram', grams: 60}},
          {id: crypto.randomUUID(), kind: 'food', food_id: yogurt.id, portion: {kind: 'gram', grams: 150}},
        ],
      },
      {
        id: snack,
        name: 'Yogurt bowl',
        notes: 'A simple afternoon option.',
        meal_items: [{id: crypto.randomUUID(), kind: 'food', food_id: yogurt.id, portion: {kind: 'gram', grams: 200}}],
      },
    ],
    day_patterns: [
      {
        id: everyday,
        name: 'Everyday',
        slots: [
          {meal_slot: 'breakfast', meal_ids: [breakfast]},
          {meal_slot: 'afternoon', meal_ids: [snack]},
        ],
      },
    ],
    schedule: Object.fromEntries(
      ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => [day, everyday]),
    ),
  };
  nutrition = (
    await send('put', `/v1/coach/nutrition-plans/${nutrition.id}/menu`, {expected_revision: nutrition.revision, menu})
  ).data;
  const today = new Date().toISOString().slice(0, 10);
  await send('post', `/v1/coach/clients/${alex.person.id}/training-plans/${training.id}/assign`, {start_date: today});
  await send('post', `/v1/coach/clients/${alex.person.id}/nutrition-plans/${nutrition.id}/assign`, {start_date: today});
  await send(
    'post',
    '/v1/client/conversation/messages',
    {body: 'All three workouts done. Squats felt stronger!'},
    alex.token,
  );
  const conversation = (await send('get', `/v1/coach/clients/${alex.person.id}/conversation`)).data;
  await send('post', `/v1/coach/conversations/${conversation.id}/messages`, {
    body: 'Great work! Keep the weight and lower with control.',
  });
  await send(
    'post',
    '/v1/client/conversation/messages',
    {body: 'Can we make Wednesday a 30-minute session?'},
    alex.token,
  );

  const screens = [
    ['clients', `/clients/${alex.person.id}`, 'Alex Morgan'],
    ['training', `/training-plans/${training.id}`, 'Stronger every week'],
    ['nutrition', `/nutrition-plans/${nutrition.id}`, 'Everyday nourishment'],
    ['workspace', `/clients/${alex.person.id}/conversation`, 'Can we make Wednesday a 30-minute session?'],
  ];
  for (const [device, width, height] of [
    ['desktop', 1152, 1100],
    ['mobile', 375, 1280],
  ]) {
    const context = await browser.newContext({
      baseURL: process.env.COACHAPP_URL || 'http://localhost:2022',
      viewport: {width, height},
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await page.goto('/login');
    await page.evaluate(async (value) => {
      const {saveSession} = await import('/src/api/session.ts');
      saveSession(value);
    }, tokens);
    for (const [name, path, text] of screens) {
      await page.goto(path);
      if (name === 'training' || name === 'nutrition') {
        await expect(
          page.getByRole('textbox', {
            name: name === 'training' ? 'Plan name · edit anytime' : 'Plan name',
            exact: true,
          }),
        ).toHaveValue(text);
      } else {
        await expect(page.getByText(text, {exact: true}).first()).toBeVisible();
      }
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => {
        document.activeElement?.blur();
        scrollTo(0, 0);
      });
      const main = await page.locator('main').boundingBox();
      // Frame the feature itself so small previews do not stop at page controls.
      const anchor =
        name === 'training'
          ? page.getByRole('textbox', {name: 'Workout name', exact: true}).first()
          : name === 'nutrition'
            ? page.getByRole('region', {
                name: device === 'mobile' ? 'breakfast options' : 'Meal worksheet',
                exact: true,
              })
            : name === 'workspace'
              ? page.locator('[aria-label="Conversation history"]')
              : page.locator('main');
      if (name === 'workspace') {
        await anchor.evaluate((node) => {
          node.scrollTop = 0;
        });
      }
      await anchor.evaluate((node) =>
        window.scrollTo(0, Math.max(0, node.getBoundingClientRect().top + scrollY - 150)),
      );
      const focus = await anchor.boundingBox();
      const gutter = device === 'mobile' ? 20 : 32;
      const captureHeight = device === 'desktop' ? 680 : 300;
      const top = Math.max(130, focus.y - 16);
      const format = name === 'workspace' ? 'png' : 'jpg';
      await page.screenshot({
        path: `${output}/${name}-${device}.${format}`,
        ...(format === 'jpg' ? {type: 'jpeg', quality: 85} : {type: 'png'}),
        animations: 'disabled',
        clip: {x: main.x + gutter, y: top, width: main.width - gutter * 2, height: captureHeight},
      });
    }
    await context.close();
  }
  console.log('Captured 12 real app previews from a disposable demonstration account.');
} finally {
  await browser.close();
  await api.dispose();
}
