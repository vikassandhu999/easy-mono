import {mkdir, writeFile} from 'node:fs/promises';
import {chromium, expect} from '@playwright/test';
import {api, inviteClient} from '../auth/fixtures.mjs';

const browser = await chromium.launch();
const context = await browser.newContext({
  baseURL: process.env.CLIENT_APP_URL || 'http://localhost:1315',
  viewport: {width: 375, height: 812},
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const results = [];
await mkdir('tests/training/artifacts', {recursive: true});
try {
  const fixture = await inviteClient();
  await page.goto(`/invite/${fixture.token}`);
  await page.getByRole('button', {name: 'Continue with email'}).click();
  await page.getByLabel('Verification code').fill('123456');
  await page.getByRole('button', {name: 'Verify and continue'}).click();
  await expect(page.getByRole('heading', {name: 'Today', exact: true})).toBeVisible();
  const token = await page.evaluate(() => JSON.parse(localStorage.getItem('clientapp.auth.v1')).tokens.access_token);
  const profile = (await api('/v1/client/me', {token})).data;
  for (let index = 0; index < 22; index++) {
    const session = (
      await api('/v1/client/training-sessions', {method: 'POST', token, body: {training_workout_id: null}})
    ).data;
    await api(`/v1/client/training-sessions/${session.id}/${index < 2 ? 'discard' : 'complete'}`, {
      method: 'POST',
      token,
      ...(index < 2 ? {} : {body: {notes: `History ${index}`}}),
    });
  }
  let failNext = true;
  await page.route('**/v1/client/training-sessions?**', (route) => {
    const cursor = new URL(route.request().url()).searchParams.get('cursor');
    return failNext && cursor && cursor !== 'start'
      ? route.fulfill({status: 503, json: {error_message: 'Unavailable'}})
      : route.continue();
  });
  await page.goto('/training?view=history');
  await expect(page.getByText('22 workouts', {exact: true})).toBeVisible();
  const rows = page.getByRole('list', {name: 'workouts'}).getByRole('link');
  await expect(rows).toHaveCount(20);
  await page.getByRole('button', {name: 'Load more', exact: true}).scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', {name: 'Retry loading more'})).toBeVisible();
  await expect(rows).toHaveCount(20);
  await expect(page.getByText('22 workouts', {exact: true})).toBeVisible();
  failNext = false;
  await page.getByRole('button', {name: 'Retry loading more'}).click();
  await expect(rows).toHaveCount(22);
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({width, height: 812});
    await page.screenshot({path: `tests/training/artifacts/history-${width}.png`, fullPage: true});
    expect(await page.locator('main').evaluate((node) => node.getBoundingClientRect().width)).toBeLessThanOrEqual(480);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.setViewportSize({width: 375, height: 812});
  await expect(page.getByText('All workouts loaded', {exact: true})).toBeAttached();
  await expect(page.getByRole('button', {name: 'Load more', exact: true})).toHaveCount(0);
  await page.getByRole('button', {name: 'Filter workouts'}).click();
  await page.getByRole('button', {name: /Workout status/}).click();
  await page.getByRole('option', {name: 'Discarded', exact: true}).click();
  await page.getByLabel('From', {exact: true}).fill(profile.local_date);
  await page.getByLabel('To', {exact: true}).fill(profile.local_date);
  await page.screenshot({path: 'tests/training/artifacts/history-filters-375.png', fullPage: false});
  await page.getByRole('button', {name: 'Apply filters'}).click();
  await expect(page).toHaveURL(/state=discarded/);
  await expect(page.getByText('2 workouts', {exact: true})).toBeVisible();
  await expect(rows).toHaveCount(2);
  await rows.first().click();
  await expect(page.getByRole('link', {name: 'Back to workout history'})).toBeVisible();
  await page.getByRole('link', {name: 'Back to workout history'}).click();
  await expect(page.getByText('2 workouts', {exact: true})).toBeVisible();
  await page.getByRole('button', {name: 'Filter workouts'}).click();
  await expect(page.getByLabel('From', {exact: true})).toHaveValue(profile.local_date);
  await page.getByRole('button', {name: /Workout status/}).click();
  await page.getByRole('option', {name: 'All workouts', exact: true}).click();
  await page.getByRole('button', {name: 'Apply filters'}).click();
  await expect(page.getByText('22 workouts', {exact: true})).toBeVisible();
  await page.getByRole('link', {name: 'Your account'}).click();
  await page.getByRole('button', {name: 'Sign out', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Welcome back'})).toBeVisible();
  expect(
    await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('clientapp.private.'))),
  ).toEqual([]);
  const other = await inviteClient();
  await page.goto(`/invite/${other.token}`);
  await page.getByRole('button', {name: 'Continue with email'}).click();
  await page.getByLabel('Verification code').fill('123456');
  await page.getByRole('button', {name: 'Verify and continue'}).click();
  await expect(page.getByRole('heading', {name: 'Today', exact: true})).toBeVisible();
  await page.goto('/training?view=history');
  await expect(page.getByText('0 workouts', {exact: true})).toBeVisible();
  expect(errors).toEqual([]);
  results.push({
    scenario:
      '22-session cursor paging, failed-page retry, server state/date filters and counts, filter return/reset, logout and other-account isolation',
    passed: true,
  });
} finally {
  await context.close();
  await browser.close();
  await writeFile('tests/training/artifacts/history-results.json', JSON.stringify(results, null, 2));
}
console.log(JSON.stringify(results));
