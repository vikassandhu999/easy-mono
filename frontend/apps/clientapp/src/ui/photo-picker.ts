import {type RestoredListenerEvent} from '@capacitor/app';
import {Camera, CameraErrorCode, CameraResultType, CameraSource, MediaTypeSelection} from '@capacitor/camera';
import {Capacitor, registerPlugin} from '@capacitor/core';
import {validatePhoto} from '../api/attachments';
import {readDraft, removeDraft, writeDraft} from '../api/drafts';
import {type StoredPhoto, savePhoto} from '../api/photo-store';
import {getSession} from '../api/session';

const intentKey = 'photo-picker';
const photoLibrary = registerPlugin<{pick: () => Promise<{path: string}>}>('PhotoLibrary');
type PhotoIntent = {id: string; resource: string; returnPath: string; questionShape: string};
function readIntent(value: unknown): PhotoIntent | null {
  return value &&
    typeof value === 'object' &&
    'id' in value &&
    typeof value.id === 'string' &&
    'questionShape' in value &&
    typeof value.questionShape === 'string' &&
    'resource' in value &&
    typeof value.resource === 'string' &&
    'returnPath' in value &&
    typeof value.returnPath === 'string' &&
    value.returnPath.startsWith('/') &&
    !value.returnPath.startsWith('//')
    ? {id: value.id, resource: value.resource, returnPath: value.returnPath, questionShape: value.questionShape}
    : null;
}
function photoError(error: unknown) {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
  const message = error && typeof error === 'object' && 'message' in error ? error.message : undefined;
  if (
    code === 'cancelled' ||
    code === CameraErrorCode.TakePhotoCancelled ||
    code === CameraErrorCode.ChooseMediaCancelled ||
    message === 'User cancelled photos app'
  ) {
    return null;
  }
  if (code === CameraErrorCode.NoCameraAvailable) {
    return 'A camera is not available on this device. Choose a photo from your library.';
  }
  return code === CameraErrorCode.CameraPermissionDenied || code === CameraErrorCode.GalleryPermissionDenied
    ? 'Photo access is off. Enable it for Easy in your device settings, then try again. You can keep answering the form.'
    : 'The photo could not be opened. Try choosing a photo from your library.';
}
async function keepPhoto(data: unknown, intent: PhotoIntent, session: NonNullable<ReturnType<typeof getSession>>) {
  if (!session.accountId || !data || typeof data !== 'object') {
    throw new Error('The device did not return a photo.');
  }
  const path =
    'webPath' in data && typeof data.webPath === 'string'
      ? data.webPath
      : 'path' in data && typeof data.path === 'string'
        ? Capacitor.convertFileSrc(data.path)
        : null;
  if (!path) {
    throw new Error('The device did not return a photo.');
  }
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error('The selected photo could not be opened.');
  }
  const source = await response.blob();
  validatePhoto(source);
  // A file-backed iOS photo can lose its library access before IndexedDB copies it.
  // Own the bytes before persisting the selection or leaving the native picker flow.
  const blob = new Blob([await source.arrayBuffer()], {type: source.type});
  const photo: StoredPhoto = {
    id: intent.id,
    owner: session.accountId,
    resource: intent.resource,
    blob,
    name: 'Progress photo',
    questionShape: intent.questionShape,
  };
  await savePhoto(photo, () => getSession()?.id === session.id);
  await removeDraft(session.id, intentKey);
  return photo;
}
function firstResult(data: unknown): unknown {
  return data && typeof data === 'object' && 'results' in data && Array.isArray(data.results) ? data.results[0] : data;
}
function capturePhoto() {
  if (Capacitor.getPlatform() === 'android') {
    // Camera 8.2.4 saves the capture file and plugin callback only for getPhoto.
    // Keep this path until takePhoto passes the Android process-recovery scenario.
    return Camera.getPhoto({
      source: CameraSource.Camera,
      resultType: CameraResultType.Uri,
      quality: 85,
      saveToGallery: false,
    });
  }
  return Camera.takePhoto({quality: 85, saveToGallery: false});
}
export async function pickNativePhoto(source: 'camera' | 'gallery', resource: string, questionShape: string) {
  const session = getSession();
  if (!session?.accountId) {
    throw new Error('Please sign in again before choosing a photo.');
  }
  const intent = {
    id: crypto.randomUUID(),
    resource,
    questionShape,
    returnPath: window.location.pathname + window.location.search,
  };
  await writeDraft(session.id, intentKey, intent);
  let data: unknown;
  try {
    data =
      source === 'camera'
        ? await capturePhoto()
        : Capacitor.getPlatform() === 'android'
          ? await photoLibrary.pick()
          : await Camera.chooseFromGallery({
              mediaType: MediaTypeSelection.Photo,
              allowMultipleSelection: false,
              quality: 85,
            });
  } catch (error) {
    await removeDraft(session.id, intentKey);
    const message = photoError(error);
    if (message) {
      throw new Error(message);
    }
    return null;
  }
  try {
    return await keepPhoto(firstResult(data), intent, session);
  } catch (error) {
    await removeDraft(session.id, intentKey);
    throw error;
  }
}
export async function restoreNativePhoto(event: RestoredListenerEvent) {
  if (
    !(event.pluginId === 'PhotoLibrary' && event.methodName === 'pick') &&
    !(event.pluginId === 'Camera' && ['getPhoto', 'takePhoto', 'chooseFromGallery'].includes(event.methodName))
  ) {
    return null;
  }
  const session = getSession();
  if (!session?.accountId) {
    return null;
  }
  const intent = readIntent(await readDraft(session.id, intentKey));
  if (!intent) {
    return null;
  }
  try {
    if (!event.success) {
      throw new Error('The photo picker was interrupted.');
    }
    await keepPhoto(firstResult(event.data), intent, session);
  } catch {
    await writeDraft(
      session.id,
      `${intent.resource}.picker-error`,
      'Your photo could not be recovered after the app restarted. Please choose it again. Your answers are still here.',
    );
    await removeDraft(session.id, intentKey);
  }
  return getSession()?.id === session.id ? intent.returnPath : null;
}
