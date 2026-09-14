import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium, expect, request} from '@playwright/test';
import {chooseOption, selectTrigger} from '../select-helpers.mjs';

execFileSync(
  'rtk',
  ['proxy', 'mix', 'run', '--no-start', fileURLToPath(new URL('./prospects-fixtures.exs', import.meta.url))],
  {cwd: fileURLToPath(new URL('../../../../../backend', import.meta.url)), stdio: 'pipe'},
);
const fixtures = JSON.parse(await readFile(new URL('./artifacts/prospects-fixtures.json', import.meta.url), 'utf8'));
const api = await request.newContext({baseURL: process.env.COACHAPP_API_URL || 'http://127.0.0.1:44000'});
const browser = await chromium.launch({channel: 'chromium'});
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()} ${await response.text()}`).toBe(true);
  return response.json();
}
async function login(email) {
  await send('post', '/v1/auth/otp', {email, type: 'authentication'});
  return send('post', '/v1/auth/token', {email, otp: '123456', role: 'coach', grant_type: 'otp'});
}
async function session(page, tokens) {
  await page.evaluate(async (tokens) => {
    const {saveSession} = await import('/src/api/session.ts');
    saveSession(tokens);
  }, tokens);
}
async function refresh(page) {
  await page.evaluate(async () => {
    const {queryClient} = await import('/src/api/query-client.ts');
    const {landingPageKeys} = await import('/src/api/keys.ts');
    await queryClient.invalidateQueries({queryKey: landingPageKeys.all});
  });
}
async function capture(page, name, width) {
  await page.getByRole('heading', {level: 1}).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({path: `tests/acquisition/artifacts/${name}-${width}.png`, fullPage: true});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
try {
  for (const fixture of fixtures) {
    const {width} = fixture;
    const tokens = await login(fixture.owner_email);
    const initial = (await send('get', '/v1/coach/landing-page', undefined, tokens.access_token)).data;
    const headline = 'Strength, confidence and a routine that works around your everyday life.';
    const longCopy = 'Practical coaching around work, family and the things that matter to you. '
      .repeat(3)
      .slice(0, 255);
    const seeded = (
      await send(
        'put',
        '/v1/coach/landing-page',
        {
          slug: initial.slug,
          expected_revision: initial.revision,
          status: 'published',
          template: 'coach_story',
          headline,
          subheadline: longCopy,
          coach_intro: longCopy,
          hero_image_url: 'https://images.example.test/unavailable.jpg',
          proof_points: [{value: 'Eight years', label: 'Coaching experience'}],
          fit_points: [longCopy],
          programs: [
            {name: 'Personal strength coaching', audience: longCopy, description: longCopy},
            {name: 'Nutrition that fits your day', description: longCopy},
            {name: 'A'.repeat(255), description: longCopy},
          ],
          application_questions: Array.from({length: 5}, (_, index) => ({
            id: `question-${index}`,
            label: `Question ${index + 1}`,
            type: 'long_text',
          })),
        },
        tokens.access_token,
      )
    ).data;
    const options = {baseURL: process.env.COACHAPP_URL || 'http://localhost:22022', viewport: {width, height: 900}};
    const coach = await browser.newContext(options);
    const visitor = await browser.newContext(options);
    await coach.route('https://images.example.test/**', (route) => route.fulfill({status: 404, body: ''}));
    await visitor.route('https://images.example.test/**', (route) => route.fulfill({status: 404, body: ''}));
    const page = await coach.newPage();
    const publicPage = await visitor.newPage();
    const errors = [];
    for (const tab of [page, publicPage]) {
      tab.on('pageerror', (error) => errors.push(error.message));
    }
    await page.goto('/login');
    await session(page, tokens);
    await page.route('**/v1/coach/landing-page', (route) =>
      route.fulfill({status: 503, json: {error_code: 'unavailable'}}),
    );
    await page.goto('/coaching-page/edit');
    await expect(page.getByRole('button', {name: 'Try again', exact: true})).toBeVisible();
    await page.unroute('**/v1/coach/landing-page');
    await page.getByRole('button', {name: 'Try again', exact: true}).click();
    await expect(page.getByLabel('What can you help people achieve?', {exact: true})).toHaveValue(headline);
    await page.getByLabel('What can you help people achieve?', {exact: true}).fill(`${headline} Start today.`);
    await page.route('**/v1/coach/landing-page', (route) =>
      route.fulfill({status: 503, json: {error_code: 'unavailable'}}),
    );
    await refresh(page);
    await expect(page.getByRole('button', {name: 'Retry refresh', exact: true})).toBeVisible();
    await expect(page.getByLabel('What can you help people achieve?', {exact: true})).toHaveValue(
      `${headline} Start today.`,
    );
    await page.unroute('**/v1/coach/landing-page');
    await page.getByRole('button', {name: 'Retry refresh', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Retry refresh', exact: true})).toHaveCount(0);
    await page.getByLabel('What can you help people achieve?', {exact: true}).fill(headline);
    await expect(page.getByRole('button', {name: 'Add program', exact: true})).toBeDisabled();
    await expect(page.getByRole('button', {name: 'Add question', exact: true})).toBeDisabled();
    await expect(page.getByRole('button', {name: 'Move program 1 up', exact: true})).toBeDisabled();
    await expect(page.getByRole('button', {name: 'Move program 3 down', exact: true})).toBeDisabled();
    await page.getByRole('button', {name: 'Move program 2 up', exact: true}).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByLabel('Program name', {exact: true}).first()).toHaveValue('Nutrition that fits your day');
    await page.getByRole('button', {name: 'Move program 1 down', exact: true}).click();
    await expect(page.getByLabel('Program name', {exact: true}).first()).toHaveValue('Personal strength coaching');
    await page.getByRole('button', {name: 'Move program 2 up', exact: true}).click();
    await page.getByRole('button', {name: 'Move question 5 up', exact: true}).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByLabel('Question', {exact: true}).nth(3)).toHaveValue('Question 5');
    await page.getByRole('button', {name: 'Move question 4 down', exact: true}).click();
    await expect(page.getByLabel('Question', {exact: true}).nth(3)).toHaveValue('Question 4');
    await page.getByRole('button', {name: 'Move question 5 up', exact: true}).click();
    await page.getByText('More about your coaching', {exact: true}).click();
    for (const [choice, expected] of [
      ['Your story', ['Meet your coach', 'Is this for you?', 'Your experience']],
      ['Who you help', ['Is this for you?', 'Meet your coach', 'Your experience']],
      ['Your experience', ['Your experience', 'Is this for you?', 'Meet your coach']],
    ]) {
      await chooseOption(selectTrigger(page, 'What comes after your introduction?'), choice);
      await page.getByRole('button', {name: 'Publish changes', exact: true}).click();
      await expect(page.getByText('Your page is live. Changes are published.', {exact: true})).toBeVisible();
      await publicPage.goto(`/coaching/${seeded.slug}`);
      await expect(publicPage.getByRole('heading', {level: 1})).toHaveText(headline);
      await expect(publicPage.locator('article img')).toHaveCount(0);
      const order = await publicPage
        .locator('article > section, article > dl')
        .evaluateAll((nodes) =>
          nodes
            .slice(1, 4)
            .map((node) => (node.tagName === 'DL' ? 'Your experience' : node.querySelector('h2')?.textContent)),
        );
      expect(order).toEqual(expected);
      await expect(publicPage.getByRole('heading', {level: 3}).first()).toHaveText('Nutrition that fits your day');
      await capture(publicPage, `layout-${choice.replaceAll(' ', '-').toLowerCase()}`, width);
    }
    const saved = (await send('get', '/v1/coach/landing-page', undefined, tokens.access_token)).data;
    expect(saved.programs[0].id).toBe(seeded.programs[1].id);
    expect(saved.application_questions[3].id).toBe('question-4');
    await page.getByRole('button', {name: 'Remove program 3', exact: true}).click();
    await page.getByRole('button', {name: 'Remove question 5', exact: true}).click();
    await page.getByRole('button', {name: 'Publish changes', exact: true}).click();
    await expect(page.getByText('Your page is live. Changes are published.', {exact: true})).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('Program name', {exact: true})).toHaveCount(2);
    await expect(page.getByLabel('Question', {exact: true})).toHaveCount(4);
    await publicPage.route(`**/v1/public/landing-pages/${seeded.slug}`, (route) =>
      route.fulfill({status: 503, json: {error_code: 'unavailable'}}),
    );
    await refresh(publicPage);
    await expect(publicPage.getByRole('button', {name: 'Refresh coaching page', exact: true})).toBeVisible();
    await expect(publicPage.getByRole('heading', {level: 1})).toHaveText(headline);
    await publicPage.reload();
    await expect(publicPage.getByRole('heading', {name: 'This page is unavailable', exact: true})).toBeVisible();
    await publicPage.unroute(`**/v1/public/landing-pages/${seeded.slug}`);
    await publicPage.getByRole('button', {name: 'Try again', exact: true}).click();
    await expect(publicPage.getByRole('heading', {level: 1})).toHaveText(headline);

    const trainerBody = {email: fixture.trainer_email, invitation_token: fixture.trainer_token};
    await send('post', '/v1/auth/trainer-accept-invite', trainerBody);
    const trainerTokens = await send('post', '/v1/auth/trainer-accept-invite/verify', {...trainerBody, otp: '123456'});
    await session(page, trainerTokens);
    await page.goto('/coaching-page/edit');
    await page.getByLabel('What can you help people achieve?', {exact: true}).fill('Coaching with our whole team');
    await page.getByRole('button', {name: 'Publish changes', exact: true}).click();
    await expect(page.getByText('Your page is live. Changes are published.', {exact: true})).toBeVisible();
    expect((await send('get', '/v1/coach/landing-page', undefined, tokens.access_token)).data.headline).toBe(
      'Coaching with our whole team',
    );
    const foreign = fixtures.find((item) => item.width !== width);
    const foreignTokens = await login(foreign.owner_email);
    const foreignPage = (await send('get', '/v1/coach/landing-page', undefined, foreignTokens.access_token)).data;
    const privateHeadline = `Private draft for business ${width}`;
    let release;
    const held = new Promise((resolve) => {
      release = resolve;
    });
    let received;
    const started = new Promise((resolve) => {
      received = resolve;
    });
    await page.route('**/v1/coach/landing-page', async (route) => {
      if (route.request().method() === 'PUT') {
        const response = await route.fetch();
        received();
        await held;
        await route.fulfill({response});
      } else {
        await route.continue();
      }
    });
    await page.getByLabel('What can you help people achieve?', {exact: true}).fill(privateHeadline);
    await page.getByRole('button', {name: 'Publish changes', exact: true}).click();
    await started;
    await session(page, foreignTokens);
    release();
    await expect(page.getByLabel('Page address', {exact: true})).toHaveValue(foreignPage.slug);
    await expect(page.getByLabel('What can you help people achieve?', {exact: true})).toHaveValue(foreignPage.headline);
    expect(errors).toEqual([]);
    await coach.close();
    await visitor.close();
    console.log(
      `Authoring audit ${width}: layouts, long copy, failed image, row limits/order/removal, cold/refresh recovery, trainer edits and session isolation passed.`,
    );
  }
} finally {
  await browser.close();
  await api.dispose();
}
