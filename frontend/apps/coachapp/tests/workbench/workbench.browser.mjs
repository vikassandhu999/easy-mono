import {mkdir} from 'node:fs/promises';
import {chromium, expect, request} from '@playwright/test';
import {chooseOption, selectTrigger} from '../select-helpers.mjs';

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
    await send('post', '/v1/coach/nutrition-plans', {name: 'Daily nutrition', target_calories: 2100}, token);
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
    await page.route('**/v1/coach/workbench/queues/*?*', (route) => {
      const url = new URL(route.request().url());
      url.searchParams.set('limit', '1');
      return route.continue({url: url.href});
    });
    await page.route('**/v1/coach/workbench', (route) => route.fulfill({status: 503, json: {}}));
    await page.goto('/workbench');
    await expect(page.getByRole('heading', {name: 'Workbench', exact: true})).toBeVisible();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByText('2 tasks', {exact: true})).toBeVisible();
    await page.unroute('**/v1/coach/workbench');
    await page.getByRole('button', {name: 'Refresh workbench', exact: true}).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
    const navigation = page.getByRole('navigation', {name: 'Workbench queues', exact: true});
    const rows = page.getByRole('list', {name: 'tasks', exact: true}).locator(':scope > li');
    const pick = async (label) => {
      if (width === 375) {
        const trigger = selectTrigger(page, 'Task queue');
        await trigger.click();
        await page.getByRole('option', {name: new RegExp(`^${label} · `)}).click();
        await page.getByRole('listbox', {includeHidden: true}).waitFor({state: 'detached'});
      } else {
        await navigation.getByRole('button', {name: new RegExp(`^${label} `)}).click();
      }
    };
    const labels = ['Check-in reviews', 'Replies', 'Getting started', 'Plans', 'Ending soon', 'Missed check-ins'];
    for (const label of labels) {
      await pick(label);
      await expect(page.getByText('2 tasks', {exact: true})).toBeVisible();
      await page.getByRole('button', {name: 'Refresh tasks', exact: true}).press('End');
      await expect(rows).toHaveCount(2);
      await expect(rows.getByRole('article', {name: 'Alex Morgan', exact: true})).toHaveCount(1);
      await expect(rows.getByRole('article', {name: 'Jordan Morgan', exact: true})).toHaveCount(1);
      if (label === 'Getting started') {
        const reason = rows.first().getByText(intakeName, {exact: false});
        await expect(reason).toBeVisible();
        const geometry = await reason.evaluate((node) => ({
          width: node.clientWidth,
          scroll: node.scrollWidth,
          overflowWrap: getComputedStyle(node).overflowWrap,
          tag: node.tagName,
        }));
        expect(geometry.scroll, JSON.stringify(geometry)).toBeLessThanOrEqual(geometry.width);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByRole('heading', {name: 'Workbench', exact: true}).click();
      await page.evaluate(() => {
        document.activeElement?.blur();
        window.scrollTo({top: 0, behavior: 'instant'});
      });
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      if (label === 'Plans' && width === 375) {
        const header = await page.locator('.app-header').boundingBox();
        const nav = await page.getByRole('navigation', {name: 'Coaching', exact: true}).boundingBox();
        expect(header?.y).toBe(0);
        expect(nav?.y).toBeGreaterThanOrEqual(header?.height ?? 0);
        await page.screenshot({path: 'tests/workbench/artifacts/plans-viewport-375.png'});
        const border = await rows
          .getByRole('link', {name: 'Assign training', exact: true})
          .first()
          .evaluate((node) => getComputedStyle(node).borderColor);
        expect(border).not.toBe('rgba(0, 0, 0, 0)');
      }
      await page.screenshot({
        path: `tests/workbench/artifacts/${label.replaceAll(' ', '-').toLowerCase()}-${width}.png`,
        fullPage: true,
      });
    }
    if (process.env.COACHAPP_WORKBENCH_VISUAL_ONLY === '1') {
      await context.close();
      continue;
    }
    await pick('Plans');
    await chooseOption(selectTrigger(page, 'Service'), 'Nutrition');
    await expect(rows.getByRole('link', {name: 'Assign training', exact: true})).toHaveCount(0);
    await page.getByLabel('Search tasks', {exact: true}).fill('Jordan');
    await expect(page.getByText('1 task', {exact: true})).toBeVisible();
    await rows.getByRole('link', {name: 'Assign nutrition', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Nutrition for Jordan Morgan', exact: true})).toBeVisible();
    await page.getByRole('link', {name: 'Back to workbench', exact: true}).click();
    await expect(selectTrigger(page, 'Service')).toContainText('Nutrition');
    await expect(page.getByLabel('Search tasks', {exact: true})).toHaveValue('Jordan');
    await page.reload();
    await expect(page.getByText('1 task', {exact: true})).toBeVisible();
    await rows.getByRole('link', {name: 'Assign nutrition', exact: true}).click();
    await page.getByText('Daily nutrition', {exact: true}).click();
    await page.getByLabel('Start date', {exact: true}).fill(date(0));
    await page.getByRole('button', {name: 'Assign nutrition plan', exact: true}).click();
    await expect(page.getByText('Daily nutrition assigned.', {exact: true})).toBeVisible();
    await page.getByRole('link', {name: 'Back to workbench', exact: true}).click();
    await expect(selectTrigger(page, 'Service')).toContainText('Nutrition');
    await expect(page.getByLabel('Search tasks', {exact: true})).toHaveValue('Jordan');
    await expect(page.getByText('0 tasks', {exact: true})).toBeVisible();

    await pick('Check-in reviews');
    await rows
      .getByRole('article', {name: 'Alex Morgan', exact: true})
      .getByRole('link', {name: 'Review check-in', exact: true})
      .click();
    await expect(page.getByText('The plan is going well.', {exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'Mark reviewed', exact: true}).click();
    await expect(page.getByRole('heading', {name: 'Review saved', exact: true})).toBeVisible();
    await page.getByRole('link', {name: 'Back to workbench', exact: true}).click();
    await expect(page.getByText('1 task', {exact: true})).toBeVisible();
    await expect(
      width === 375
        ? selectTrigger(page, 'Task queue')
        : navigation.getByRole('button', {name: 'Check-in reviews 1', exact: true}),
    ).toContainText('1');
    await pick('Replies');
    await rows
      .getByRole('article', {name: 'Alex Morgan', exact: true})
      .getByRole('link', {name: 'Reply', exact: true})
      .click();
    await page.getByLabel('Message Alex Morgan', {exact: true}).fill('I have checked it. Keep going with the plan.');
    await page.getByRole('button', {name: 'Send message', exact: true}).click();
    await expect(page.getByText('Message sent.', {exact: true})).toBeVisible();
    await page.getByRole('link', {name: 'Back to workbench', exact: true}).click();
    await expect(page.getByText('1 task', {exact: true})).toBeVisible();

    await pick('Ending soon');
    await rows
      .getByRole('article', {name: 'Alex Morgan', exact: true})
      .getByRole('link', {name: 'Update engagement', exact: true})
      .click();
    await page.getByLabel('Engagement ends', {exact: true}).fill(date(60));
    await page.getByRole('button', {name: 'Save changes', exact: true}).click();
    await expect(page.getByText('Client details saved.', {exact: true})).toBeVisible();
    await page.getByRole('link', {name: 'Back to workbench', exact: true}).click();
    await expect(page.getByText('1 task', {exact: true})).toBeVisible();
    await rows.getByRole('button', {name: 'Snooze', exact: true}).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', {name: 'Snooze task', exact: true}).click();
    await expect(dialog.getByLabel('Hide through', {exact: true})).toHaveAttribute('aria-invalid', 'true');
    let invalidDateWrites = 0;
    const countSnoozes = (request) => {
      if (request.url().endsWith('/queue-snooze') && request.method() === 'PUT') {
        invalidDateWrites += 1;
      }
    };
    page.on('request', countSnoozes);
    await dialog.getByLabel('Hide through', {exact: true}).fill(date(-1));
    await dialog.getByRole('button', {name: 'Snooze task', exact: true}).click();
    await expect(dialog.getByLabel('Hide through', {exact: true})).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.getByLabel('Hide through', {exact: true})).toBeFocused();
    await expect(dialog.getByText('Choose today or a later date.', {exact: true})).toBeVisible();
    expect(invalidDateWrites).toBe(0);
    page.off('request', countSnoozes);
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
    await expect(page.getByRole('heading', {name: 'Nothing waiting in this queue', exact: true})).toBeVisible();
    await expect(
      width === 375
        ? selectTrigger(page, 'Task queue')
        : navigation.getByRole('button', {name: 'Ending soon 0', exact: true}),
    ).toContainText('0');
    await pick('Missed check-ins');
    await expect(page.getByText('2 tasks', {exact: true})).toBeVisible();
    await rows
      .getByRole('article', {name: 'Alex Morgan', exact: true})
      .getByRole('button', {name: 'Snooze', exact: true})
      .click();
    await dialog.getByLabel('Hide through', {exact: true}).fill(date(5));
    await dialog.getByRole('button', {name: 'Snooze task', exact: true}).click();
    await expect(page.getByText('1 task', {exact: true})).toBeVisible();

    // A failed refresh retains the current tasks and retries through the shared list.
    await page.route('**/v1/coach/workbench/queues/quiet?*', (route) => route.fulfill({status: 503, json: {}}));
    await page.getByRole('button', {name: 'Refresh tasks', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Retry refresh', exact: true})).toBeVisible();
    await expect(rows).toHaveCount(1);
    await page.unroute('**/v1/coach/workbench/queues/quiet?*');
    await page.getByRole('button', {name: 'Retry refresh', exact: true}).click();
    await expect(page.getByRole('button', {name: 'Retry refresh', exact: true})).toHaveCount(0);
    await page.getByLabel('Search tasks', {exact: true}).fill('missing-client');
    await expect(page.getByRole('heading', {name: 'No matching tasks', exact: true})).toBeVisible();
    await page.route('**/v1/coach/workbench/queues/quiet?*', (route) => route.fulfill({status: 503, json: {}}));
    await page.reload();
    await expect(page.getByRole('button', {name: 'Try again', exact: true})).toBeVisible();
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', {name: 'Try again', exact: true}).focus();
    await page.unroute('**/v1/coach/workbench/queues/quiet?*');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', {name: 'No matching tasks', exact: true})).toBeVisible();

    if (width === 375) {
      await pick('Plans');
      await expect(rows).toHaveCount(2);
      const held = Promise.withResolvers();
      const release = Promise.withResolvers();
      await page.route('**/v1/coach/workbench/queues/programming?*', async (route) => {
        const response = await route.fetch();
        held.resolve();
        await release.promise;
        return route.fulfill({response});
      });
      await page.getByRole('button', {name: 'Refresh tasks', exact: true}).click();
      await held.promise;
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
      await expect(page.getByRole('heading', {name: 'Nothing waiting in this queue', exact: true})).toBeVisible();
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
    }
    expect(errors).toEqual([]);
    await context.close();
    console.log(`Workbench queues, task completion, snooze, recovery and isolation passed at ${width}px.`);
  }
} finally {
  await browser.close();
  await api.dispose();
}
