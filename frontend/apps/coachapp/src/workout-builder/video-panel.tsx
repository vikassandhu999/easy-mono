import {useEffect, useRef, useState} from 'react';
import {errorMessage} from '../api/client';
import {mediaFileError, useUploadLibraryMedia} from '../api/library-media';
import {Button} from '../ui/button';
import {FormError} from '../ui/form-error';
import {Input} from '../ui/input';
import {validUrl} from './model';

export function VideoPanel({
  value,
  onChange,
  validationVisible,
  onPendingChange,
}: {
  value: string;
  onChange: (value: string) => void;
  validationVisible: boolean;
  onPendingChange: (pending: boolean) => void;
}) {
  const upload = useUploadLibraryMedia();
  const fileInput = useRef<HTMLInputElement>(null);
  const active = useRef<AbortController | null>(null);
  const [error, setError] = useState<string>();
  const [progress, setProgress] = useState(0);
  const invalid = validationVisible && !validUrl(value);
  useEffect(() => {
    onPendingChange(upload.isPending);
    return () => onPendingChange(false);
  }, [upload.isPending, onPendingChange]);
  useEffect(() => () => active.current?.abort(), []);
  return (
    <section className="surface space-y-3">
      <h2 className="editor-section-title">Video</h2>
      <p className="text-muted-foreground">The client follows this video on the scheduled day.</p>
      <label
        htmlFor="workout-video"
        className="grid gap-1"
      >
        <span className="text-sm font-medium">Video URL</span>
        <Input
          id="workout-video"
          type="url"
          required
          aria-invalid={invalid}
          aria-describedby={invalid ? 'workout-video-error' : undefined}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="https://…"
        />
      </label>
      {invalid && (
        <p
          id="workout-video-error"
          role="alert"
          className="text-sm text-destructive"
        >
          Enter a video URL that starts with https:// or http://.
        </p>
      )}
      <input
        ref={fileInput}
        type="file"
        className="sr-only"
        aria-label="Choose workout video"
        tabIndex={-1}
        accept="video/mp4,video/webm"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) {
            return;
          }
          const problem = !['video/mp4', 'video/webm'].includes(file.type)
            ? 'Choose an MP4 or WebM video.'
            : mediaFileError(file);
          if (problem) {
            setError(problem);
            return;
          }
          const controller = new AbortController();
          active.current = controller;
          setError(undefined);
          setProgress(0);
          try {
            const media = await upload.mutateAsync({file, signal: controller.signal, onProgress: setProgress});
            if (!media.url) {
              throw new Error('The uploaded video has no public URL.');
            }
            onChange(media.url);
          } catch (cause) {
            if (!controller.signal.aborted) {
              setError(errorMessage(cause, 'Could not upload the video. Choose it again to retry.'));
            }
          }
        }}
      />
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          isPending={upload.isPending}
          onPress={() => fileInput.current?.click()}
        >
          {upload.isPending ? 'Uploading…' : 'Upload a video'}
        </Button>
        {upload.isPending && (
          <Button
            variant="outline"
            onPress={() => active.current?.abort()}
          >
            Cancel upload
          </Button>
        )}
      </div>
      {upload.isPending && (
        <div className="space-y-2">
          <p
            role="status"
            className="text-sm font-medium"
          >
            Uploading video… {progress}%
          </p>
          <progress
            aria-label="Video upload progress"
            value={progress}
            max={100}
            className="w-full"
          />
        </div>
      )}
      <FormError message={error} />
      {validUrl(value) && (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center font-medium underline"
        >
          Open video (new tab)
        </a>
      )}
      {validUrl(value) && /\.(mp4|webm)(\?|$)/i.test(value) && (
        <video
          controls
          playsInline
          preload="metadata"
          src={value}
          aria-label="Workout video"
          className="max-h-80 w-full rounded-xl"
        >
          <track kind="captions" />
        </video>
      )}
    </section>
  );
}
