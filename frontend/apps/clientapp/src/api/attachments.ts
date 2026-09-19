import {useQuery} from '@tanstack/react-query';
import {call, client} from './client';
import {attachmentKeys} from './keys';
import {readPhotos, type StoredPhoto, updatePhoto} from './photo-store';
import {getSession} from './session';

export function photoType(type: string) {
  switch (type) {
    case 'image/jpeg':
    case 'image/png':
    case 'image/webp':
    case 'image/heic':
      return type;
    default:
      throw new Error('Choose a JPEG, PNG, WebP or HEIC photo.');
  }
}
export function validatePhoto(blob: Blob) {
  const type = photoType(blob.type);
  if (blob.size === 0 || blob.size > 15 * 1024 * 1024) {
    throw new Error('Choose a photo smaller than 15 MB.');
  }
  return type;
}
const uploads = new Map<string, Promise<StoredPhoto>>();
export function uploadPhoto(photo: StoredPhoto, sessionId: string) {
  const key = `${sessionId}:${photo.id}`;
  const running = uploads.get(key);
  if (running) {
    return running;
  }
  const pending = uploadStoredPhoto(photo, sessionId).finally(() => uploads.delete(key));
  uploads.set(key, pending);
  return pending;
}
async function uploadStoredPhoto(photo: StoredPhoto, sessionId: string) {
  const isCurrent = () => getSession()?.id === sessionId;
  if (!isCurrent()) {
    throw new Error('Your account changed.');
  }
  const stored = (await readPhotos(photo.owner, photo.resource)).find((row) => row.id === photo.id);
  if (!isCurrent()) {
    throw new Error('Your account changed.');
  }
  if (!stored) {
    throw new Error('This photo was removed.');
  }
  if (stored.attachmentId) {
    return stored;
  }
  const content_type = validatePhoto(stored.blob);
  const ticket =
    stored.upload && Date.parse(stored.upload.upload_url_expires_at) > Date.now() + 15_000
      ? stored.upload
      : (await call(client.POST('/v1/client/uploads', {body: {content_type, byte_size: stored.blob.size}}))).data;
  const uploading = {...stored, ...(photo.questionShape ? {questionShape: photo.questionShape} : {}), upload: ticket};
  await updatePhoto(uploading, isCurrent);
  const result = await fetch(ticket.upload_url, {method: 'PUT', headers: ticket.upload_headers, body: stored.blob});
  if (!result.ok) {
    throw new Error('The photo could not be uploaded. Try again when connected.');
  }
  const uploaded = {...uploading, attachmentId: ticket.id};
  await updatePhoto(uploaded, isCurrent);
  return uploaded;
}
export function useAttachmentUrls(ids: string[]) {
  return useQuery({
    queryKey: attachmentKeys.urls(ids),
    queryFn: ({signal}) =>
      call(client.POST('/v1/client/attachments/download-urls', {body: {attachment_ids: ids}, signal})),
    enabled: ids.length > 0,
    staleTime: 60_000,
    gcTime: 300_000,
  });
}
