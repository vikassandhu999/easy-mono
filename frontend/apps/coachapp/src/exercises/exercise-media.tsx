import {useEffect, useRef, useState} from 'react';
import type {Exercise} from '../api/exercises';
import {mediaFileError, useUploadLibraryMedia} from '../api/library-media';
import {Button} from '../ui/button';
import {FormError} from '../ui/form-error';
import {MediaPreview} from '../ui/media-preview';

export function ExerciseMedia({
  media,
  images,
  disabled,
  readOnly,
  onChange,
  onImagesChange,
  onBusy,
}: {
  media: Exercise['media'];
  images: string[];
  disabled: boolean;
  readOnly: boolean;
  onChange: (media: Exercise['media']) => void;
  onImagesChange: (images: string[]) => void;
  onBusy: (busy: boolean) => void;
}) {
  const upload = useUploadLibraryMedia();
  const input = useRef<HTMLInputElement>(null);
  const active = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [retryFile, setRetryFile] = useState<File | null>(null);
  const [removed, setRemoved] = useState<
    {kind: 'media'; value: NonNullable<Exercise['media']>} | {kind: 'image'; url: string; index: number} | null
  >(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      active.current?.abort();
    };
  }, []);
  async function attach(file: File) {
    const invalid = mediaFileError(file);
    setError(invalid ?? '');
    setNotice('');
    setRetryFile(null);
    if (invalid || active.current) {
      return;
    }
    const controller = new AbortController();
    active.current = controller;
    onBusy(true);
    try {
      const uploaded = await upload.mutateAsync({file, signal: controller.signal});
      if (mounted.current && !controller.signal.aborted) {
        onChange(uploaded);
        setRemoved(null);
        setNotice('Upload finished.');
      }
    } catch {
      if (mounted.current) {
        if (controller.signal.aborted) {
          setNotice('Upload cancelled. Your demonstration is unchanged.');
        } else {
          setError('Could not upload this file. Your demonstration is unchanged. Retry when connected.');
          setRetryFile(file);
        }
      }
    } finally {
      active.current = null;
      if (mounted.current) {
        onBusy(false);
      }
    }
  }
  return (
    <section
      aria-label="Exercise demonstration"
      className="space-y-3"
    >
      <h2 className="text-sm font-medium">Demonstration</h2>
      {media && (
        <MediaPreview
          key={media.id}
          kind={media.kind}
          url={media.url}
          label="Exercise demonstration"
        />
      )}
      {!media && images.length === 0 && readOnly && (
        <p className="text-sm text-muted-foreground">No demonstration added.</p>
      )}
      {!readOnly && (
        <>
          <p className="text-sm text-muted-foreground">
            JPG, PNG or WebP photos up to 15 MB. MP4 or WebM videos up to 50 MB. Demonstrations are public; keep private
            client information out of them.
          </p>
          <input
            ref={input}
            type="file"
            className="sr-only"
            tabIndex={-1}
            aria-label="Choose demonstration"
            disabled={disabled}
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) {
                attach(file);
              }
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              isDisabled={disabled}
              onPress={() => input.current?.click()}
            >
              {media ? 'Replace demonstration' : 'Add photo or video'}
            </Button>
            {media && (
              <Button
                variant="ghost"
                isDisabled={disabled}
                onPress={() => {
                  setRemoved({kind: 'media', value: media});
                  onChange(null);
                  setNotice('');
                }}
              >
                Remove demonstration
              </Button>
            )}
          </div>
        </>
      )}
      {upload.isPending && (
        <div className="flex flex-wrap items-center gap-3">
          <p
            role="status"
            className="text-sm"
          >
            Uploading demonstration…
          </p>
          <Button
            variant="outline"
            onPress={() => active.current?.abort()}
          >
            Cancel upload
          </Button>
        </div>
      )}
      <FormError message={error} />
      {retryFile && (
        <Button
          variant="outline"
          isDisabled={disabled}
          onPress={() => {
            attach(retryFile);
          }}
        >
          Retry upload
        </Button>
      )}
      {notice && (
        <p
          role="status"
          className="text-sm text-muted-foreground"
        >
          {notice}
        </p>
      )}
      {images.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Reference photos</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {images.map((url, index) => (
              <div
                key={`${url}-${index}`}
                className="space-y-2"
              >
                <MediaPreview
                  key={url}
                  kind="image"
                  url={url}
                  label={`Reference photo ${index + 1}`}
                />
                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="sm"
                    isDisabled={disabled}
                    onPress={() => {
                      setRemoved({kind: 'image', url, index});
                      onImagesChange(images.toSpliced(index, 1));
                    }}
                  >
                    Remove reference photo {index + 1}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {removed && !readOnly && (
        <Button
          variant="outline"
          isDisabled={disabled}
          onPress={() => {
            if (removed.kind === 'media') {
              onChange(removed.value);
            } else {
              onImagesChange(images.toSpliced(removed.index, 0, removed.url));
            }
            setRemoved(null);
          }}
        >
          Undo removal
        </Button>
      )}
    </section>
  );
}
