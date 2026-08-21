/**
 * Attachment/media upload endpoints. No cache tags — uploads don't invalidate
 * any list or detail query on their own; the caller wires the returned id
 * into whatever it's attaching to (a chat message, a food/exercise media
 * field, ...).
 */

import {useMutation} from '@tanstack/react-query';

import {call, client} from '@/api/client';
import type {components} from '@/api/schema';

export type Attachment = components['schemas']['Attachment'];
export type AttachmentUpload = components['schemas']['AttachmentUpload'];
export type AttachmentUploadRequest = components['schemas']['AttachmentUploadRequest'];
export type AttachmentUploadResponse = components['schemas']['AttachmentUploadResponse'];
export type AttachmentDownload = components['schemas']['AttachmentDownload'];
export type AttachmentDownloadRequest = components['schemas']['AttachmentDownloadRequest'];
export type AttachmentDownloadsResponse = components['schemas']['AttachmentDownloadsResponse'];
export type LibraryMediaUpload = components['schemas']['LibraryMediaUpload'];
export type LibraryMediaUploadRequest = components['schemas']['LibraryMediaUploadRequest'];
export type LibraryMediaUploadResponse = components['schemas']['LibraryMediaUploadResponse'];

export function useGetCoachAttachmentDownloadUrlsMutation() {
  return useMutation({
    mutationFn: (body: AttachmentDownloadRequest) =>
      call(client.POST('/v1/coach/attachments/download-urls', {body})),
  });
}

export function useCreateCoachClientUploadMutation() {
  return useMutation({
    mutationFn: ({body, clientId}: {body: AttachmentUploadRequest; clientId: string}) =>
      call(
        client.POST('/v1/coach/clients/{client_id}/uploads', {params: {path: {client_id: clientId}}, body}),
      ),
  });
}

export function useCreateCoachLibraryMediaUploadMutation() {
  return useMutation({
    mutationFn: (body: LibraryMediaUploadRequest) =>
      call(client.POST('/v1/coach/library-media/uploads', {body})),
  });
}
