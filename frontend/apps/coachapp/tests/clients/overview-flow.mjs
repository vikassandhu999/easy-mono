import {expect} from '@playwright/test';

export async function checkClientOverview({page, api, coachToken, clientToken, clientId, width}) {
  const coachHeaders = {authorization: `Bearer ${coachToken}`};
  const assignmentPath = `/v1/coach/clients/${clientId}/intake`;
  const assignmentsResponse = await api.get(assignmentPath, {headers: coachHeaders});
  expect(assignmentsResponse.ok()).toBe(true);
  const assignment = (await assignmentsResponse.json()).data;
  await page.screenshot({path: `tests/clients/artifacts/overview-pending-${width}.png`, fullPage: true});
  await page.route(`**${assignmentPath}`, (route) =>
    route.fulfill({status: 503, json: {error_message: 'Unavailable'}}),
  );
  await page.getByRole('button', {name: 'Refresh status', exact: true}).click();
  await expect(page.getByRole('button', {name: 'Retry intake', exact: true})).toBeVisible();
  await expect(page.getByText('Intake pending', {exact: true})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Manage intake', exact: true})).toBeDisabled();
  await page.unroute(`**${assignmentPath}`);
  await page.getByRole('button', {name: 'Retry intake', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Intake pending', exact: true})).toBeVisible();
  const clientPath = `/v1/coach/clients/${clientId}`;
  const person = (await (await api.get(clientPath, {headers: coachHeaders})).json()).data;
  await page.route(`**${clientPath}`, (route) =>
    route.fulfill({json: {data: {...person, status: 'inactive', inactive_reason: 'awaiting_seat'}}}),
  );
  await page.reload();
  await expect(page.getByRole('heading', {name: 'Client inactive', exact: true})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Intake paused', exact: true})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Intake pending', exact: true})).toHaveCount(0);
  await page.unroute(`**${clientPath}`);
  await page.route(`**${assignmentPath}`, (route) => route.fulfill({json: {data: null}}));
  await page.reload();
  await expect(page.getByRole('heading', {name: 'No intake assigned', exact: true})).toBeVisible();
  await page.unroute(`**${assignmentPath}`);
  await page.route(`**${assignmentPath}`, (route) =>
    route.fulfill({json: {data: {...assignment, status: 'dismissed'}}}),
  );
  await page.reload();
  await expect(page.getByRole('heading', {name: 'Intake dismissed', exact: true})).toBeVisible();
  await page.unroute(`**${assignmentPath}`);
  await page.reload();
  await expect(page.getByRole('heading', {name: 'Intake pending', exact: true})).toBeVisible();

  const templatePath = `/v1/coach/form-templates/${assignment.form_template_id}`;
  const sections = [
    ...assignment.form_template.sections,
    {
      title: 'Additional context',
      questions: [
        {id: 'consent', label: 'Have you worked with a coach before?', type: 'boolean'},
        {id: 'preferences', label: 'Preferred training days', type: 'multi_select', options: ['Monday', 'Friday']},
        {id: 'services', label: 'Coaching support', type: 'service_type', required: true},
      ],
    },
  ];
  expect((await api.patch(templatePath, {headers: coachHeaders, data: {sections}})).ok()).toBe(true);
  const answers = Object.fromEntries(
    sections
      .flatMap((section) => section.questions)
      .flatMap((question) => {
        if (question.id === 'target-weight') {
          return [[question.id, 0]];
        }
        if (question.id === 'consent') {
          return [[question.id, false]];
        }
        if (question.id === 'preferences') {
          return [[question.id, ['Monday', 'Friday']]];
        }
        if (question.type === 'service_type') {
          return [[question.id, {services: ['training', 'nutrition']}]];
        }
        if (!question.required) {
          return [];
        }
        return [
          [
            question.id,
            question.type === 'select'
              ? question.options[0]
              : 'Build strength steadily.\nTrain comfortably around my work schedule.',
          ],
        ];
      }),
  );
  const submit = await api.post(`/v1/client/form-assignments/${assignment.id}/submit`, {
    headers: {authorization: `Bearer ${clientToken}`},
    data: {answers},
  });
  expect(submit.status()).toBe(201);
  const submitted = (await submit.json()).data;
  const editedSections = sections.map((section) => ({
    ...section,
    questions: section.questions.map((question) => ({...question, label: 'Changed after submission'})),
  }));
  expect((await api.patch(templatePath, {headers: coachHeaders, data: {sections: editedSections}})).ok()).toBe(true);
  const submissionsPath = `/v1/coach/form-assignments/${assignment.id}/submissions`;
  await page.route(`**${submissionsPath}`, (route) =>
    route.fulfill({status: 503, json: {error_message: 'Unavailable'}}),
  );
  await page.getByRole('button', {name: 'Refresh status', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Intake submitted', exact: true})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Retry answers', exact: true})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Mark intake reviewed', exact: true})).toHaveCount(0);
  await page.unroute(`**${submissionsPath}`);
  await page.getByRole('button', {name: 'Retry answers', exact: true}).click();
  const submittedAnswers = page.getByRole('region', {name: 'Submitted answers', exact: true});
  await expect(submittedAnswers.getByText("What's your primary goal?", {exact: true})).toBeVisible();
  await expect(submittedAnswers.getByText('Changed after submission', {exact: true})).toHaveCount(0);
  await expect(submittedAnswers.getByText('0', {exact: true})).toBeVisible();
  await expect(submittedAnswers.getByText('No', {exact: true})).toBeVisible();
  await expect(submittedAnswers.getByText('Monday', {exact: true})).toBeVisible();
  await expect(submittedAnswers.getByText('Nutrition', {exact: true}).last()).toBeVisible();
  await expect(submittedAnswers.getByText('Not answered', {exact: true}).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path: `tests/clients/artifacts/overview-submitted-${width}.png`, fullPage: true});
  const reviewPath = `/v1/coach/form-submissions/${submitted.id}/review`;
  await page.route(`**${reviewPath}`, (route) => route.fulfill({status: 503, json: {error_message: 'Unavailable'}}));
  await page.getByRole('button', {name: 'Mark intake reviewed', exact: true}).click();
  await expect(page.getByRole('alert')).toBeInViewport();
  await expect(page.getByRole('heading', {name: 'Intake submitted', exact: true})).toBeVisible();
  await page.unroute(`**${reviewPath}`);
  await page.getByRole('button', {name: 'Mark intake reviewed', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Intake reviewed', exact: true})).toBeVisible();
  await expect(page.getByText('Review saved', {exact: true})).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', {name: 'Intake reviewed', exact: true})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Mark intake reviewed', exact: true})).toHaveCount(0);
  expect((await (await api.get(submissionsPath, {headers: coachHeaders})).json()).data[0].reviewed_at).toBeTruthy();
  // A review completed in another session must appear after Refresh status.
  await page.route(`**${submissionsPath}`, (route) =>
    route.fulfill({json: {data: [{...submitted, reviewed_at: null}]}}),
  );
  await page.reload();
  await expect(page.getByRole('heading', {name: 'Intake submitted', exact: true})).toBeVisible();
  await page.unroute(`**${submissionsPath}`);
  await page.getByRole('button', {name: 'Refresh status', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Intake reviewed', exact: true})).toBeVisible();

  // Media storage is external: exercise its UI boundary with a signed-URL response fixture.
  const photoId = 'd2cef5e4-c1b2-4d79-8b63-8f5664305ed3';
  await page.route(`**${submissionsPath}`, (route) =>
    route.fulfill({
      json: {
        data: [
          {
            ...submitted,
            question_snapshot: [
              {title: 'Photos', questions: [{id: 'photo', label: 'Starting position', type: 'photo'}]},
            ],
            answers: {photo: [photoId]},
          },
        ],
      },
    }),
  );
  await page.route('**/v1/coach/attachments/download-urls', (route) =>
    route.fulfill({status: 503, json: {error_message: 'Unavailable'}}),
  );
  await page.reload();
  await page.getByRole('button', {name: 'Load photo', exact: true}).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.unroute('**/v1/coach/attachments/download-urls');
  await page.route('**/v1/coach/attachments/download-urls', (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: photoId,
            download_url:
              'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6wX8AAAAASUVORK5CYII=',
            download_url_expires_at: new Date(Date.now() + 60_000).toISOString(),
          },
        ],
      },
    }),
  );
  await page.getByRole('button', {name: 'Reload photos', exact: true}).click();
  await expect(page.getByRole('link', {name: /Open photo 1/})).toBeVisible();
  await expect(page.getByRole('img', {name: 'Starting position, 1', exact: true})).toBeVisible();
  await page.unroute('**/v1/coach/attachments/download-urls');
  await page.unroute(`**${submissionsPath}`);
  await page.reload();
  await expect(page.getByRole('heading', {name: 'Intake reviewed', exact: true})).toBeVisible();
  await page.route(`**${clientPath}`, (route) =>
    route.fulfill({json: {data: {...person, stage: 'coaching', training_plan_name: null, nutrition_plan_name: null}}}),
  );
  await page.reload();
  await expect(
    page.getByText('Use these answers when preparing or updating their coaching plans.', {exact: true}),
  ).toBeVisible();
  await expect(
    page.getByText('Next: prepare their coaching plans using these goals and preferences.', {exact: true}),
  ).toHaveCount(0);
  await page.unroute(`**${clientPath}`);
  console.log(
    `Client overview: pending, submitted, snapshot answers, review/retry and persisted review passed at ${width}px.`,
  );
}
