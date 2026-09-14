import {mkdir} from 'node:fs/promises';
import {chromium, expect, request} from '@playwright/test';
import {chooseOption, selectTrigger} from '../select-helpers.mjs';
import {checkRecovery} from './recovery.mjs';

const baseURL = process.env.COACH_APP_URL || 'http://localhost:2022';
const api = await request.newContext({baseURL: 'http://localhost:4000'});
const browser = await chromium.launch();
await mkdir('tests/forms/artifacts', {recursive: true});
const errors = [];

async function post(path, data, token) {
  const response = await api.post(path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${path}: ${response.status()}`).toBe(true);
  return response.json();
}

try {
  for (const width of [375, 1280]) {
    const unique = `${Date.now()}-${width}`;
    const email = `forms-${unique}@example.test`;
    await post('/v1/auth/signup', {email, first_name: 'Taylor'});
    const guest = await post('/v1/auth/verify', {email, otp: '123456'});
    await post('/v1/businesses', {name: 'Everyday Coaching', handle: `forms-${unique}`}, guest.access_token);
    const tokens = await post('/v1/auth/token', {
      grant_type: 'refresh_token',
      refresh_token: guest.refresh_token,
      role: 'coach',
    });
    const context = await browser.newContext({baseURL, viewport: {width, height: 900}});
    context.setDefaultTimeout(10000);
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/login');
    await page.evaluate(async (tokens) => {
      const {saveSession} = await import('/src/api/session.ts');
      saveSession(tokens);
    }, tokens);
    await page.goto('/');
    await page.getByRole('link', {name: 'Forms', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Forms', exact: true})).toBeVisible();
    await expect(page.getByRole('link', {name: /Weekly check-in/})).toBeVisible();
    await page.getByRole('link', {name: 'Create form', exact: true}).click();
    await page.getByLabel('Form name', {exact: true}).fill('Getting to know you');
    const purpose = selectTrigger(page, 'Purpose');
    await purpose.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('listbox', {name: 'Purpose', exact: true})).toBeVisible();
    await page.keyboard.press('Home');
    await page.keyboard.press('Enter');
    await expect(purpose).toHaveText('Intake');
    await expect(purpose).toBeFocused();
    await page.getByLabel('Section title', {exact: true}).fill('Goals and preferences');
    await page.getByLabel('Question', {exact: true}).fill('What would you like to achieve?');
    await page.getByText('Required answer', {exact: true}).click();
    await expect(page.getByRole('checkbox', {name: 'Required answer', exact: true})).toBeChecked();
    await page.getByRole('button', {name: 'Add question', exact: true}).click();
    await page.getByLabel('Question', {exact: true}).nth(1).fill('Where do you train?');
    await page.getByLabel('Question', {exact: true}).nth(1).press('Tab');
    await expect(selectTrigger(page, 'Answer type').nth(1)).toBeFocused();
    await chooseOption(selectTrigger(page, 'Answer type').nth(1), 'Single choice');
    await expect(selectTrigger(page, 'Answer type').nth(1)).toBeFocused();
    await page.getByLabel('Choices', {exact: true}).fill('Home\nGym\nOutdoors');
    await page.getByRole('button', {name: 'Move question 2 up', exact: true}).click();
    await expect(page.getByLabel('Question', {exact: true}).first()).toHaveValue('Where do you train?');
    await page.getByRole('button', {name: 'Preview form', exact: true}).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(selectTrigger(page.getByRole('dialog'), 'Where do you train?')).toBeVisible();
    await page.screenshot({path: `tests/forms/artifacts/preview-${width}.png`, fullPage: true});
    await page.getByRole('button', {name: 'Close preview', exact: true}).click();
    await page.route('**/v1/coach/form-templates', (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({status: 503, json: {error_code: 'unavailable', error_message: 'Unavailable'}})
        : route.continue(),
    );
    await page.getByRole('button', {name: 'Save form', exact: true}).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByLabel('Form name', {exact: true})).toHaveValue('Getting to know you');
    await page.unroute('**/v1/coach/form-templates');
    const createdResponse = page.waitForResponse(
      (response) =>
        response.url().endsWith('/form-templates') &&
        response.request().method() === 'POST' &&
        response.status() === 201,
    );
    await page.getByRole('button', {name: 'Save form', exact: true}).click();
    const created = (await (await createdResponse).json()).data;
    expect(created.purpose).toBe('intake');
    expect(created.sections[0].questions.map((q) => q.label)).toEqual([
      'Where do you train?',
      'What would you like to achieve?',
    ]);
    expect(created.sections[0].questions[0].options).toEqual(['Home', 'Gym', 'Outdoors']);
    expect(created.sections[0].questions[1].required).toBe(true);
    await expect(page.getByRole('heading', {name: 'Forms', exact: true})).toBeVisible();
    await page.getByLabel('Search forms', {exact: true}).fill('no matching form');
    await expect(page.getByText('No matching forms', {exact: true})).toBeVisible();
    await page.getByLabel('Search forms', {exact: true}).fill('Getting to know you');
    await page.getByRole('link', {name: /Getting to know you/}).click();
    await expect(selectTrigger(page, 'Purpose')).toBeDisabled();
    await page.reload();
    await expect(page.getByLabel('Choices', {exact: true})).toHaveValue('Home\nGym\nOutdoors');
    await page.getByLabel('Question', {exact: true}).nth(1).fill('What does success look like?');
    await page.getByRole('button', {name: 'Save form', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Forms', exact: true})).toBeVisible();
    const savedResponse = await api.get(`/v1/coach/form-templates/${created.id}`, {
      headers: {authorization: `Bearer ${tokens.access_token}`},
    });
    const saved = (await savedResponse.json()).data;
    expect(saved.sections[0].questions.map((q) => q.id)).toEqual(created.sections[0].questions.map((q) => q.id));
    expect(saved.sections[0].questions[1].label).toBe('What does success look like?');
    await page.getByRole('link', {name: /Getting to know you/}).click();
    await page.route('**/default-intake*', (route) =>
      route.request().method() === 'PUT'
        ? route.fulfill({status: 503, json: {error_code: 'unavailable', error_message: 'Unavailable'}})
        : route.continue(),
    );
    await page.getByRole('button', {name: 'Use as default intake', exact: true}).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await page.unroute('**/default-intake*');
    await page.getByRole('button', {name: 'Use as default intake', exact: true}).click();
    await expect(page.getByText('Default intake', {exact: true})).toBeVisible();
    await page.getByRole('link', {name: 'Clients', exact: true}).click();
    await page.getByRole('link', {name: 'Invite client', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Getting to know you', exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'Preview intake', exact: true}).click();
    await expect(page.getByText('What does success look like?', {exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'Close preview', exact: true}).click();
    await page.getByRole('link', {name: 'Forms', exact: true}).click();
    await expect(page.getByText('Default intake', {exact: true})).toBeVisible();
    await page.screenshot({path: `tests/forms/artifacts/list-${width}.png`, fullPage: true});
    await page.getByRole('link', {name: /Getting to know you/}).click();
    await expect(page.getByLabel('Form name', {exact: true})).toHaveValue('Getting to know you');
    await page.screenshot({path: `tests/forms/artifacts/editor-${width}.png`, fullPage: true});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await checkRecovery({page, api, tokens, width, post, unique});
    await context.close();
    console.log(`Forms create, preview, retry, reorder, edit, default intake and invitation: ${width}px passed.`);
  }
  expect(errors).toEqual([]);
} finally {
  await browser.close();
  await api.dispose();
}
