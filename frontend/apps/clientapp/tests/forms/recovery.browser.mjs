import {mkdir, writeFile} from 'node:fs/promises';
import {chromium, expect} from '@playwright/test';
import {api, inviteClient} from '../auth/fixtures.mjs';

const browser = await chromium.launch();
const results = [];
await mkdir('tests/forms/artifacts', {recursive: true});
try {
  const fixture = await inviteClient();
  const assignment = (await api(`/v1/coach/clients/${fixture.clientId}/intake`, {token: fixture.coachToken})).data;
  await api(`/v1/coach/form-templates/${assignment.form_template_id}`, {
    method: 'PATCH',
    token: fixture.coachToken,
    body: {
      expected_revision: assignment.form_template.revision,
      sections: [{questions: [{id: 'goal', type: 'text', label: 'Your goal', required: true}]}],
    },
  });
  const context = await browser.newContext({baseURL: 'http://localhost:1315', viewport: {width: 375, height: 812}});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`/invite/${fixture.token}`);
  await page.getByRole('button', {name: 'Continue with email'}).click();
  await page.getByLabel('Verification code').fill('123456');
  await page.getByRole('button', {name: 'Verify and continue'}).click();
  await page.getByRole('link', {name: 'Forms & check-ins', exact: true}).click();
  await page.getByRole('link', {name: new RegExp(assignment.form_template.name)}).click();
  await page.getByLabel('Your goal', {exact: false}).fill('This device has a different draft');
  const token = await page.evaluate(() => JSON.parse(localStorage.getItem('clientapp.auth.v1')).tokens.access_token);
  await api(`/v1/client/form-assignments/${assignment.id}/submit`, {
    method: 'POST',
    token,
    body: {answers: {goal: 'Saved from another device'}, expected_revision: assignment.form_template.revision + 1},
  });
  await page.getByRole('button', {name: 'Send response'}).click();
  await expect(page.getByText('A different response was already saved for this form.', {exact: false})).toBeVisible();
  await expect(page.getByLabel('Your goal', {exact: false})).toHaveValue('This device has a different draft');
  await page.getByRole('button', {name: 'Open saved response'}).click();
  await expect(page.getByText('Saved from another device', {exact: true})).toBeVisible();
  await page.reload();
  await page.getByText('Compare your unsent answers', {exact: true}).click();
  await expect(page.getByText('This device has a different draft', {exact: true})).toBeVisible();
  await page.getByRole('button', {name: 'Discard unsent answers'}).click();
  await expect(page.getByText('Compare your unsent answers')).toHaveCount(0);
  const submissions = await api(`/v1/coach/form-assignments/${assignment.id}/submissions`, {token: fixture.coachToken});
  expect(submissions.data).toHaveLength(1);
  expect(submissions.data[0].answers.goal).toBe('Saved from another device');
  results.push({
    scenario: 'different response preserves local draft through reload until explicit discard',
    passed: true,
  });

  for (let index = 0; index < 22; index += 1) {
    const template = await api('/v1/coach/form-templates', {
      method: 'POST',
      token: fixture.coachToken,
      body: {
        name: `Weekly check-in ${index + 1}`,
        purpose: 'check_in',
        sections: [{questions: [{id: 'note', label: 'How was your week?', type: 'text'}]}],
      },
    });
    await api(`/v1/coach/clients/${fixture.clientId}/form-assignments`, {
      method: 'POST',
      token: fixture.coachToken,
      body: {form_template_id: template.data.id},
    });
  }
  let failNext = true;
  await page.route('**/v1/client/form-assignments?**', (route) => {
    const cursor = new URL(route.request().url()).searchParams.get('cursor');
    return failNext && cursor && cursor !== 'start'
      ? route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({error_message: 'Unavailable'}),
        })
      : route.continue();
  });
  await page.goto('/forms');
  await expect(page.getByText('22 requests', {exact: true})).toBeVisible();
  await expect(page.getByRole('list', {name: 'requests'}).getByRole('link')).toHaveCount(20);
  await page.getByRole('button', {name: 'Load more', exact: true}).scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', {name: 'Retry loading more'})).toBeVisible();
  await expect(page.getByRole('list', {name: 'requests'}).getByRole('link')).toHaveCount(20);
  await expect(page.getByText('22 requests', {exact: true})).toBeVisible();
  failNext = false;
  await page.getByRole('button', {name: 'Retry loading more'}).click();
  await expect(page.getByRole('list', {name: 'requests'}).getByRole('link')).toHaveCount(22);
  await expect(page.getByRole('button', {name: 'All requests loaded'})).toBeDisabled();
  await page.getByRole('link', {name: /Weekly check-in 1 /}).click();
  await expect(page.getByLabel('How was your week?')).toBeVisible();
  await page.goBack();
  await expect(page.getByText('22 requests', {exact: true})).toBeVisible();
  const pending = (await api('/v1/client/form-assignments?state=pending', {token})).data[0];
  await api(`/v1/coach/form-templates/${pending.form_template_id}`, {
    method: 'PATCH',
    token: fixture.coachToken,
    body: {
      expected_revision: pending.form_template.revision,
      sections: [
        {
          questions: [
            {id: 'note', label: 'How was your week?', type: 'text'},
            {id: 'photos', label: 'Progress views', type: 'photo'},
          ],
        },
      ],
    },
  });
  await page.route('http://localhost:9000/**', (route) =>
    route.fulfill({status: 503, headers: {'Access-Control-Allow-Origin': '*'}}),
  );
  await page.goto(`/forms/${pending.id}`);
  await page.getByLabel('How was your week?').fill('Remove this private draft on logout');
  await page.getByLabel('Choose Progress views').setInputFiles({
    name: 'progress.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==',
      'base64',
    ),
  });
  await expect(page.getByRole('button', {name: 'Retry photo 1'})).toBeVisible();
  await expect(page.getByText('The photo could not be uploaded. Try again when connected.')).toBeVisible();
  await page.getByRole('link', {name: 'Your account'}).click();
  await page.evaluate(() => {
    const transaction = IDBDatabase.prototype.transaction;
    let fail = true;
    IDBDatabase.prototype.transaction = function (...args) {
      if (fail && this.name === 'clientapp.photos' && args[1] === 'readwrite') {
        fail = false;
        throw new DOMException('Storage unavailable', 'InvalidStateError');
      }
      return transaction.apply(this, args);
    };
  });
  await page.getByRole('button', {name: 'Sign out', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Sign-out not finished'})).toBeVisible();
  await expect(page.getByRole('link', {name: 'Your account'})).toHaveCount(0);
  await page.getByRole('button', {name: 'Retry sign-out'}).click();
  await expect(page.getByRole('heading', {name: 'Welcome back'})).toBeVisible();
  const photoCount = await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('clientapp.photos');
        open.onsuccess = () => {
          const request = open.result.transaction('photos').objectStore('photos').count();
          request.onsuccess = () => {
            open.result.close();
            resolve(request.result);
          };
          request.onerror = () => reject(request.error);
        };
        open.onerror = () => reject(open.error);
      }),
  );
  expect(photoCount).toBe(0);
  expect(
    await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('clientapp.private.'))),
  ).toEqual([]);
  results.push({
    scenario: 'failed logout hides private screens; retry removes drafts and unfinished photo blobs',
    passed: true,
  });
  expect(errors).toEqual([]);
  results.push({
    scenario: '22 real requests; failed next page retains 20; retry loads remainder; return to list',
    passed: true,
  });
  await context.close();
} finally {
  await browser.close();
  await writeFile('tests/forms/artifacts/recovery-results.json', JSON.stringify(results, null, 2));
}
console.log(JSON.stringify(results));
