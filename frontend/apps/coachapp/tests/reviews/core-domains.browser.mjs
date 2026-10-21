import {execFileSync} from 'node:child_process';
import {mkdir, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium, expect, request} from '@playwright/test';

const repo = fileURLToPath(new URL('../../../../../', import.meta.url));
const screens = `${repo}/frontend/apps/coachapp/tests/reviews/artifacts`;
await mkdir(screens, {recursive: true});
const api = await request.newContext({baseURL: 'http://localhost:4000'});
const browser = await chromium.launch();
const suffix = String(Date.now());
const errors = [];
const failures = [];
let coach;
let clientPage;

async function send(method, path, data, token) {
  const response = await api[method](path, {data, headers: token ? {authorization: `Bearer ${token}`} : {}});
  expect(response.ok(), `${method} ${path}: ${response.status()} ${await response.text()}`).toBe(true);
  return response.status() === 204 ? null : response.json();
}

async function select(page, label, option, scope = page) {
  await scope.getByRole('button', {name: new RegExp(label)}).click();
  await page.getByRole('option', {name: option, exact: true}).click();
}

async function shot(page, name) {
  await page.evaluate(() => window.scrollTo(0, 0));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path: `${screens}/${name}.png`, fullPage: true});
}

function dateAfter(date, days) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

async function login(page, email) {
  await page.goto('/login');
  await page.getByLabel('Email', {exact: true}).fill(email);
  await page.getByRole('button', {name: 'Continue with email'}).click();
  await page.getByLabel('Verification code').fill('123456');
  await page.getByRole('button', {name: 'Verify and continue'}).click();
  await expect(page).toHaveURL(/\/(clients|welcome)$/);
}

