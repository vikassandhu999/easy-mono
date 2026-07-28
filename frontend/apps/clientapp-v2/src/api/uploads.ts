import {useMutation} from '@tanstack/react-query';

import {call, client} from '@/api/client';
import type {components} from '@/api/schema';

export type Attachment = components['schemas']['Attachment'];
export type AttachmentDownload = components['schemas']['AttachmentDownload'];
export type AttachmentDownloadRequest = components['schemas']['AttachmentDownloadRequest'];
export type AttachmentUpload = components['schemas']['AttachmentUpload'];
export type AttachmentUploadRequest = components['schemas']['AttachmentUploadRequest'];
export type ChatMessageEmbed = components['schemas']['ChatMessageEmbed'];

type UploadResponse = components['schemas']['AttachmentUploadResponse'];
type DownloadsResponse = components['schemas']['AttachmentDownloadsResponse'];

/** Mints a presigned PUT for a new attachment. Nothing is cached — no invalidation. */
export function useCreateClientUploadMutation() {
  return useMutation({
    mutationFn: (body: AttachmentUploadRequest) =>
      call(client.POST('/v1/client/uploads', {body})) as Promise<UploadResponse>,
  });
}

/** Batch-mints presigned GETs. A mutation (not a query) because it POSTs a body of ids. */
export function useGetClientAttachmentDownloadUrlsMutation() {
  return useMutation({
    mutationFn: (body: AttachmentDownloadRequest) =>
      call(client.POST('/v1/client/attachments/download-urls', {body})) as Promise<DownloadsResponse>,
  });
}
