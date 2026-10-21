import assert from 'node:assert/strict';
import {test} from 'node:test';
import {emptyMessageDraft, messageAttempt, parseMessageDraft} from '../../src/messages/message-draft.ts';

test('a message attempt survives restart with the exact identity, text and attachment order', () => {
  const mediaIds = [crypto.randomUUID(), crypto.randomUUID()];
  const attachmentIds = [crypto.randomUUID(), crypto.randomUUID()];
  const draft = {...emptyMessageDraft(), body: '  My progress\nfrom today  ', mediaIds};
  const attempt = messageAttempt(draft, attachmentIds);
  assert.deepEqual(attempt, {request_id: draft.id, body: 'My progress\nfrom today', attachment_ids: attachmentIds});
  assert.deepEqual(parseMessageDraft(JSON.parse(JSON.stringify({...draft, attempt}))), {...draft, attempt});
  assert.equal(parseMessageDraft({...draft, attempt: {...attempt, request_id: crypto.randomUUID()}}), null);
  assert.equal(parseMessageDraft({...draft, body: 'Changed while sending', attempt}), null);
  assert.equal(parseMessageDraft({...draft, attempt: {...attempt, attachment_ids: [attachmentIds[0]]}}), null);
  assert.equal(parseMessageDraft({...draft, mediaIds: [...mediaIds, ...mediaIds]}), null);
});

test('incomplete text can be kept but an empty or partially uploaded message cannot send', () => {
  const draft = emptyMessageDraft();
  assert.deepEqual(parseMessageDraft(draft), draft);
  assert.throws(() => messageAttempt({...draft, body: '  '}, []), /Write a message/);
  assert.throws(
    () => messageAttempt({...draft, body: 'Ready', mediaIds: [crypto.randomUUID()]}, []),
    /Finish uploading/,
  );
  assert.throws(() => messageAttempt({...draft, body: 'x'.repeat(4001)}, []), /4,000/);
  assert.equal(parseMessageDraft({version: 1, id: 'broken', body: 'Keep me', mediaIds: [], attempt: null}), null);
  const media = {...draft, mediaIds: [crypto.randomUUID()]};
  assert.equal(messageAttempt(media, [crypto.randomUUID()]).body, null);
});
