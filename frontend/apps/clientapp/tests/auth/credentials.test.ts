import assert from 'node:assert/strict';
import {test} from 'node:test';
import {restoreNativeCredentials, sessionStorageKey} from '../../src/api/credential-store.ts';

function store(entries: [string, string][] = []) {
  const values = new Map(entries);
  return {
    values,
    getItem: async (key: string) => values.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: async (key: string) => {
      values.delete(key);
    },
  };
}

const session = JSON.stringify({id: 'verified-session', tokens: {refresh_token: 'test-refresh'}});

test('migration retains the session and removes its plaintext copy', async () => {
  const vault = store();
  const ordinary = store([[sessionStorageKey, session]]);
  assert.equal(await restoreNativeCredentials({vault, ordinary}), session);
  assert.equal(vault.values.get(sessionStorageKey), session);
  assert.equal(ordinary.values.has(sessionStorageKey), false);
  assert.equal(await restoreNativeCredentials({vault, ordinary}), session);
});

test('a failed vault write preserves the migration source for retry', async () => {
  const vault = store();
  const ordinary = store([[sessionStorageKey, session]]);
  await assert.rejects(
    restoreNativeCredentials({
      vault: {
        ...vault,
        setItem: async () => {
          throw new Error('vault unavailable');
        },
      },
      ordinary,
    }),
  );
  assert.equal(ordinary.values.get(sessionStorageKey), session);
  assert.equal(await restoreNativeCredentials({vault, ordinary}), session);
});

test('failed migration marker persistence can be retried without losing the session', async () => {
  const vault = store();
  const ordinary = store([[sessionStorageKey, session]]);
  await assert.rejects(
    restoreNativeCredentials({
      vault,
      ordinary: {
        ...ordinary,
        setItem: async () => {
          throw new Error('disk unavailable');
        },
      },
    }),
  );
  assert.equal(vault.values.get(sessionStorageKey), session);
  assert.equal(ordinary.values.get(sessionStorageKey), session);
  assert.equal(await restoreNativeCredentials({vault, ordinary}), session);
});

test('interrupted cleanup never resurrects a stale plaintext session', async () => {
  const vault = store();
  const ordinary = store([[sessionStorageKey, session]]);
  await assert.rejects(
    restoreNativeCredentials({
      vault,
      ordinary: {
        ...ordinary,
        removeItem: async () => {
          throw new Error('disk unavailable');
        },
      },
    }),
  );
  await vault.setItem(sessionStorageKey, '{}');
  assert.equal(await restoreNativeCredentials({vault, ordinary}), '{}');
  assert.equal(ordinary.values.has(sessionStorageKey), false);
});

test('a reinstall discards retained keychain credentials', async () => {
  const vault = store([[sessionStorageKey, session]]);
  const ordinary = store();
  assert.equal(await restoreNativeCredentials({vault, ordinary}), '{}');
  assert.equal(vault.values.get(sessionStorageKey), '{}');
});

test('an unavailable vault does not clear a migrated session', async () => {
  const vault = store();
  const ordinary = store([[sessionStorageKey, session]]);
  await restoreNativeCredentials({vault, ordinary});
  await assert.rejects(
    restoreNativeCredentials({
      vault: {
        ...vault,
        getItem: async () => {
          throw new Error('device locked');
        },
      },
      ordinary,
    }),
  );
  assert.equal(vault.values.get(sessionStorageKey), session);
  assert.equal(await restoreNativeCredentials({vault, ordinary}), session);
});
