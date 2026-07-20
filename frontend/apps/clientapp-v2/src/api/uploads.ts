import {clientApi} from '@/api/generated';

export type {
  Attachment,
  AttachmentDownload,
  AttachmentUpload,
  AttachmentUploadRequest,
  ChatMessageEmbed,
} from '@/api/generated';

export const {useCreateClientUploadMutation, useGetClientAttachmentDownloadUrlsMutation} = clientApi;
