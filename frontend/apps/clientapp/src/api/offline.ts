import {dehydrate, hydrate, type QueryKey} from '@tanstack/react-query';
import {queryClient, snapshotAge} from './query-client';
import {getSession, subscribeSession} from './session';
import {readStored, removeStored, writeStored} from './storage';

const version = 1;
const listeners = new Set<() => void>();
let issue = '';
export const offlineIssue = () => issue;
export function subscribeOfflineIssue(notify: () => void) {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}
function report(message: string) {
  issue = message;
  for (const notify of listeners) {
    notify();
  }
}
function eligible(key: QueryKey, sessionId: string) {
  return (
    key[1] === sessionId &&
    ((key[0] === 'auth' && key[2] === 'profile') ||
      (key[0] === 'forms' && ['lists', 'details'].includes(String(key[2]))) ||
      (key[0] === 'training' && ['lists', 'details', 'coverage', 'active'].includes(String(key[2]))) ||
      (key[0] === 'nutrition' && ['lists', 'details'].includes(String(key[2]))))
  );
}
function cacheKey(owner: string) {
  return `clientapp.private.${owner}.snapshot`;
}
async function saveSnapshot() {
  const session = getSession();
  if (!session?.accountId) {
    return;
  }
  const state = dehydrate(queryClient, {
    shouldDehydrateMutation: () => false,
    shouldDehydrateQuery: (query) =>
      eligible(query.queryKey, session.id) &&
      query.state.data !== undefined &&
      query.state.dataUpdatedAt > Date.now() - snapshotAge,
  });
  state.queries.sort((left, right) => right.state.dataUpdatedAt - left.state.dataUpdatedAt);
  state.queries = state.queries.slice(0, 100);
  try {
    await writeStored(cacheKey(session.accountId), JSON.stringify({version, sessionId: session.id, state}));
    if (getSession()?.id === session.id) {
      report('');
    }
  } catch {
    if (getSession()?.id === session.id) {
      report('This device could not keep a copy for offline use. Your online data is still available.');
    }
  }
}
async function restoreSnapshot() {
  const session = getSession();
  if (!session?.accountId) {
    return;
  }
  const key = cacheKey(session.accountId);
  try {
    const raw = await readStored(key);
    if (!raw || getSession()?.id !== session.id) {
      return;
    }
    const saved: unknown = JSON.parse(raw);
    if (
      !saved ||
      typeof saved !== 'object' ||
      !('version' in saved) ||
      saved.version !== version ||
      !('sessionId' in saved) ||
      saved.sessionId !== session.id ||
      !('state' in saved) ||
      !saved.state ||
      typeof saved.state !== 'object' ||
      !('queries' in saved.state) ||
      !Array.isArray(saved.state.queries)
    ) {
      await removeStored(key);
      return;
    }
    // Data came from generated-contract reads in this cache version. Only approved,
    // account-matching query records may cross the framework's hydration boundary.
    const queries = saved.state.queries.filter(
      (query: unknown) =>
        query &&
        typeof query === 'object' &&
        'queryKey' in query &&
        Array.isArray(query.queryKey) &&
        eligible(query.queryKey, session.id) &&
        'queryHash' in query &&
        typeof query.queryHash === 'string' &&
        'state' in query &&
        query.state &&
        typeof query.state === 'object' &&
        'data' in query.state &&
        'dataUpdatedAt' in query.state &&
        typeof query.state.dataUpdatedAt === 'number' &&
        query.state.dataUpdatedAt > Date.now() - snapshotAge,
    );
    hydrate(queryClient, {queries, mutations: []});
    await queryClient.invalidateQueries({refetchType: 'none'});
  } catch {
    queryClient.clear();
    report('Saved data could not be restored. Connect to reload it. Your drafts are kept.');
  }
}
export async function startOfflineCache() {
  await restoreSnapshot();
  queryClient.getQueryCache().subscribe((event) => {
    const session = getSession();
    if (
      session &&
      eligible(event.query.queryKey, session.id) &&
      (event.type === 'removed' || (event.type === 'updated' && event.action.type === 'success'))
    ) {
      saveSnapshot();
    }
  });
  subscribeSession(() => {
    if (!getSession()) {
      report('');
    }
  });
}
