import {mkdir} from 'node:fs/promises';
import {chromium, expect, request} from '@playwright/test';

const api = await request.newContext({baseURL: process.env.COACHAPP_API_URL || 'http://localhost:4000'});
const browser = await chromium.launch({channel: 'chromium'});
await mkdir('tests/workbench/artifacts', {recursive: true});
async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()} ${await response.text()}`).toBe(true);
  return response.status() === 204 ? null : response.json();
}
async function account(unique) {
  const email = `workbench-coach-${unique}@example.test`;
  await send('post', '/v1/auth/signup', {email, first_name: 'Taylor'});
  const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
  await send('post', '/v1/businesses', {name: 'Everyday Coaching', handle: `workbench-${unique}`}, guest.access_token);
  return send('post', '/v1/auth/token', {
    grant_type: 'refresh_token',
    refresh_token: guest.refresh_token,
    role: 'coach',
  });
}
async function client(unique, token, name) {
  const email = `workbench-client-${unique}@example.test`;
  const person = (await send('post', '/v1/coach/clients/invite', {first_name: name, last_name: 'Morgan', email}, token))
    .data;
  const invitation_token = new URL(person.invite_url).pathname.split('/').at(-1);
  await send('post', '/v1/auth/accept-invite', {email, invitation_token});
  const session = await send('post', '/v1/auth/accept-invite/verify', {email, invitation_token, otp: '123456'});
  return {person, token: session.access_token};
}
function date(offset) {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
}
try {
  for (const width of process.env.COACHAPP_WORKBENCH_VISUAL_ONLY === '1' ? [375] : [375, 1280]) {
    const unique = `${Date.now()}-${width}`;
    const tokens = await account(unique);
    const token = tokens.access_token;
    const intakeName = `Test Intake ${'Reflection'.repeat(23)}`;
    const intakeTemplate = (
      await send(
        'post',
        '/v1/coach/form-templates',
        {
          name: intakeName,
          purpose: 'intake',
          sections: [
            {title: 'Goals', questions: [{id: crypto.randomUUID(), type: 'text', label: 'What brings you here?'}]},
          ],
        },
        token,
      )
    ).data;
    await send('put', `/v1/coach/form-templates/${intakeTemplate.id}/default-intake`, undefined, token);
    const alex = await client(unique, token, 'Alex');
    const jordan = await client(`other-${unique}`, token, 'Jordan');
    const q = crypto.randomUUID();
    const form = (
      await send(
        'post',
        '/v1/coach/form-templates',
        {
          name: 'Weekly reflection',
          purpose: 'check_in',
          sections: [{title: 'Your week', questions: [{id: q, type: 'text', label: 'How did it go?', required: true}]}],
        },
        token,
      )
    ).data;
    for (const person of [alex, jordan]) {
      await send(
        'patch',
        `/v1/coach/clients/${person.person.id}`,
        {required_services: ['training', 'nutrition'], subscription_ends_on: date(3)},
        token,
      );
      const intake = (await send('get', `/v1/coach/clients/${person.person.id}/intake`, undefined, token)).data;
      await send('patch', `/v1/coach/form-assignments/${intake.id}`, {due_date: date(-2)}, token);
      const missed = (
        await send('post', `/v1/coach/clients/${person.person.id}/form-assignments`, {form_template_id: form.id}, token)
      ).data;
      await send('patch', `/v1/coach/form-assignments/${missed.id}`, {status: 'missed', due_date: date(-1)}, token);
      const review = (
        await send('post', `/v1/coach/clients/${person.person.id}/form-assignments`, {form_template_id: form.id}, token)
      ).data;
      await send('patch', `/v1/coach/form-assignments/${review.id}`, {due_date: date(-3)}, token);
      await send(
        'post',
        `/v1/client/form-assignments/${review.id}/submit`,
        {answers: {[q]: 'The plan is going well.'}},
        person.token,
      );
      await send('post', '/v1/client/conversation/messages', {body: 'Could you check my plan?'}, person.token);
    }
    const nutritionTemplate = (
      await send('post', '/v1/coach/nutrition-plans', {name: 'Daily nutrition', target_calories: 2100}, token)
    ).data;
    const context = await browser.newContext({
      baseURL: process.env.COACHAPP_URL || 'http://localhost:2022',
      viewport: {width, height: 1000},
    });
    context.setDefaultTimeout(15000);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/login');
    await page.evaluate(async (tokens) => {
      const {saveSession} = await import('/src/api/session.ts');
      saveSession(tokens);
    }, tokens);
    await context.addInitScript(() => {
      delete window.IntersectionObserver;
    });
    let failBadge = true;
    let failPage = false;
    let failNext = false;
    let incompatibleNext = false;
    let holdRefresh = null;
    const requests = [];
    await page.route('**/v1/coach/workbench/items?*', async (route) => {
      const url = new URL(route.request().url());
      const badge = url.searchParams.get('limit') === '1';
      requests.push({
        view: url.searchParams.get('view'),
        cursor: url.searchParams.get('cursor'),
        count: url.searchParams.get('include_count'),
        badge,
      });
      if (
        (badge && failBadge) ||
        (!badge && failPage) ||
        (!badge && failNext && url.searchParams.get('cursor') !== 'start')
      ) {
        return route.fulfill({status: 503, json: {}});
      }
      if (!badge && incompatibleNext && url.searchParams.get('cursor') !== 'start') {
        incompatibleNext = false;
        return route.fulfill({status: 422, json: {error_message: 'Cursor is incompatible.'}});
      }
      if (!badge) {
        url.searchParams.set('limit', '2');
      }
      if (!badge && holdRefresh) {
        const held = holdRefresh;
        holdRefresh = null;
        const response = await route.fetch({url: url.href});
        held.ready.resolve();
        await held.release.promise;
        return route.fulfill({response});
      }
      return route.continue({url: url.href});
    });
    const legacyRequests = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.pathname === '/v1/coach/workbench' || url.pathname.includes('/workbench/queues/')) {
        legacyRequests.push(url.pathname);
      }
    });
    await page.goto('/workbench');
    const rows = page.getByRole('list', {name: 'tasks', exact: true}).locator(':scope > li');
    const nav = page.getByRole('navigation', {name: 'Workbench views'});
    const pick = async (name) => {
      await nav.getByRole('button', {name: new RegExp(`^${name}`)}).click();
      await page.waitForLoadState('networkidle');
    };
    const loadAll = async () => {
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const more = page.getByRole('button', {name: 'Load more', exact: true});
        if (!(await more.count())) {
          break;
        }
        const before = await rows.count();
        await more.click();
        await expect.poll(() => rows.count()).toBeGreaterThan(before);
      }
      await expect(page.getByRole('button', {name: 'All tasks loaded', exact: true})).toBeVisible();
    };
    async function capture(name) {
      await page.getByRole('heading', {name: 'Workbench', exact: true}).click();
      await page.evaluate(() => {
        document.activeElement?.blur();
        window.scrollTo({top: 0, behavior: 'instant'});
      });
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.screenshot({path: `tests/workbench/artifacts/${name}-${width}.png`, fullPage: true});
      await page.screenshot({path: `tests/workbench/artifacts/${name}-viewport-${width}.png`});
    }
    const task = (name, action) => rows.getByRole('article', {name: `${name} Morgan · ${action}`, exact: true});
    const search = page.getByLabel('Search clients', {exact: true});
    await expect(page.getByText('8 tasks', {exact: true})).toBeVisible();
    await expect(
      page.getByText('Follow-up count unavailable. Your work is still accessible.', {exact: true}),
    ).toBeVisible();
    failBadge = false;
    await page.getByRole('button', {name: 'Retry count', exact: true}).click();
    await expect(nav.getByRole('button', {name: 'Follow-ups · 6', exact: true})).toBeVisible();
    await expect(rows).toHaveCount(2);
    failNext = true;
    await page.getByRole('button', {name: 'Load more', exact: true}).press('Enter');
    await expect(page.getByRole('button', {name: 'Retry loading more', exact: true})).toBeVisible();
    await expect(rows).toHaveCount(2);
    failNext = false;
    await page.getByRole('button', {name: 'Retry loading more', exact: true}).press('Enter');
    await expect(rows).toHaveCount(4);
    incompatibleNext = true;
    await page.getByRole('button', {name: 'Load more', exact: true}).click();
    await expect(
      page.getByText('This list has changed. Refresh to continue from the beginning.', {exact: true}),
    ).toBeVisible();
    await expect(rows).toHaveCount(4);
    await page.getByRole('button', {name: 'Retry refresh', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Retry refresh', exact: true})).toHaveCount(0);
    await loadAll();
    await expect(rows).toHaveCount(8);
    expect(
      await rows.locator('article').evaluateAll((nodes) => new Set(nodes.map((node) => node.dataset.workbenchId)).size),
    ).toBe(8);
    await expect(page.getByText('8 tasks', {exact: true})).toBeVisible();
    await expect(task('Alex', 'Prepare training plan')).toBeVisible();
    await expect(task('Alex', 'Prepare nutrition plan')).toBeVisible();
    await expect(task('Alex', 'Review check-in')).toBeVisible();
    await expect(task('Alex', 'Reply')).toBeVisible();
    expect(requests.some((r) => !r.badge && r.cursor !== 'start' && r.count === 'false')).toBe(true);
    expect(requests.filter((r) => !r.badge && r.cursor === 'start').every((r) => r.count === 'true')).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await capture('awaiting');

    await search.fill('Jordan');
    await expect(page.getByText('4 tasks', {exact: true})).toBeVisible();
    await task('Jordan', 'Prepare nutrition plan')
      .getByRole('link', {name: 'Prepare nutrition plan', exact: true})
      .click();
    await expect(page.getByRole('heading', {name: 'Nutrition for Jordan Morgan', exact: true})).toBeVisible();
    await page.getByRole('link', {name: 'Back to workbench', exact: true}).click();
    await expect(search).toHaveValue('Jordan');
    await page.reload();
    await expect(search).toHaveValue('Jordan');
    await task('Jordan', 'Prepare nutrition plan')
      .getByRole('link', {name: 'Prepare nutrition plan', exact: true})
      .click();
    await page.getByText('Daily nutrition', {exact: true}).click();
    await page.getByLabel('Start date', {exact: true}).fill(date(0));
    await page.getByRole('button', {name: 'Assign nutrition plan', exact: true}).click();
    await expect(page.getByText('Daily nutrition assigned.', {exact: true})).toBeVisible();
    await page.getByRole('link', {name: 'Back to workbench', exact: true}).click();
    await expect(search).toHaveValue('Jordan');
    await expect(page.getByText('3 tasks', {exact: true})).toBeVisible();
    await expect(task('Jordan', 'Prepare training plan')).toBeVisible();
    await expect(task('Jordan', 'Prepare nutrition plan')).toHaveCount(0);
    await search.fill('');
    await expect(page.getByText('7 tasks', {exact: true})).toBeVisible();
    await loadAll();

    await task('Alex', 'Review check-in').getByRole('link', {name: 'Review check-in', exact: true}).click();
    await expect(page.getByText('The plan is going well.', {exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'Mark reviewed', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Review saved', exact: true})).toBeVisible();
    await page.getByRole('link', {name: 'Back to workbench', exact: true}).click();
    await expect(page.getByText('6 tasks', {exact: true})).toBeVisible();
    await loadAll();
    await expect(task('Alex', 'Review check-in')).toHaveCount(0);
    await task('Alex', 'Reply').getByRole('link', {name: 'Reply', exact: true}).click();
    await page.getByRole('link', {name: 'Back to workbench', exact: true}).click();
    await expect(page.getByText('6 tasks', {exact: true})).toBeVisible();
    await loadAll();
    await task('Alex', 'Reply').getByRole('link', {name: 'Reply', exact: true}).click();
    await page.getByLabel('Message Alex Morgan', {exact: true}).fill('I have checked it. Keep going with the plan.');
    await page.getByRole('button', {name: 'Send message', exact: true}).click();
    await expect(page.getByText('Message sent.', {exact: true})).toBeVisible();
    await page.getByRole('link', {name: 'Back to workbench', exact: true}).click();
    await expect(page.getByText('5 tasks', {exact: true})).toBeVisible();

    const alexIntake = (await send('get', `/v1/coach/clients/${alex.person.id}/intake`, undefined, token)).data;
    const intakeQuestion = intakeTemplate.sections[0].questions[0].id;
    await send(
      'post',
      `/v1/client/form-assignments/${alexIntake.id}/submit`,
      {answers: {[intakeQuestion]: 'Build a consistent routine.'}},
      alex.token,
    );
    await page.getByRole('button', {name: 'Refresh tasks', exact: true}).click();
    await expect(page.getByText('6 tasks', {exact: true})).toBeVisible();
    await loadAll();
    await task('Alex', 'Review intake').getByRole('link', {name: 'Review intake', exact: true}).click();
    await expect(page.getByText('Build a consistent routine.', {exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'Mark intake reviewed', exact: true}).click();
    await expect(page.getByText('Intake reviewed', {exact: true})).toBeVisible();
    await page.getByRole('link', {name: 'Back to workbench', exact: true}).click();
    await expect(page.getByText('5 tasks', {exact: true})).toBeVisible();

    await pick('Follow-ups');
    await expect(page.getByText('5 tasks', {exact: true})).toBeVisible();
    await loadAll();
    await expect(task('Alex', 'Follow up')).toBeVisible();
    const longReason = task('Jordan', 'Follow up intake').getByText(intakeName, {exact: true});
    await expect(longReason).toBeVisible();
    expect(await longReason.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await capture('follow-ups');
    await task('Alex', 'Update engagement').getByRole('link', {name: 'Update engagement', exact: true}).click();
    await page.getByLabel('Engagement ends', {exact: true}).fill(date(60));
    await page.getByRole('button', {name: 'Save changes', exact: true}).click();
    await expect(page.getByText('Client details saved.', {exact: true})).toBeVisible();
    await page.getByRole('link', {name: 'Back to workbench', exact: true}).click();
    await expect(page.getByText('4 tasks', {exact: true})).toBeVisible();
    await loadAll();
    await task('Jordan', 'Update engagement').getByRole('button', {name: 'Snooze', exact: true}).click();
    const dialog = page.getByRole('dialog');
    let invalidWrites = 0;
    const countWrites = (request) => {
      if (request.url().endsWith('/queue-snooze') && request.method() === 'PUT') {
        invalidWrites += 1;
      }
    };
    page.on('request', countWrites);
    await dialog.getByLabel('Hide through', {exact: true}).fill(date(-1));
    await dialog.getByRole('button', {name: 'Snooze task', exact: true}).click();
    await expect(dialog.getByLabel('Hide through', {exact: true})).toBeFocused();
    await expect(dialog.getByText('Choose today or a later date.', {exact: true})).toBeVisible();
    expect(invalidWrites).toBe(0);
    page.off('request', countWrites);
    await dialog.getByLabel('Hide through', {exact: true}).fill(date(5));
    const snoozeEndpoint = `**/v1/coach/clients/${jordan.person.id}/queue-snooze`;
    await page.route(snoozeEndpoint, (route) => route.fulfill({status: 503, json: {}}));
    await dialog.getByRole('button', {name: 'Snooze task', exact: true}).click();
    await expect(dialog.getByRole('alert')).toBeVisible();
    await page.unroute(snoozeEndpoint);
    await page.route(snoozeEndpoint, async (route) => {
      await route.fetch();
      await route.abort('failed');
    });
    await dialog.getByRole('button', {name: 'Snooze task', exact: true}).click();
    await expect(dialog.getByText(/Could not confirm the snooze/)).toBeVisible();
    await page.unroute(snoozeEndpoint);
    await dialog.getByRole('button', {name: 'Snooze task', exact: true}).click();
    await expect(page.getByText('3 tasks', {exact: true})).toBeVisible();
    await loadAll();
    await expect(task('Jordan', 'Follow up')).toBeVisible();
    await task('Alex', 'Follow up').getByRole('button', {name: 'Snooze', exact: true}).click();
    await dialog.getByLabel('Hide through', {exact: true}).fill(date(5));
    await dialog.getByRole('button', {name: 'Snooze task', exact: true}).click();
    await expect(page.getByText('2 tasks', {exact: true})).toBeVisible();
    failPage = true;
    await page.getByRole('button', {name: 'Refresh tasks', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Retry refresh', exact: true})).toBeVisible();
    await expect(rows).toHaveCount(2);
    failPage = false;
    await page.getByRole('button', {name: 'Retry refresh', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Retry refresh', exact: true})).toHaveCount(0);
    await search.fill('missing-client');
    await expect(page.getByRole('heading', {name: 'No matching work', exact: true})).toBeVisible();
    failPage = true;
    await page.reload();
    await expect(page.getByRole('button', {name: 'Try again', exact: true})).toBeVisible();
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', {name: 'Try again', exact: true}).focus();
    failPage = false;
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', {name: 'No matching work', exact: true})).toBeVisible();

    await pick('Awaiting you');
    await expect(page.getByText('5 tasks', {exact: true})).toBeVisible();
    await loadAll();
    await task('Jordan', 'Review check-in').getByRole('link', {name: 'Review check-in', exact: true}).click();
    await page.getByRole('button', {name: 'Mark reviewed', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Review saved', exact: true})).toBeVisible();
    await page.getByRole('link', {name: 'Back to workbench', exact: true}).click();
    await expect(page.getByText('4 tasks', {exact: true})).toBeVisible();
    await loadAll();
    await task('Jordan', 'Reply').getByRole('link', {name: 'Reply', exact: true}).click();
    await page.getByRole('button', {name: 'Mark handled', exact: true}).click();
    await expect(page.getByText('Conversation marked handled.', {exact: true})).toBeVisible();
    await page.getByRole('link', {name: 'Back to workbench', exact: true}).click();
    await expect(page.getByText('3 tasks', {exact: true})).toBeVisible();
    const trainingTemplate = (await send('post', '/v1/coach/training-plans', {name: 'Coverage fixture'}, token)).data;
    for (const person of [alex, jordan]) {
      await send(
        'post',
        `/v1/coach/clients/${person.person.id}/training-plans/${trainingTemplate.id}/assign`,
        {start_date: date(0)},
        token,
      );
    }
    await send(
      'post',
      `/v1/coach/clients/${alex.person.id}/nutrition-plans/${nutritionTemplate.id}/assign`,
      {start_date: date(0)},
      token,
    );
    await page.getByRole('button', {name: 'Refresh tasks', exact: true}).click();
    await expect(
      page.getByRole('heading', {name: 'No replies, reviews, or plans waiting on you.', exact: true}),
    ).toBeVisible();
    await expect(nav.getByRole('button', {name: 'Follow-ups · 2', exact: true})).toBeVisible();
    await pick('Follow-ups');
    await expect(page.getByText('2 tasks', {exact: true})).toBeVisible();

    if (width === 375) {
      await expect(rows).toHaveCount(2);
      const ready = Promise.withResolvers();
      const release = Promise.withResolvers();
      holdRefresh = {ready, release};
      await page.getByRole('button', {name: 'Refresh tasks', exact: true}).click();
      await ready.promise;
      const replacement = await account(`replacement-${unique}`);
      await page.evaluate(async (tokens) => {
        const {clearSession, saveSession} = await import('/src/api/session.ts');
        clearSession();
        saveSession(tokens);
      }, replacement);
      release.resolve();
      await page
        .getByRole('navigation', {name: 'Coaching', exact: true})
        .getByRole('link', {name: 'Workbench', exact: true})
        .click();
      await expect(
        page.getByRole('heading', {
          name: /No (replies, reviews, or plans waiting on you\.|follow-ups in this view\.)/,
          exact: true,
        }),
      ).toBeVisible();
      await page.waitForLoadState('networkidle');
      expect(
        await page.evaluate(async (id) => {
          const {queryClient} = await import('/src/api/query-client.ts');
          return queryClient
            .getQueryCache()
            .getAll()
            .some((query) => JSON.stringify(query.state.data ?? '').includes(id));
        }, alex.person.id),
      ).toBe(false);
      await pick('Follow-ups');
      await expect(page.getByRole('heading', {name: 'No follow-ups in this view.', exact: true})).toBeVisible();
    }
    expect(legacyRequests).toEqual([]);
    expect(errors).toEqual([]);
    await context.close();
    console.log(
      `Unified workbench, independent outcomes, intake review, paging, recovery and isolation passed at ${width}px.`,
    );
  }
} finally {
  await browser.close();
  await api.dispose();
}
