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
  await send('post', '/v1/auth/signup', {email, full_name: 'Taylor Reed'});
  const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
  token = guest.access_token;
  await send('post', '/v1/businesses', {
    full_name: 'Taylor Reed',
    name: 'Everyday Coaching',
    handle: `welcome-preview-${unique}`,
  });
  const tokens = await send('post', '/v1/auth/token', {
    grant_type: 'refresh_token',
    refresh_token: guest.refresh_token,
    role: 'coach',
  });
  token = tokens.access_token;
  const clients = [];
  for (const [givenName, familyName] of [
    ['Alex', 'Morgan'],
    ['Priya', 'Shah'],
    ['Sam', 'Rivera'],
  ]) {
    const person = (
      await send('post', '/v1/coach/clients', {
        full_name: `${givenName} ${familyName}`,
        email: `${givenName}-${unique}@example.test`,
      })
    ).data;
    const invitation_token = new URL(person.invite_url).pathname.split('/').at(-1);
    await send('post', '/v1/auth/accept-invite', {email: person.email, invitation_token});
    const session = await send('post', `/v1/auth/invites/${invitation_token}/accept`, {
      email: person.email,
      invitation_token,
      otp: '123456',
    });
    clients.push({person, token: session.access_token});
  }
  const alex = clients[0];
  const exercises = [];
  for (const name of ['Goblet squat', 'Dumbbell Romanian deadlift', 'Seated cable row']) {
    exercises.push(
      (
        await send('post', '/v1/coach/exercises', {
          name,
          kind: 'movement',
          goals: ['strength'],
          places: ['gym'],
          metrics: ['reps', 'weight'],
        })
      ).data,
    );
  }
  const training = (
    await send('post', '/v1/coach/workouts', {
      name: 'Stronger every week',
      type: 'prescribed',
      description: 'Move with control.',
      groups: [
        {
          name: 'Full body A',
          rounds: 3,
          exercises: exercises.map((exercise) => ({
            exercise_id: exercise.id,
            targets_mode: 'same_for_all',
            targets: [{reps: {mode: 'range', min: 8, max: 10}, weight: {mode: 'exact', value: 12}}],
            rest: [{mode: 'exact', value: 90}],
          })),
        },
      ],
    })
  ).data;
  await send('post', `/v1/coach/clients/${alex.person.id}/workout-schedules`, {
    library_workout_id: training.id,
    weekdays_mask: 21,
  });
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
    ['training', `/workouts/${training.id}`, 'Stronger every week'],
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
            name: name === 'training' ? 'Workout name' : 'Plan name',
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
