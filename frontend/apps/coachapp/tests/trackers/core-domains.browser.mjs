import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium, expect, request} from '@playwright/test';

const repo = fileURLToPath(new URL('../../../../../', import.meta.url));
const screens = `${repo}/.scratch/core-domains/build/s3-screens`;
await mkdir(screens, {recursive: true});
const api = await request.newContext({baseURL: 'http://localhost:4000'});
const browser = await chromium.launch();
const errors = [];
const suffix = String(Date.now());
let coach;
let clientPage;

async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()} ${await response.text()}`).toBe(true);
  return response.status() === 204 ? null : response.json();
}

async function select(page, label, option, scope = page) {
  await scope.getByRole('button', {name: new RegExp(label)}).click();
  await page.getByRole('option', {name: option, exact: true}).click();
}

async function shot(page, name) {
  await page.evaluate(() => window.scrollTo(0, 0));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path: `${screens}/${name}.png`, fullPage: true});
}

async function login(page, email) {
  await page.goto('/login');
  await page.getByLabel('Email', {exact: true}).fill(email);
  await page.getByRole('button', {name: 'Continue with email'}).click();
  await page.getByLabel('Verification code').fill('123456');
  await page.getByRole('button', {name: 'Verify and continue'}).click();
  await expect(page).toHaveURL(/\/(clients|welcome)$/);
}

async function chooseTracker(name) {
  await coach.getByLabel('Search Trackers', {exact: true}).fill(name);
  await coach.getByRole('button', {name: `Select ${name}`, exact: true}).click();
}

async function assign(clientId, name, timing) {
  await coach.goto(`/clients/${clientId}/trackers`);
  await coach.getByRole('button', {name: 'Add Tracker', exact: true}).click();
  await chooseTracker(name);
  await select(coach, 'Timing', timing);
  await coach.getByRole('button', {name: 'Add to Tracker list', exact: true}).click();
  await expect(coach.getByRole('status')).toHaveText('Tracker added.');
  await expect(coach.getByText(name, {exact: true}).first()).toBeVisible();
}

async function openClientRecord(tracker) {
  await clientPage.goto(`/trackers/${tracker.id}?record=1`);
  const form = clientPage.getByRole('region', {name: `Record ${tracker.name}`, exact: true});
  await expect(form).toBeVisible();
  return form;
}

async function createReportPdf() {
  const page = await browser.newPage();
  await page.setContent('<h1>Sample blood report</h1><p>Browser test fixture. Page one.</p>');
  const bytes = await page.pdf({format: 'A4'});
  await page.close();
  return bytes;
}

async function verifyOtherTrackerFlows({person, token, today, tracker, photo}) {
  const weight = tracker('Body weight');
  for (const [index, value] of ['179', '178'].entries()) {
    await clientPage.goto(`/trackers/${weight.id}`);
    await clientPage.getByRole('button', {name: 'Correct entry', exact: true}).click();
    const form = clientPage.getByRole('region', {name: 'Record Body weight', exact: true});
    await expect(form.getByLabel('Value', {exact: true})).toHaveValue(index === 0 ? '180' : '179');
    await form.getByLabel('Value', {exact: true}).fill(value);
    await form.getByRole('button', {name: 'Save correction', exact: true}).click();
    await expect(form).toHaveCount(0);
    const entries = (
      await send('get', `/v1/coach/clients/${person.id}/tracker-entries?tracker_id=${weight.id}`, undefined, token)
    ).data;
    expect(entries).toHaveLength(1);
    expect(entries[0].revision).toBe(index + 2);
    expect(Number(entries[0].number_value)).toBeCloseTo(Number(value) * 0.45359237, 5);
  }

  await assign(person.id, 'Hunger', 'After each meal');
  await clientPage.goto(`/nutrition/days/${today}/new`);
  await clientPage.getByRole('button', {name: 'Quick add', exact: true}).click();
  await clientPage.getByLabel('Quick add name', {exact: true}).fill('Tracker test meal');
  await clientPage.getByLabel('Calories (kcal)', {exact: true}).fill('100');
  await clientPage.getByRole('button', {name: 'Add quick entry', exact: true}).click();
  await clientPage.getByRole('button', {name: 'Save meal', exact: true}).click();
  await expect(clientPage.getByText('After your meal', {exact: true})).toBeVisible();
  await clientPage.getByRole('button', {name: 'Record Hunger', exact: true}).click();
  let form = clientPage.getByRole('region', {name: 'Record Hunger', exact: true});
  await select(clientPage, 'Rating', '3', form);
  await shot(clientPage, '14-client-after-meal-375');
  await form.getByRole('button', {name: 'Save entry', exact: true}).click();
  await expect
    .poll(
      async () =>
        (await send('get', `/v1/coach/clients/${person.id}/trackers/${tracker('Hunger').id}/metrics`, undefined, token))
          .data.meal_coverage,
    )
    .toEqual({recorded: 1, total: 1});

  await clientPage.goto('/');
  await clientPage.getByRole('link', {name: 'Add something else', exact: true}).click();
  await clientPage.getByLabel('Search Trackers', {exact: true}).fill('Progress photo front');
  await clientPage.getByRole('link', {name: /^Progress photo front/}).click();
  const front = tracker('Progress photo front');
  for (let index = 0; index < 2; index++) {
    form = await openClientRecord(front);
    await form
      .getByLabel('Photos', {exact: true})
      .setInputFiles({name: `front-${index}.png`, mimeType: 'image/png', buffer: photo});
    await form.getByRole('button', {name: 'Save entry', exact: true}).click();
    await expect(form).toHaveCount(0);
  }
  await expect(clientPage.getByRole('heading', {name: 'Latest photo', exact: true})).toBeVisible();
  await select(clientPage, 'Compare photo with', 'First photo');
  await expect(clientPage.getByRole('heading', {name: 'First photo', exact: true})).toBeVisible();
  const assignments = (await send('get', `/v1/coach/clients/${person.id}/tracker-assignments`, undefined, token)).data;
  expect(assignments.map((item) => item.tracker.id)).not.toContain(front.id);
  await shot(clientPage, '15-client-photo-comparison-375');
  await coach.goto(`/clients/${person.id}/tracker-history?tracker_id=${front.id}`);
  await shot(coach, '16-coach-photo-comparison-375');

  await coach.goto('/trackers/new');
  await coach.getByLabel('Tracker name', {exact: true}).fill('Custom test value');
  await coach.getByLabel('Unit', {exact: true}).fill('points');
  await coach.getByRole('button', {name: 'Create Tracker', exact: true}).click();
  await expect(coach).toHaveURL(/\/trackers\/[0-9a-f-]{36}$/);
  await coach.getByRole('button', {name: 'Archive Tracker', exact: true}).click();
  await expect(coach.getByText('Tracker archived.', {exact: true})).toBeVisible();
  await coach.getByRole('button', {name: 'Restore Tracker', exact: true}).click();
  await expect(coach.getByText('Tracker restored.', {exact: true})).toBeVisible();
  await coach.getByRole('button', {name: 'Delete unused Tracker', exact: true}).click();
  await coach.getByRole('button', {name: 'Confirm delete', exact: true}).click();
  await expect(coach).toHaveURL(/\/trackers$/);

  await coach.goto('/tracker-templates/new');
  await coach.getByLabel('Template name', {exact: true}).fill('Sleep and reflection');
  await coach.getByRole('button', {name: 'Add Tracker', exact: true}).click();
  await chooseTracker('Sleep hours');
  await select(coach, 'Timing', 'Daily');
  await coach.getByRole('button', {name: 'Save template', exact: true}).click();
  await expect(coach).toHaveURL(/\/tracker-templates\/[0-9a-f-]{36}$/);
  const templateId = new URL(coach.url()).pathname.split('/').at(-1);
  await shot(coach, '17-coach-template-375');
  await coach.goto(`/clients/${person.id}/trackers`);
  await coach.getByRole('button', {name: 'Apply template', exact: true}).click();
  await coach.getByRole('button', {name: 'Select Sleep and reflection', exact: true}).click();
  await coach.getByRole('button', {name: 'Apply this template', exact: true}).click();
  await expect
    .poll(async () =>
      (await send('get', `/v1/coach/clients/${person.id}/tracker-assignments`, undefined, token)).data.map(
        (item) => item.tracker.name,
      ),
    )
    .toEqual(['Sleep hours']);
  await coach.getByRole('button', {name: 'Change timing', exact: true}).click();
  await select(coach, 'Timing', 'Weekly');
  await coach.getByRole('button', {name: 'Save timing', exact: true}).click();
  await expect
    .poll(
      async () =>
        (await send('get', `/v1/coach/clients/${person.id}/tracker-assignments`, undefined, token)).data[0].timing,
    )
    .toBe('weekly');
  await coach.goto('/settings/business');
  await coach.getByRole('button', {name: 'Choose default template', exact: true}).click();
  await coach.getByRole('button', {name: 'Select Sleep and reflection', exact: true}).click();
  await coach.getByRole('button', {name: 'Save Tracker default', exact: true}).click();
  await expect
    .poll(
      async () => (await send('get', '/v1/coach/tracker-settings', undefined, token)).data.default_tracker_template_id,
    )
    .toBe(templateId);
  await shot(coach, '18-coach-default-375');
}

try {
  const email = `s3-coach-${suffix}@example.test`;
  await send('post', '/v1/auth/signup', {email, full_name: 'Slice Three Coach'});
  const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
  await send(
    'post',
    '/v1/businesses',
    {
      full_name: 'Slice Three Coach',
      name: 'Slice Three Trackers',
      handle: `s3-${suffix}`,
    },
    guest.access_token,
  );
  const tokens = await send('post', '/v1/auth/token', {
    grant_type: 'refresh_token',
    refresh_token: guest.refresh_token,
    role: 'coach',
  });
  const token = tokens.access_token;
  const clientEmail = `s3-client-${suffix}@example.test`;
  const person = (
    await send(
      'post',
      '/v1/coach/clients',
      {
        full_name: 'Slice Three Client',
        email: clientEmail,
      },
      token,
    )
  ).data;
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
  }

  await clientPage.goto(`/invite/${invitation}`);
  await clientPage.getByRole('button', {name: 'Continue with email'}).click();
  await clientPage.getByLabel('Verification code').fill('123456');
  await clientPage.getByRole('button', {name: 'Verify and continue'}).click();
  await expect(clientPage.getByRole('heading', {name: 'Today', exact: true})).toBeVisible();
  const today = (await send('get', `/v1/coach/clients/${person.id}`, undefined, token)).data.local_date;
  const defaults = (await send('get', `/v1/coach/clients/${person.id}/tracker-assignments`, undefined, token)).data;
  expect(defaults.map((item) => ({name: item.tracker.name, timing: item.timing, weekday: item.weekday}))).toEqual([
    {name: 'Reflection', timing: 'weekly', weekday: 6},
  ]);
  await login(coach, email);
  await coach.goto(`/clients/${person.id}/trackers`);
  await expect(coach.getByText('Reflection', {exact: true})).toBeVisible();
  await shot(coach, '01-default-list-1280');

  await coach.goto(`/clients/${person.id}/profile`);
  await select(coach, 'Unit system', 'Imperial (lb)');
  await coach.getByRole('button', {name: 'Save changes', exact: true}).click();
  await expect
    .poll(async () => (await send('get', `/v1/coach/clients/${person.id}`, undefined, token)).data.unit_system)
    .toBe('imperial');
  await assign(person.id, 'Body weight', 'Daily');
  await assign(person.id, 'Energy', 'After each workout');
  await assign(person.id, 'Supplements taken', 'Daily');
  await coach.getByRole('button', {name: 'Request Tracker', exact: true}).click();
  await chooseTracker('Blood report');
  await coach.getByRole('button', {name: 'Request this Tracker', exact: true}).click();
  await expect(coach.getByText(/Waiting on client since/)).toBeVisible();
  await shot(coach, '02-assignments-request-1280');
  await coach.setViewportSize({width: 375, height: 812});
  await shot(coach, '03-assignments-request-375');

  const library = (await send('get', '/v1/coach/trackers?limit=100', undefined, token)).data;
  const tracker = (name) => {
    const found = library.find((item) => item.name === name);
    expect(found, `built-in Tracker ${name}`).toBeTruthy();
    return found;
  };
  const weight = tracker('Body weight');
  const habit = tracker('Supplements taken');
  const energy = tracker('Energy');
  const report = tracker('Blood report');
  const waist = tracker('Waist');

  await clientPage.goto('/');
  await expect(clientPage.getByRole('heading', {name: 'To record', exact: true})).toBeVisible();
  await expect(clientPage.getByRole('heading', {name: 'Your coach asked for', exact: true})).toBeVisible();
  await shot(clientPage, '04-client-today-375');
  let form = await openClientRecord(weight);
  await expect(form.getByRole('button', {name: /Unit/})).toContainText('lb');
  await form.getByLabel('Value', {exact: true}).fill('180');
  await expect(clientPage.getByText('Draft saved on this device.', {exact: true})).toBeVisible();
  await clientPage.reload();
  form = clientPage.getByRole('region', {name: 'Record Body weight', exact: true});
  await expect(form.getByLabel('Value', {exact: true})).toHaveValue('180');
  let lost = true;
  const attempts = [];
  await clientPage.route('**/v1/client/tracker-entries', async (route) => {
    if (route.request().method() !== 'POST') {
      return route.continue();
    }
    attempts.push(route.request().postDataJSON());
    const response = await route.fetch();
    expect(response.status()).toBe(201);
    if (lost) {
      lost = false;
      return route.abort('connectionreset');
    }
    return route.fulfill({response});
  });
  await form.getByRole('button', {name: 'Save entry', exact: true}).click();
  await expect(form.getByRole('button', {name: 'Check Tracker save', exact: true})).toBeVisible();
  await clientPage.reload();
  form = clientPage.getByRole('region', {name: 'Record Body weight', exact: true});
  await form.getByRole('button', {name: 'Check Tracker save', exact: true}).click();
  await expect(form).toHaveCount(0);
  await expect
    .poll(
      async () =>
        (await send('get', `/v1/coach/clients/${person.id}/tracker-entries?tracker_id=${weight.id}`, undefined, token))
          .count,
    )
    .toBe(1);
  await clientPage.unroute('**/v1/client/tracker-entries');
  expect(attempts.length).toBeGreaterThanOrEqual(1);
  expect(new Set(attempts.map((item) => item.request_id)).size).toBe(1);
  const weightMetrics = (
    await send('get', `/v1/coach/clients/${person.id}/trackers/${weight.id}/metrics`, undefined, token)
  ).data;
  expect(Number(weightMetrics.latest.number_value)).toBeCloseTo(81.6466266, 5);

  form = await openClientRecord(habit);
  await select(clientPage, 'Answer', 'Yes', form);
  await form.getByRole('button', {name: 'Save entry', exact: true}).click();
  await expect
    .poll(async () =>
      (await send('get', `/v1/coach/clients/${person.id}/tracker-today`, undefined, token)).data.due.map(
        (item) => item.tracker.id,
      ),
    )
    .not.toContain(habit.id);
  await clientPage.goto('/training');
  await clientPage.getByRole('button', {name: 'Start freestyle workout', exact: true}).click();
  await expect(clientPage).toHaveURL(/training\/sessions\/[0-9a-f-]{36}/);
  const sessionId = new URL(clientPage.url()).pathname.split('/').at(-1);
  await clientPage.getByRole('button', {name: 'Finish workout', exact: true}).click();
  await clientPage.getByRole('button', {name: 'Finish and save workout', exact: true}).click();
  await expect(clientPage.getByText('After your workout', {exact: true})).toBeVisible();
  await clientPage.getByRole('button', {name: 'Record Energy', exact: true}).click();
  form = clientPage.getByRole('region', {name: 'Record Energy', exact: true});
  await select(clientPage, 'Rating', '4', form);
  await shot(clientPage, '05-client-workout-energy-375');
  await form.getByRole('button', {name: 'Save entry', exact: true}).click();
  await expect
    .poll(
      async () =>
        (await send('get', `/v1/coach/clients/${person.id}/trackers/${energy.id}/metrics`, undefined, token)).data
          .workout_coverage,
    )
    .toEqual({recorded: 1, total: 1});

  const pdf = await createReportPdf();
  const photo = await readFile(`${repo}/frontend/apps/clientapp/tests/messages/photo.png`);
  form = await openClientRecord(report);
  await form.getByLabel('File date', {exact: true}).fill(today);
  await form.getByLabel('Report files', {exact: true}).setInputFiles([
    {name: 'report-page-1.pdf', mimeType: 'application/pdf', buffer: pdf},
    {name: 'report-page-2.png', mimeType: 'image/png', buffer: photo},
  ]);
  await shot(clientPage, '06-client-report-draft-375');
  await form.getByRole('button', {name: 'Save entry', exact: true}).click();
  await expect
    .poll(async () => (await send('get', `/v1/coach/clients/${person.id}/tracker-requests`, undefined, token)).data)
    .toEqual([]);
  const reports = (
    await send('get', `/v1/coach/clients/${person.id}/tracker-entries?tracker_id=${report.id}`, undefined, token)
  ).data;
  expect(reports).toHaveLength(1);
  expect(reports[0].attachments.map((item) => item.content_type)).toEqual(['application/pdf', 'image/png']);
  expect(reports[0].attachments.map((item) => item.captured_on)).toEqual([today, today]);
  const downloads = (
    await send(
      'post',
      '/v1/coach/attachments/download-urls',
      {attachment_ids: reports[0].attachments.map((item) => item.id)},
      token,
    )
  ).data;
  for (const [index, attachment] of downloads.entries()) {
    const stored = await api.get(attachment.download_url);
    expect(stored.ok()).toBe(true);
    expect(await stored.body()).toEqual(index === 0 ? pdf : photo);
  }

  await coach.goto(`/clients/${person.id}/tracker-entries/new?tracker_id=${waist.id}`);
  await coach.getByLabel('Value', {exact: true}).fill('82');
  await select(coach, 'Unit', 'cm');
  await coach.getByRole('button', {name: 'Record entry', exact: true}).click();
  await expect
    .poll(
      async () =>
        (await send('get', `/v1/coach/clients/${person.id}/tracker-entries?tracker_id=${waist.id}`, undefined, token))
          .data[0]?.recorded_by_type,
    )
    .toBe('coach');
  await coach.goto(`/clients/${person.id}/tracker-history?tracker_id=${waist.id}`);
  await expect(coach.getByText('Recorded by coach', {exact: true}).first()).toBeVisible();
  await shot(coach, '07-coach-waist-375');
  await coach.goto(`/clients/${person.id}/tracker-history?tracker_id=${weight.id}`);
  await select(coach, 'Display unit', 'kg');
  await expect(coach.getByText(/81\.6/).first()).toBeVisible();
  await shot(coach, '08-coach-weight-kg-375');
  await select(coach, 'Display unit', 'lb');
  await expect(coach.getByText(/180/).first()).toBeVisible();
  await coach.setViewportSize({width: 1280, height: 900});
  await shot(coach, '09-coach-weight-lb-1280');
  await coach.goto(`/clients/${person.id}/tracker-history?tracker_id=${energy.id}`);
  await expect(coach.getByText(/1 of 1 workouts/)).toBeVisible();
  await shot(coach, '10-coach-energy-1280');
  await coach.goto(`/clients/${person.id}/tracker-history?tracker_id=${report.id}`);
  await expect(coach.getByRole('link', {name: /View|Download/}).first()).toBeVisible();
  await shot(coach, '11-coach-report-1280');
  await coach.setViewportSize({width: 375, height: 812});
  await shot(coach, '12-coach-report-375');
  await clientPage.goto(`/trackers/${waist.id}`);
  await expect(clientPage.getByText(/Recorded by coach/).first()).toBeVisible();
  await shot(clientPage, '13-client-coach-entry-375');
  await verifyOtherTrackerFlows({person, token, today, tracker, photo});
  expect(errors).toEqual([]);
  await writeFile(
    `${screens}/results.json`,
    JSON.stringify(
      {
        passed: true,
        clientId: person.id,
        sessionId,
        today,
        defaultReflection: true,
        imperialWeight: true,
        requestReplay: true,
        workoutCoverage: '1 of 1',
        orderedReportStorageVerified: true,
        requestClosed: true,
        coachActor: true,
        repeatedCorrections: true,
        mealCoverage: '1 of 1',
        photoComparison: true,
        customTrackerLifecycle: true,
        templateAndDefault: true,
        sameDayTimingChange: true,
        errors,
      },
      null,
      2,
    ),
  );
  console.log('Slice 3 Tracker flow passed: coach 1280/375, client 375, real ordered PDF/image upload.');
} catch (error) {
  for (const [name, page] of [
    ['coach', coach],
    ['client', clientPage],
  ]) {
    if (page) {
      await writeFile(`${screens}/failure-${name}.txt`, await page.locator('body').ariaSnapshot());
      await page.screenshot({path: `${screens}/failure-${name}.png`, fullPage: true});
    }
  }
  throw error;
} finally {
  await browser.close();
  await api.dispose();
}
