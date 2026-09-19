import {type RestoredListenerEvent} from '@capacitor/app';
import {Camera, CameraErrorCode, MediaTypeSelection} from '@capacitor/camera';
import {validatePhoto} from '../api/attachments';
import {readDraft, removeDraft, writeDraft} from '../api/drafts';
import {type StoredPhoto, savePhoto} from '../api/photo-store';
import {getSession} from '../api/session';

const intentKey = 'photo-picker';
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
  if (code === CameraErrorCode.TakePhotoCancelled || code === CameraErrorCode.ChooseMediaCancelled) {
    return null;
  }
  return code === CameraErrorCode.CameraPermissionDenied || code === CameraErrorCode.GalleryPermissionDenied
    ? 'Photo access is off. Enable it for Easy in your device settings, then try again. You can keep answering the form.'
    : 'The photo could not be opened. Try choosing a photo from your library.';
}
async function keepPhoto(data: unknown, intent: PhotoIntent, session: NonNullable<ReturnType<typeof getSession>>) {
  if (
    !session.accountId ||
    !data ||
    typeof data !== 'object' ||
    !('webPath' in data) ||
    typeof data.webPath !== 'string'
  ) {
    throw new Error('The device did not return a photo.');
  }
  const response = await fetch(data.webPath);
  if (!response.ok) {
    throw new Error('The selected photo could not be opened.');
  }
  const blob = await response.blob();
  validatePhoto(blob);
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
  try {
    const data =
      source === 'camera'
        ? await Camera.takePhoto({quality: 85, saveToGallery: false})
        : await Camera.chooseFromGallery({
            mediaType: MediaTypeSelection.Photo,
            allowMultipleSelection: false,
            quality: 85,
          });
    return await keepPhoto(firstResult(data), intent, session);
  } catch (error) {
    await removeDraft(session.id, intentKey);
    const message = photoError(error);
    if (message) {
      throw new Error(message);
    }
    return null;
  }
}
export async function restoreNativePhoto(event: RestoredListenerEvent) {
  if (event.pluginId !== 'Camera' || !['takePhoto', 'chooseFromGallery'].includes(event.methodName)) {
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