async function runReviewJourney({person, token, today, earlier, weight}) {
  const privateNote = 'Coach only: discuss recovery at our next call.';
  const reply = 'Keep your workouts steady this week.';
  const editedReply = 'Keep your workouts steady and take a rest day.';
  const focus = 'Keep a steady training routine.';
  await coach.goto('/clients');
  await expect(
    coach.getByRole('list', {name: 'clients', exact: true}).getByText('Never this term', {exact: true}),
  ).toBeVisible();
  let roster = (await send('get', '/v1/coach/review-roster?due=due', undefined, token)).data;
  expect(roster.map((row) => row.client_id)).toEqual([person.id]);
  expect(roster[0].due).toBe(true);
  expect(roster[0].last_reviewed_at).toBeNull();
  await shot(coach, '01-roster-never-1280');
  await coach.setViewportSize({width: 375, height: 812});
  await shot(coach, '02-roster-never-375');
  await coach.getByRole('link', {name: 'Review', exact: true}).click();
  await expect(coach.getByRole('heading', {name: 'New since last review', exact: true})).toBeVisible();
  await expect(coach.getByRole('heading', {name: 'Summary', exact: true})).toBeVisible();
  const screen = (await send('get', `/v1/coach/clients/${person.id}/review-screen`, undefined, token)).data;
  expect(screen.changes.map((group) => group.record_type).sort()).toEqual(['tracker_entry']);
  expect(screen.changes.find((group) => group.record_type === 'tracker_entry').title).toBe('Body weight');
  await shot(coach, '03-review-new-375');
  await coach.setViewportSize({width: 1280, height: 900});
  await shot(coach, '04-review-new-1280');
  await coach.getByLabel('Focus', {exact: true}).fill(focus);
  await coach.getByRole('button', {name: 'Save Focus', exact: true}).click();
  await expect
    .poll(async () => (await send('get', `/v1/coach/clients/${person.id}`, undefined, token)).data.focus)
    .toBe(focus);
  await coach.getByRole('button', {name: 'Request Tracker', exact: true}).click();
  await coach.getByLabel('Search Trackers', {exact: true}).fill('Blood report');
  await coach.getByRole('button', {name: 'Select Blood report', exact: true}).click();
  await coach.getByRole('button', {name: 'Request this Tracker', exact: true}).click();
  await expect(coach.getByText(/Blood report · Waiting on client since/)).toBeVisible();
  await select(coach, 'Assessment', 'Needs attention');
  await coach.getByLabel('Private note', {exact: true}).fill(privateNote);
  await coach.getByLabel('Reply to client', {exact: true}).fill(reply);
  await coach.getByLabel('Summary from', {exact: true}).fill(earlier);
  await coach.getByRole('button', {name: 'Update summary range', exact: true}).click();
  await expect(coach).toHaveURL(new RegExp(`from=${earlier}`));
  await expect(coach.getByLabel('Private note', {exact: true})).toHaveValue(privateNote);
  await expect(coach.getByLabel('Reply to client', {exact: true})).toHaveValue(reply);
  await expect(coach.getByRole('button', {name: /Assessment/})).toContainText('Needs attention');
  const attempts = [];
  await coach.route(`**/v1/coach/clients/${person.id}/reviews`, async (route) => {
    if (route.request().method() !== 'POST') {
      return route.continue();
    }
    attempts.push(route.request().postDataJSON());
    const response = await route.fetch();
    expect(response.status()).toBe(201);
    return attempts.length === 1 ? route.abort('connectionreset') : route.fulfill({response});
  });
  await coach.getByRole('button', {name: 'Save Review', exact: true}).click();
  await expect(coach.getByRole('button', {name: 'Check Review save', exact: true})).toBeVisible();
  await coach.getByRole('button', {name: 'Check Review save', exact: true}).click();
  await expect(coach).toHaveURL(new RegExp(`/clients/${person.id}/reviews$`));
  await coach.unroute(`**/v1/coach/clients/${person.id}/reviews`);
  expect(attempts).toHaveLength(2);
  expect(attempts[1]).toEqual(attempts[0]);
  await expect
    .poll(async () => (await send('get', `/v1/coach/clients/${person.id}/reviews`, undefined, token)).count)
    .toBe(1);
  const review = (await send('get', `/v1/coach/clients/${person.id}/reviews`, undefined, token)).data[0];
  expect(review.assessment).toBe('needs_attention');
  expect(review.private_note).toBe(privateNote);
  expect(review.reply.body).toBe(reply);
  expect(review.reply.embed.type).toBe('review');
  await clientPage.goto('/');
  await expect(clientPage.getByText(focus, {exact: true})).toBeVisible();
  await expect(clientPage.getByRole('heading', {name: 'Your coach asked for', exact: true})).toBeVisible();
  await expect(clientPage.getByRole('link', {name: 'Record Blood report', exact: true})).toBeVisible();
  await expect(clientPage.getByText(privateNote, {exact: true})).toHaveCount(0);
  await expect(clientPage.getByText('Needs attention', {exact: true})).toHaveCount(0);
  await shot(clientPage, '05-client-focus-375');
  await clientPage.goto('/messages');
  await expect(clientPage.getByText(reply, {exact: true})).toBeVisible();
  await shot(clientPage, '06-client-reply-375');
  const linkedReplyResponse = clientPage.waitForResponse((response) =>
    response.url().includes('/v1/client/review-replies'),
  );
  await clientPage.getByRole('link', {name: /^View Review:/}).click();
  await expect(clientPage).toHaveURL(new RegExp(`/check-ins\\?review=${review.id}$`));
  await expect(clientPage.getByText(reply, {exact: true})).toBeVisible();
  const clientReply = await (await linkedReplyResponse).json();
  expect(clientReply.count).toBe(1);
  expect(clientReply.data[0].body).toBe(reply);
  expect(JSON.stringify(clientReply)).not.toContain('private_note');
  expect(JSON.stringify(clientReply)).not.toContain('assessment');
  expect(JSON.stringify(clientReply)).not.toContain(privateNote);
  await clientPage.getByRole('link', {name: 'Back', exact: true}).click();
  await expect(clientPage).toHaveURL(/\/messages$/);
  await clientPage.goto('/check-ins');
  await expect(clientPage.getByText(reply, {exact: true})).toBeVisible();
  await expect(clientPage.getByText(focus, {exact: true})).toBeVisible();
  await expect(clientPage.getByText(privateNote, {exact: true})).toHaveCount(0);
  await expect(clientPage.getByText('Needs attention', {exact: true})).toHaveCount(0);
  await shot(clientPage, '07-client-reply-history-375');

  await clientPage.goto(`/trackers/${weight.id}`);
  await clientPage.getByRole('button', {name: 'Remove entry', exact: true}).click();
  await clientPage.getByRole('dialog').getByRole('button', {name: 'Remove entry', exact: true}).click();
  await expect(clientPage.getByRole('dialog')).toHaveCount(0);
  await expect
    .poll(
      async () =>
        (await send('get', `/v1/coach/clients/${person.id}/tracker-entries?tracker_id=${weight.id}`, undefined, token))
          .count,
    )
    .toBe(0);

  await coach.goto('/clients');
  roster = (await send('get', '/v1/coach/review-roster?due=not_due', undefined, token)).data;
  expect(roster.map((row) => row.client_id)).toEqual([person.id]);
  expect(roster[0].due).toBe(false);
  expect(roster[0].due_on).toBe(dateAfter(today, 7));
  await expect(
    coach.getByRole('list', {name: 'clients', exact: true}).getByText('Never this term', {exact: true}),
  ).toHaveCount(0);
  await shot(coach, '08-roster-reviewed-1280');
  await coach.goto(`/clients/${person.id}/reviews/new`);
  const nextScreen = (await send('get', `/v1/coach/clients/${person.id}/review-screen`, undefined, token)).data;
  expect(nextScreen.changes.map((group) => group.record_type).sort()).toEqual(['tracker_entry']);
  const removedEntry = nextScreen.changes.find((group) => group.record_type === 'tracker_entry');
  expect(removedEntry.title).toBe('Body weight');
  expect(removedEntry.changes.some((change) => change.action === 'removed')).toBe(true);
  await expect(coach.getByText(privateNote, {exact: true})).toBeVisible();
  await expect(coach.getByRole('heading', {name: 'Body weight · removed', exact: true})).toBeVisible();
  await shot(coach, '09-tracker-removal-1280');
  await coach.setViewportSize({width: 375, height: 812});
  await shot(coach, '10-tracker-removal-375');

  await clientPage.goto('/messages');
  await expect(clientPage.getByText(reply, {exact: true})).toBeVisible();
  await coach.goto(`/clients/${person.id}/reviews`);
  await coach.getByRole('button', {name: 'Edit Review', exact: true}).click();
  await coach.getByLabel('Reply to client', {exact: true}).fill(editedReply);
  await coach.getByRole('button', {name: 'Save changes', exact: true}).click();
  await expect(clientPage.getByText(editedReply, {exact: true})).toBeVisible();
  await expect(clientPage.getByRole('log', {name: 'Messages', exact: true})).toContainText('· edited');
  await expect(clientPage.getByText(reply, {exact: true})).toHaveCount(0);
  await shot(clientPage, '11-client-reply-edited-375');
  await shot(coach, '12-coach-history-375');
  const edited = (await send('get', `/v1/coach/clients/${person.id}/reviews`, undefined, token)).data[0];
  expect(edited.reviewed_at).toBe(review.reviewed_at);
  expect(edited.reviewed_through_seq).toBe(review.reviewed_through_seq);
  expect(edited.seen_at).toBe(review.seen_at);
  expect(edited.reply.edited_at).not.toBeNull();
  await coach.getByRole('button', {name: 'Delete reply', exact: true}).click();
  await expect(clientPage.getByText(editedReply, {exact: true})).toHaveCount(0);
  await shot(clientPage, '13-client-reply-deleted-375');
  await clientPage.goto('/check-ins');
  await expect(clientPage.getByText(editedReply, {exact: true})).toHaveCount(0);
  await expect(clientPage.getByText(focus, {exact: true})).toBeVisible();
  const afterDelete = (await send('get', `/v1/coach/clients/${person.id}/reviews`, undefined, token)).data[0];
  expect(afterDelete.reply).toBeNull();
  expect(afterDelete.assessment).toBe('needs_attention');
  expect(afterDelete.private_note).toBe(privateNote);
  await verifySettingsAndFilters({person, token, focus});
  return {
    reviewId: review.id,
    reviewedThroughSeq: review.reviewed_through_seq,
    correctionGroups: nextScreen.changes.length,
  };
}

