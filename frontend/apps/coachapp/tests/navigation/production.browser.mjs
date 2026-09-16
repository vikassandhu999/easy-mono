import {mkdir} from 'node:fs/promises';
import {chromium, expect, webkit} from '@playwright/test';
import {preview} from 'vite';
import {chooseOption, selectTrigger} from '../select-helpers.mjs';

const engine = process.env.BROWSER_ENGINE || 'chromium';
if (engine !== 'chromium' && engine !== 'webkit') {
  throw new Error('Choose chromium or webkit.');
}
const app = await preview({
  preview: {
    host: '127.0.0.1',
    port: 0,
    proxy: {
      '/v1': {target: 'http://localhost:4000', changeOrigin: true},
      '/socket': {target: 'http://localhost:4000', ws: true, changeOrigin: true},
    },
  },
});
const browser = await (engine === 'webkit' ? webkit : chromium).launch();
const baseURL = `http://127.0.0.1:${app.httpServer.address().port}`;
await mkdir('tests/navigation/artifacts', {recursive: true});
try {
  for (const width of [375, 1280]) {
    const context = await browser.newContext({baseURL, viewport: {width, height: 900}});
    context.setDefaultTimeout(15000);
    const page = await context.newPage();
    const errors = [];
    const scripts = new Set();
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => {
      if (request.resourceType() === 'script') {
        scripts.add(new URL(request.url()).pathname);
      }
    });
    const suffix = `${Date.now()}-${engine}-${width}`;
    const email = `production-${suffix}@example.test`;
    const name = `Test Production ${engine} ${width}`;
    try {
      await page.goto('/forms/new');
      await expect(page).toHaveURL(/\/login\?returnTo=/);
      await page.getByRole('link', {name: 'Create an account', exact: true}).click();
      await page.getByLabel('First name', {exact: true}).fill('Test');
      await page.getByLabel('Last name', {exact: true}).fill('Production');
      await page.getByLabel('Email', {exact: true}).fill(email);
      await page.getByRole('button', {name: 'Create account', exact: true}).click();
      await page.getByLabel('Verification code', {exact: true}).fill('000000');
      await page.getByRole('button', {name: 'Verify and continue', exact: true}).click();
      await expect(page.getByLabel('Verification code', {exact: true})).toHaveAttribute('aria-invalid', 'true');
      await page.getByLabel('Verification code', {exact: true}).fill('123456');
      await page.getByRole('button', {name: 'Verify and continue', exact: true}).click();
      await page.getByLabel('Business name', {exact: true}).fill('Test Production Business');
      await page.getByLabel('Business handle', {exact: true}).fill(`production-${suffix}`);
      await page.getByRole('button', {name: 'Create business', exact: true}).click();
      await expect(page).toHaveURL(`${baseURL}/forms/new`);
      await page.getByLabel('Form name', {exact: true}).fill(name);
      await page.getByLabel('Section title', {exact: true}).fill('Your progress');
      await page.getByLabel('Question', {exact: true}).fill('What helped you this week?');
      await chooseOption(selectTrigger(page, 'Answer type'), 'Single choice');
      await page.getByLabel('Choices', {exact: true}).fill('Walking\nPlanning meals\nRest');
      const createdResponse = page.waitForResponse(
        (response) =>
          response.url().endsWith('/v1/coach/form-templates') &&
          response.request().method() === 'POST' &&
          response.status() === 201,
      );
      await page.getByRole('button', {name: 'Save form', exact: true}).click();
      const form = (await (await createdResponse).json()).data;
      expect(form.sections[0].questions[0].label).toBe('What helped you this week?');
      expect(form.sections[0].questions[0].options).toEqual(['Walking', 'Planning meals', 'Rest']);
      await page.getByRole('link', {name: new RegExp(name)}).click();
      await expect(page.getByLabel('Form name', {exact: true})).toHaveValue(name);
      await expect(page.getByLabel('Question', {exact: true})).toHaveValue('What helped you this week?');
      await page.reload();
      await expect(page.getByLabel('Question', {exact: true})).toHaveValue('What helped you this week?');
      for (const [label, path, title] of [
        ['Workbench', '/workbench', 'Workbench'],
        ['Clients', '/', 'Clients'],
        ['Applications', '/applications', 'Applications'],
        ['Check-ins', '/check-ins', 'Check-ins'],
        ['Forms', '/forms', 'Forms'],
        ['Training', '/training-plans', 'Training plans'],
        ['Nutrition', '/nutrition-plans', 'Nutrition plans'],
      ]) {
        await page
          .getByRole('navigation', {name: 'Coaching', exact: true})
          .getByRole('link', {name: label, exact: true})
          .click();
        await expect(page).toHaveURL(baseURL + path);
        await expect(page.getByRole('heading', {level: 1, name: title, exact: true})).toBeVisible();
        await expect(page.getByRole('status').filter({hasText: /Loading|Opening/})).toHaveCount(0);
        await expect(page.getByRole('alert')).toHaveCount(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
      const socketReady = page.waitForEvent('websocket').then((socket) =>
        socket.waitForEvent('framereceived', {
          predicate: (frame) => String(frame.payload).includes('phx_reply') && String(frame.payload).includes('ok'),
        }),
      );
      await page
        .getByRole('navigation', {name: 'Coaching', exact: true})
        .getByRole('link', {name: 'Messages', exact: true})
        .click();
      await expect(page.getByRole('heading', {name: 'Messages', exact: true})).toBeVisible();
      await socketReady;
      await expect(page.getByText('Your conversations start here', {exact: true})).toBeVisible();
      await page.screenshot({
        path: `tests/navigation/artifacts/production-${engine}-${width}.png`,
        animations: 'disabled',
      });
      await page.goto(`/forms/${form.id}`);
      const session = await page.evaluate(() => JSON.parse(localStorage.getItem('coachapp.auth.v1')));
      const removal = await context.request.delete(
        `${baseURL}/v1/coach/form-templates/${form.id}?expected_revision=${form.revision}`,
        {
          headers: {authorization: `Bearer ${session.tokens.access_token}`},
        },
      );
      expect(removal.status()).toBe(204);
      await page.getByRole('button', {name: 'Your account', exact: true}).click();
      await page.getByRole('menuitem', {name: 'Sign out', exact: true}).click();
      await expect(page).toHaveURL(`${baseURL}/login`);
      await page.goto(`/forms/${form.id}`);
      await expect(page).toHaveURL(/\/login\?returnTo=/);
      await page.getByLabel('Email', {exact: true}).fill(email);
      await page.getByRole('button', {name: 'Continue with email', exact: true}).click();
      await page.getByLabel('Verification code', {exact: true}).fill('123456');
      await page.getByRole('button', {name: 'Verify and continue', exact: true}).click();
      await expect(page).toHaveURL(`${baseURL}/forms/${form.id}`);
      await expect(page.getByRole('alert')).toContainText('The requested resource was not found.');
      await page.getByRole('link', {name: 'Back to forms', exact: true}).click();
      await expect(page.getByRole('heading', {name: 'Forms', exact: true})).toBeVisible();
      expect([...scripts].every((path) => path.startsWith('/assets/') && path.endsWith('.js'))).toBe(true);
      expect(errors).toEqual([]);
      console.log(
        `Production ${engine} ${width}px: signup/deep link, validation/recovery, saved form/reload, eight sections, real inbox socket, logout/login and missing-record recovery passed. Only built asset scripts loaded.`,
      );
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  await app.close();
}
