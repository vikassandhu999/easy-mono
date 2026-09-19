import type {Upload} from './schema';

export type PhotoUpload = Pick<Upload, 'id' | 'upload_url' | 'upload_url_expires_at' | 'upload_headers'>;
export type StoredPhoto = {
  id: string;
  owner: string;
  resource: string;
  blob: Blob;
  name: string;
  attachmentId?: string;
  questionShape?: string;
  upload?: PhotoUpload;
};
function isUpload(value: unknown): value is PhotoUpload {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'id' in value &&
      typeof value.id === 'string' &&
      'upload_url' in value &&
      typeof value.upload_url === 'string' &&
      'upload_url_expires_at' in value &&
      typeof value.upload_url_expires_at === 'string' &&
      'upload_headers' in value &&
      value.upload_headers &&
      typeof value.upload_headers === 'object' &&
      !Array.isArray(value.upload_headers) &&
      Object.values(value.upload_headers).every((header) => typeof header === 'string'),
  );
}
let opening: Promise<IDBDatabase> | undefined;
function open() {
  opening ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('clientapp.photos', 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore('photos', {keyPath: 'id'});
      store.createIndex('owner', 'owner');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).catch((error: unknown) => {
    opening = undefined;
    throw error;
  });
  return opening;
}
function isPhoto(value: unknown): value is StoredPhoto {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'id' in value &&
      typeof value.id === 'string' &&
      'owner' in value &&
      typeof value.owner === 'string' &&
      'resource' in value &&
      typeof value.resource === 'string' &&
      'blob' in value &&
      value.blob instanceof Blob &&
      'name' in value &&
      typeof value.name === 'string' &&
      (!('attachmentId' in value) || typeof value.attachmentId === 'string') &&
      (!('questionShape' in value) || typeof value.questionShape === 'string') &&
      (!('upload' in value) || isUpload(value.upload)),
  );
}
export async function updatePhoto(photo: StoredPhoto, isCurrent: () => boolean) {
  const db = await open();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('photos', 'readwrite');
    const store = tx.objectStore('photos');
    const request = store.get(photo.id);
    request.onsuccess = () => {
      if (!isCurrent() || !request.result) {
        tx.abort();
        return;
      }
      store.put(photo);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(new Error('This photo was removed or your account changed.'));
  });
}
export async function readPhotos(owner: string, resource: string) {
  const db = await open();
  return new Promise<StoredPhoto[]>((resolve, reject) => {
    const request = db.transaction('photos').objectStore('photos').index('owner').getAll(owner);
    request.onsuccess = () => {
      const rows: unknown = request.result;
      resolve(Array.isArray(rows) ? rows.filter(isPhoto).filter((row) => row.resource === resource) : []);
    };
    request.onerror = () => reject(request.error);
  });
}
export async function savePhoto(photo: StoredPhoto, isCurrent: () => boolean) {
  const db = await open();
  if (!isCurrent()) {
    throw new Error('Your account changed.');
  }
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('photos', 'readwrite');
    tx.objectStore('photos').put(photo);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
export async function removePhoto(id: string) {
  const db = await open();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('photos', 'readwrite');
    tx.objectStore('photos').delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
export async function clearAccountPhotos(owner: string) {
  const db = await open();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('photos', 'readwrite');
    const request = tx.objectStore('photos').index('owner').openKeyCursor(owner);
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        tx.objectStore('photos').delete(cursor.primaryKey);
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function clearFormPhotos(owner: string, prefix: string) {
  const db = await open();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('photos', 'readwrite');
    const request = tx.objectStore('photos').index('owner').openCursor(owner);
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        const value: unknown = cursor.value;
        if (isPhoto(value) && value.resource.startsWith(prefix)) {
          cursor.delete();
        }
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
