import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium, expect} from '@playwright/test';

execFileSync(
  'rtk',
  ['proxy', 'mix', 'run', '--no-start', fileURLToPath(new URL('./invitation-fixtures.exs', import.meta.url))],
  {
    cwd: fileURLToPath(new URL('../../../../../backend', import.meta.url)),
    stdio: 'pipe',
  },
);
const fixture = JSON.parse(await readFile(new URL('./artifacts/invitations.json', import.meta.url), 'utf8'));
const browser = await chromium.launch();
const context = await browser.newContext({
  baseURL: process.env.COACH_APP_URL || 'http://localhost:2022',
  viewport: {width: 375, height: 812},
});
const page = await context.newPage();
try {
  await page.goto('/accept-invite');
  await expect(page.getByText('This invitation link is incomplete.', {exact: false})).toBeVisible();
  await page.goto(`/accept-invite?token=${fixture.unavailable_token}`);
  await expect(page.getByRole('heading', {name: 'Invitation unavailable'})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Continue with email'})).toHaveCount(0);
  await page.goto(`/accept-invite?token=${fixture.expired_token}`);
  await expect(page.getByText('This invitation has expired.', {exact: false})).toBeVisible();
  await page.goto(`/accept-invite?token=${fixture.token}`);
  await expect(page.getByRole('heading', {name: 'Join Invitation Coaching'})).toBeVisible();
  await expect(page.getByLabel('Email', {exact: true})).toHaveValue(fixture.email);
  await page.screenshot({path: 'tests/auth/artifacts/invitation-mobile.png', fullPage: true});
  await page.getByRole('button', {name: 'Continue with email'}).click();
  await expect(page.getByRole('heading', {name: 'Check your email'})).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', {name: 'Check your email'})).toBeVisible();
  await page.getByRole('link', {name: 'Change email'}).click();
  await expect(page.getByLabel('Email', {exact: true})).toHaveValue(fixture.email);
  await page.getByRole('button', {name: 'Continue with email'}).click();
  await page.getByLabel('Verification code').fill('000000');
  await page.getByRole('button', {name: 'Verify and continue'}).click();
  await expect(page.getByText('Invalid code. Please check and try again.')).toBeVisible();
  await page.setViewportSize({width: 1280, height: 900});
  await page.getByLabel('Verification code').fill('123456');
  await page.getByRole('button', {name: 'Verify and continue'}).click();
  await expect(page.getByRole('heading', {name: "You're signed in"})).toBeVisible();
  await expect(page.getByText('Welcome to Invitation Coaching.')).toBeVisible();
  await page.reload();
  await expect(page.getByText(fixture.email, {exact: true})).toBeVisible();
  await page.goto(`/accept-invite?token=${fixture.token}`);
  await expect(page.getByRole('button', {name: 'Sign out to continue'})).toBeVisible();
  await page.getByRole('button', {name: 'Sign out to continue'}).click();
  await expect(page.getByRole('heading', {name: 'Invitation unavailable'})).toBeVisible();
  console.log(
    'Real API invitations: missing, revoked, expired, accepted, reload, code recovery, and signed-in account guard passed.',
  );
} finally {
  await context.close();
  await browser.close();
}
