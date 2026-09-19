import {mkdir, writeFile} from 'node:fs/promises';
import {chromium, expect} from '@playwright/test';
import {api, inviteClient} from '../auth/fixtures.mjs';

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==',
  'base64',
);
const questions = [
  {id: 'goal.with.dots', label: 'What would you like to work on?', type: 'text', required: true},
  {id: 'sessions', label: 'Sessions each week', type: 'number', required: true},
  {id: 'pain', label: 'Any pain today?', type: 'boolean', required: true},
  {id: 'start', label: 'Preferred start date', type: 'date', required: true},
  {id: 'meal', label: 'Meal preference', type: 'select', options: ['Home cooking', 'Eating out'], required: true},
  {id: 'days', label: 'Available days', type: 'multi_select', options: ['Monday', 'Friday'], required: true},
  {id: 'energy', label: 'Energy today', type: 'rating', required: true},
  {id: 'weight', label: 'Current weight', type: 'weight', required: true},
  {id: 'photos', label: 'Progress views', type: 'photo', required: true},
  {id: 'services', label: 'Service type', type: 'service_type', required: true},
];
const browser = await chromium.launch();
const results = [];
await mkdir('tests/forms/artifacts', {recursive: true});
try {
  for (const width of [375, 768, 1280]) {
    const fixture = await inviteClient();
    const assignment = await api(`/v1/coach/clients/${fixture.clientId}/intake`, {token: fixture.coachToken});
    await api(`/v1/coach/form-templates/${assignment.data.form_template_id}`, {
      method: 'PATCH',
      token: fixture.coachToken,
      body: {
        name: 'Getting started together',
        expected_revision: assignment.data.form_template.revision,
        sections: [{title: 'About you', questions}],
      },
    });
    const context = await browser.newContext({baseURL: 'http://localhost:1315', viewport: {width, height: 812}});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    let uploadTickets = 0;
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().endsWith('/v1/client/uploads')) {
        uploadTickets += 1;
      }
    });
    const objects = new Map();
    let failUpload = true;
    let failDownload = false;
    await page.route(`${process.env.CLIENT_STORAGE_URL || 'http://localhost:9000'}/**`, async (route) => {
      const path = new URL(route.request().url()).pathname;
      const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      };
      if (route.request().method() === 'OPTIONS') {
        return route.fulfill({status: 200, headers});
      }
      if (route.request().method() === 'PUT') {
        if (failUpload) {
          return route.fulfill({status: 503, headers});
        }
        objects.set(path, route.request().postDataBuffer());
        return route.fulfill({status: 200, headers});
      }
      return route.fulfill({
        status: failDownload ? 503 : objects.has(path) ? 200 : 404,
        contentType: 'image/png',
        body: failDownload ? '' : (objects.get(path) ?? ''),
        headers,
      });
    });
    try {
      await page.goto(`/invite/${fixture.token}`);
      await page.getByRole('button', {name: 'Continue with email'}).click();
      await page.getByLabel('Verification code').fill('123456');
      await page.getByRole('button', {name: 'Verify and continue'}).click();
      await page.getByRole('link', {name: 'Forms & check-ins', exact: true}).click();
      await page.getByRole('link', {name: /Getting started together/}).click();
      await expect(page.getByRole('button', {name: 'Send response'})).toBeEnabled();
      await page.getByRole('button', {name: 'Send response'}).click();
      await expect(page.getByLabel('What would you like to work on?', {exact: false})).toBeFocused();
      await page.getByLabel('What would you like to work on?', {exact: false}).fill('Build a steady routine');
      await page.getByLabel('Sessions each week', {exact: false}).fill('3');
      await page.getByRole('radio', {name: 'No', exact: true}).check();
      await page.getByLabel('Preferred start date', {exact: false}).fill('2026-10-01');
      await page.getByRole('button', {name: /Meal preference/}).click();
      await page.getByRole('option', {name: 'Home cooking'}).click();
      await page.getByText('Monday', {exact: true}).click();
      await expect(page.getByRole('checkbox', {name: 'Monday', exact: true})).toBeChecked();
      await page.getByText('Friday', {exact: true}).click();
      await expect(page.getByRole('checkbox', {name: 'Friday', exact: true})).toBeChecked();
      await page.getByRole('radio', {name: '4', exact: true}).check();
      await page.getByLabel('Current weight', {exact: false}).fill('70.5');
      await page.getByLabel('Service type (required)').getByText('Training', {exact: true}).click();
      await expect(page.getByRole('checkbox', {name: 'Training', exact: true})).toBeChecked();
      await page.getByLabel('Service type (required)').getByText('Nutrition', {exact: true}).click();
      await expect(page.getByRole('checkbox', {name: 'Nutrition', exact: true})).toBeChecked();
      await page.getByRole('button', {name: 'Send response'}).click();
      await expect(page.getByRole('group', {name: /Progress views/})).toBeFocused();
      await page
        .getByLabel('Choose Progress views')
        .setInputFiles({name: 'progress.png', mimeType: 'image/png', buffer: png});
      await expect(page.getByRole('button', {name: 'Retry photo 1'})).toBeVisible();
      await expect(page.getByText('The photo could not be uploaded. Try again when connected.')).toBeVisible();
      await expect(page.getByRole('button', {name: 'Send response'})).toBeDisabled();
      if (width === 375) {
        // An interrupted upload saved by the Blob-based app must survive the storage format change.
        await page.evaluate(
          () =>
            new Promise((resolve, reject) => {
              const open = indexedDB.open('clientapp.photos');
              open.onerror = () => reject(open.error);
              open.onsuccess = () => {
                const db = open.result;
                const tx = db.transaction('photos', 'readwrite');
                const request = tx.objectStore('photos').openCursor();
                request.onsuccess = () => {
                  const cursor = request.result;
                  if (!cursor || !(cursor.value.blob instanceof ArrayBuffer)) {
                    reject(new Error('Expected a persisted byte-backed photo before converting the fixture.'));
                    tx.abort();
                    return;
                  }
                  const {mimeType, ...record} = cursor.value;
                  cursor.update({...record, blob: new Blob([record.blob], {type: mimeType})});
                };
                tx.oncomplete = () => {
                  db.close();
                  resolve();
                };
                tx.onabort = () => {
                  db.close();
                  reject(tx.error);
                };
              };
            }),
        );
      }
      await page.reload();
      await expect(page.getByText('Your unsent answers were restored.')).toBeVisible();
      await expect(page.getByLabel('What would you like to work on?', {exact: false})).toHaveValue(
        'Build a steady routine',
      );
      await expect(page.getByRole('radio', {name: 'No', exact: true})).toBeChecked();
      await expect(page.getByRole('button', {name: 'Retry photo 1'})).toBeVisible();
      failUpload = false;
      await page.getByRole('button', {name: 'Retry photo 1'}).click();
      await expect(page.getByText('Photo uploaded', {exact: true})).toBeVisible();
      expect(uploadTickets, 'A retry after restart reuses the original attachment').toBe(1);
      await expect(page.getByRole('button', {name: 'Send response'})).toBeEnabled();
      await expect(page.getByLabel('Current weight (kg)', {exact: false})).toHaveValue('70.5');
      await api(`/v1/coach/form-templates/${assignment.data.form_template_id}`, {
        method: 'PATCH',
        token: fixture.coachToken,
        body: {
          expected_revision: assignment.data.form_template.revision + 1,
          sections: [
            {
              title: 'About you',
              questions: questions.map((question) =>
                question.id === 'goal.with.dots'
                  ? {...question, label: 'Your main goal this month'}
                  : question.id === 'photos'
                    ? {...question, label: 'Front and side views'}
                    : question,
              ),
            },
          ],
        },
      });
      const outdated = page.waitForResponse((response) =>
        response.url().endsWith(`/form-assignments/${assignment.data.id}/submit`),
      );
      await page.getByRole('button', {name: 'Send response'}).click();
      const outdatedResponse = await outdated;
      expect(outdatedResponse.status(), JSON.stringify(await outdatedResponse.json())).toBe(409);
      await expect(page.getByText('Your coach updated this form. Review your answers before sending.')).toBeVisible();
      await expect(page.getByLabel('Your main goal this month', {exact: false})).toHaveValue('');
      await expect(page.getByLabel('Current weight (kg)', {exact: false})).toHaveValue('70.5');
      await expect(page.getByText('From an earlier question', {exact: true})).toBeVisible();
      await page.getByRole('button', {name: 'Use photo 1', exact: true}).click();
      await expect(page.getByText('Photo uploaded', {exact: true})).toBeVisible();
      await page.getByText('Answers from the earlier form', {exact: true}).click();
      await expect(page.getByText('Build a steady routine', {exact: true})).toBeVisible();
      await page.getByLabel('Your main goal this month', {exact: false}).fill('Build a steady routine');
      await page.screenshot({path: `tests/forms/artifacts/editor-${width}.png`, fullPage: true});
      let accepted = 0;
      await page.route(`**/v1/client/form-assignments/${assignment.data.id}/submit`, async (route) => {
        const response = await route.fetch();
        expect(response.status()).toBe(201);
        accepted += 1;
        await route.abort('connectionreset');
      });
      await page.getByRole('button', {name: 'Send response'}).click();
      await expect(page.getByText(/Response saved/)).toBeVisible();
      expect(accepted).toBe(1);
      failDownload = true;
      await page.reload();
      await expect(page.getByText('Photos could not be loaded.', {exact: true})).toBeVisible();
      failDownload = false;
      await page.getByRole('button', {name: 'Retry photos'}).click();
      await expect(page.getByText('Photos could not be loaded.', {exact: true})).toHaveCount(0);
      await expect
        .poll(() =>
          page
            .getByRole('img', {name: 'Progress view 1'})
            .evaluate((image) => image.complete && image.naturalWidth > 0),
        )
        .toBe(true);
      await expect(page.getByText('Build a steady routine')).toBeVisible();
      await expect(page.getByText('70.5', {exact: true})).toBeVisible();
      await expect(page.getByText('Current weight (kg)', {exact: true})).toBeVisible();
      await expect(page.getByText('Compare your unsent answers')).toHaveCount(0);
      await expect(page.getByRole('img', {name: 'Progress view 1'})).toBeVisible();
      await page.screenshot({path: `tests/forms/artifacts/saved-${width}.png`, fullPage: true});
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await page.locator('.app-header').evaluate((el) => el.getBoundingClientRect().width)).toBeLessThanOrEqual(
        480,
      );
      await page.getByRole('link', {name: 'Back to your forms'}).click();
      await expect(page.getByText('Nothing to complete right now.', {exact: false})).toBeVisible();
      await page.getByRole('link', {name: 'History', exact: true}).click();
      await expect(page.getByRole('link', {name: /Getting started together/})).toBeVisible();
      const submissions = await api(`/v1/coach/form-assignments/${assignment.data.id}/submissions`, {
        token: fixture.coachToken,
      });
      expect(submissions.data).toHaveLength(1);
      expect(submissions.data[0].answers['goal.with.dots']).toBe('Build a steady routine');
      expect(submissions.data[0].answers.pain).toBe(false);
      expect(submissions.data[0].answers.services).toEqual({services: ['training', 'nutrition']});
      expect(submissions.data[0].attachments).toHaveLength(1);
      expect(errors).toEqual([]);
      results.push({width, passed: true, objectStorage: 'external boundary simulated; Phoenix and PostgreSQL real'});
    } catch (error) {
      await writeFile(`tests/forms/artifacts/failure-${width}.txt`, await page.locator('body').innerText());
      await page.screenshot({path: `tests/forms/artifacts/failure-${width}.png`, fullPage: true});
      throw error;
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  await writeFile('tests/forms/artifacts/results.json', JSON.stringify(results, null, 2));
}
console.log(JSON.stringify(results));
