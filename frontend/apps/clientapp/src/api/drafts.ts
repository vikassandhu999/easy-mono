import {getSession} from './session';
import {readStored, removeStored, writeStored} from './storage';

function draftKey(owner: string, resource: string) {
  return `clientapp.private.${owner}.draft.${resource}`;
}

export async function readDraft(owner: string, resource: string): Promise<unknown> {
  const raw = await readStored(draftKey(owner, resource));
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
  if (getSession()?.id === owner) {
    await writeStored(draftKey(owner, resource), JSON.stringify(value));
  }
}

export async function removeDraft(owner: string, resource: string) {
  await removeStored(draftKey(owner, resource));
}
