import assert from 'node:assert/strict';
import {test} from 'node:test';
import {draftKey, parseDraft} from '../../src/conversations/draft.ts';

test('an interrupted coach send restores the same request, context, reference and completed uploads', () => {
  const raw = JSON.stringify({
    body: 'I will adjust Thursday’s session tomorrow.',
    requestId: 'b50dc7b4-5c26-42d8-97ce-0e581e8bbbad',
    state: 'uncertain',
    reference: {
      type: 'training_session',
      id: 'session-1',
      title: 'Full-body workout',
      revision: 2,
      occurredOn: '2026-09-21',
    },
    attachments: [
      {key: 'photo', name: 'plan.png', id: 'uploaded-photo'},
      {key: 'unfinished', name: 'voice.webm', id: null},
    ],
  });
  assert.deepEqual(parseDraft(raw), {
    body: 'I will adjust Thursday’s session tomorrow.',
    requestId: 'b50dc7b4-5c26-42d8-97ce-0e581e8bbbad',
    state: 'uncertain',
    reference: {
      type: 'training_session',
      id: 'session-1',
      title: 'Full-body workout',
      revision: 2,
      occurredOn: '2026-09-21',
    },
    attachments: [
      {key: 'photo', name: 'plan.png', id: 'uploaded-photo'},
      {key: 'unfinished', name: 'voice.webm', id: null},
    ],
  });
});
test('corrupt records and unsupported references cannot enter a restored draft', () => {
  for (const raw of [
    '{',
    '{}',
    'null',
    JSON.stringify({
      body: 'x',
      requestId: 'id',
      state: 'editing',
      attachments: [],
      reference: {type: 'other', id: 'x', revision: 1, title: 'x', occurredOn: null},
    }),
  ]) {
    assert.equal(parseDraft(raw), null);
  }
});
test('drafts from another session or client are isolated', () => {
  assert.equal(
    draftKey('coach-session', 'client-conversation'),
    'coachapp.conversation-draft.v1:coach-session:client-conversation',
  );
  assert.notEqual(draftKey('coach-session', 'client-conversation'), draftKey('another-session', 'client-conversation'));
  assert.notEqual(draftKey('coach-session', 'client-conversation'), draftKey('coach-session', 'another-conversation'));
});

test('the teammate notice baseline survives a restored draft', () => {
  const restored = parseDraft(
    JSON.stringify({
      body: 'How was your workout?',
      reference: null,
      attachments: [],
      requestId: 'draft-id',
      state: 'editing',
      teammateThrough: '2026-09-22T09:12:00.000Z',
    }),
  );
  assert.equal(restored?.teammateThrough, '2026-09-22T09:12:00.000Z');
});
