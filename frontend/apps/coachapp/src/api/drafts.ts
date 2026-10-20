import {getSession} from './session';

export async function readDraft(owner: string, key: string): Promise<unknown> {
  if (getSession()?.id !== owner) {
    return null;
  }
  const raw = localStorage.getItem(key);
  if (raw === null) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}
export async function writeDraft(owner: string, key: string, value: unknown) {
  if (getSession()?.id !== owner) {
    throw new Error('Your session changed. Please sign in again.');
  }
  localStorage.setItem(key, JSON.stringify(value));
}
export async function removeDraft(owner: string, key: string) {
  if (getSession()?.id === owner) {
    localStorage.removeItem(key);
  }
}