async function verifySettingsAndFilters({person, token, focus}) {
  await coach.goto('/clients');
  await coach.getByText('Sort and filter clients', {exact: true}).click();
  await select(coach, 'Review due', 'Due');
  await expect(coach.getByRole('heading', {name: 'No matching clients', exact: true})).toBeVisible();
  await select(coach, 'Review due', 'Not due');
  await select(coach, 'Assessment$', 'Needs attention');
  await select(coach, 'Requests$', 'Waiting on client');
  await select(coach, 'Last reviewed', 'Reviewed this term');
  await select(coach, 'Sort by', 'Waiting since');
  await select(coach, 'Order$', 'Descending');
  await expect(
    coach.getByRole('list', {name: 'clients', exact: true}).getByRole('link', {name: 'Slice Four Client', exact: true}),
  ).toBeVisible();
  await shot(coach, '14-roster-filters-375');
  await coach.goto('/settings/business');
  await select(coach, 'Review frequency$', 'Every 3 days');
  await coach.getByRole('button', {name: 'Save Review default', exact: true}).click();
  await expect(coach.getByText('Review default saved.', {exact: true})).toBeVisible();
  expect((await send('get', `/v1/coach/clients/${person.id}`, undefined, token)).data.review_frequency_days).toBe(7);
  const invited = (
    await send(
      'post',
      '/v1/coach/clients',
      {full_name: 'Default Frequency Client', email: `s4-default-${suffix}@example.test`},
      token,
    )
  ).data;
  expect(invited.review_frequency_days).toBe(3);
  await select(coach, 'Review frequency$', 'Every 14 days');
  const defaultForm = coach
    .locator('form')
    .filter({has: coach.getByRole('button', {name: 'Save Review default', exact: true})});
  await defaultForm.getByText('Apply to existing clients too', {exact: true}).click();
  await expect(defaultForm.getByRole('checkbox', {name: 'Apply to existing clients too', exact: true})).toBeChecked();
  await coach.getByRole('button', {name: 'Save Review default', exact: true}).click();
  await expect
    .poll(
      async () => (await send('get', `/v1/coach/clients/${person.id}`, undefined, token)).data.review_frequency_days,
    )
    .toBe(14);
  expect((await send('get', `/v1/coach/clients/${invited.id}`, undefined, token)).data.review_frequency_days).toBe(14);
  await shot(coach, '15-review-default-375');
  await coach.goto(`/clients/${person.id}/profile`);
  await select(coach, 'Review frequency$', 'Every 7 days');
  await coach.getByRole('button', {name: 'Save changes', exact: true}).click();
  await expect
    .poll(
      async () => (await send('get', `/v1/coach/clients/${person.id}`, undefined, token)).data.review_frequency_days,
    )
    .toBe(7);
  await coach.goto(`/clients/${person.id}/reviews/new`);
  await coach.getByLabel('Focus', {exact: true}).fill('');
  await coach.getByRole('button', {name: 'Save Focus', exact: true}).click();
  await expect
    .poll(async () => (await send('get', `/v1/coach/clients/${person.id}`, undefined, token)).data.focus)
    .toBeNull();
  await clientPage.goto('/');
  await expect(clientPage.getByText(focus, {exact: true})).toHaveCount(0);
  await coach.getByRole('link', {name: 'Review history', exact: true}).click();
  await expect(coach.getByRole('heading', {name: 'Review history', exact: true})).toBeVisible();
  await coach.route('**/review-screen*', (route) => route.abort('connectionreset'));
  await coach.getByRole('link', {name: 'Review client', exact: true}).click();
  await expect(coach.getByRole('button', {name: 'Retry Review', exact: true})).toBeVisible({timeout: 20000});
  await coach.unroute('**/review-screen*');
  await coach.getByRole('button', {name: 'Retry Review', exact: true}).click();
  await expect(coach.getByRole('heading', {name: 'Review Slice Four Client', exact: true})).toBeVisible();
}

