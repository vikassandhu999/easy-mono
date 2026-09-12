import {mkdir} from 'node:fs/promises';
import {chromium, expect, request} from '@playwright/test';
import {checkClientOverview} from '../clients/overview-flow.mjs';
import {chooseOption, selectTrigger} from '../select-helpers.mjs';

const api = await request.newContext({baseURL: 'http://localhost:4000'});
const browser = await chromium.launch();
await mkdir('tests/check-ins/artifacts', {recursive: true});
await mkdir('tests/clients/artifacts', {recursive: true});
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()} ${response.ok() ? '' : await response.text()}`).toBe(
    true,
  );
  return response.status() === 204 ? null : response.json();
}
async function account(unique) {
  const email = `review-coach-${unique}@example.test`;
  await send('post', '/v1/auth/signup', {email, first_name: 'Taylor'});
  const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
  await send('post', '/v1/businesses', {name: 'Everyday Coaching', handle: `review-${unique}`}, guest.access_token);
  return send('post', '/v1/auth/token', {
    grant_type: 'refresh_token',
    refresh_token: guest.refresh_token,
    role: 'coach',
  });
}
async function clientAccount(unique, token) {
  const email = `review-client-${unique}@example.test`;
  const person = (
    await send('post', '/v1/coach/clients/invite', {first_name: 'Alex', last_name: 'Morgan', email}, token)
  ).data;
  const invitation_token = new URL(person.invite_url).pathname.split('/').at(-1);
  await send('post', '/v1/auth/accept-invite', {email, invitation_token});
  const tokens = await send('post', '/v1/auth/accept-invite/verify', {email, invitation_token, otp: '123456'});
  return {person, tokens};
}
async function submit(form, person, coachToken, clientToken, answers) {
  const assignment = (
    await send('post', `/v1/coach/clients/${person.id}/form-assignments`, {form_template_id: form.id}, coachToken)
  ).data;
  return (await send('post', `/v1/client/form-assignments/${assignment.id}/submit`, {answers}, clientToken)).data;
}
async function signIn(page, tokens) {
  await page.goto('/login');
  await page.evaluate(async (tokens) => {
    const {saveSession} = await import('/src/api/session.ts');
    saveSession(tokens);
  }, tokens);
}
try {
  for (const width of [375, 1280]) {
    const unique = `${Date.now()}-${width}`;
    const tokens = await account(unique);
    const token = tokens.access_token;
    const {person, tokens: clientTokens} = await clientAccount(unique, token);
    const context = await browser.newContext({baseURL: 'http://localhost:2022', viewport: {width, height: 900}});
    context.setDefaultTimeout(12000);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await signIn(page, tokens);
    await page.goto(`/clients/${person.id}`);
    await expect(page.getByRole('heading', {name: 'Intake pending', exact: true})).toBeVisible();
    await checkClientOverview({
      page,
      api,
      coachToken: token,
      clientToken: clientTokens.access_token,
      clientId: person.id,
      width,
    });
    await page.goto('/');
    const navigation = page.getByRole('navigation', {name: 'Coaching', exact: true});
    expect(
      await navigation
        .getByRole('link', {name: 'Check-ins', exact: true})
        .evaluate((link) => getComputedStyle(link).whiteSpace),
    ).toBe('nowrap');
    await page.route('**/v1/coach/check-ins/submissions?*', (route) => route.fulfill({status: 503, json: {}}));
    await page.getByRole('link', {name: 'Check-ins', exact: true}).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await page.unroute('**/v1/coach/check-ins/submissions?*');
    await page.getByRole('button', {name: 'Try again', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'No check-ins waiting for review', exact: true})).toBeVisible();
    const q = {
      text: crypto.randomUUID(),
      number: crypto.randomUUID(),
      bool: crypto.randomUUID(),
      optional: crypto.randomUUID(),
    };
    const sections = [
      {
        title: 'Your week',
        questions: [
          {id: q.text, type: 'text', label: 'What went well this week?', required: true},
          {id: q.number, type: 'number', label: 'Missed sessions', required: true},
          {id: q.bool, type: 'boolean', label: 'Any pain?', required: true},
          {id: q.optional, type: 'text', label: 'Anything else?', required: false},
        ],
      },
    ];
    const form = (
      await send(
        'post',
        '/v1/coach/form-templates',
        {name: 'First week reflection', purpose: 'check_in', sections},
        token,
      )
    ).data;
    const first = await submit(form, person, token, clientTokens.access_token, {
      [q.text]: 'I made time for every session and felt stronger.',
      [q.number]: 0,
      [q.bool]: false,
    });
    await send(
      'patch',
      `/v1/coach/form-templates/${form.id}`,
      {
        sections: [
          {
            title: 'Updated questions',
            questions: [{id: q.text, type: 'text', label: 'A changed question', required: true}],
          },
        ],
      },
      token,
    );
    const weekly = (
      await send('post', '/v1/coach/form-templates', {name: 'Weekly progress', purpose: 'check_in', sections}, token)
    ).data;
    for (let index = 0; index < 45; index++) {
      await submit(weekly, person, token, clientTokens.access_token, {
        [q.text]: `Progress update ${index}`,
        [q.number]: index % 3,
        [q.bool]: false,
      });
    }
    const endpoint = '/v1/coach/check-ins/submissions';
    await page.getByRole('button', {name: 'Refresh check-in responses', exact: true}).click();
    const rows = page.getByRole('list', {name: 'check-in responses', exact: true}).locator(':scope > li');
    await expect(rows).toHaveCount(20);
    const serverPage = await send('get', `${endpoint}?cursor=start&reviewed=false`, undefined, token);
    await expect(page.getByText(`${serverPage.count} check-in responses`, {exact: true})).toBeVisible();
    await page.route(`**${endpoint}?*`, (route) =>
      new URL(route.request().url()).searchParams.get('cursor') !== 'start'
        ? route.fulfill({status: 503, json: {}})
        : route.continue(),
    );
    await page.getByRole('button', {name: 'Load more', exact: true}).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', {name: 'Retry loading more', exact: true})).toBeVisible();
    await expect(rows).toHaveCount(20);
    await page.unroute(`**${endpoint}?*`);
    await page.getByRole('button', {name: 'Retry loading more', exact: true}).click();
    await expect(rows).toHaveCount(40);
    await rows.nth(30).scrollIntoViewIfNeeded();
    const scroll = await page.evaluate(() => scrollY);
    await rows.nth(30).getByRole('link').click();
    await expect(page.getByRole('region', {name: 'Submitted answers', exact: true})).toBeVisible();
    await page.getByRole('link', {name: 'Back to responses', exact: true}).click();
    await expect(rows).toHaveCount(40);
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(scroll);
    await page.getByRole('button', {name: 'Load more', exact: true}).scrollIntoViewIfNeeded();
    await expect(rows).toHaveCount(46);
    await expect(page.getByRole('button', {name: 'All check-in responses loaded', exact: true})).toBeDisabled();
    await page.getByLabel('Search check-ins', {exact: true}).fill('First week reflection');
    await expect(rows).toHaveCount(1);
    await page.reload();
    await expect(rows).toHaveCount(1);
    const read = page.getByRole('link', {name: 'Read First week reflection from Alex Morgan', exact: true});
    await read.click();
    await expect(page.getByText('What went well this week?', {exact: true})).toBeVisible();
    await expect(page.getByText('A changed question', {exact: true})).toHaveCount(0);
    const answers = page.getByRole('region', {name: 'Submitted answers', exact: true});
    await expect(answers.getByText('0', {exact: true})).toBeVisible();
    await expect(answers.getByText('No', {exact: true})).toBeVisible();
    await expect(answers.getByText('Not answered', {exact: true})).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({path: `tests/check-ins/artifacts/response-${width}.png`, fullPage: true});
    const reviewPath = `/v1/coach/form-submissions/${first.id}/review`;
    await page.route(`**${reviewPath}`, (route) => route.fulfill({status: 503, json: {}}));
    await page.getByRole('button', {name: 'Mark reviewed', exact: true}).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(answers.getByText('0', {exact: true})).toBeVisible();
    await page.unroute(`**${reviewPath}`);
    // The write succeeds but its response is lost. Refetch must reveal the saved review.
    await page.route(`**${reviewPath}`, async (route) => {
      const response = await route.fetch();
      expect(response.status()).toBe(200);
      return route.abort('connectionfailed');
    });
    await page.getByRole('button', {name: 'Mark reviewed', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Review saved', exact: true})).toBeVisible();
    await page.unroute(`**${reviewPath}`);
    await page.reload();
    await expect(page.getByRole('heading', {name: 'Review saved', exact: true})).toBeVisible();
    await page.getByRole('link', {name: 'Return to responses', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'No matching responses', exact: true})).toBeVisible();
    await chooseOption(selectTrigger(page, 'Show'), 'Reviewed');
    await expect(rows).toHaveCount(1);
    await read.click();
    await page.getByRole('link', {name: 'Alex Morgan', exact: true}).click();
    await page.getByRole('link', {name: 'View responses', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Responses from Alex Morgan', exact: true})).toBeVisible();
    await expect(rows).toHaveCount(20);
    await chooseOption(selectTrigger(page, 'Show'), 'Reviewed');
    await expect(rows).toHaveCount(1);
    await page.screenshot({path: `tests/check-ins/artifacts/responses-${width}.png`, fullPage: true});
    await page.getByRole('link', {name: 'Manage schedules', exact: true}).click();
    await page.getByRole('link', {name: 'View submitted responses', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Responses from Alex Morgan', exact: true})).toBeVisible();
    // Photo recovery uses a response fixture; upload storage is an external boundary.
    const detailPath = `${endpoint}/${first.id}`;
    const photoId = crypto.randomUUID();
    await page.route(`**${detailPath}`, async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      body.data.question_snapshot.push({
        title: 'Progress photo',
        questions: [{id: 'photo', type: 'photo', label: 'This week’s photo'}],
      });
      body.data.answers.photo = [photoId];
      return route.fulfill({response, json: body});
    });
    await page.goto(`/check-ins/responses/${first.id}`);
    await page.route('**/v1/coach/attachments/download-urls', (route) => route.fulfill({status: 503, json: {}}));
    await page.getByRole('button', {name: 'Load photo', exact: true}).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await page.unroute('**/v1/coach/attachments/download-urls');
    await page.route('**/v1/coach/attachments/download-urls', (route) =>
      route.fulfill({
        json: {data: [{id: photoId, download_url: 'data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA='}]},
      }),
    );
    await page.getByRole('button', {name: 'Reload photos', exact: true}).click();
    await expect(page.getByRole('link', {name: /Open photo 1/})).toBeVisible();
    await page.unroute(`**${detailPath}`);
    await page.unroute('**/v1/coach/attachments/download-urls');
    await page.goto(`/check-ins/responses/${crypto.randomUUID()}`);
    await expect(page.getByRole('heading', {name: 'Response not found', exact: true})).toBeVisible();
    await page.getByRole('link', {name: 'Return to responses', exact: true}).click();
    await expect(rows).toHaveCount(20);
    await rows.first().getByRole('link').click();
    if (width === 375) {
      const held = Promise.withResolvers();
      const release = Promise.withResolvers();
      await page.route('**/v1/coach/form-submissions/*/review', async (route) => {
        const response = await route.fetch();
        expect(response.status()).toBe(200);
        held.resolve();
        await release.promise;
        return route.fulfill({response});
      });
      await page.getByRole('button', {name: 'Mark reviewed', exact: true}).click();
      await held.promise;
      const other = await account(`other-${unique}`);
      await page.evaluate(async (tokens) => {
        const {clearSession, saveSession} = await import('/src/api/session.ts');
        clearSession();
        saveSession(tokens);
      }, other);
      release.resolve();
      await page.getByRole('link', {name: 'Check-ins', exact: true}).click();
      await expect(page.getByRole('heading', {name: 'No check-ins waiting for review', exact: true})).toBeVisible();
      await page.waitForLoadState('networkidle');
      expect(
        await page.evaluate(async (id) => {
          const {queryClient} = await import('/src/api/query-client.ts');
          return queryClient
            .getQueryCache()
            .getAll()
            .some((query) => JSON.stringify(query.state.data ?? '').includes(id));
        }, person.id),
      ).toBe(false);
    } else {
      await page.getByRole('button', {name: 'Mark reviewed', exact: true}).click();
      await expect(page.getByRole('heading', {name: 'Review saved', exact: true})).toBeVisible();
    }
    expect(errors).toEqual([]);
    await context.close();
    console.log(`Check-in review, history, snapshot, pagination, recovery and session safety passed at ${width}px.`);
  }
} finally {
  await browser.close();
  await api.dispose();
}
