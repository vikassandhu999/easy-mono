import {Capacitor} from '@capacitor/core';
import {Preferences} from '@capacitor/preferences';

export const isNative = Capacitor.isNativePlatform();
let writes: Promise<void> = Promise.resolve();

function enqueue(write: () => Promise<void>) {
  const result = writes.catch(() => undefined).then(write);
  writes = result;
  return result;
}

export async function readStored(key: string) {
  await writes.catch(() => undefined);
  return isNative ? (await Preferences.get({key})).value : localStorage.getItem(key);
}

export async function writeStored(key: string, value: string) {
  if (isNative) {
    await enqueue(() => Preferences.set({key, value}));
  } else {
    localStorage.setItem(key, value);
  }
}

export async function removeStored(key: string) {
  if (isNative) {
    await enqueue(() => Preferences.remove({key}));
  } else {
    localStorage.removeItem(key);
  }
}

export async function clearPrivateStorage(owner: string) {
  await enqueue(async () => {
    const keys = isNative ? (await Preferences.keys()).keys : Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith(`clientapp.private.${owner}.`)) {
        if (isNative) {
          await Preferences.remove({key});
        } else {
          localStorage.removeItem(key);
        }
      }
    }
  });
}
