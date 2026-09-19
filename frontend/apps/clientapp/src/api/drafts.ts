import {getSession} from './session';
import {readStored, removeStored, writeStored} from './storage';

function draftKey(sessionId: string, resource: string) {
  const session = getSession();
  return session?.id === sessionId && session.accountId
    ? `clientapp.private.${session.accountId}.draft.${resource}`
    : null;
}

export async function readDraft(owner: string, resource: string): Promise<unknown> {
  const key = draftKey(owner, resource);
  if (!key) {
    return null;
  }
  const raw = await readStored(key);
  if (getSession()?.id !== owner || !raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function writeDraft(owner: string, resource: string, value: unknown) {
  const key = draftKey(owner, resource);
  if (!key) {
    throw new Error('Your account must be verified before keeping a draft.');
  }
  await writeStored(key, JSON.stringify(value));
}

export async function removeDraft(owner: string, resource: string) {
  const key = draftKey(owner, resource);
  if (key) {
    await removeStored(key);
  }
}
