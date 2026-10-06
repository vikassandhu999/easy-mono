import {execFileSync} from 'node:child_process';
import {mkdir, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium, expect, request} from '@playwright/test';

const repo = fileURLToPath(new URL('../../../../../', import.meta.url));
const screens = `${repo}/.scratch/core-domains/build/s1-screens`;
const api = await request.newContext({baseURL: 'http://localhost:4000'});
const browser = await chromium.launch();
const errors = [];
const failures = [];
await mkdir(screens, {recursive: true});
const suffix = String(Date.now());
let coach;
let clientPage;
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()} ${await response.text()}`).toBe(true);
  return response.status() === 204 ? null : response.json();
}
function dateAfter(date, days) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
async function select(page, label, option, scope = page) {
  await scope.getByRole('button', {name: new RegExp(label)}).click();
  await page.getByRole('option', {name: option, exact: true}).click();
}
async function shot(page, name) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path: `${screens}/${name}.png`, fullPage: true});
}
try {
  const email = `s1-coach-${suffix}@example.test`;
  await send('post', '/v1/auth/signup', {email, full_name: 'Slice One Coach'});
  const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
  await send(
    'post',
    '/v1/businesses',
    {full_name: 'Slice One Coach', name: 'Slice One Training', handle: `s1-${suffix}`},
    guest.access_token,
  );
  const tokens = await send('post', '/v1/auth/token', {
    grant_type: 'refresh_token',
    refresh_token: guest.refresh_token,
    role: 'coach',
  });
  const token = tokens.access_token;
  const exercises = [];
  for (const name of ['S1 Squat', 'S1 Row']) {
    exercises.push(
      (await send('post', '/v1/coach/training-exercises', {name, measures: ['reps', 'load'], bodyweight: false}, token))
        .data,
    );
  }
  const clientEmail = `s1-client-${suffix}@example.test`;
  const person = (await send('post', '/v1/coach/clients', {full_name: 'Slice One Client', email: clientEmail}, token))
    .data;
  await send('patch', `/v1/coach/clients/${person.id}`, {unit_system: 'imperial'}, token);
  const invitation = new URL(person.invite_url).pathname.split('/').at(-1);
  const coachContext = await browser.newContext({
    baseURL: 'http://localhost:2022',
    viewport: {width: 1280, height: 900},
  });
  const clientContext = await browser.newContext({
    baseURL: 'http://localhost:1315',
    viewport: {width: 375, height: 812},
  });
  coach = await coachContext.newPage();
  clientPage = await clientContext.newPage();
  for (const page of [coach, clientPage]) {
    page.setDefaultTimeout(20000);
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', async (response) => {
      if (response.status() >= 400) {
        failures.push({url: response.url(), status: response.status(), body: await response.text().catch(() => '')});
      }
    });
  }
  await clientPage.goto(`/invite/${invitation}`);
  await clientPage.getByRole('button', {name: 'Continue with email'}).click();
  await clientPage.getByLabel('Verification code').fill('123456');
  await clientPage.getByRole('button', {name: 'Verify and continue'}).click();
  await expect(clientPage.getByRole('heading', {name: 'Today', exact: true})).toBeVisible();
  const currentPerson = (await send('get', `/v1/coach/clients/${person.id}`, undefined, token)).data;
  const today = currentPerson.local_date;
  const earlier = dateAfter(today, -1);
  execFileSync(
    'rtk',
    [
      'mix',
      'run',
      '-e',
      'Easy.Repo.query!("UPDATE coaching_terms SET starts_on = $1 WHERE client_id = $2", [Date.from_iso8601!(System.fetch_env!("S1_TERM_DATE")), Ecto.UUID.dump!(System.fetch_env!("S1_CLIENT_ID"))])',
    ],
    {
      cwd: `${repo}/backend`,
      env: {...process.env, S1_TERM_DATE: dateAfter(today, -2), S1_CLIENT_ID: person.id},
      stdio: 'pipe',
    },
  );
  await coach.goto('/login');
  await coach.getByLabel('Email', {exact: true}).fill(email);
  await coach.getByRole('button', {name: 'Continue with email'}).click();
  await coach.getByLabel('Verification code').fill('123456');
  await coach.getByRole('button', {name: 'Verify and continue'}).click();
  await expect(coach).toHaveURL(/\/(clients|welcome)$/);
  await coach.goto('/training-plans/new');
  await coach.getByLabel('Plan name · edit anytime').fill('Slice One Strength');
  await coach.getByRole('button', {name: 'Add workout', exact: true}).click();
  await coach.getByLabel('Workout name', {exact: true}).fill('Strength A');
  await select(coach, 'Block format', 'Superset');
  await coach.getByRole('button', {name: 'Add exercises', exact: true}).click();
  await coach.getByLabel('Search exercises', {exact: true}).fill('S1 ');
  await coach.getByRole('button', {name: 'Select S1 Squat', exact: true}).click();
  await coach.getByRole('button', {name: 'Select S1 Row', exact: true}).click();
  await coach.getByRole('button', {name: 'Add 2 exercises', exact: true}).click();
  const firstSet = coach
    .locator('details')
    .filter({has: coach.getByRole('button', {name: /Rep target/})})
    .first();
  await select(coach, 'Rep target', 'Range', firstSet);
  await firstSet.getByLabel('Minimum reps').fill('8');
  await firstSet.getByLabel('Maximum reps').fill('12');
  await firstSet.getByLabel('Load (kg)', {exact: true}).fill('45');
  await firstSet.getByLabel('RPE', {exact: true}).fill('8');
  await firstSet.getByLabel('RIR', {exact: true}).fill('2');
  await firstSet.getByLabel('Tempo', {exact: true}).fill('3010');
  await firstSet.getByLabel('Rest (s)', {exact: true}).fill('60');
  const secondSet = coach
    .locator('details')
    .filter({has: coach.getByRole('button', {name: /Rep target/})})
    .nth(1);
  await select(coach, 'Rep target', 'AMRAP', secondSet);
  await select(coach, 'Load unit', 'lb', secondSet);
  await select(coach, 'Distance unit', 'km', secondSet);
  for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']) {
    await coach.getByRole('button', {name: `Add ${day} workout`, exact: true}).click();
  }
  await shot(coach, '01-coach-builder-1280');
  await coach.setViewportSize({width: 375, height: 812});
  await shot(coach, '02-coach-builder-375');
  let documentWrites = 0;
  coach.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/v1/coach/training-plans')) {
      documentWrites++;
    }
  });
  await coach.getByRole('button', {name: 'Save plan', exact: true}).click();
  await expect(coach).toHaveURL(/training-plans\/[0-9a-f-]{36}$/);
  expect(documentWrites).toBe(1);
  const templateId = new URL(coach.url()).pathname.split('/').at(-1);
  const template = (await send('get', `/v1/coach/training-plans/${templateId}`, undefined, token)).data;
  expect(template.content.workouts[0].blocks[0].items[1].sets[0].load).toBeNull();
  expect(template.content.workouts[0].blocks[0].items[1].sets[0].distance).toBeNull();
  await coach.goto(`/clients/${person.id}/training-plans/assign/${templateId}`);
  await coach.getByLabel('Start date', {exact: true}).fill(dateAfter(today, -2));
  await coach.getByRole('button', {name: 'Assign plan', exact: true}).click();
  await expect(coach).toHaveURL(new RegExp(`/clients/${person.id}$`));
  const plan = (await send('get', `/v1/coach/clients/${person.id}/training-plans`, undefined, token)).data[0];
  await coach.goto(`/clients/${person.id}/training-plans/${plan.id}/edit`);
  await coach.getByLabel('Plan name · edit anytime').fill('Slice One Strength Updated');
  await coach.getByRole('button', {name: 'Publish from today', exact: true}).click();
  await expect(coach.getByText('Revision published from today.', {exact: true})).toBeVisible();
  await coach.getByLabel('Workout name', {exact: true}).fill('Strength A next');
  await coach.getByLabel('Effective date', {exact: true}).fill(dateAfter(today, 3));
  await coach.getByRole('button', {name: 'Schedule revision', exact: true}).click();
  await expect(coach.getByText(`Revision scheduled for ${dateAfter(today, 3)}.`, {exact: true})).toBeVisible();
  await expect(coach.getByText(/An edit from today applies until/)).toBeVisible();
  await coach.getByText('View scheduled workouts', {exact: true}).click();
  await expect(coach.getByText('Strength A next', {exact: true})).toBeVisible();
  await coach.getByText('View scheduled workouts', {exact: true}).click();
  await shot(coach, '03-scheduled-revision-375');
  await coach.setViewportSize({width: 1280, height: 900});
  await shot(coach, '04-scheduled-revision-1280');
  await coach.getByRole('button', {name: 'Withdraw scheduled revision', exact: true}).click();
  await expect(coach.getByRole('button', {name: 'Withdraw scheduled revision', exact: true})).toHaveCount(0);
  await clientPage.reload();
  await expect(clientPage.getByRole('link', {name: 'Strength A', exact: true})).toBeVisible();
  await shot(clientPage, '05-client-today-375');
  await clientPage.getByRole('link', {name: 'Strength A', exact: true}).click();
  await clientPage.getByRole('button', {name: 'Start workout', exact: true}).click();
  await expect(clientPage).toHaveURL(/training\/sessions\//);
  const sessionId = new URL(clientPage.url()).pathname.split('/').at(-1);
  await clientPage.getByLabel('Reps', {exact: true}).fill('8');
  await clientContext.setOffline(true);
  await clientPage.getByLabel('Load (lb)', {exact: true}).fill('100');
  await expect(clientPage.getByText('Draft saved on this device.', {exact: true})).toBeVisible();
  await clientContext.setOffline(false);
  await clientPage.reload();
  await expect(clientPage.getByLabel('Load (lb)', {exact: true})).toHaveValue('100');
  const attempts = [];
  await clientPage.route(`**/v1/client/training-sessions/${sessionId}/performed-sets`, async (route) => {
    attempts.push(route.request().postDataJSON());
    const response = await route.fetch();
    expect(response.status()).toBe(201);
    await route.abort('connectionreset');
  });
  await clientPage.getByRole('button', {name: 'Save set', exact: true}).click();
  await expect(clientPage.getByRole('button', {name: 'Retry set save', exact: true})).toBeVisible();
  await clientPage.reload();
  await clientPage.unroute(`**/v1/client/training-sessions/${sessionId}/performed-sets`);
  await clientPage.getByRole('button', {name: 'Retry set save', exact: true}).click();
  await expect(clientPage.getByText('Set saved.', {exact: true})).toBeVisible();
  const prescribed = clientPage.getByRole('list', {name: 'Prescribed sets'});
  await prescribed.getByRole('button', {name: /Set 1.*AMRAP/}).click();
  await select(clientPage, 'Set outcome', 'Skipped');
  await clientPage.getByRole('button', {name: 'Save set', exact: true}).click();
  await expect(clientPage.getByText('Set saved.', {exact: true})).toBeVisible();
  await prescribed.getByRole('button', {name: 'Add extra set', exact: true}).first().click();
  await clientPage.getByLabel('Reps', {exact: true}).fill('5');
  await clientPage.getByLabel('Load (lb)', {exact: true}).fill('110');
  await clientPage.getByRole('button', {name: 'Save set', exact: true}).click();
  await expect(clientPage.getByText('Set saved.', {exact: true})).toBeVisible();
  await shot(clientPage, '06-client-recording-375');
  await clientPage.getByRole('button', {name: 'Finish workout', exact: true}).click();
  await clientPage.getByRole('dialog').getByRole('button', {name: 'Finish and save workout', exact: true}).click();
  await expect(clientPage.getByText('Your completed workout is saved.', {exact: true})).toBeVisible();
  const completed = (
    await send('get', `/v1/coach/clients/${person.id}/training-sessions/${sessionId}`, undefined, token)
  ).data;
  expect(completed.performed_sets).toHaveLength(3);
  expect(completed.performed_sets.filter((set) => set.outcome === 'skipped')).toHaveLength(1);
  expect(completed.performed_sets.filter((set) => set.set_id === null)).toHaveLength(1);
  expect(completed.occurrence_date).toBe(today);
  expect(attempts).toHaveLength(1);
  await clientPage.goto(`/training?date=${earlier}`);
  await clientPage.getByRole('button', {name: 'Start workout', exact: true}).click();
  await expect(clientPage).toHaveURL(/training\/sessions\//);
  const earlierSessionId = new URL(clientPage.url()).pathname.split('/').at(-1);
  await clientPage.getByLabel('Reps', {exact: true}).fill('8');
  await clientPage.getByLabel('Load (lb)', {exact: true}).fill('105');
  await clientPage.getByRole('button', {name: 'Save set', exact: true}).click();
  await expect(clientPage.getByText('Set saved.', {exact: true})).toBeVisible();
  await clientPage.getByRole('button', {name: 'Finish workout', exact: true}).click();
  await clientPage.getByRole('dialog').getByRole('button', {name: 'Finish and save workout', exact: true}).click();
  await expect(clientPage.getByText('Your completed workout is saved.', {exact: true})).toBeVisible();
  const earlierSession = (
    await send('get', `/v1/coach/clients/${person.id}/training-sessions/${earlierSessionId}`, undefined, token)
  ).data;
  expect(earlierSession.local_date).toBe(today);
  expect(earlierSession.occurrence_date).toBe(earlier);
  await shot(clientPage, '07-earlier-occurrence-375');
  await clientPage.goto('/training');
  await clientPage.getByRole('button', {name: 'Start freestyle workout', exact: true}).click();
  await expect(clientPage).toHaveURL(/training\/sessions\//);
  await clientPage.getByLabel('Exercise name', {exact: true}).fill('Extra walking');
  await clientPage.getByLabel('Time (seconds)', {exact: true}).fill('600');
  await clientPage.getByRole('button', {name: 'Save set', exact: true}).click();
  await expect(clientPage.getByText('Set saved.', {exact: true})).toBeVisible();
  await clientPage.getByRole('button', {name: 'Finish workout', exact: true}).click();
  await clientPage.getByRole('dialog').getByRole('button', {name: 'Finish and save workout', exact: true}).click();
  await expect(clientPage.getByText('Your completed workout is saved.', {exact: true})).toBeVisible();

  await coach.goto(`/clients/${person.id}`);
  await expect(coach.getByRole('heading', {name: 'This week’s training', exact: true})).toBeVisible();
  await expect(coach.getByRole('link', {name: 'Done · View session', exact: true}).first()).toBeVisible();
  await expect(coach.getByText(/Extra ·/)).toBeVisible();
  await shot(coach, '08-coach-week-1280');
  await coach.setViewportSize({width: 375, height: 812});
  await shot(coach, '09-coach-week-375');
  await coach.getByRole('button', {name: 'Exercise PRs', exact: true}).click();
  await coach.getByLabel('Search exercises', {exact: true}).fill('S1 Squat');
  await coach.getByRole('button', {name: 'S1 Squat', exact: true}).click();
  await expect(coach.getByRole('heading', {name: 'S1 Squat · PRs', exact: true})).toBeVisible();
  await expect(coach.getByText('8 reps', {exact: true})).toBeVisible();
  await shot(coach, '10-coach-pr-375');
  await coach.goto(`/clients/${person.id}/training-sessions/${sessionId}`);
  await expect(coach.getByRole('heading', {name: 'Prescribed and performed', exact: true})).toBeVisible();
  await shot(coach, '11-coach-session-375');
  await coach.setViewportSize({width: 1280, height: 900});
  await shot(coach, '12-coach-session-1280');
  expect(errors).toEqual([]);
  await writeFile(
    `${screens}/results.json`,
    JSON.stringify(
      {
        passed: true,
        templateId,
        planId: plan.id,
        clientId: person.id,
        sessionId,
        earlierSessionId,
        today,
        earlier,
        documentWrites,
        offlineDraft: true,
        blankUnits: true,
        extraWorkout: true,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    'Slice 1 end-to-end flow passed: coach 1280/375, client 375, lost response retry, earlier occurrence, weekly results and PRs.',
  );
} catch (error) {
  await writeFile(`${screens}/failure-responses.json`, JSON.stringify(failures, null, 2));
  if (coach) {
    await writeFile(`${screens}/failure-coach.txt`, await coach.locator('body').ariaSnapshot());
  }
  if (clientPage) {
    await writeFile(`${screens}/failure-client.txt`, await clientPage.locator('body').ariaSnapshot());
  }
  if (coach) {
    await coach.screenshot({path: `${screens}/failure-coach.png`, fullPage: true});
  }
  if (clientPage) {
    await clientPage.screenshot({path: `${screens}/failure-client.png`, fullPage: true});
  }
  throw error;
} finally {
  await browser.close();
  await api.dispose();
}
