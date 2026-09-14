import {useEffect, useRef, useState} from 'react';
import {mediaFileError, type UploadedLibraryMedia, useUploadLibraryMedia} from '../api/library-media';
import {Button} from './button';
import {FormError} from './form-error';
import {MediaPreview} from './media-preview';

export function LibraryMediaField({
  media,
  label,
  noun,
  disabled,
  readOnly,
  onUpload,
  onRemove,
  onBusy,
}: {
  media: Pick<UploadedLibraryMedia, 'id' | 'kind' | 'url'> | null;
  label: string;
  noun: string;
  disabled: boolean;
  readOnly: boolean;
  onUpload: (media: UploadedLibraryMedia) => void;
  onRemove: () => void;
  onBusy: (busy: boolean) => void;
}) {
  const upload = useUploadLibraryMedia();
  const input = useRef<HTMLInputElement>(null);
  const active = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [retryFile, setRetryFile] = useState<File | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      active.current?.abort();
    };
  }, []);
  async function attach(file: File) {
    if (disabled || readOnly || active.current) {
      return;
    }
    const invalid = mediaFileError(file);
    setError(invalid ?? '');
    setNotice('');
    setRetryFile(null);
    if (invalid) {
      return;
    }
    const controller = new AbortController();
    active.current = controller;
    onBusy(true);
    try {
      const uploaded = await upload.mutateAsync({file, signal: controller.signal});
      if (mounted.current && !controller.signal.aborted) {
        onUpload(uploaded);
        setNotice('Upload finished.');
      }
    } catch {
      if (mounted.current) {
        if (controller.signal.aborted) {
          setNotice(`Upload cancelled. Your ${noun} is unchanged.`);
        } else {
          setError(`Could not upload this file. Your ${noun} is unchanged. Retry when connected.`);
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
    <div className="space-y-3">
      {media && (
        <MediaPreview
          key={media.id}
          kind={media.kind}
          url={media.url}
          label={label}
        />
      )}
      {!readOnly && (
        <>
          <p className="text-sm text-muted-foreground">
            JPG, PNG or WebP photos up to 15 MB. MP4 or WebM videos up to 50 MB. Files are public; keep private client
            information out of them.
          </p>
          <input
            ref={input}
            type="file"
            className="sr-only"
            tabIndex={-1}
            aria-label={`Choose ${noun}`}
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
              {media ? `Replace ${noun}` : 'Add photo or video'}
            </Button>
            {media && (
              <Button
                variant="ghost"
                isDisabled={disabled}
                onPress={() => {
                  onRemove();
                  setNotice('');
                }}
              >
                Remove {noun}
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
            Uploading {noun}…
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
    </div>
  );
}
