/**
 * Attachment/media upload endpoints. No cache tags — uploads don't invalidate
 * any list or detail query on their own; the caller wires the returned id
 * into whatever it's attaching to (a chat message, a food/exercise media
 * field, ...).
 */

import {useMutation} from '@tanstack/react-query';

import {call, client} from '@/api/client';
import type {
  Attachment,
  LibraryMedia,
  LibraryMediaCreate,
  paths,
  Upload,
  UploadCreate,
  UploadDownload,
  UploadDownloadUrls,
} from '@/api/schema';

export type {
  Attachment,
  LibraryMedia,
  LibraryMediaCreate,
  Upload,
  UploadCreate,
  UploadDownload,
  UploadDownloadUrls,
} from '@/api/schema';
export type AttachmentUpload = Upload;
export type AttachmentUploadRequest = UploadCreate;
export type AttachmentUploadResponse =
  paths['/v1/coach/clients/{client_id}/uploads']['post']['responses'][201]['content']['application/json'];
export type AttachmentDownload = UploadDownload;
export type AttachmentDownloadRequest = UploadDownloadUrls;
export type AttachmentDownloadsResponse =
  paths['/v1/coach/attachments/download-urls']['post']['responses'][200]['content']['application/json'];
export type LibraryMediaUpload = LibraryMedia;
export type LibraryMediaUploadRequest = LibraryMediaCreate;
export type LibraryMediaUploadResponse =
  paths['/v1/coach/library-media/uploads']['post']['responses'][201]['content']['application/json'];

export function useGetCoachAttachmentDownloadUrlsMutation() {
  return useMutation({
    mutationFn: (body: AttachmentDownloadRequest) => call(client.POST('/v1/coach/attachments/download-urls', {body})),
  });
}

export function useCreateCoachClientUploadMutation() {
  return useMutation({
    mutationFn: ({body, clientId}: {body: AttachmentUploadRequest; clientId: string}) =>
      call(client.POST('/v1/coach/clients/{client_id}/uploads', {params: {path: {client_id: clientId}}, body})),
  });
}

export function useCreateCoachLibraryMediaUploadMutation() {
  return useMutation({
    mutationFn: (body: LibraryMediaCreate) => call(client.POST('/v1/coach/library-media/uploads', {body})),
  });
}
