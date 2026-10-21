import {useMutation} from '@tanstack/react-query';
import {call, client} from './client';
import type {LibraryMedia, LibraryMediaCreate} from './schema';
import {getSession} from './session';

export type UploadedLibraryMedia = Pick<LibraryMedia, 'id' | 'kind' | 'url' | 'content_type' | 'byte_size'>;

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

function uploadFile(
  url: string,
  headers: Record<string, string>,
  file: File,
  signal: AbortSignal,
  onProgress?: (percent: number) => void,
) {
  signal.throwIfAborted();
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    const finish = (error?: Error) => {
      signal.removeEventListener('abort', abort);
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    };
    xhr.open('PUT', url);
    for (const [key, value] of Object.entries(headers)) {
      xhr.setRequestHeader(key, value);
    }
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () =>
      finish(xhr.status >= 200 && xhr.status < 300 ? undefined : new Error('Could not upload the file.'));
    xhr.onerror = () => finish(new Error('Could not upload the file. Check your connection and try again.'));
    xhr.onabort = () => finish(new DOMException('Upload cancelled.', 'AbortError'));
    signal.addEventListener('abort', abort, {once: true});
    xhr.send(file);
  });
}

export function useUploadLibraryMedia() {
  return useMutation({
    networkMode: 'always',
    mutationFn: async ({
      file,
      signal,
      onProgress,
    }: {
      file: File;
      signal: AbortSignal;
      onProgress?: (percent: number) => void;
    }) => {
      const sessionId = getSession()?.id;
      const type = contentType(file.type);
      const problem = mediaFileError(file);
      if (problem) {
        throw new Error(problem);
      }
      if (!sessionId || !type) {
        throw new Error('Your session changed.');
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
      await uploadFile(data.upload_url, data.upload_headers, file, signal, onProgress);
      signal.throwIfAborted();
      if (getSession()?.id !== sessionId) {
        throw new Error('Your session changed.');
      }
      // Uploading prepares an unattached asset. Saving its library item owns invalidation.
      return {id: data.id, kind: data.kind, url: data.url, content_type: data.content_type, byte_size: data.byte_size};
    },
  });
}
