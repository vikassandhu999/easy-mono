import {mkdir} from 'node:fs/promises';
import {chromium, expect, request} from '@playwright/test';

const baseURL = process.env.COACH_APP_URL || 'http://localhost:2022';
const api = await request.newContext({baseURL: process.env.COACHAPP_API_URL || 'http://localhost:4000'});
const browser = await chromium.launch();
const artifacts = 'tests/auth/artifacts/owner-setup';
await mkdir(artifacts, {recursive: true});
const errors = [];
try {
  for (const width of [375, 1280]) {
    for (const existingName of ['Signup Owner', '']) {
      const context = await browser.newContext({baseURL, viewport: {width, height: 900}});
      const page = await context.newPage();
      page.on('pageerror', (error) => errors.push(error.message));
      const unique = `${Date.now()}-${width}`;
      const email = `owner-setup-${unique}@example.test`;
      if (existingName) {
        await page.goto('/signup');
        await page.getByLabel('Full name', {exact: true}).fill(existingName);
        await page.getByLabel('Email', {exact: true}).fill(email);
        await page.getByRole('button', {name: 'Create account', exact: true}).click();
      } else {
        const signup = await api.post('/v1/auth/signup', {data: {email}});
        expect(signup.ok(), await signup.text()).toBe(true);
        await page.goto('/login');
        await page.getByLabel('Email', {exact: true}).fill(email);
        await page.getByRole('button', {name: 'Continue with email', exact: true}).click();
      }
      await page.getByLabel('Verification code').fill('123456');
      await page.getByRole('button', {name: 'Verify and continue', exact: true}).click();
      await expect(page.getByRole('heading', {name: 'Your coaching business', exact: true})).toBeVisible();
      await expect(page.getByLabel('Full name', {exact: true})).toHaveValue(existingName);
      await page.reload();
      await expect(page.getByLabel('Full name', {exact: true})).toHaveValue(existingName);
      await page.getByLabel('Full name', {exact: true}).fill('');
      await page.getByLabel('Business name', {exact: true}).fill('Owner Setup Coaching');
      await page.getByLabel('Business handle', {exact: true}).fill(`owner-${unique}`);
      await page.getByRole('button', {name: 'Create business', exact: true}).click();
      await expect(page.getByLabel('Full name', {exact: true})).toHaveAttribute('aria-invalid', 'true');
      await page.getByLabel('Full name', {exact: true}).fill('A'.repeat(256));
      await page.getByLabel('Preferred name', {exact: true}).fill('B'.repeat(256));
      const invalid = page.waitForResponse(
        (response) => new URL(response.url()).pathname === '/v1/businesses' && response.status() === 422,
      );
      await page.getByRole('button', {name: 'Create business', exact: true}).click();
      await invalid;
      await expect(page.getByLabel('Full name', {exact: true})).toHaveAttribute('aria-invalid', 'true');
      await expect(page.getByLabel('Preferred name', {exact: true})).toHaveAttribute('aria-invalid', 'true');
      await page.getByLabel('Full name', {exact: true}).fill('Owner Coach Full Name');
      await page.getByLabel('Preferred name', {exact: true}).fill('Owner Coach');
      await expect(page.getByText('Handle available', {exact: true})).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({
        path: `${artifacts}/${existingName ? 'prefilled' : 'empty-account'}-${width}.png`,
        fullPage: true,
      });
      const created = page.waitForResponse(
        (response) => new URL(response.url()).pathname === '/v1/businesses' && response.status() === 201,
      );
      await page.getByRole('button', {name: 'Create business', exact: true}).click();
      await created;
      await expect(page.getByRole('heading', {name: 'Build once. Coach each person.'})).toBeVisible();
      await page.getByRole('button', {name: 'Skip tour', exact: true}).click();
      await page.goto('/settings/profile');
      await expect(page.getByLabel('Full name', {exact: true})).toHaveValue('Owner Coach Full Name');
      await expect(page.getByLabel('Preferred name', {exact: true})).toHaveValue('Owner Coach');
      await page.reload();
      await expect(page.getByLabel('Full name', {exact: true})).toHaveValue('Owner Coach Full Name');
      await page.screenshot({
        path: `${artifacts}/saved-${existingName ? 'prefilled' : 'empty'}-${width}.png`,
        fullPage: true,
      });
      await context.close();
    }
    console.log(
      `Owner setup: required names, server field errors, signup prefill, empty-name account and saved profile passed at ${width}px.`,
    );
  }
  expect(errors).toEqual([]);
} finally {
  await browser.close();
  await api.dispose();
}
