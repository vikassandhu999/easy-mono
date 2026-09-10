import {expect} from '@playwright/test';
import {signOut} from '../auth/browser-helpers.mjs';

export async function checkRecovery({page, api, tokens, width, post, unique}) {
  await page.getByRole('link', {name: 'Forms', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Forms', exact: true})).toBeVisible();
  await page.route('**/v1/coach/form-templates', (route) =>
    route.fulfill({status: 503, json: {error_code: 'unavailable'}}),
  );
  await page.reload();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.unroute('**/v1/coach/form-templates');
  await page.getByRole('button', {name: 'Try again', exact: true}).click();
  await expect(page.getByRole('link', {name: /Weekly check-in/})).toBeVisible();
  // Empty response is a boundary fixture: the real API creates a built-in check-in.
  await page.route('**/v1/coach/form-templates', (route) => route.fulfill({json: {data: []}}));
  await page.reload();
  await expect(page.getByText('Create your first form', {exact: true})).toBeVisible();
  await page.unroute('**/v1/coach/form-templates');
  await page.getByRole('link', {name: 'Create form', exact: true}).click();
  await page.getByRole('button', {name: 'Save form', exact: true}).click();
  await expect(page.getByLabel('Form name', {exact: true})).toHaveAttribute('aria-invalid', 'true');
  await page.getByLabel('Form name', {exact: true}).fill('Weekly reflection');
  await page.getByLabel('Question', {exact: true}).fill('How was your energy?');
  await page.getByLabel('Answer type', {exact: true}).selectOption('rating');
  await expect(
    page.getByLabel('Answer type', {exact: true}).getByRole('option', {name: 'Service type', exact: true}),
  ).toHaveCount(0);
  await page.getByRole('button', {name: 'Preview form', exact: true}).click();
  await expect(page.getByRole('dialog').getByLabel('How was your energy?', {exact: true})).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('option', {name: '5', exact: true})).toHaveCount(1);
  await expect(page.getByRole('dialog').getByRole('option', {name: '6', exact: true})).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', {name: 'Preview form', exact: true})).toBeFocused();
  await page.getByRole('link', {name: 'Forms', exact: true}).click();
  await expect(page.getByRole('dialog', {name: 'Leave without saving?'})).toBeVisible();
  await page.getByRole('button', {name: 'Keep editing', exact: true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('link', {name: 'Forms', exact: true})).toBeFocused();
  await expect(page.getByLabel('Form name', {exact: true})).toHaveValue('Weekly reflection');
  await page.getByLabel('Section title', {exact: true}).fill('Energy');
  await expect(page.getByLabel('Section title', {exact: true})).toHaveValue('Energy');
  await page.getByRole('button', {name: 'Add section', exact: true}).click();
  await expect(page.getByLabel('Section title', {exact: true}).first()).toHaveValue('Energy');
  await page.getByLabel('Section title', {exact: true}).nth(1).fill('Habits');
  await page.getByLabel('Question', {exact: true}).nth(1).fill('Which habits felt good?');
  await page.getByLabel('Answer type', {exact: true}).nth(1).selectOption('multi_select');
  await page.getByLabel('Choices', {exact: true}).fill('Sleep\nWalking\nCooking');
  await expect(page.getByLabel('Section title', {exact: true}).first()).toHaveValue('Energy');
  await page.getByRole('button', {name: 'Move section 2 up', exact: true}).click();
  await expect(page.getByLabel('Section title', {exact: true}).first()).toHaveValue('Habits');
  await expect(page.getByLabel('Section title', {exact: true}).nth(1)).toHaveValue('Energy');
  await expect(page.getByLabel('Question', {exact: true}).first()).toHaveValue('Which habits felt good?');
  await page.getByRole('button', {name: 'Add question', exact: true}).first().click();
  await page.getByLabel('Question', {exact: true}).nth(1).fill('Anything to change?');
  await page.getByRole('button', {name: 'Remove question 2', exact: true}).click();
  await expect(page.getByLabel('Question', {exact: true})).toHaveCount(2);
  await page.getByLabel('Choices', {exact: true}).fill('');
  await page.getByRole('button', {name: 'Save form', exact: true}).click();
  await expect(page.getByLabel('Choices', {exact: true})).toHaveAttribute('aria-invalid', 'true');
  await page.getByLabel('Choices', {exact: true}).fill('Sleep\nWalking\nCooking');
  const checkInResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith('/form-templates') && response.request().method() === 'POST' && response.status() === 201,
  );
  await page.getByRole('button', {name: 'Save form', exact: true}).click();
  const checkIn = (await (await checkInResponse).json()).data;
  expect(checkIn.purpose).toBe('check_in');
  expect(checkIn.sections.map((section) => section.title)).toEqual(['Habits', 'Energy']);
  expect(checkIn.sections.map((section) => section.questions.map((question) => question.type))).toEqual([
    ['multi_select'],
    ['rating'],
  ]);
  await expect(page.getByRole('heading', {name: 'Forms', exact: true})).toBeVisible();
  await page.getByLabel('Form purpose', {exact: true}).selectOption('check_in');
  await expect(page.getByRole('link', {name: /Weekly reflection/})).toBeVisible();
  await expect(page.getByRole('link', {name: /Getting to know you/})).toHaveCount(0);
  await page.route(`**/v1/coach/form-templates/${checkIn.id}`, (route) =>
    route.fulfill({status: 503, json: {error_code: 'unavailable'}}),
  );
  await page.getByRole('link', {name: /Weekly reflection/}).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', {name: 'Save form', exact: true})).toHaveCount(0);
  await page.unroute(`**/v1/coach/form-templates/${checkIn.id}`);
  await page.getByRole('button', {name: 'Try again', exact: true}).click();
  await expect(page.getByLabel('Section title', {exact: true}).first()).toHaveValue('Habits');
  await expect(page.getByLabel('Section title', {exact: true}).nth(1)).toHaveValue('Energy');
  await page.getByLabel('Form name', {exact: true}).fill('Unsaved name');
  await page.getByRole('button', {name: 'Cancel', exact: true}).click();
  await page.getByRole('button', {name: 'Discard changes', exact: true}).click();
  await page.getByRole('link', {name: /Weekly reflection/}).click();
  await expect(page.getByLabel('Form name', {exact: true})).toHaveValue('Weekly reflection');
  // A fresh editor must load the latest server copy, even if its old detail is cached.
  await page.getByRole('link', {name: 'Forms', exact: true}).click();
  const update = await api.patch(`/v1/coach/form-templates/${checkIn.id}`, {
    data: {name: 'Updated elsewhere'},
    headers: {authorization: `Bearer ${tokens.access_token}`},
  });
  expect(update.ok()).toBe(true);
  await page.getByRole('link', {name: /Weekly reflection/}).click();
  await expect(page.getByLabel('Form name', {exact: true})).toHaveValue('Updated elsewhere');
  await page.getByRole('link', {name: 'Forms', exact: true}).click();
  await page.getByRole('link', {name: 'Create form', exact: true}).click();
  await page.getByLabel('Form name', {exact: true}).fill('Service intake');
  await page.getByLabel('Purpose', {exact: true}).selectOption('intake');
  await page.getByRole('button', {name: 'Remove question 1', exact: true}).click();
  await page.getByRole('button', {name: 'Save form', exact: true}).click();
  await expect(page.getByRole('alert')).toContainText('Add at least one question');
  await page.getByRole('button', {name: 'Add question', exact: true}).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByLabel('Answer type', {exact: true}).selectOption('select');
  await page.getByLabel('Answer type', {exact: true}).selectOption('service_type');
  await expect(page.getByLabel('Question', {exact: true})).toHaveValue('Service type');
  await expect(page.getByLabel('Question', {exact: true})).toBeDisabled();
  await expect(page.getByLabel('Answer type', {exact: true})).toBeDisabled();
  await expect(page.getByRole('checkbox', {name: 'Required answer', exact: true})).toBeChecked();
  await expect(page.getByRole('checkbox', {name: 'Required answer', exact: true})).toBeDisabled();
  await expect(page.getByLabel('Choices', {exact: true})).toHaveCount(0);
  await page.getByRole('button', {name: 'Add question', exact: true}).click();
  await expect(
    page.getByLabel('Answer type', {exact: true}).nth(1).getByRole('option', {name: 'Service type', exact: true}),
  ).toBeDisabled();
  await page.getByRole('button', {name: 'Remove question 2', exact: true}).click();
  const serviceResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith('/form-templates') && response.request().method() === 'POST' && response.status() === 201,
  );
  await page.getByRole('button', {name: 'Save form', exact: true}).click();
  const service = (await (await serviceResponse).json()).data;
  expect(service.sections[0].questions).toEqual([
    {id: expect.any(String), label: 'Service type', type: 'service_type', required: true},
  ]);
  await expect(page.getByRole('heading', {name: 'Forms', exact: true})).toBeVisible();
  await page.getByRole('link', {name: /Updated elsewhere/}).click();
  await expect(page.getByLabel('Form name', {exact: true})).toHaveValue('Updated elsewhere');
  if (width === 375) {
    await page.setViewportSize({width: 375, height: 480});
    await page.getByRole('button', {name: 'Save form', exact: true}).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', {name: 'Save form', exact: true})).toBeInViewport({ratio: 1});
    const badSizes = await page
      .locator('input:not([type=checkbox]), select, textarea')
      .evaluateAll((inputs) => inputs.filter((input) => parseFloat(getComputedStyle(input).fontSize) < 16).length);
    expect(badSizes).toBe(0);
    await page.setViewportSize({width: 375, height: 900});
    await page.getByLabel('Form name', {exact: true}).fill('Late save');
    const held = Promise.withResolvers();
    const release = Promise.withResolvers();
    await page.route(`**/v1/coach/form-templates/${checkIn.id}`, async (route) => {
      if (route.request().method() !== 'PATCH') {
        return route.continue();
      }
      const response = await route.fetch();
      expect(response.ok()).toBe(true);
      held.resolve();
      await release.promise;
      await route.fulfill({response});
    });
    await page.getByRole('button', {name: 'Save form', exact: true}).click();
    await held.promise;
    await signOut(page);
    await expect(page.getByRole('heading', {name: 'Welcome back', exact: true})).toBeVisible();
    const email = `other-forms-${unique}@example.test`;
    await post('/v1/auth/signup', {email});
    const guest = await post('/v1/auth/verify', {email, otp: '123456'});
    await post('/v1/businesses', {name: 'Another business', handle: `other-forms-${unique}`}, guest.access_token);
    const otherTokens = await post('/v1/auth/token', {
      grant_type: 'refresh_token',
      refresh_token: guest.refresh_token,
      role: 'coach',
    });
    await page.evaluate(async (tokens) => {
      const {saveSession} = await import('/src/api/session.ts');
      saveSession(tokens);
    }, otherTokens);
    await expect(page.getByRole('heading', {name: 'Clients', exact: true})).toBeVisible();
    const settled = page.waitForResponse((response) => response.url().endsWith(`/form-templates/${checkIn.id}`));
    release.resolve();
    await settled;
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', {name: 'Clients', exact: true})).toBeVisible();
    const cache = await page.evaluate(async () => {
      const {queryClient} = await import('/src/api/query-client.ts');
      return queryClient.getQueriesData({queryKey: ['forms']});
    });
    expect(cache).toEqual([]);
  }
  console.log(
    `Forms failure recovery, section reorder, purpose, validation, unsaved changes and freshness: ${width}px passed.`,
  );
}
