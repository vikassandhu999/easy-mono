import {AUDIO_CONTENT_TYPES, IMAGE_CONTENT_TYPES, VIDEO_CONTENT_TYPES} from '@easy/utils';

import type {AttachmentUploadRequest} from '@/api/generated';

export const MAX_ATTACHMENTS = 4;
export const MAX_RECORDING_MS = 300_000;
export const ACCEPTED_TYPES = [...IMAGE_CONTENT_TYPES, ...VIDEO_CONTENT_TYPES, ...AUDIO_CONTENT_TYPES];

export const MAX_BYTES: Record<AttachmentUploadRequest['content_type'], number> = {
  'audio/mp4': 10 * 1024 * 1024,
  'audio/mpeg': 10 * 1024 * 1024,
  'audio/webm': 10 * 1024 * 1024,
  'image/heic': 15 * 1024 * 1024,
  'image/jpeg': 15 * 1024 * 1024,
  'image/png': 15 * 1024 * 1024,
  'image/webp': 15 * 1024 * 1024,
  'video/mp4': 50 * 1024 * 1024,
  'video/quicktime': 50 * 1024 * 1024,
  'video/webm': 50 * 1024 * 1024,
};

export type UploadItem = {
  attachmentId?: string;
  durationMs?: number;
  errorMessage?: string;
  file: File;
  localId: string;
  previewUrl: string;
  progress: number;
  status: 'error' | 'uploaded' | 'uploading';
};

export function isAcceptedAttachmentType(type: string): type is AttachmentUploadRequest['content_type'] {
  return (ACCEPTED_TYPES as readonly string[]).includes(type);
}

export function validateAttachmentFiles(files: File[], available: number): string | undefined {
  if (files.length > available) {
    return `You can add up to ${MAX_ATTACHMENTS} attachments.`;
  }
  if (files.some((file) => !isAcceptedAttachmentType(file.type))) {
    return 'Choose a JPEG, PNG, WebP, HEIC, MP4, WebM, QuickTime, or supported audio file.';
  }
  if (
    files.some((file) => !isAcceptedAttachmentType(file.type) || file.size <= 0 || file.size > MAX_BYTES[file.type])
  ) {
    return 'Images can be 15 MB, videos 50 MB, and audio 10 MB at most.';
  }
  return undefined;
}
