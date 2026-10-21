import {clearChallenge} from './challenge.ts';
import {sessionStorageKey as KEY, readCredentials, writeCredentials} from './credential-store.ts';
import {queryClient} from './query-client.ts';
import {type AuthTokens, parseSession, type Session} from './session-value.ts';
import {clearPrivateStorage, isNative} from './storage.ts';

export {parseSession} from './session-value.ts';

const EVENT = 'clientapp:session';
let snapshot: string | null = null;
let writes: Promise<void> = Promise.resolve();
let endingState: 'idle' | 'pending' | 'failed' = 'idle';
let endingTask: (() => Promise<void>) | undefined;
let endingPromise: Promise<void> | undefined;

export function sessionEndState() {
  return endingState;
}

export async function restoreSession() {
  snapshot = await readCredentials();
}

export function sessionSnapshot() {
  return isNative ? snapshot : localStorage.getItem(KEY);
}

export function getSession() {
  return parseSession(sessionSnapshot());
}

function persist(value: string) {
  snapshot = value;
  if (!isNative) {
    localStorage.setItem(KEY, value);
    return Promise.resolve();
  }
  // Serialize native storage so a delayed sign-in cannot overwrite a logout.
  const pending = writes.catch(() => undefined).then(() => writeCredentials(value));
  writes = pending;
  return pending;
}

export async function saveSession(tokens: AuthTokens, previous?: Session) {
  if (tokens.scope !== 'client') {
    throw new Error('This account does not have client access. Open your coach’s invitation to get started.');
  }
  if (previous && getSession()?.tokens.refresh_token !== previous.tokens.refresh_token) {
    throw new Error('Your session changed. Please sign in again.');
  }
  const accountId = previous ? getSession()?.accountId : undefined;
  const session: Session = {
    id: previous?.id ?? crypto.randomUUID(),
    ...(accountId ? {accountId} : {}),
    tokens,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  };
  await persist(JSON.stringify(session));
  if (getSession()?.id !== session.id) {
    throw new Error('Your session changed. Please sign in again.');
  }
  if (!previous) {
    queryClient.clear();
  }
  window.dispatchEvent(new Event(EVENT));
  return session;
}

export async function identifySession(accountId: string, sessionId: string) {
  const session = getSession();
  if (!session || session.id !== sessionId || (session.accountId && session.accountId !== accountId)) {
    throw new Error('Your session changed. Please sign in again.');
  }
  if (!session.accountId) {
    await persist(JSON.stringify({...session, accountId}));
    if (getSession()?.id === sessionId) {
      window.dispatchEvent(new Event(EVENT));
    }
  }
  if (getSession()?.id !== sessionId) {
    throw new Error('Your session changed. Please sign in again.');
  }
}

// Authentication expiry keeps account-scoped drafts for the next verified login.
export function expireSession() {
  return endSession(false);
}

export function clearSession() {
  return endSession(true);
}

function endSession(removePrivateData: boolean) {
  if (endingTask) {
    return retryEndSession();
  }
  const owner = getSession()?.accountId;
  const tombstone = JSON.stringify({id: crypto.randomUUID()});
  endingTask = async () => {
    const pending = persist(tombstone);
    const clearing = owner && removePrivateData ? clearPrivateStorage(owner) : Promise.resolve();
    queryClient.clear();
    await Promise.all([pending, clearing]);
    if (sessionSnapshot() === tombstone) {
      await clearChallenge();
    }
  };
  return retryEndSession();
}

export function retryEndSession(): Promise<void> {
  if (endingPromise || !endingTask) {
    return endingPromise ?? Promise.resolve();
  }
  endingState = 'pending';
  window.dispatchEvent(new Event(EVENT));
  endingPromise = endingTask()
    .then(
      () => {
        endingState = 'idle';
        endingTask = undefined;
      },
      () => {
        endingState = 'failed';
      },
    )
    .finally(() => {
      endingPromise = undefined;
      window.dispatchEvent(new Event(EVENT));
    });
  return endingPromise;
}

export function subscribeSession(onChange: () => void) {
  let sessionId = getSession()?.id;
  const notify = () => {
    const next = getSession()?.id;
    if (next !== sessionId) {
      queryClient.clear();
      sessionId = next;
    }
    onChange();
  };
  const storage = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) {
      notify();
    }
  };
  window.addEventListener(EVENT, notify);
  window.addEventListener('storage', storage);
  return () => {
    window.removeEventListener(EVENT, notify);
    window.removeEventListener('storage', storage);
  };
}
