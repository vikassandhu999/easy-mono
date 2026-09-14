import {expect} from '@playwright/test';

export async function checkConversationFeatures({
  page,
  context,
  send,
  token,
  person,
  clientToken,
  conversation,
  width,
}) {
  const path = `/clients/${person.id}/conversation`;
  const incoming = (body) => send('post', '/v1/client/conversation/messages', {body}, clientToken);
  await page.addInitScript(() => {
    window.chatTestSockets = [];
    const NativeSocket = window.WebSocket;
    window.WebSocket = class extends NativeSocket {
      constructor(...args) {
        super(...args);
        if (new URL(args[0], location.href).pathname === '/socket/websocket') {
          window.chatTestSockets.push(this);
        }
      }
    };
  });
  await page.goto(path);
  await expect(page.getByLabel('Message Alex Morgan', {exact: true})).toBeVisible();
  await page.waitForLoadState('networkidle');
  const teammate = await context.newPage();
  await teammate.goto(path);
  await expect(teammate.getByLabel('Message Alex Morgan', {exact: true})).toBeVisible();
  await teammate.waitForLoadState('networkidle');
  await incoming('A reply for the whole coaching team.');
  await expect(teammate.getByRole('button', {name: 'Mark handled', exact: true})).toBeVisible();
  await page.getByRole('button', {name: /^Mark as read/}).click();
  await expect(teammate.getByRole('button', {name: /^Mark as read/})).toHaveCount(0);
  await page.getByRole('button', {name: 'Mark handled', exact: true}).click();
  await expect(teammate.getByRole('button', {name: 'Mark handled', exact: true})).toHaveCount(0);
  await teammate.close();

  const body = page.getByLabel('Message Alex Morgan', {exact: true});
  await body.fill('Draft retained while reconnecting.');
  await context.setOffline(true);
  await page.evaluate(() => {
    for (const socket of window.chatTestSockets) {
      socket.close();
    }
  });
  await expect(page.getByText(/Live updates are reconnecting/)).toBeVisible();
  await incoming('Sent while the coach was offline.');
  await context.setOffline(false);
  await expect(page.getByText('Sent while the coach was offline.', {exact: true})).toHaveCount(1, {timeout: 15000});
  await expect(page.getByText(/Live updates are reconnecting/)).toHaveCount(0, {timeout: 15000});
  await expect(body).toHaveValue('Draft retained while reconnecting.');
  await body.fill('');

  const question = crypto.randomUUID();
  const form = (
    await send(
      'post',
      '/v1/coach/form-templates',
      {
        name: 'Weekly reflection',
        purpose: 'check_in',
        sections: [
          {
            title: 'This week',
            questions: [{id: question, type: 'text', label: 'What would you like help with?', required: true}],
          },
        ],
      },
      token,
    )
  ).data;
  const assignment = (
    await send('post', `/v1/coach/clients/${person.id}/form-assignments`, {form_template_id: form.id}, token)
  ).data;
  const submission = (
    await send(
      'post',
      `/v1/client/form-assignments/${assignment.id}/submit`,
      {
        answers: {[question]: 'Finding time to prepare lunch.'},
      },
      clientToken,
    )
  ).data;
  await page.goto(`/check-ins/responses/${submission.id}`);
  await page.getByRole('link', {name: 'Discuss with client', exact: true}).click();
  const attached = page.getByRole('group', {name: 'Attached form response', exact: true});
  await expect(attached.getByRole('button', {name: /Weekly reflection/})).toBeVisible();
  await expect(page.getByText('Finding time to prepare lunch.', {exact: true})).toHaveCount(0);
  await attached.getByRole('button', {name: /Weekly reflection/}).click();
  await expect(page.getByRole('region', {name: 'Submitted answers', exact: true})).toContainText(
    'Finding time to prepare lunch.',
  );
  await page.getByRole('button', {name: 'Back to conversation', exact: true}).click();
  await body.fill('Let us plan two simple lunch options.');
  await page.getByRole('button', {name: 'Send message', exact: true}).click();
  await expect(attached).toHaveCount(0);
  await expect(page).not.toHaveURL(/response=/);
  const shared = page.getByRole('button', {name: /Weekly reflection/});
  await expect(shared).toHaveCount(1);
  const reader = `/v1/coach/clients/${person.id}/form-submissions/${submission.id}`;
  await page.evaluate(async () => {
    const {queryClient} = await import('/src/api/query-client.ts');
    queryClient.clear();
  });
  await expect(shared).toBeVisible();
  await page.route(`**${reader}`, (route) => route.fulfill({status: 503, json: {}}));
  await shared.click();
  await expect(page.getByRole('button', {name: 'Retry response', exact: true})).toBeVisible();
  await page.unroute(`**${reader}`);
  await page.getByRole('button', {name: 'Retry response', exact: true}).click();
  await expect(page.getByRole('region', {name: 'Submitted answers', exact: true})).toContainText(
    'Finding time to prepare lunch.',
  );
  await page.screenshot({path: `tests/conversations/artifacts/shared-response-${width}.png`, fullPage: true});
  await page.getByRole('button', {name: 'Back to conversation', exact: true}).click();

  const intake = (await send('get', `/v1/coach/clients/${person.id}/intake`, undefined, token)).data;
  const questions = intake.form_template.sections.flatMap((section) => section.questions);
  const answers = Object.fromEntries(
    questions.map((question) => [
      question.id,
      question.type === 'service_type'
        ? {services: ['training']}
        : question.type === 'boolean'
          ? false
          : question.type === 'number' || question.type === 'rating' || question.type === 'weight'
            ? 5
            : question.type === 'select'
              ? question.options[0]
              : question.type === 'multi_select'
                ? [question.options[0]]
                : question.type === 'date'
                  ? '2026-09-12'
                  : 'My intake answer',
    ]),
  );
  const intakeResponse = (await send('post', `/v1/client/form-assignments/${intake.id}/submit`, {answers}, clientToken))
    .data;
  await page.goto(`/clients/${person.id}`);
  await page.getByRole('link', {name: 'Discuss intake with client', exact: true}).click();
  await expect(attached.getByRole('button', {name: /View shared response/})).toBeVisible();
  await page.getByRole('button', {name: 'Send message', exact: true}).click();
  await expect(attached).toHaveCount(0);
  const history = await send(
    'get',
    `/v1/coach/conversations/${conversation.id}/history?cursor=start`,
    undefined,
    token,
  );
  expect(history.data[0].embed.id).toBe(intakeResponse.id);
  await page.getByRole('button', {name: new RegExp(intake.form_template.name)}).click();
  await expect(page.getByRole('region', {name: 'Submitted answers', exact: true})).toBeVisible();
  await page.getByRole('button', {name: 'Back to conversation', exact: true}).click();
  await page.goto(`${path}?response=${crypto.randomUUID()}`);
  await expect(page.getByRole('alert')).toContainText('Could not load the shared response');
  await page.getByRole('button', {name: 'Remove shared response', exact: true}).click();
  await expect(attached).toHaveCount(0);

  await page.evaluate(() => {
    const getUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    window.chatTestTracks = [];
    let reject = true;
    navigator.mediaDevices.getUserMedia = async (...args) => {
      if (reject) {
        reject = false;
        throw new DOMException('Denied by test', 'NotAllowedError');
      }
      const stream = await getUserMedia(...args);
      window.chatTestTracks.push(...stream.getTracks());
      return stream;
    };
  });
  await page.getByRole('button', {name: 'Record voice note', exact: true}).click();
  await page.getByRole('button', {name: 'Start recording', exact: true}).click();
  await expect(page.getByRole('alert')).toContainText('Microphone access was denied');
  await page.getByRole('button', {name: 'Start recording', exact: true}).click();
  await expect(page.getByRole('timer', {name: 'Recording duration', exact: true})).toContainText('0:01');
  await page.getByRole('button', {name: 'Stop recording', exact: true}).click();
  const preview = page.locator('audio[aria-label="Voice note preview"]');
  await expect(preview).toBeVisible();
  await expect.poll(() => preview.evaluate((audio) => audio.readyState)).toBeGreaterThan(0);
  await preview.evaluate((audio) => audio.play());
  await page.screenshot({path: `tests/conversations/artifacts/voice-note-${width}.png`, fullPage: true});
  await page.getByRole('button', {name: 'Record again', exact: true}).click();
  await expect(page.getByRole('button', {name: 'Stop recording', exact: true})).toBeVisible();
  await page.getByRole('button', {name: 'Discard and close', exact: true}).click();
  expect(await page.evaluate(() => window.chatTestTracks.every((track) => track.readyState === 'ended'))).toBe(true);
  await expect(page.getByRole('group', {name: 'Message attachments', exact: true})).toHaveCount(0);
  await page.getByRole('button', {name: 'Record voice note', exact: true}).click();
  await page.getByRole('button', {name: 'Start recording', exact: true}).click();
  await expect(page.getByRole('timer', {name: 'Recording duration', exact: true})).toContainText('0:01');
  await page.getByRole('button', {name: 'Stop recording', exact: true}).click();
  let audioBytes;
  let audioType;
  await page.route('http://127.0.0.1:44001/**', (route) => {
    if (route.request().method() === 'PUT') {
      audioBytes = route.request().postDataBuffer();
      audioType = route.request().headers()['content-type'];
      return route.fulfill({status: 200, body: ''});
    }
    return route.fulfill({status: 200, contentType: audioType, body: audioBytes});
  });
  await page.getByRole('button', {name: 'Use voice note', exact: true}).click();
  await expect(page.getByText('Ready to send', {exact: true})).toBeVisible();
  await page.getByRole('button', {name: 'Send message', exact: true}).click();
  await page.getByRole('button', {name: 'Open audio', exact: true}).click();
  const sentAudio = page.locator('[data-slot="message"] audio');
  await expect(sentAudio).toBeVisible();
  await expect.poll(() => sentAudio.evaluate((audio) => audio.readyState)).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.chatTestTracks.every((track) => track.readyState === 'ended'))).toBe(true);
  expect(audioBytes.byteLength).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
