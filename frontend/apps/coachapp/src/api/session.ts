import {queryClient} from './query-client.ts';
import type {components} from './schema.ts';

type AuthTokens = components['schemas']['AuthTokenResponse'];

export type Session = {id: string; expiresAt: number; tokens: AuthTokens};
const STORAGE_KEY = 'coachapp.auth.v1';
const CHANGE_EVENT = 'coachapp:session';

export function parseSession(raw: string | null): Session | null {
  try {
    const value: unknown = JSON.parse(raw ?? 'null');
    if (!value || typeof value !== 'object' || !('id' in value) || !('expiresAt' in value) || !('tokens' in value)) {
      return null;
    }
    const tokens = value.tokens;
    if (
      typeof value.id !== 'string' ||
      !value.id ||
      typeof value.expiresAt !== 'number' ||
      !Number.isFinite(value.expiresAt) ||
      !tokens ||
      typeof tokens !== 'object' ||
      !('access_token' in tokens) ||
      typeof tokens.access_token !== 'string' ||
      !tokens.access_token ||
      !('refresh_token' in tokens) ||
      typeof tokens.refresh_token !== 'string' ||
      !tokens.refresh_token ||
      !('scope' in tokens) ||
      typeof tokens.scope !== 'string' ||
      !tokens.scope ||
      !('expires_in' in tokens) ||
      typeof tokens.expires_in !== 'number' ||
      !Number.isFinite(tokens.expires_in) ||
      tokens.expires_in <= 0 ||
      !('token_type' in tokens) ||
      tokens.token_type !== 'Bearer'
    ) {
      return null;
    }
    return {
      id: value.id,
      expiresAt: value.expiresAt,
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        scope: tokens.scope,
        expires_in: tokens.expires_in,
        token_type: tokens.token_type,
        ...('full_name' in tokens && typeof tokens.full_name === 'string' ? {full_name: tokens.full_name} : {}),
      },
    };
  } catch {
    return null;
  }
}

export function sessionSnapshot() {
  return localStorage.getItem(STORAGE_KEY);
}

export function getSession() {
  return parseSession(sessionSnapshot());
}

export function saveSession(tokens: AuthTokens, previous?: Session) {
  if (previous && getSession()?.tokens.refresh_token !== previous.tokens.refresh_token) {
    throw new Error('Your session changed. Please try again.');
  }
  const session: Session = {
    id: previous?.id ?? crypto.randomUUID(),
    tokens,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  if (!previous) {
    queryClient.clear();
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
  return session;
}

export function clearSession() {
  // Retain a revision so a delayed sign-in response cannot undo sign-out.
  localStorage.setItem(STORAGE_KEY, JSON.stringify({id: crypto.randomUUID()}));
  sessionStorage.removeItem('coachapp.challenge.v1');
  queryClient.clear();
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeSession(onChange: () => void) {
  let sessionId = getSession()?.id;
  const notify = () => {
    const nextId = getSession()?.id;
    if (sessionId !== nextId) {
      queryClient.clear();
      sessionId = nextId;
    }
    onChange();
  };
  const storageChanged = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      notify();
    }
  };
  window.addEventListener(CHANGE_EVENT, notify);
  window.addEventListener('storage', storageChanged);
  return () => {
    window.removeEventListener(CHANGE_EVENT, notify);
    window.removeEventListener('storage', storageChanged);
  };
}