try {
  const email = `s4-coach-${suffix}@example.test`;
  await send('post', '/v1/auth/signup', {email, full_name: 'Slice Four Coach'});
  const guest = await send('post', '/v1/auth/verify', {email, otp: '123456'});
  await send(
    'post',
    '/v1/businesses',
    {full_name: 'Slice Four Coach', name: 'Slice Four Reviews', handle: `s4-${suffix}`},
    guest.access_token,
  );
  const tokens = await send('post', '/v1/auth/token', {
    grant_type: 'refresh_token',
    refresh_token: guest.refresh_token,
    role: 'coach',
  });
  const token = tokens.access_token;
  const person = (
    await send(
      'post',
      '/v1/coach/clients',
      {full_name: 'Slice Four Client', email: `s4-client-${suffix}@example.test`},
      token,
    )
  ).data;
  const invitation = new URL(person.invite_url).pathname.split('/').at(-1);
  const coachContext = await browser.newContext({
    baseURL: 'http://localhost:2022',
    viewport: {width: 1280, height: 900},
  });
  const clientContext = await browser.newContext({
    baseURL: 'http://localhost:1315',
    viewport: {width: 375, height: 812},
  });
  coach = await coachContext.newPage();
  clientPage = await clientContext.newPage();
  for (const page of [coach, clientPage]) {
    page.setDefaultTimeout(20000);
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', async (response) => {
      if (response.status() >= 400) {
        failures.push({url: response.url(), status: response.status(), body: await response.text().catch(() => '')});
      }
    });
  }
  await clientPage.goto(`/invite/${invitation}`);
  await clientPage.getByRole('button', {name: 'Continue with email'}).click();
  await clientPage.getByLabel('Verification code').fill('123456');
  await clientPage.getByRole('button', {name: 'Verify and continue'}).click();
  await expect(clientPage.getByRole('heading', {name: 'Today', exact: true})).toBeVisible();
  const today = (await send('get', `/v1/coach/clients/${person.id}`, undefined, token)).data.local_date;
  const earlier = dateAfter(today, -1);
  execFileSync(
    'rtk',
    [
      'mix',
      'run',
      '-e',
      'Easy.Repo.query!("UPDATE coaching_terms SET starts_on = $1 WHERE client_id = $2", [Date.from_iso8601!(System.fetch_env!("S4_TERM_DATE")), Ecto.UUID.dump!(System.fetch_env!("S4_CLIENT_ID"))])',
    ],
    {
      cwd: `${repo}/backend`,
      env: {...process.env, S4_TERM_DATE: dateAfter(today, -2), S4_CLIENT_ID: person.id},
      stdio: 'pipe',
    },
  );
  await login(coach, email);
  const weight = (await send('get', '/v1/coach/trackers?search=Body%20weight&limit=100', undefined, token)).data.find(
    (item) => item.name === 'Body weight',
  );
  await clientPage.goto(`/trackers/${weight.id}?record=1`);
  const form = clientPage.getByRole('region', {name: 'Record Body weight', exact: true});
  await form.getByLabel('Value', {exact: true}).fill('82');
  await form.getByRole('button', {name: 'Save entry', exact: true}).click();
  await expect(form).toHaveCount(0);
  const result = await runReviewJourney({person, token, today, earlier, weight});
  expect(errors).toEqual([]);
  expect(failures).toEqual([]);
  await writeFile(
    `${screens}/results.json`,
    JSON.stringify(
      {
        passed: true,
        clientId: person.id,
        today,
        earlier,
        ...result,
        liveReplyEditDelete: true,
        widths: {coach: [1280, 375], client: [375]},
        errors,
      },
      null,
      2,
    ),
  );
  console.log('Slice 4 Review flow passed: coach 1280/375, client 375, Tracker removal and live reply edit/delete.');
} catch (error) {
  await writeFile(`${screens}/failure-responses.json`, JSON.stringify(failures, null, 2));
  for (const [name, page] of [
    ['coach', coach],
    ['client', clientPage],
  ]) {
    if (page) {
      await writeFile(`${screens}/failure-${name}.txt`, await page.locator('body').ariaSnapshot());
      await page.screenshot({path: `${screens}/failure-${name}.png`, fullPage: true});
    }
  }
  throw error;
} finally {
  await browser.close();
  await api.dispose();
}
