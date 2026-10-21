import {mkdir, rm, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium, expect, request} from '@playwright/test';

const artifacts = fileURLToPath(new URL('./artifacts/', import.meta.url));
await mkdir(artifacts, {recursive: true});
await Promise.all(
  ['results.json', 'failure.txt', 'failure.png'].map((name) => rm(`${artifacts}/${name}`, {force: true})),
);
const api = await request.newContext({baseURL: process.env.API_URL ?? 'http://localhost:4000'});
const browser = process.env.PLAYWRIGHT_CDP_URL
  ? await chromium.connectOverCDP(process.env.PLAYWRIGHT_CDP_URL)
  : await chromium.launch();
const errors = [];
const results = [];
let activePage;
const escaped = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function send(method, path, body, token) {
  const response = await api[method](path, {data: body, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()} ${await response.text()}`).toBe(true);
  return response.status() === 204 ? null : response.json();
}

async function account(width) {
  const unique = `${Date.now()}-${width}`;
  const email = `exercise-library-${unique}@example.test`;
  await send('post', '/v1/auth/signup', {email, full_name: 'Taylor'});
  const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
  await send(
    'post',
    '/v1/businesses',
    {full_name: 'Taylor', name: 'Exercise library', handle: `ex-${unique}`},
    guest.access_token,
  );
  return send('post', '/v1/auth/token', {
    grant_type: 'refresh_token',
    refresh_token: guest.refresh_token,
    role: 'coach',
  });
}

async function shot(page, name) {
  await page.evaluate(() => window.scrollTo(0, 0));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path: `${artifacts}/${name}.png`, fullPage: true});
}

async function journey(width) {
  const tokens = await account(width);
  const token = tokens.access_token;
  const context = await browser.newContext({
    baseURL: process.env.COACH_URL ?? 'http://localhost:2022',
    viewport: {width, height: width === 375 ? 812 : 900},
    locale: 'en-US',
  });
  const page = await context.newPage();
  activePage = page;
  page.setDefaultTimeout(20000);
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto('/login');
    await page.evaluate(async (session) => {
      const {saveSession} = await import('/src/api/session.ts');
      saveSession(session);
    }, tokens);
    await page.goto('/exercises/new');
    const name = `Climbing practice ${width}`;
    await page.getByLabel('Exercise name', {exact: true}).fill(name);
    await page.getByRole('combobox', {name: 'Kind', exact: true}).selectOption('practice');
    await page
      .getByLabel('Instructions (optional)', {exact: true})
      .fill('Keep each movement controlled.\nStop before form changes.');
    await page.getByRole('combobox', {name: 'Metric 1', exact: true}).selectOption('reps');
    await page.getByLabel('Metric 1 label', {exact: true}).fill('Moves completed');
    await page.getByRole('combobox', {name: 'Add metric', exact: true}).selectOption('attempts');
    await page.getByLabel('Metric 2 label', {exact: true}).fill('Route attempts');
    await expect(
      page.getByRole('combobox', {name: 'Add metric', exact: true}).locator('option[value="grade"]'),
    ).toHaveCount(0);
    await page.getByRole('button', {name: 'Move Attempts up', exact: true}).click();
    await expect(page.getByRole('combobox', {name: 'Metric 1', exact: true})).toHaveValue('attempts');
    await expect(page.getByLabel('Metric 1 label', {exact: true})).toHaveValue('Route attempts');
    await page.getByLabel('Equipment (optional)', {exact: true}).fill('Climbing wall and shoes.\nUse an easy route.');
    await page.getByLabel('Muscles', {exact: true}).fill('Forearms, Back');
    await page.getByRole('button', {name: 'Add link', exact: true}).click();
    await page.getByLabel('Media 1 URL', {exact: true}).fill('https://example.com/climbing-demo');
    await page.getByLabel('Media 1 caption (optional)', {exact: true}).fill('Controlled movement demo');
    await page.getByRole('button', {name: 'Save exercise', exact: true}).click();
    await expect(page).toHaveURL(/\/exercises\/[0-9a-f-]{36}$/);
    const id = new URL(page.url()).pathname.split('/').at(-1);
    const saved = (await send('get', `/v1/coach/exercises/${id}`, undefined, token)).data;
    expect(saved).toMatchObject({
      name,
      kind: 'practice',
      goals: [],
      places: [],
      instructions: 'Keep each movement controlled.\nStop before form changes.',
      equipment: 'Climbing wall and shoes.\nUse an easy route.',
      metrics: [
        {key: 'attempts', label: 'Route attempts'},
        {key: 'reps', label: 'Moves completed'},
      ],
      muscles: ['Forearms', 'Back'],
      media: [{url: 'https://example.com/climbing-demo', caption: 'Controlled movement demo'}],
      archived_at: null,
    });
    await page.reload();
    await expect(page.getByLabel('Exercise name', {exact: true})).toHaveValue(name);
    await expect(page.getByLabel('Metric 1 label', {exact: true})).toHaveValue('Route attempts');
    await expect(page.getByRole('combobox', {name: 'Metric 2', exact: true})).toHaveValue('reps');
    await expect(page.getByLabel('Metric 2 label', {exact: true})).toHaveValue('Moves completed');
    await expect(page.getByLabel('Equipment (optional)', {exact: true})).toHaveValue(saved.equipment);
    await expect(page.getByLabel('Media 1 URL', {exact: true})).toHaveValue('https://example.com/climbing-demo');
    await expect(page.getByLabel('Media 1 caption (optional)', {exact: true})).toHaveValue('Controlled movement demo');
    await page.getByRole('combobox', {name: 'Metric 1', exact: true}).focus();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Metric 1 label', {exact: true})).toBeFocused();
    await shot(page, `exercise-editor-${width}`);

    await page.getByRole('button', {name: 'Archive exercise', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Restore exercise', exact: true})).toBeVisible();
    expect((await send('get', `/v1/coach/exercises/${id}`, undefined, token)).data.archived_at).not.toBeNull();
    const workout = (await send('post', '/v1/coach/workouts', {name: 'Picker verification', groups: []}, token)).data;
    await page.goto(`/workouts/${workout.id}`);
    await page.getByRole('button', {name: 'Add exercise', exact: true}).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Search exercises', {exact: true}).fill(name);
    await expect(dialog.getByText('No matching exercises. Try another name.', {exact: true})).toBeVisible();
    await expect(dialog.getByRole('button', {name: new RegExp(`^${escaped(name)} `)})).toHaveCount(0);
    await shot(page, `archived-picker-${width}`);
    await page.goto(`/exercises?search=${encodeURIComponent(name)}`);
    await expect(page.getByRole('heading', {name: 'No matching exercises', exact: true})).toBeVisible();
    const archivedFilter = page.getByLabel('Show archived', {exact: true});
    await archivedFilter.click();
    await expect.poll(() => new URL(page.url()).searchParams.get('archived')).toBe('true');
    await expect(archivedFilter).toBeChecked();
    await expect(page.getByRole('link', {name: new RegExp(`^${escaped(name)} `)})).toBeVisible();
    await page.getByRole('link', {name: new RegExp(`^${escaped(name)} `)}).click();
    await page.getByRole('button', {name: 'Restore exercise', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Archive exercise', exact: true})).toBeVisible();
    const restored = (await send('get', `/v1/coach/exercises/${id}`, undefined, token)).data;
    expect(restored.archived_at).toBeNull();
    expect(restored.metrics).toEqual(saved.metrics);
    expect(restored.media).toEqual(saved.media);
    await page.goto(`/exercises?search=${encodeURIComponent(name)}`);
    await expect(page.getByRole('link', {name: new RegExp(`^${escaped(name)} `)})).toBeVisible();
    await shot(page, `restored-library-${width}`);
    results.push({
      width,
      exerciseId: id,
      passed: true,
      metricLabels: true,
      orderedMetrics: true,
      mediaCaption: true,
      archivePicker: true,
      restore: true,
      keyboard: true,
    });
  } catch (error) {
    await writeFile(`${artifacts}/failure.txt`, await page.locator('body').ariaSnapshot());
    await page.screenshot({path: `${artifacts}/failure.png`, fullPage: true});
    throw error;
  } finally {
    await context.close();
  }
}

try {
  for (const width of [375, 1280]) {
    await journey(width);
  }
  expect(errors).toEqual([]);
  await writeFile(`${artifacts}/results.json`, `${JSON.stringify({passed: true, results, errors}, null, 2)}\n`);
  console.log(
    'Exercise creation, labelled metrics, demonstrations, archive selection and restore passed at 375px and 1280px.',
  );
} catch (error) {
  if (activePage && !activePage.isClosed()) {
    await writeFile(`${artifacts}/failure.txt`, await activePage.locator('body').ariaSnapshot());
    await activePage.screenshot({path: `${artifacts}/failure.png`, fullPage: true});
  }
  throw error;
} finally {
  await browser.close();
  await api.dispose();
}
