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
export function validateAttachment(blob: Blob) {
  switch (blob.type) {
    case 'image/jpeg':
    case 'image/png':
    case 'image/webp':
    case 'image/heic':
      return validatePhoto(blob);
    case 'application/pdf':
      if (blob.size > 0 && blob.size <= 15 * 1024 * 1024) {
        return blob.type;
      }
      throw new Error('Choose a PDF no larger than 15 MiB.');
    case 'video/mp4':
    case 'video/webm':
    case 'video/quicktime':
      if (blob.size > 0 && blob.size <= 50 * 1024 * 1024) {
        return blob.type;
      }
      throw new Error('Choose a video smaller than 50 MB.');
    case 'audio/webm':
    case 'audio/mp4':
    case 'audio/mpeg':
      if (blob.size > 0 && blob.size <= 10 * 1024 * 1024) {
        return blob.type;
      }
      throw new Error('Choose an audio file smaller than 10 MB.');
    default:
      throw new Error('Choose a supported photo, MP4, WebM, MOV, M4A or MP3 file.');
  }
}
const uploads = new Map<string, Promise<StoredPhoto>>();
export function uploadPhoto(photo: StoredPhoto, sessionId: string) {
  validatePhoto(photo.blob);
  return uploadAttachment(photo, sessionId);
}
export function uploadAttachment(photo: StoredPhoto, sessionId: string) {
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
  const content_type = validateAttachment(stored.blob);
  const ticket =
    stored.upload && Date.parse(stored.upload.upload_url_expires_at) > Date.now() + 15_000
      ? stored.upload
      : (
          await call(
            client.POST('/v1/client/uploads', {
              body: {
                content_type,
                byte_size: stored.blob.size,
                ...(stored.capturedOn ? {captured_on: stored.capturedOn} : {}),
              },
            }),
          )
        ).data;
  const uploading = {...stored, upload: ticket};
  await updatePhoto(uploading, isCurrent);
  let result: Response;
  try {
    result = await fetch(ticket.upload_url, {method: 'PUT', headers: ticket.upload_headers, body: stored.blob});
  } catch {
    throw new Error(
      'The attachment upload stopped. Your file is kept on this device. Try sending again when connected.',
    );
  }
  if (!result.ok) {
    const kind = content_type.startsWith('image/') ? 'photo' : 'attachment';
    throw new Error(`The ${kind} could not be uploaded. Try again when connected.`);
  }
  const uploaded = {...uploading, attachmentId: ticket.id};
  await updatePhoto(uploaded, isCurrent);
  return uploaded;
}
export function useAttachmentUrls(ids: string[], enabled = true) {
  return useQuery({
    queryKey: attachmentKeys.urls(ids),
    queryFn: ({signal}) =>
      call(
        client.GET('/v1/client/attachments/download-urls', {
          params: {query: {attachment_ids: ids}},
          querySerializer: () => new URLSearchParams(ids.map((id) => ['attachment_ids[]', id])).toString(),
          signal,
        }),
      ),
    enabled: enabled && ids.length > 0,
    staleTime: 60_000,
    gcTime: 300_000,
  });
}
