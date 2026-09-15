import {execFileSync} from 'node:child_process';
import {mkdir, readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium, expect, request} from '@playwright/test';
import {chooseOption, selectTrigger} from '../select-helpers.mjs';

execFileSync('rtk', ['proxy', 'mix', 'run', '--no-start', fileURLToPath(new URL('./fixtures.exs', import.meta.url))], {
  cwd: fileURLToPath(new URL('../../../../../backend', import.meta.url)),
  stdio: 'pipe',
});
const fixtures = JSON.parse(await readFile(new URL('./artifacts/fixtures.json', import.meta.url), 'utf8'));
const api = await request.newContext({baseURL: process.env.COACHAPP_API_URL || 'http://127.0.0.1:44000'});
const browser = await chromium.launch({channel: 'chromium'});
await mkdir('tests/acquisition/artifacts', {recursive: true});
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()} ${await response.text()}`).toBe(true);
  return response.json();
}
function pageInput(page, status = page.status) {
  const {id, revision, inserted_at, updated_at, ...editable} = page;
  return {
    ...editable,
    status,
    expected_revision: revision,
    programs: page.programs.map(({position, ...program}) => program),
  };
}
async function capture(page, name, width) {
  await page.screenshot({path: `tests/acquisition/artifacts/${name}-${width}.png`, fullPage: true});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
try {
  for (const {width, owner_email, slug} of fixtures) {
    await send('post', '/v1/auth/otp', {email: owner_email, type: 'authentication'});
    const tokens = await send('post', '/v1/auth/token', {
      email: owner_email,
      otp: '123456',
      role: 'coach',
      grant_type: 'otp',
    });
    const options = {baseURL: process.env.COACHAPP_URL || 'http://localhost:22022', viewport: {width, height: 900}};
    const coach = await browser.newContext(options);
    const visitor = await browser.newContext(options);
    const page = await coach.newPage();
    const publicPage = await visitor.newPage();
    const errors = [];
    for (const tab of [page, publicPage]) {
      tab.on('pageerror', (error) => errors.push(error.message));
    }
    await page.goto('/login');
    await page.evaluate(async (tokens) => {
      const {saveSession} = await import('/src/api/session.ts');
      saveSession(tokens);
    }, tokens);
    await page.goto('/');
    await page.getByRole('button', {name: 'Your account', exact: true}).click();
    await page.getByRole('menuitem', {name: 'Coaching page', exact: true}).click();
    await page.getByRole('link', {name: 'Create your page', exact: true}).click();
    await page
      .getByLabel('What can you help people achieve?', {exact: true})
      .fill('Build strength that fits your life');
    await page
      .getByLabel('Tell them a little more', {exact: true})
      .fill('Personal training and nutrition guidance for busy people.');
    await page.getByText('More about your coaching', {exact: true}).click();
    await page
      .getByLabel('About you', {exact: true})
      .fill('I’m Kavya. I help you build a routine you can keep, with clear targets and regular support.');
    await page.getByRole('button', {name: 'Add who you help', exact: true}).click();
    await page.getByText('More about your coaching', {exact: true}).click();
    await page.getByRole('button', {name: 'Save draft', exact: true}).click();
    await expect(page.getByLabel('A good fit for 1', {exact: true})).toBeFocused();
    await page
      .getByLabel('A good fit for 1', {exact: true})
      .fill('You want a practical routine around work and family.');
    await page.getByRole('button', {name: 'Add program', exact: true}).click();
    await page.getByLabel('Program name', {exact: true}).fill('Personal strength coaching');
    await page.getByLabel('Who is it for?', {exact: true}).fill('Busy people starting or returning to training');
    await page.getByLabel('Price or pricing note', {exact: true}).fill('₹8,000/month');
    await page.getByRole('button', {name: 'Add question', exact: true}).click();
    await page.getByLabel('Question', {exact: true}).fill('What would you like help with?');
    await page.getByRole('button', {name: 'Add question', exact: true}).click();
    await page.getByLabel('Question', {exact: true}).nth(1).fill('When would you like to start?');
    await chooseOption(selectTrigger(page, 'Answer format').nth(1), 'Choose one');
    await page.getByLabel('Choices', {exact: true}).fill('This month\nNext month\nJust exploring');
    await page.getByRole('button', {name: 'Add question', exact: true}).click();
    await page.getByLabel('Question', {exact: true}).nth(2).fill('What should I call you?');
    await chooseOption(selectTrigger(page, 'Answer format').nth(2), 'Short answer');
    await page.route('**/v1/coach/landing-page', (route) =>
      route.request().method() === 'PUT'
        ? route.fulfill({status: 503, json: {error_code: 'unavailable'}})
        : route.continue(),
    );
    await page.getByRole('button', {name: 'Save draft', exact: true}).click();
    await expect(page.getByRole('alert')).toBeFocused();
    await expect(page.getByLabel('Program name', {exact: true})).toHaveValue('Personal strength coaching');
    await page.unroute('**/v1/coach/landing-page');
    await page.getByRole('button', {name: 'Save draft', exact: true}).click();
    await expect(page.getByText('Draft saved. Your page is private.', {exact: true})).toBeFocused();
    await page.getByRole('button', {name: 'Add program', exact: true}).click();
    await expect(page.getByText('Draft saved. Your page is private.', {exact: true})).toHaveCount(0);
    await page.getByRole('button', {name: 'Remove program 2', exact: true}).click();
    expect((await api.get(`/v1/public/landing-pages/${slug}`)).status()).toBe(404);
    await page.getByRole('button', {name: 'Preview', exact: true}).click();
    await expect(
      page.getByRole('dialog').getByRole('heading', {name: 'Build strength that fits your life', exact: true}),
    ).toBeVisible();
    await expect(
      page.getByRole('dialog').getByRole('button', {name: 'Apply for coaching', exact: true}),
    ).toBeDisabled();
    await capture(page, 'preview', width);
    await page.keyboard.press('Escape');
    await page.getByRole('button', {name: 'Publish page', exact: true}).click();
    await expect(page.getByText('Your page is live. Changes are published.', {exact: true})).toBeFocused();
    await capture(page, 'editor', width);
    const saved = (await send('get', '/v1/coach/landing-page', undefined, tokens.access_token)).data;
    await publicPage.goto(`/coaching/${slug}`);
    await expect(publicPage.getByRole('heading', {level: 1})).toHaveText('Build strength that fits your life');
    await capture(publicPage, 'public-page', width);
    await publicPage.getByRole('button', {name: 'Apply for Personal strength coaching', exact: true}).click();
    await publicPage.getByLabel('Your name', {exact: true}).fill('Priya Sharma');
    await publicPage.getByRole('button', {name: 'Send application', exact: true}).click();
    await expect(publicPage.getByLabel('Email', {exact: true})).toBeFocused();
    await expect(
      publicPage.getByText('Enter your email or phone so the coach can reach you.', {exact: true}),
    ).toBeVisible();
    await publicPage.getByLabel('Email', {exact: true}).fill(`priya-${width}@example.test`);
    await publicPage
      .getByLabel('What would you like help with? (optional)', {exact: true})
      .fill('I want to feel stronger and build a consistent routine.');
    await chooseOption(selectTrigger(publicPage, 'When would you like to start? (optional)'), 'Next month');
    await publicPage.getByLabel('What should I call you? (optional)', {exact: true}).fill('Priya');
    await publicPage.route('**/applications', (route) =>
      route.fulfill({
        status: 422,
        json: {error_code: 'invalid_input', error_detail: {fields: {instagram: ['Check your Instagram username.']}}},
      }),
    );
    await publicPage.getByRole('button', {name: 'Send application', exact: true}).click();
    await expect(publicPage.getByLabel('Instagram username', {exact: true})).toBeFocused();
    await expect(publicPage.getByText('Check your Instagram username.', {exact: true})).toBeVisible();
    await publicPage.getByLabel('Instagram username', {exact: true}).fill('priya');
    await publicPage.unroute('**/applications');
    await capture(publicPage, 'application', width);
    let lost = false;
    await publicPage.route('**/applications', async (route) => {
      if (!lost) {
        const response = await route.fetch();
        expect(response.status()).toBe(201);
        lost = true;
        await route.fulfill({status: 503, json: {error_code: 'unavailable'}});
      } else {
        await route.continue();
      }
    });
    await publicPage.getByRole('button', {name: 'Send application', exact: true}).click();
    await expect(publicPage.getByRole('button', {name: 'Retry application', exact: true})).toBeVisible();
    await expect(publicPage.getByRole('dialog').getByRole('alert')).toBeFocused();
    await publicPage.keyboard.press('Tab');
    await expect(publicPage.getByRole('button', {name: 'Retry application', exact: true})).toBeFocused();
    await publicPage.screenshot({path: `tests/acquisition/artifacts/public-recovery-${width}.png`});
    expect(
      await publicPage.evaluate(
        (slug) => JSON.parse(sessionStorage.getItem(`easy:coaching-application:${slug}`)).landing_page_id,
        slug,
      ),
    ).toBe(saved.id);
    const renamed = (
      await send(
        'put',
        '/v1/coach/landing-page',
        {...pageInput(saved, width === 375 ? 'draft' : 'published'), slug: `${slug}-renamed`},
        tokens.access_token,
      )
    ).data;
    await publicPage.reload();
    await publicPage.route('**/applications', (route) =>
      route.fulfill({status: 503, json: {error_code: 'unavailable'}}),
    );
    await publicPage.getByRole('button', {name: 'Check application', exact: true}).click();
    await expect(publicPage.getByRole('alert')).toBeFocused();
    await publicPage.keyboard.press('Tab');
    await expect(publicPage.getByRole('button', {name: 'Check application', exact: true})).toBeFocused();
    await publicPage.unroute('**/applications');
    await publicPage.getByRole('button', {name: 'Check application', exact: true}).click();
    await expect(
      publicPage.getByRole('heading', {name: 'Your application is with the coach', exact: true}),
    ).toBeFocused();
    await send('put', '/v1/coach/landing-page', {...pageInput(renamed, 'published'), slug}, tokens.access_token);
    await page.reload();
    let prospects = await send('get', '/v1/coach/prospects', undefined, tokens.access_token);
    expect(prospects.count).toBe(1);
    expect(prospects.data[0].program.name).toBe('Personal strength coaching');
    expect(prospects.data[0].submitted_questions).toHaveLength(3);
    await page.getByLabel('Program name', {exact: true}).fill('New coaching offer');
    await page.getByRole('button', {name: 'Publish changes', exact: true}).click();
    await expect(page.getByText('Your page is live. Changes are published.', {exact: true})).toBeVisible();
    prospects = await send('get', '/v1/coach/prospects', undefined, tokens.access_token);
    expect(prospects.data[0].program.name).toBe('Personal strength coaching');
    expect((await send('get', '/v1/coach/landing-page', undefined, tokens.access_token)).data.programs[0].id).toBe(
      saved.programs[0].id,
    );
    const beforeOtherSave = (await send('get', '/v1/coach/landing-page', undefined, tokens.access_token)).data;
    await send(
      'put',
      '/v1/coach/landing-page',
      {...pageInput(beforeOtherSave), headline: 'Headline from another tab'},
      tokens.access_token,
    );
    await page.getByLabel('What can you help people achieve?', {exact: true}).fill('My older draft');
    await page.getByRole('button', {name: 'Publish changes', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Load saved version', exact: true})).toBeVisible();
    await expect(page.getByLabel('What can you help people achieve?', {exact: true})).toHaveValue('My older draft');
    await expect(page.locator('form').getByRole('alert')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', {name: 'Load saved version', exact: true})).toBeFocused();
    await page.getByRole('button', {name: 'Load saved version', exact: true}).click();
    await page.route('**/v1/coach/landing-page', (route) =>
      route.fulfill({status: 503, json: {error_code: 'unavailable'}}),
    );
    await page.getByRole('button', {name: 'Load saved page', exact: true}).click();
    const reloadDialog = page.getByRole('dialog', {name: 'Replace your unsaved changes?', exact: true});
    await expect(reloadDialog.getByRole('alert')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(reloadDialog.getByRole('button', {name: 'Keep editing', exact: true})).toBeFocused();
    await page.screenshot({path: `tests/acquisition/artifacts/editor-recovery-${width}.png`});
    await page.unroute('**/v1/coach/landing-page');
    await page.getByRole('button', {name: 'Load saved page', exact: true}).click();
    await expect(page.getByText('Latest saved version loaded.', {exact: true})).toBeFocused();
    await expect(page.getByLabel('What can you help people achieve?', {exact: true})).toHaveValue(
      'Headline from another tab',
    );
    await publicPage.goto(`/coaching/${slug}`);
    await publicPage.getByRole('button', {name: 'Apply for coaching', exact: true}).click();
    await publicPage.getByLabel('Your name', {exact: true}).fill('Asha Rao');
    await publicPage.getByLabel('Phone', {exact: true}).fill('+44 7700 900124');
    await publicPage
      .getByLabel('What would you like help with? (optional)', {exact: true})
      .fill('Retain this goal while I review the updated questions.');
    await chooseOption(selectTrigger(publicPage, 'When would you like to start? (optional)'), 'Next month');
    const beforeVisitorSave = (await send('get', '/v1/coach/landing-page', undefined, tokens.access_token)).data;
    await send(
      'put',
      '/v1/coach/landing-page',
      {
        ...pageInput(beforeVisitorSave),
        application_questions: beforeVisitorSave.application_questions.map((question) =>
          question.type === 'single_select' ? {...question, options: ['In two months', 'Just exploring']} : question,
        ),
      },
      tokens.access_token,
    );
    await publicPage.getByRole('button', {name: 'Send application', exact: true}).click();
    await expect(publicPage.getByRole('button', {name: 'Review updated page', exact: true})).toBeVisible();
    await expect(publicPage.getByRole('dialog').getByRole('alert')).toBeFocused();
    await publicPage.route(`**/v1/public/landing-pages/${slug}`, (route) =>
      route.fulfill({status: 503, json: {error_code: 'unavailable'}}),
    );
    await publicPage.getByRole('button', {name: 'Review updated page', exact: true}).click();
    await expect(
      publicPage.getByText('Could not load the updated page. Your answers are still here.', {exact: true}),
    ).toBeFocused();
    await publicPage.keyboard.press('Tab');
    await expect(publicPage.getByRole('button', {name: 'Review updated page', exact: true})).toBeFocused();
    await publicPage.unroute(`**/v1/public/landing-pages/${slug}`);
    await publicPage.getByRole('button', {name: 'Review updated page', exact: true}).click();
    await expect(publicPage.getByLabel('Your name', {exact: true})).toHaveValue('Asha Rao');
    await expect(selectTrigger(publicPage, 'Interested in')).toBeFocused();
    await expect(publicPage.getByRole('dialog').getByRole('alert')).toHaveCount(0);
    await expect(publicPage.getByLabel('What would you like help with? (optional)', {exact: true})).toHaveValue(
      'Retain this goal while I review the updated questions.',
    );
    await expect(selectTrigger(publicPage, 'When would you like to start? (optional)')).toContainText(
      'Prefer not to answer',
    );
    await chooseOption(selectTrigger(publicPage, 'When would you like to start? (optional)'), 'In two months');
    await publicPage.getByRole('button', {name: 'Send application', exact: true}).click();
    await expect(
      publicPage.getByRole('heading', {name: 'Your application is with the coach', exact: true}),
    ).toBeFocused();
    expect((await send('get', '/v1/coach/prospects', undefined, tokens.access_token)).count).toBe(2);
    await page.getByLabel('What can you help people achieve?', {exact: true}).fill('Unsaved change');
    await page.getByRole('link', {name: 'Coaching page', exact: true}).click();
    await page.getByRole('button', {name: 'Keep editing', exact: true}).click();
    await expect(page.getByLabel('What can you help people achieve?', {exact: true})).toHaveValue('Unsaved change');
    await page.getByRole('button', {name: 'Discard changes', exact: true}).click();
    await page.getByRole('button', {name: 'Load saved page', exact: true}).click();
    await expect(page.getByLabel('What can you help people achieve?', {exact: true})).toHaveValue(
      'Headline from another tab',
    );
    await page.getByRole('link', {name: 'Coaching page', exact: true}).click();
    await page.evaluate(() =>
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async () => {
            throw new Error('Clipboard unavailable');
          },
        },
      }),
    );
    await page.getByRole('button', {name: 'Copy link', exact: true}).click();
    await expect(page.getByRole('alert')).toBeFocused();
    await page.evaluate(() =>
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {writeText: async () => undefined},
      }),
    );
    await page.getByRole('button', {name: 'Copy link', exact: true}).click();
    await expect(page.getByText('Page link copied.', {exact: true})).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByRole('button', {name: 'Copy link', exact: true})).toBeFocused();
    await page.getByRole('button', {name: 'Take page offline', exact: true}).click();
    await page.route('**/v1/coach/landing-page', (route) =>
      route.request().method() === 'PUT'
        ? route.fulfill({status: 503, json: {error_code: 'unavailable'}})
        : route.continue(),
    );
    await page.getByRole('button', {name: 'Take offline', exact: true}).click();
    const offlineDialog = page.getByRole('dialog', {name: 'Take your page offline?', exact: true});
    await expect(offlineDialog.getByRole('alert')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(offlineDialog.getByRole('button', {name: 'Keep page live', exact: true})).toBeFocused();
    await page.screenshot({path: `tests/acquisition/artifacts/offline-recovery-${width}.png`});
    expect((await api.get(`/v1/public/landing-pages/${slug}`)).status()).toBe(200);
    await page.unroute('**/v1/coach/landing-page');
    await page.getByRole('button', {name: 'Take offline', exact: true}).click();
    await expect(page.getByText('Your page is now offline.', {exact: true})).toBeFocused();
    await publicPage.goto(`/coaching/${slug}`);
    await expect(publicPage.getByRole('heading', {name: 'This page is unavailable', exact: true})).toBeVisible();
    expect(errors).toEqual([]);
    await coach.close();
    await visitor.close();
    console.log(
      `Acquisition ${width}: draft, preview, publish, three answer formats, lost response/reload recovery, application snapshot and offline flow passed.`,
    );
  }
} finally {
  await browser.close();
  await api.dispose();
}
