import {chromium, expect, request} from '@playwright/test';
import {signOut} from './browser-helpers.mjs';

const baseURL = process.env.COACH_APP_URL || 'http://localhost:2022';
const api = await request.newContext({baseURL: process.env.API_URL || 'http://localhost:4000'});
const browser = await chromium.launch();
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()} ${await response.text()}`).toBe(true);
  return response.status() === 204 ? null : response.json();
}
async function verify(page) {
  await page.getByLabel('Verification code', {exact: true}).fill('123456');
  await page.getByRole('button', {name: 'Verify and continue', exact: true}).click();
}
async function login(page, email) {
  await page.getByLabel('Email', {exact: true}).fill(email);
  await page.getByRole('button', {name: 'Continue with email', exact: true}).click();
  await verify(page);
}
try {
  for (const width of [375, 1280]) {
    const unique = `${Date.now()}-${width}`;
    const email = `test-deep-links-${unique}@example.test`;
    await send('post', '/v1/auth/signup', {email, full_name: 'Test Coach'});
    const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
    await send(
      'post',
      '/v1/businesses',
      {full_name: 'Test Coach', name: 'Test Navigation', handle: `links-${unique}`},
      guest.access_token,
    );
    const coach = await send('post', '/v1/auth/token', {
      grant_type: 'refresh_token',
      refresh_token: guest.refresh_token,
      role: 'coach',
    });
    const exercise = (
      await send(
        'post',
        '/v1/coach/exercises',
        {
          name: 'Test deep-link exercise',
          kind: 'movement',
          goals: ['strength'],
          places: ['gym'],
          metrics: ['reps', 'weight'],
        },
        coach.access_token,
      )
    ).data;
    const context = await browser.newContext({baseURL, viewport: {width, height: 900}});
    context.setDefaultTimeout(15000);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    try {
      const destination = `/exercises/${exercise.id}?source=library#details`;
      await page.goto(destination);
      await expect(page.getByRole('heading', {name: 'Welcome back', exact: true})).toBeVisible();
      const peer = await context.newPage();
      await peer.goto('/exercises?search=Test');
      await expect(peer.getByRole('heading', {name: 'Welcome back', exact: true})).toBeVisible();
      await page.reload();
      await page.getByLabel('Email', {exact: true}).fill(email);
      await page.getByRole('button', {name: 'Continue with email', exact: true}).click();
      await expect(page.getByRole('heading', {name: 'Check your email', exact: true})).toBeVisible();
      await page.reload();
      await page.getByRole('link', {name: 'Change email', exact: true}).click();
      await login(page, email);
      await expect(page).toHaveURL(destination);
      await expect(page.getByLabel('Exercise name', {exact: true})).toHaveValue(exercise.name);
      await expect(peer).toHaveURL('/exercises?search=Test');
      await peer.close();

      // Explicit logout starts a fresh login, without retaining the previous client's screen.
      await page.getByLabel('Exercise name', {exact: true}).fill('Unsaved draft before logout');
      await signOut(page);
      await expect(page).toHaveURL('/login');
      await login(page, email);
      await expect(page).toHaveURL('/clients');

      // A revoked session returns through the same route, including list filters.
      const filtered = '/exercises?status=active&search=Test';
      await page.goto(filtered);
      await page.evaluate(() => {
        const session = JSON.parse(localStorage.getItem('coachapp.auth.v1'));
        localStorage.setItem(
          'coachapp.auth.v1',
          JSON.stringify({
            ...session,
            expiresAt: 1,
            tokens: {...session.tokens, access_token: 'invalid-access', refresh_token: 'invalid-refresh'},
          }),
        );
      });
      await page.reload();
      await expect(page.getByRole('heading', {name: 'Welcome back', exact: true})).toBeVisible();
      await login(page, email);
      await expect(page).toHaveURL(filtered);
      await expect(page.getByLabel('Search exercises', {exact: true})).toHaveValue('Test');

      // A return address must never leave this app or loop through an auth screen.
      for (const target of [
        'https://example.test/',
        '//example.test/',
        '/\\example.test/',
        '/login',
        '/exercises/../verify',
        '/register-business',
      ]) {
        await page.goto(`/login?returnTo=${encodeURIComponent(target)}`);
        await expect(page).toHaveURL('/clients');
      }

      // A new coach keeps the destination through signup and reloaded business setup.
      await expect(page.getByRole('button', {name: 'Your account', exact: true})).toBeVisible();
      await signOut(page);
      await page.goto('/exercises/new');
      await page.getByRole('link', {name: 'Create an account', exact: true}).click();
      await expect(page.getByRole('heading', {name: 'Create your account', exact: true})).toBeVisible();
      await page.getByLabel('Email', {exact: true}).fill(`test-new-links-${unique}@example.test`);
      await page.getByRole('button', {name: 'Create account', exact: true}).click();
      await verify(page);
      await expect(page.getByRole('heading', {name: 'Your coaching business', exact: true})).toBeVisible();
      await page.reload();
      await page.getByLabel('Business name', {exact: true}).fill('Test New Navigation');
      await page.getByLabel('Business handle', {exact: true}).fill(`new-links-${unique}`);
      await page.getByRole('button', {name: 'Create business', exact: true}).click();
      await expect(page.getByRole('heading', {name: 'Build once. Coach each person.', exact: true})).toBeVisible();
      await page.getByRole('button', {name: 'Skip tour', exact: true}).click();
      await expect(page).toHaveURL('/exercises/new');
      await expect(page.getByRole('heading', {name: 'Create exercise', exact: true})).toBeVisible();
      expect(errors).toEqual([]);
      console.log(`Auth deep links, reload, email change, session expiry, logout and setup passed at ${width}px.`);
    } catch (error) {
      console.error(`Failed at ${page.url()}:\n${await page.locator('body').innerText()}`);
      throw error;
    } finally {
      await context.close();
      await send('delete', `/v1/coach/exercises/${exercise.id}`, undefined, coach.access_token);
    }
  }
} finally {
  await browser.close();
  await api.dispose();
}
