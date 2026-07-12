import {clientApi} from '@/api/generated';

export type {
  AttachmentDownload,
  AttachmentUpload,
  AttachmentUploadRequest,
  ChatAttachment,
  ChatMessageEmbed,
} from '@/api/generated';

export const {useCreateClientUploadMutation, useGetClientAttachmentDownloadUrlsMutation} = clientApi;
