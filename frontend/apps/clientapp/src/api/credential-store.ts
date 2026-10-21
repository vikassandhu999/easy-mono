import {KeychainAccess, SecureStorage} from '@aparajita/capacitor-secure-storage';
import {isNative, readStored, removeStored, writeStored} from './storage.ts';

export const sessionStorageKey = 'clientapp.auth.v1';
const installationKey = 'clientapp.credentials.v1';
const signedOut = '{}';

type Store = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

const secure = {
  getItem: (key: string) => SecureStorage.getItem(key),
  setItem: async (key: string, value: string) => {
    await SecureStorage.setDefaultKeychainAccess(KeychainAccess.whenUnlockedThisDeviceOnly);
    await SecureStorage.setItem(key, value);
  },
};
const preferences: Store = {getItem: readStored, setItem: writeStored, removeItem: removeStored};

export async function restoreNativeCredentials({
  vault,
  ordinary,
}: {
  vault: Pick<Store, 'getItem' | 'setItem'>;
  ordinary: Store;
}) {
  let value: string | null;
  if (await ordinary.getItem(installationKey)) {
    value = await vault.getItem(sessionStorageKey);
  } else {
    value = (await ordinary.getItem(sessionStorageKey)) ?? signedOut;
    // Commit credentials before marking migration complete. A reinstall has no
    // marker or legacy session, so retained iOS Keychain data is overwritten.
    await vault.setItem(sessionStorageKey, value);
    await ordinary.setItem(installationKey, '1');
  }
  // A completed migration never falls back to an interrupted plaintext cleanup.
  await ordinary.removeItem(sessionStorageKey);
  return value;
}

export function readCredentials() {
  return isNative ? restoreNativeCredentials({vault: secure, ordinary: preferences}) : readStored(sessionStorageKey);
}

export function writeCredentials(value: string) {
  return isNative ? secure.setItem(sessionStorageKey, value) : writeStored(sessionStorageKey, value);
}
