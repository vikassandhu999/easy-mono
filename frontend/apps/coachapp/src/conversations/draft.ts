export type SavedAttachment = {key: string; name: string; id: string | null};
export type ConversationDraft = {
  body: string;
  attachments: SavedAttachment[];
  requestId: string;
  teammateThrough?: string | null;
  state: 'editing' | 'uncertain';
};
export function emptyDraft(): ConversationDraft {
  return {
    body: '',
    attachments: [],
    requestId: crypto.randomUUID(),
    state: 'editing',
  };
}
export function parseDraft(raw: string | null): ConversationDraft | null {
  try {
    const value: unknown = JSON.parse(raw ?? 'null');
    if (
      !value ||
      typeof value !== 'object' ||
      !('body' in value) ||
      typeof value.body !== 'string' ||
      !('requestId' in value) ||
      typeof value.requestId !== 'string' ||
      !value.requestId ||
      !('state' in value) ||
      (value.state !== 'editing' && value.state !== 'uncertain') ||
      !('attachments' in value) ||
      !Array.isArray(value.attachments) ||
      value.attachments.length > 4
    ) {
      return null;
    }
    const attachments: SavedAttachment[] = [];
    for (const item of value.attachments) {
      if (
        !item ||
        typeof item !== 'object' ||
        !('key' in item) ||
        typeof item.key !== 'string' ||
        !('name' in item) ||
        typeof item.name !== 'string' ||
        !('id' in item) ||
        (item.id !== null && typeof item.id !== 'string')
      ) {
        return null;
      }
      attachments.push({key: item.key, name: item.name, id: item.id});
    }
    const teammateThrough = 'teammateThrough' in value ? value.teammateThrough : undefined;
    if (
      teammateThrough !== undefined &&
      teammateThrough !== null &&
      (typeof teammateThrough !== 'string' || !Number.isFinite(Date.parse(teammateThrough)))
    ) {
      return null;
    }
    return {
      body: value.body,
      requestId: value.requestId,
      state: value.state,
      attachments,
      ...(teammateThrough !== undefined ? {teammateThrough} : {}),
    };
  } catch {
    return null;
  }
}
export function draftKey(sessionId: string, conversationId: string) {
  return `coachapp.conversation-draft.v1:${sessionId}:${conversationId}`;
}
export type DraftLoad = {kind: 'ready'; draft: ConversationDraft} | {kind: 'failed'};
export function loadDraft(key: string): DraftLoad {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return {kind: 'ready', draft: emptyDraft()};
    }
    const draft = parseDraft(raw);
    return draft ? {kind: 'ready', draft} : {kind: 'failed'};
  } catch {
    return {kind: 'failed'};
  }
}
export function saveDraft(key: string, draft: ConversationDraft) {
  try {
    localStorage.setItem(key, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}
