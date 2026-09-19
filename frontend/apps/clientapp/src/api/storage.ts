import {Capacitor, registerPlugin} from '@capacitor/core';
import {Preferences} from '@capacitor/preferences';
import {clearAccountPhotos} from './photo-store';

export const isNative = Capacitor.isNativePlatform();
const nativeWrites =
  Capacitor.getPlatform() === 'android'
    ? registerPlugin<Pick<typeof Preferences, 'set' | 'remove'>>('DurableStorage')
    : Preferences;
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
    await enqueue(() => nativeWrites.set({key, value}));
  } else {
    localStorage.setItem(key, value);
  }
}

export async function removeStored(key: string) {
  if (isNative) {
    await enqueue(() => nativeWrites.remove({key}));
  } else {
    localStorage.removeItem(key);
  }
}

export async function clearPrivateStorage(owner: string) {
  await Promise.all([
    clearAccountPhotos(owner),
    enqueue(async () => {
      const keys = isNative ? (await Preferences.keys()).keys : Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith(`clientapp.private.${owner}.`)) {
          if (isNative) {
            await nativeWrites.remove({key});
          } else {
            localStorage.removeItem(key);
          }
        }
      }
    }),
  ]);
}
