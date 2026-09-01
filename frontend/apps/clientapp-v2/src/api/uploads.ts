import {useMutation} from '@tanstack/react-query';

import {call, client} from '@/api/client';
import type {UploadCreate, UploadDownload, UploadDownloadUrls} from '@/api/schema';

export type {
  Attachment,
  ChatMessageEmbed,
  Upload,
  UploadCreate,
  UploadDownload,
  UploadDownloadUrls,
} from '@/api/schema';

export type AttachmentDownload = UploadDownload;
type AttachmentDownloadRequest = UploadDownloadUrls;
export type AttachmentUploadRequest = UploadCreate;

/** Mints a presigned PUT for a new attachment. Nothing is cached — no invalidation. */
export function useCreateClientUploadMutation() {
  return useMutation({
    mutationFn: (body: AttachmentUploadRequest) => call(client.POST('/v1/client/uploads', {body})),
  });
}

/** Batch-mints presigned GETs. A mutation (not a query) because it POSTs a body of ids. */
export function useGetClientAttachmentDownloadUrlsMutation() {
  return useMutation({
    mutationFn: (body: AttachmentDownloadRequest) => call(client.POST('/v1/client/attachments/download-urls', {body})),
  });
}
