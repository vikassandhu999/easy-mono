import {
  AUDIO_CONTENT_TYPES,
  IMAGE_CONTENT_TYPES,
  mediaKind,
  putFileToSignedUrl,
  startVoiceRecording,
  VIDEO_CONTENT_TYPES,
} from '@easy/utils';
import {Button, ProgressBar} from '@heroui/react';
import {Camera, ImagePlus, Mic, RotateCcw, Square, Trash2, X} from 'lucide-react';
import {type ChangeEvent, useEffect, useId, useRef, useState} from 'react';

import {type AttachmentUploadRequest, useCreateCoachClientUploadMutation} from '@/api/attachments';
import {getApiErrorMessage} from '@/api/shared';

const MAX_ATTACHMENTS = 4;
const MAX_RECORDING_MS = 300_000;
const ACCEPTED_TYPES = [...IMAGE_CONTENT_TYPES, ...VIDEO_CONTENT_TYPES, ...AUDIO_CONTENT_TYPES];
const MAX_BYTES: Record<AttachmentUploadRequest['content_type'], number> = {
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

type UploadItem = {
  attachmentId?: string;
  durationMs?: number;
  errorMessage?: string;
  file: File;
  localId: string;
  previewUrl: string;
  progress: number;
  status: 'error' | 'uploaded' | 'uploading';
};

type AttachmentComposerProps = {
  clientId: string;
  disabled: boolean;
  onChange: (state: {attachmentIds: string[]; busy: boolean; failed: boolean}) => void;
};

function isAcceptedType(type: string): type is AttachmentUploadRequest['content_type'] {
  return (ACCEPTED_TYPES as readonly string[]).includes(type);
}

function validateFiles(files: File[], available: number): string | undefined {
  if (files.length > available) {
    return `You can add up to ${MAX_ATTACHMENTS} attachments.`;
  }
  if (files.some((file) => !isAcceptedType(file.type))) {
    return 'Choose a JPEG, PNG, WebP, HEIC, MP4, WebM, QuickTime, or supported audio file.';
  }
  if (files.some((file) => !isAcceptedType(file.type) || file.size <= 0 || file.size > MAX_BYTES[file.type])) {
    return 'Images can be 15 MB, videos 50 MB, and audio 10 MB at most.';
  }
  return undefined;
}

export default function AttachmentComposer({clientId, disabled, onChange}: AttachmentComposerProps) {
  const inputId = useId();
  const [createUpload] = useCreateCoachClientUploadMutation();
  const [items, setItems] = useState<UploadItem[]>([]);
  const [fieldError, setFieldError] = useState<string>();
  const [recordingMs, setRecordingMs] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const disposedRef = useRef(false);
  const itemsRef = useRef(items);
  const recordingAttemptRef = useRef(0);
  const recordingRef = useRef<Awaited<ReturnType<typeof startVoiceRecording>> | undefined>(undefined);
  const recordingStartedAtRef = useRef(0);
  const startingRef = useRef(false);

  itemsRef.current = items;

  useEffect(() => {
    onChange({
      attachmentIds: items.flatMap((item) => (item.attachmentId ? [item.attachmentId] : [])),
      busy: isRecording || isStarting || items.some((item) => item.status === 'uploading'),
      failed: items.some((item) => item.status === 'error'),
    });
  }, [isRecording, isStarting, items, onChange]);

  useEffect(() => {
    disposedRef.current = false;
    return () => {
      disposedRef.current = true;
      recordingAttemptRef.current += 1;
      startingRef.current = false;
      recordingRef.current?.cancel();
      for (const item of itemsRef.current) {
        URL.revokeObjectURL(item.previewUrl);
      }
    };
  }, []);

  useEffect(() => {
    if (!isRecording) {
      return;
    }
    const timer = window.setInterval(() => {
      const elapsed = Math.min(MAX_RECORDING_MS, Date.now() - recordingStartedAtRef.current);
      setRecordingMs(elapsed);
      if (elapsed >= MAX_RECORDING_MS) {
        stopRecording().catch(() => undefined);
      }
    }, 250);
    return () => window.clearInterval(timer);
  });

  const updateItem = (localId: string, patch: Partial<UploadItem>) => {
    if (disposedRef.current) {
      return;
    }
    setItems((current) => current.map((item) => (item.localId === localId ? {...item, ...patch} : item)));
  };

  const uploadFile = async (file: File, durationMs?: number, existingLocalId?: string) => {
    const localId = existingLocalId ?? crypto.randomUUID();
    if (!existingLocalId) {
      setItems((current) => [
        ...current,
        {
          durationMs,
          file,
          localId,
          previewUrl: URL.createObjectURL(file),
          progress: 0,
          status: 'uploading',
        },
      ]);
    } else {
      updateItem(localId, {errorMessage: undefined, progress: 0, status: 'uploading'});
    }

    if (!isAcceptedType(file.type)) {
      updateItem(localId, {errorMessage: 'This file type is not supported.', status: 'error'});
      return;
    }

    let response;
    try {
      response = await createUpload({
        clientId,
        attachmentUploadRequest: {
          byte_size: file.size,
          content_type: file.type,
          ...(durationMs && {duration_ms: durationMs}),
        },
      }).unwrap();
    } catch (error) {
      updateItem(localId, {
        errorMessage: getApiErrorMessage(error, "Couldn't prepare this upload. Try again."),
        status: 'error',
      });
      return;
    }

    try {
      await putFileToSignedUrl(response.data.upload_url, file, response.data.upload_headers, (progress) =>
        updateItem(localId, {progress}),
      );
      updateItem(localId, {attachmentId: response.data.id, progress: 100, status: 'uploaded'});
    } catch {
      updateItem(localId, {
        errorMessage: "Couldn't send this file to storage. Check your connection and try again.",
        status: 'error',
      });
    }
  };

  const chooseFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];
    event.target.value = '';
    setFieldError(undefined);
    if (disabled) {
      return;
    }
    const error = validateFiles(files, MAX_ATTACHMENTS - items.length);
    if (error) {
      setFieldError(error);
      return;
    }
    for (const file of files) {
      uploadFile(file);
    }
  };

  const startRecording = async () => {
    if (disabled || isRecording || startingRef.current) {
      return;
    }
    startingRef.current = true;
    const attempt = recordingAttemptRef.current + 1;
    recordingAttemptRef.current = attempt;
    setIsStarting(true);
    setFieldError(undefined);
    try {
      const recording = await startVoiceRecording();
      if (disposedRef.current || recordingAttemptRef.current !== attempt) {
        recording.cancel();
        return;
      }
      recordingRef.current = recording;
      recordingStartedAtRef.current = Date.now();
      setRecordingMs(0);
      setIsRecording(true);
    } catch {
      if (!disposedRef.current && recordingAttemptRef.current === attempt) {
        setFieldError("Voice recording isn't available. Check microphone permission and try again.");
      }
    } finally {
      if (!disposedRef.current && recordingAttemptRef.current === attempt) {
        startingRef.current = false;
        setIsStarting(false);
      }
    }
  };

  async function stopRecording() {
    const recording = recordingRef.current;
    if (!recording) {
      return;
    }
    const attempt = recordingAttemptRef.current;
    recordingRef.current = undefined;
    const durationMs = Math.max(1, Math.min(MAX_RECORDING_MS, Date.now() - recordingStartedAtRef.current));
    setIsRecording(false);
    setRecordingMs(0);
    try {
      const file = await recording.stop();
      if (disposedRef.current || recordingAttemptRef.current !== attempt) {
        return;
      }
      if (file.size > MAX_BYTES[file.type as AttachmentUploadRequest['content_type']]) {
        setFieldError('Voice recordings can be 10 MB at most.');
        return;
      }
      await uploadFile(file, durationMs);
    } catch {
      if (!disposedRef.current && recordingAttemptRef.current === attempt) {
        setFieldError("Couldn't finish the recording. Try again.");
      }
    }
  }

  const cancelRecording = () => {
    recordingAttemptRef.current += 1;
    recordingRef.current?.cancel();
    recordingRef.current = undefined;
    setIsRecording(false);
    setRecordingMs(0);
  };

  const removeItem = (item: UploadItem) => {
    if (item.status === 'uploading') {
      return;
    }
    URL.revokeObjectURL(item.previewUrl);
    setItems((current) => current.filter((candidate) => candidate.localId !== item.localId));
    setFieldError(undefined);
  };

  const controlsDisabled = disabled || isRecording || isStarting || items.length >= MAX_ATTACHMENTS;

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap gap-2">
        <Button
          aria-label="Take a photo or video"
          className="min-h-11 min-w-11"
          isDisabled={controlsDisabled}
          isIconOnly
          onPress={() => document.getElementById(`${inputId}-camera`)?.click()}
          variant="secondary"
        >
          <Camera size={18} />
        </Button>
        <Button
          aria-label="Choose media"
          className="min-h-11 min-w-11"
          isDisabled={controlsDisabled}
          isIconOnly
          onPress={() => document.getElementById(`${inputId}-library`)?.click()}
          variant="secondary"
        >
          <ImagePlus size={18} />
        </Button>
        {isRecording ? (
          <>
            <Button
              className="min-h-11"
              onPress={stopRecording}
              variant="secondary"
            >
              <Square size={16} /> Stop {Math.floor(recordingMs / 60_000)}:
              {String(Math.floor((recordingMs % 60_000) / 1000)).padStart(2, '0')}
            </Button>
            <Button
              aria-label="Cancel recording"
              className="min-h-11 min-w-11"
              isIconOnly
              onPress={cancelRecording}
              variant="secondary"
            >
              <X size={18} />
            </Button>
          </>
        ) : (
          <Button
            aria-label="Record voice note"
            className="min-h-11 min-w-11"
            isDisabled={controlsDisabled}
            isIconOnly
            isPending={isStarting}
            onPress={startRecording}
            variant="secondary"
          >
            <Mic size={18} />
          </Button>
        )}
        <input
          accept={[...IMAGE_CONTENT_TYPES, ...VIDEO_CONTENT_TYPES].join(',')}
          capture="environment"
          className="sr-only"
          disabled={controlsDisabled}
          id={`${inputId}-camera`}
          onChange={chooseFiles}
          type="file"
        />
        <input
          accept={ACCEPTED_TYPES.join(',')}
          className="sr-only"
          disabled={controlsDisabled}
          id={`${inputId}-library`}
          multiple
          onChange={chooseFiles}
          type="file"
        />
      </div>

      {items.length > 0 ? (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {items.map((item) => {
            const kind = mediaKind(item.file.type);
            return (
              <div
                className="w-28 shrink-0 overflow-hidden rounded-xl border border-border bg-surface"
                key={item.localId}
              >
                <div className="relative grid aspect-square place-items-center overflow-hidden bg-surface-secondary">
                  {kind === 'image' ? (
                    <img
                      alt={item.file.name}
                      className="size-full object-cover"
                      src={item.previewUrl}
                    />
                  ) : kind === 'video' ? (
                    <video
                      className="size-full object-cover"
                      muted
                      src={item.previewUrl}
                    />
                  ) : (
                    // biome-ignore lint/a11y/useMediaCaption: local voice-note preview has no caption track
                    <audio
                      className="w-full px-2"
                      controls
                      src={item.previewUrl}
                    />
                  )}
                  {item.status !== 'uploading' ? (
                    <Button
                      aria-label={`Remove ${item.file.name}`}
                      className="absolute right-1 top-1 min-h-11 min-w-11 bg-surface/90 p-0"
                      isDisabled={disabled}
                      isIconOnly
                      onPress={() => removeItem(item)}
                      size="sm"
                      variant="secondary"
                    >
                      <Trash2 size={15} />
                    </Button>
                  ) : null}
                </div>
                <div className="p-2">
                  {item.status === 'uploading' ? (
                    <ProgressBar
                      aria-label={`Uploading ${item.file.name}`}
                      value={item.progress}
                    />
                  ) : item.status === 'error' ? (
                    <div className="grid gap-2">
                      <p className="text-danger-soft-foreground text-xs">{item.errorMessage ?? 'Upload failed.'}</p>
                      <Button
                        className="min-h-11 w-full px-2 text-xs"
                        isDisabled={disabled}
                        onPress={() => uploadFile(item.file, item.durationMs, item.localId)}
                        size="sm"
                        variant="secondary"
                      >
                        <RotateCcw size={14} /> Retry
                      </Button>
                    </div>
                  ) : (
                    <p className="truncate text-success text-xs">Ready</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
      {fieldError ? <p className="mt-2 text-danger-soft-foreground text-xs">{fieldError}</p> : null}
    </div>
  );
}
