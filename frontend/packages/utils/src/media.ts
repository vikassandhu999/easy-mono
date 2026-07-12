export const IMAGE_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'] as const;
export const VIDEO_CONTENT_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'] as const;
export const AUDIO_CONTENT_TYPES = ['audio/webm', 'audio/mp4', 'audio/mpeg'] as const;

export type MediaKind = 'audio' | 'file' | 'image' | 'video';
export type VoiceRecordingMimeType = 'audio/mp4' | 'audio/webm';

export function mediaKind(contentType: string): MediaKind {
  if (contentType.startsWith('image/')) {
    return 'image';
  }
  if (contentType.startsWith('video/')) {
    return 'video';
  }
  if (contentType.startsWith('audio/')) {
    return 'audio';
  }
  return 'file';
}

export function voiceRecordingMimeType(): VoiceRecordingMimeType | null {
  if (typeof MediaRecorder === 'undefined') {
    return null;
  }
  if (MediaRecorder.isTypeSupported('audio/webm')) {
    return 'audio/webm';
  }
  if (MediaRecorder.isTypeSupported('audio/mp4')) {
    return 'audio/mp4';
  }
  return null;
}

export function putFileToSignedUrl(
  url: string,
  file: File,
  headers: Record<string, string>,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('PUT', url);

    for (const [name, value] of Object.entries(headers)) {
      request.setRequestHeader(name, value);
    }

    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });
    request.addEventListener('load', () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(100);
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${request.status}`));
      }
    });
    request.addEventListener('error', () => reject(new Error('Upload failed')));
    request.addEventListener('abort', () => reject(new Error('Upload cancelled')));
    request.send(file);
  });
}

export async function startVoiceRecording(): Promise<{
  cancel(): void;
  mimeType: VoiceRecordingMimeType;
  stop(): Promise<File>;
}> {
  const mimeType = voiceRecordingMimeType();
  if (!mimeType || typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('Voice recording is not supported');
  }

  const stream = await navigator.mediaDevices.getUserMedia({audio: true});
  const stopTracks = () => {
    for (const track of stream.getTracks()) {
      track.stop();
    }
  };

  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, {mimeType});
  } catch (error) {
    stopTracks();
    throw error;
  }

  const chunks: Blob[] = [];
  let cancelled = false;
  let stopPromise: Promise<File> | undefined;
  let resolveStop: ((file: File) => void) | undefined;
  let rejectStop: ((error: Error) => void) | undefined;
  let result: {error: Error} | {file: File} | undefined;

  const finish = (nextResult: {error: Error} | {file: File}) => {
    if (result) {
      return;
    }
    result = nextResult;
    if ('error' in nextResult) {
      rejectStop?.(nextResult.error);
    } else {
      resolveStop?.(nextResult.file);
    }
  };

  recorder.addEventListener('dataavailable', (event) => {
    if (!cancelled && event.data.size > 0) {
      chunks.push(event.data);
    }
  });
  recorder.addEventListener('error', () => {
    stopTracks();
    finish({error: new Error('Voice recording failed')});
  });
  recorder.addEventListener('stop', () => {
    stopTracks();
    if (cancelled) {
      finish({error: new Error('Voice recording cancelled')});
      return;
    }
    finish({
      file: new File(chunks, `voice-recording.${mimeType === 'audio/webm' ? 'webm' : 'm4a'}`, {type: mimeType}),
    });
  });

  try {
    recorder.start();
  } catch (error) {
    stopTracks();
    throw error;
  }

  return {
    cancel() {
      cancelled = true;
      chunks.length = 0;
      finish({error: new Error('Voice recording cancelled')});
      try {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      } finally {
        stopTracks();
      }
    },
    mimeType,
    stop() {
      if (stopPromise) {
        return stopPromise;
      }
      if (result) {
        return 'error' in result ? Promise.reject(result.error) : Promise.resolve(result.file);
      }

      stopPromise = new Promise<File>((resolve, reject) => {
        resolveStop = resolve;
        rejectStop = reject;
      });
      try {
        recorder.stop();
      } catch (error) {
        finish({error: error instanceof Error ? error : new Error('Voice recording failed')});
      } finally {
        stopTracks();
      }
      return stopPromise;
    },
  };
}
