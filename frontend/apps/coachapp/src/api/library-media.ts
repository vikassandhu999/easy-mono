import {useMutation} from '@tanstack/react-query';
import {call, client} from './client';
import type {LibraryMediaCreate} from './schema';
import {getSession} from './session';

function contentType(type: string): LibraryMediaCreate['content_type'] | null {
  switch (type) {
    case 'image/jpeg':
    case 'image/png':
    case 'image/webp':
    case 'video/mp4':
    case 'video/webm':
      return type;
    default:
      return null;
  }
}

export function mediaFileError(file: File) {
  const type = contentType(file.type);
  if (!type) {
    return 'Choose a JPG, PNG or WebP photo, or an MP4 or WebM video.';
  }
  const maxMiB = type.startsWith('image/') ? 15 : 50;
  if (file.size === 0 || file.size > maxMiB * 1024 * 1024) {
    return `Choose a file between 1 byte and ${maxMiB} MB.`;
  }
  return null;
}

export function useUploadLibraryMedia() {
  return useMutation({
    mutationFn: async ({file, signal}: {file: File; signal: AbortSignal}) => {
      const sessionId = getSession()?.id;
      const type = contentType(file.type);
      if (!sessionId || !type || mediaFileError(file)) {
        throw new Error('Choose a supported demonstration file.');
      }
      const {data} = await call(
        client.POST('/v1/coach/library-media/uploads', {
          body: {content_type: type, byte_size: file.size},
          signal,
        }),
      );
      signal.throwIfAborted();
      if (getSession()?.id !== sessionId) {
        throw new Error('Your session changed.');
      }
      const response = await fetch(data.upload_url, {
        method: 'PUT',
        headers: data.upload_headers,
        body: file,
        signal,
      });
      if (!response.ok) {
        throw new Error('Could not upload the demonstration.');
      }
      signal.throwIfAborted();
      if (getSession()?.id !== sessionId) {
        throw new Error('Your session changed.');
      }
      // Uploading prepares an unattached asset. Saving the exercise owns invalidation.
      return {id: data.id, kind: data.kind, url: data.url, content_type: data.content_type, byte_size: data.byte_size};
    },
  });
}
