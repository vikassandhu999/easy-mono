import {putFileToSignedUrl, startVoiceRecording} from '@easy/utils';
import {type ChangeEvent, useEffect, useId, useRef, useState} from 'react';

import {type AttachmentUploadRequest, useCreateCoachClientUploadMutation} from '@/api/generated';
import {getApiErrorMessage} from '@/api/shared';
import {
  isAcceptedAttachmentType,
  MAX_ATTACHMENTS,
  MAX_BYTES,
  MAX_RECORDING_MS,
  type UploadItem,
  validateAttachmentFiles,
} from '@/messages/lib/attachment-files';

export type AttachmentComposerState = {
  attachmentIds: string[];
  busy: boolean;
  failed: boolean;
};

type Options = {
  clientId: string;
  disabled: boolean;
  onChange: (state: AttachmentComposerState) => void;
};

export default function useAttachmentComposer({clientId, disabled, onChange}: Options) {
  const inputId = useId();
  const [createUpload] = useCreateCoachClientUploadMutation();
  const [items, setItems] = useState<UploadItem[]>([]);
  const [fieldError, setFieldError] = useState<string>();
  const [recordingMs, setRecordingMs] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
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
      busy: isRecording || isStarting || isStopping || items.some((item) => item.status === 'uploading'),
      failed: items.some((item) => item.status === 'error'),
    });
  }, [isRecording, isStarting, isStopping, items, onChange]);

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

    if (!isAcceptedAttachmentType(file.type)) {
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
    const error = validateAttachmentFiles(files, MAX_ATTACHMENTS - items.length);
    if (error) {
      setFieldError(error);
      return;
    }
    for (const file of files) {
      uploadFile(file);
    }
  };

  const startRecording = async () => {
    if (disabled || isRecording || isStopping || startingRef.current) {
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
    setIsStopping(true);
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
    } finally {
      if (!disposedRef.current && recordingAttemptRef.current === attempt) {
        setIsStopping(false);
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

  return {
    cancelRecording,
    chooseFiles,
    controlsDisabled: disabled || isRecording || isStarting || isStopping || items.length >= MAX_ATTACHMENTS,
    fieldError,
    inputId,
    isRecording,
    isStarting,
    isStopping,
    items,
    recordingMs,
    removeItem,
    retryUpload: uploadFile,
    startRecording,
    stopRecording,
  };
}
