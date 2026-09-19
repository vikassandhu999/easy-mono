import type {MessageSend} from '../api/conversation';

export type MessageDraft = {
  version: 1;
  id: string;
  body: string;
  mediaIds: string[];
  attempt: MessageSend | null;
};
const uuid = (value: unknown): value is string =>
  typeof value === 'string' && /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value);
const ids = (value: unknown): value is string[] =>
  Array.isArray(value) && value.length <= 4 && value.every(uuid) && new Set(value).size === value.length;

export function emptyMessageDraft(): MessageDraft {
  return {version: 1, id: crypto.randomUUID(), body: '', mediaIds: [], attempt: null};
}
export function messageResource(id: string) {
  return `messages.${id}`;
}
export function messageAttempt(draft: MessageDraft, attachmentIds: string[]): MessageSend {
  const body = draft.body.trim();
  if ((!body && attachmentIds.length === 0) || body.length > 4000) {
    throw new Error('Write a message of up to 4,000 characters or add an attachment.');
  }
  if (!ids(attachmentIds) || attachmentIds.length !== draft.mediaIds.length) {
    throw new Error('Finish uploading your attachments before sending.');
  }
  return {request_id: draft.id, body: body || null, attachment_ids: attachmentIds};
}
export function parseMessageDraft(value: unknown): MessageDraft | null {
  if (
    !value ||
    typeof value !== 'object' ||
    !('version' in value) ||
    value.version !== 1 ||
    !('id' in value) ||
    !uuid(value.id) ||
    !('body' in value) ||
    typeof value.body !== 'string' ||
    value.body.length > 4000 ||
    !('mediaIds' in value) ||
    !ids(value.mediaIds) ||
    !('attempt' in value)
  ) {
    return null;
  }
  const draft: MessageDraft = {version: 1, id: value.id, body: value.body, mediaIds: value.mediaIds, attempt: null};
  if (value.attempt === null) {
    return draft;
  }
  const attempt = value.attempt;
  if (
    !attempt ||
    typeof attempt !== 'object' ||
    !('request_id' in attempt) ||
    attempt.request_id !== draft.id ||
    !('body' in attempt) ||
    attempt.body !== (draft.body.trim() || null) ||
    !('attachment_ids' in attempt) ||
    !ids(attempt.attachment_ids)
  ) {
    return null;
  }
  try {
    return {...draft, attempt: messageAttempt(draft, attempt.attachment_ids)};
  } catch {
    return null;
  }
}
