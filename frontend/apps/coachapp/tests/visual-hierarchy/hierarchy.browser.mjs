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
    food: ['Rolled oats', 'Nutrients per 100 g', '380'],
    client: ['Alex Morgan', 'Training plans'],
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
  await send('post', '/v1/auth/signup', {email, full_name: 'Test Coach'});
  const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
  token = guest.access_token;
  await send('post', '/v1/businesses', {
    full_name: 'Test Coach',
    name: 'Test Everyday Coaching',
    handle: `hierarchy-${unique}`,
  });
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
          measures: ['reps', 'load'],
          bodyweight: false,
          instructions: 'Move with control. Keep two repetitions in reserve.',
        })
      ).data,
    );
  }
  const workouts = ['Full body A', 'Full body B'].map((name) => ({
    id: crypto.randomUUID(),
    name,
    blocks: [
      {
        id: crypto.randomUUID(),
        format: 'superset',
        items: exercises.map((exercise) => ({
          id: crypto.randomUUID(),
          exercise_id: exercise.id,
          exercise_name: exercise.name,
          sets: Array.from({length: 3}, () => ({
            id: crypto.randomUUID(),
            kind: 'working',
            reps: {type: 'range', min: 8, max: 10},
            load: {kg: 12, entered_unit: 'kg'},
            rest_s: 90,
          })),
        })),
      },
    ],
  }));
  const training = (
    await send('post', '/v1/coach/training-plans', {
      name: 'Build a stronger foundation',
      description: 'Three focused sessions each week.',
      content: {
        workouts,
        schedule: {
          cycle_weeks: 1,
          entries: [0, 2, 4].map((day) => ({id: crypto.randomUUID(), day, ref: workouts[day === 2 ? 1 : 0].id})),
        },
      },
    })
  ).data;
  const food = (
    await send('post', '/v1/coach/foods', {
      name: 'Rolled oats',
      kind: 'food',
      basis: '100g',
      nutrients: {energy_kcal: 380, protein_g: 13, carbs_g: 67, fat_g: 7, fiber_g: 10},
    })
  ).data;
  const person = (
    await send('post', '/v1/coach/clients', {
      full_name: 'Alex Morgan',
      email: `client-${unique}@example.test`,
    })
  ).data;
  const invitation_token = new URL(person.invite_url).pathname.split('/').at(-1);
  await send('post', '/v1/auth/accept-invite', {email: person.email, invitation_token});
  await send('post', `/v1/auth/invites/${invitation_token}/accept`, {
    email: person.email,
    otp: '123456',
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
      ['food', `/foods/${food.id}`, 'Food name'],
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
          await exercise.locator('..').evaluate((node) => {
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
    ...exercises.map((exercise) => `/v1/coach/training-exercises/${exercise.id}`),
  ];
  for (const path of fixtures) {
    await send('delete', path);
    const response = await api.get(path.split('?')[0], {headers: {authorization: `Bearer ${token}`}});
    if (path.startsWith('/v1/coach/training-exercises/')) {
      expect(response.status()).toBe(200);
      expect((await response.json()).data.archived_at).not.toBeNull();
    } else {
      expect(response.status(), `Removed fixture ${path}`).toBe(404);
    }
  }
  console.log(`Verified ${results.length} screen/viewport combinations. Evidence: ${output}`);
} finally {
  await browser.close();
  await api.dispose();
}
