import {useMutation} from '@tanstack/react-query';
import {call, client} from './client';
import type {UploadCreate} from './schema';
import {getSession} from './session';

export function uploadContentType(type: string): UploadCreate['content_type'] | null {
  switch (type) {
    case 'image/jpeg':
    case 'image/png':
    case 'image/webp':
    case 'image/heic':
    case 'video/mp4':
    case 'video/webm':
    case 'video/quicktime':
    case 'audio/webm':
    case 'audio/mp4':
    case 'audio/mpeg':
      return type;
    default:
      return null;
  }
}

export function useUploadChatAttachment(clientId: string) {
  return useMutation({
    mutationFn: async (file: File) => {
      const sessionId = getSession()?.id;
      const contentType = uploadContentType(file.type);
      if (!sessionId || !contentType) {
        throw new Error('Choose a supported photo, video or audio file.');
      }
      const upload = await call(
        client.POST('/v1/coach/clients/{client_id}/uploads', {
          params: {path: {client_id: clientId}},
          body: {content_type: contentType, byte_size: file.size},
        }),
      );
      if (getSession()?.id !== sessionId) {
        throw new Error('Your session changed.');
      }
      const result = await fetch(upload.data.upload_url, {
        method: 'PUT',
        headers: upload.data.upload_headers,
        body: file,
      });
      if (!result.ok) {
        throw new Error('Upload failed. Please try again.');
      }
      if (getSession()?.id !== sessionId) {
        throw new Error('Your session changed.');
      }
      return upload.data;
    },
  });
}
