import {chromium, expect} from '@playwright/test';
import {api, inviteClient} from '../../../clientapp/tests/auth/fixtures.mjs';

const fixture = await inviteClient();
const invite = {email: fixture.email, invitation_token: fixture.token};
await api('/v1/auth/accept-invite', {method: 'POST', body: invite});
const tokens = await api('/v1/auth/accept-invite/verify', {method: 'POST', body: {...invite, otp: '123456'}});
const profile = (await api('/v1/client/me', {token: tokens.access_token})).data;
const earlier = new Date(`${profile.local_date}T12:00:00Z`);
earlier.setUTCDate(earlier.getUTCDate() - 21);
const date = earlier.toISOString().slice(0, 10);
const food = (
  await api('/v1/coach/nutrition-foods', {
    method: 'POST',
    token: fixture.coachToken,
    body: {name: 'Old meal oats', calories_per_100g: 100},
  })
).data;
await api(`/v1/client/nutrition-days/${date}`, {
  method: 'PATCH',
  token: tokens.access_token,
  body: {
    slots: [
      {
        meal_slot: 'lunch',
        meal_id: null,
        expected_revision: 0,
        share: true,
        note_to_coach: 'A note about an earlier meal',
        entries: [
          {
            id: crypto.randomUUID(),
            planned_item_ref: null,
            food_id: food.id,
            recipe_id: null,
            portion: {kind: 'gram', grams: 100},
            notes: null,
          },
        ],
      },
    ],
  },
});

const baseURL = process.env.CLIENT_APP_URL || 'http://localhost:1314';
const browser = await chromium.launch();
const context = await browser.newContext({baseURL, viewport: {width: 375, height: 812}});
const page = await context.newPage();
const errors = [];
const requests = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('request', (request) => {
  if (request.url().includes('/v1/')) {
    requests.push(request.url());
  }
});
try {
  await page.addInitScript((tokens) => {
    localStorage.setItem('clientapp.accessToken', tokens.access_token);
    localStorage.setItem('clientapp.refreshToken', tokens.refresh_token);
    localStorage.setItem('clientapp.expiresAt', String(Date.now() + tokens.expires_in * 1000));
  }, tokens);
  await page.goto('/');
  await expect(page.getByRole('heading', {level: 1})).toContainText('Alex');
  await expect(page.getByRole('navigation').getByRole('link')).toHaveCount(4);
  for (const [name, path] of [
    ['Train', '/training'],
    ['Eat', '/nutrition'],
    ['Coach', '/messages'],
  ]) {
    await page.getByRole('navigation').getByRole('link', {name, exact: true}).click();
    await expect(page).toHaveURL(baseURL + path);
    await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  }
  await expect(page.getByText('A note about an earlier meal', {exact: true})).toBeVisible();
  await page.getByRole('link', {name: new RegExp(date)}).click();
  await expect(page).toHaveURL(`${baseURL}/nutrition?date=${date}`);
  await expect(page.getByRole('button', {name: /Old meal oats/})).toBeVisible();
  await page.getByRole('navigation').getByRole('link', {name: 'Today', exact: true}).click();
  await expect(page.getByRole('link', {name: /check-ins|forms|weight progress/i})).toHaveCount(0);
  await expect(page.getByRole('button', {name: /weight progress|log weight/i})).toHaveCount(0);
  await page.getByRole('button', {name: 'Open settings', exact: true}).click();
  await expect(page.getByRole('heading', {level: 1, name: 'Settings'})).toBeVisible();
  await expect(page.getByText(fixture.email, {exact: true}).first()).toBeVisible();
  await expect(page.getByRole('link', {name: /weight|goal/i})).toHaveCount(0);
  await expect(page.getByRole('button', {name: /weight|goal/i})).toHaveCount(0);
  await page.getByRole('button', {name: 'Back', exact: true}).click();
  await expect(page.getByRole('heading', {level: 1})).toContainText('Alex');
  expect(requests.some((url) => /form-assignments|form-submissions|check-in|\/v1\/client\/weight[-_]/.test(url))).toBe(
    false,
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({path: '/tmp/clientapp-v2-core-375.png', fullPage: true});
  console.log(
    'V2 client 375px: core navigation, settings and dated meal source link passed without body-weight requests.',
  );
} finally {
  await browser.close();
}
