import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {chromium, expect} from '@playwright/test';

const {free_accept: fixture} = JSON.parse(
  await readFile(new URL('../../../../../.scratch/coaching-terms/browser-fixtures.json', import.meta.url), 'utf8'),
);
const browser = await chromium.launch();
const context = await browser.newContext({
  baseURL: process.env.CLIENT_APP_URL || 'http://localhost:1315',
  viewport: {width: 375, height: 812},
});
const page = await context.newPage();
try {
  await page.goto(`/invite/${fixture.client.token}`);
  await expect(page.getByLabel('Email', {exact: true})).toHaveValue(fixture.client.email);
  await page.getByRole('button', {name: 'Continue with email'}).click();
  await page.getByLabel('Verification code').fill('123456');
  const accepted = page.waitForResponse(
    (response) => new URL(response.url()).pathname === `/v1/auth/invites/${fixture.client.token}/accept`,
  );
  await page.getByRole('button', {name: 'Verify and continue'}).click();
  const response = await accepted;
  expect(response.status()).toBe(200);
  expect(response.request().postDataJSON()).toEqual({email: fixture.client.email, otp: '123456'});
  await expect(page.getByRole('heading', {name: 'Today', exact: true})).toBeVisible();
  await page.goto('/training');
  await expect(page.getByRole('button', {name: 'Start freestyle workout'})).toBeVisible();
  const profile = await page.evaluate(async () => {
    const token = JSON.parse(localStorage.getItem('clientapp.auth.v1')).tokens.access_token;
    const response = await fetch('/v1/client/me', {headers: {Authorization: `Bearer ${token}`}});
    return (await response.json()).data;
  });
  expect(profile.id).toBe(fixture.client.id);
  expect(profile.state).toBe('active');
  expect(profile.current_term.starts_on).toBe(profile.local_date);
  expect(profile.current_term.ends_on).toBeNull();
  expect(profile.terms).toEqual([profile.current_term]);
  await page.reload();
  await expect(page.getByRole('button', {name: 'Start freestyle workout'})).toBeVisible();
  await mkdir('tests/coaching/artifacts', {recursive: true});
  await page.screenshot({path: 'tests/coaching/artifacts/connected-free-acceptance-375.png', fullPage: true});
  await writeFile(
    'tests/coaching/artifacts/acceptance-results.json',
    JSON.stringify({width: 375, accepted: true, automaticTerm: true, activeAfterReload: true}, null, 2),
  );
} finally {
  await context.close();
  await browser.close();
}
console.log('Free-seat invitation accepted through OTP; automatic coaching term and active access persisted.');
