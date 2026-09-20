import {mkdir, writeFile} from 'node:fs/promises';
import {chromium, expect} from '@playwright/test';
import {api, inviteClient} from '../auth/fixtures.mjs';

const browser = await chromium.launch();
const context = await browser.newContext({
  baseURL: process.env.CLIENTAPP_OFFLINE_URL || 'http://localhost:1316',
  viewport: {width: 375, height: 812},
});
const page = await context.newPage();
const results = [];
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await mkdir('tests/training/artifacts', {recursive: true});
try {
  const fixture = await inviteClient();
  await page.goto(`/invite/${fixture.token}`);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', resolve, {once: true}),
      );
    }
  });
  await page.getByRole('button', {name: 'Continue with email'}).click();
  await page.getByLabel('Verification code').fill('123456');
  await page.getByRole('button', {name: 'Verify and continue'}).click();
  await expect(page.getByRole('heading', {name: 'Today', exact: true})).toBeVisible();
  await page
    .getByRole('navigation', {name: 'Main navigation'})
    .getByRole('link', {name: 'Training', exact: true})
    .click();
  await page.getByRole('button', {name: 'Start freestyle workout'}).click();
  await expect(page).toHaveURL(/\/training\/sessions\//);
  const id = new URL(page.url()).pathname.split('/').at(-1);
  const token = await page.evaluate(() => JSON.parse(localStorage.getItem('clientapp.auth.v1')).tokens.access_token);
  const read = async () =>
    (await api(`/v1/coach/clients/${fixture.clientId}/training-sessions/${id}`, {token: fixture.coachToken})).data;
  const modes = [
    {name: 'Weight and reps', reps: '8', load: '42.5'},
    {name: 'Bodyweight reps', reps: '12'},
    {name: 'Bodyweight with added weight', reps: '6', load: '10'},
    {name: 'Assisted bodyweight', reps: '7', load: '15'},
    {name: 'Reps', reps: '20'},
    {name: 'Time', duration: '45'},
    {name: 'Weight and time', load: '12', duration: '60'},
    {name: 'Distance and time', distance: '2.5', duration: '900'},
    {name: 'Weight and distance', load: '20', distance: '0.1'},
  ];
  for (const [index, mode] of modes.entries()) {
    await expect(page.getByRole('button', {name: 'Save set', exact: true})).toBeEnabled();
    await page.getByLabel('Exercise name').fill(`Exercise ${index + 1}`);
    await expect(page.getByRole('button', {name: 'Use last set', exact: true})).toHaveCount(0);
    await page.getByRole('button', {name: /What to record/}).click();
    await page.getByRole('option', {name: mode.name, exact: true}).click();
    if (mode.reps) {
      await page.getByRole('textbox', {name: 'Reps', exact: true}).fill(mode.reps);
    }
    if (mode.load) {
      await page.getByLabel(/^(Weight|Added weight|Assistance) \(kg\)$/).fill(mode.load);
    }
    if (mode.duration) {
      await page.getByLabel('Time (seconds)').fill(mode.duration);
    }
    if (mode.distance) {
      await page.getByLabel('Distance (km)').fill(mode.distance);
    }
    await page.getByRole('button', {name: 'Save set', exact: true}).click();
    await expect(page.getByRole('list', {name: 'Saved sets'}).getByRole('listitem')).toHaveCount(index + 1);
    await expect(page.getByRole('button', {name: 'Use last set', exact: true})).toBeVisible();
    const saved = (await read()).performed_sets.at(-1);
    expect(saved.reps).toBe(mode.reps ?? null);
    expect(saved.load_value === null ? null : Number(saved.load_value)).toBe(mode.load ? Number(mode.load) : null);
    expect(saved.duration_seconds).toBe(mode.duration ? Number(mode.duration) : null);
    expect(saved.distance_value === null ? null : Number(saved.distance_value)).toBe(
      mode.distance ? Number(mode.distance) : null,
    );
  }
  await page.getByRole('button', {name: 'Edit set', exact: true}).nth(7).click();
  await expect(page.getByLabel('Distance (km)')).toHaveValue('2.5');
  await expect(page.getByLabel('Time (seconds)')).toHaveValue('900');
  await page.getByLabel('Distance (km)').fill('3');
  await page.getByRole('button', {name: 'Save set changes'}).click();
  await expect(page.getByText('Exercise 8 · 900 sec · 3 km', {exact: true})).toBeVisible();
  results.push({
    scenario: 'All nine recording modes preserve supported measurements; editing distance/time retains both fields',
    passed: true,
  });

  await page.getByLabel('Exercise name').fill('Offline walk');
  await page.getByLabel('Distance (km)').fill('4');
  await expect(page.getByText('Draft saved on this device.', {exact: true})).toBeVisible();
  await page.waitForFunction((id) => {
    const key = Object.keys(localStorage).find((key) => key.endsWith('.snapshot'));
    return key && JSON.parse(localStorage.getItem(key)).state.queries.some((query) => query.queryKey.at(-1) === id);
  }, id);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByLabel('Distance (km)')).toHaveValue('4');
  await expect(page.getByText('Showing the copy from', {exact: false})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Save set', exact: true})).toBeDisabled();
  await page.getByLabel('Time (seconds)').fill('1200');
  await expect(page.getByText('Draft saved on this device.', {exact: true})).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Time (seconds)')).toHaveValue('1200');
  await context.setOffline(false);
  await expect(page.getByRole('button', {name: 'Save set', exact: true})).toBeEnabled();
  expect((await read()).performed_sets).toHaveLength(9);

  await page.evaluate(() => {
    const set = Storage.prototype.setItem;
    window.restoreStorage = () => {
      Storage.prototype.setItem = set;
    };
    Storage.prototype.setItem = function (key, value) {
      if (key.includes('.training.')) {
        throw new DOMException('Storage full', 'QuotaExceededError');
      }
      return set.call(this, key, value);
    };
  });
  await page.getByRole('button', {name: 'Save set', exact: true}).click();
  await expect(page.getByText('Your draft could not be saved on this device.', {exact: false})).toBeVisible();
  expect((await read()).performed_sets).toHaveLength(9);
  await page.evaluate(() => window.restoreStorage());
  await page.getByRole('button', {name: 'Retry set save'}).click();
  await expect(page.getByRole('list', {name: 'Saved sets'}).getByRole('listitem')).toHaveCount(10);
  results.push({
    scenario:
      'Offline shell/session/draft reload and deliberate reconnect save; failed durable identity write prevents API creation',
    passed: true,
  });

  await page.getByLabel('Exercise name').fill('Unsent cooldown');
  await page.getByLabel('Distance (km)').fill('1');
  await expect(page.getByText('Draft saved on this device.', {exact: true})).toBeVisible();
  await api(`/v1/client/training-sessions/${id}/complete`, {
    method: 'POST',
    token,
    body: {notes: 'Finished on another device'},
  });
  await page.reload();
  await expect(page.getByText('Finished on another device', {exact: true})).toBeVisible();
  await expect(page.getByText('Unsent cooldown', {exact: true})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Save set', exact: true})).toHaveCount(0);
  expect((await read()).performed_sets).toHaveLength(10);
  await page.screenshot({path: 'tests/training/artifacts/closed-recovery-375.png', fullPage: true});
  await page.getByRole('button', {name: 'Remove local entries'}).click();
  await page.getByRole('dialog').getByRole('button', {name: 'Clear local entry'}).click();
  await expect(page.getByText('Unsent cooldown', {exact: true})).toHaveCount(0);
  await page.getByRole('link', {name: 'Back to Today'}).click();
  await expect(page.getByRole('link', {name: 'Resume workout'})).toHaveCount(0);
  await page
    .getByRole('navigation', {name: 'Main navigation'})
    .getByRole('link', {name: 'Training', exact: true})
    .click();
  await page.getByRole('button', {name: 'Start freestyle workout'}).click();
  await page.getByRole('button', {name: 'Discard workout', exact: true}).click();
  await page.getByRole('dialog').getByRole('button', {name: 'Confirm discard'}).click();
  await expect(page.getByRole('link', {name: 'Back to workout history'})).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', {name: 'Save set', exact: true})).toHaveCount(0);
  results.push({
    scenario: 'Other-device completion retains local unsent work separately; explicit removal and discard persist',
    passed: true,
  });
  expect(errors).toEqual([]);
} finally {
  await context.close();
  await browser.close();
  await writeFile('tests/training/artifacts/recovery-results.json', JSON.stringify(results, null, 2));
}
console.log(JSON.stringify(results));
