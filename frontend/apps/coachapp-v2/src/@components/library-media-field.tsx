import {putFileToSignedUrl} from '@easy/utils';
import {Button, CloseButton, Label, Typography} from '@heroui/react';
import {ImageOff, ImagePlus, Video} from 'lucide-react';
import {type ChangeEvent, useEffect, useId, useRef, useState} from 'react';

import {type LibraryMediaUploadRequest, useCreateCoachLibraryMediaUploadMutation} from '@/api/generated';
import {getApiErrorMessage} from '@/api/shared';

// ponytail: library media accepts only what the browser renders natively — no transcode.
const MAX_BYTES: Record<LibraryMediaUploadRequest['content_type'], number> = {
  'image/jpeg': 15 * 1024 * 1024,
  'image/png': 15 * 1024 * 1024,
  'image/webp': 15 * 1024 * 1024,
  'video/mp4': 50 * 1024 * 1024,
  'video/webm': 50 * 1024 * 1024,
};

const ACCEPT = Object.keys(MAX_BYTES).join(',');

function isAcceptedType(type: string): type is LibraryMediaUploadRequest['content_type'] {
  return type in MAX_BYTES;
}

function validateFile(file: File): string | undefined {
  if (!isAcceptedType(file.type)) {
    return 'Choose a JPEG, PNG, WebP, MP4, or WebM file.';
  }
  if (file.size <= 0 || file.size > MAX_BYTES[file.type]) {
    return 'Images can be 15 MB and videos 50 MB at most.';
  }
  return undefined;
}

export type LibraryMediaValue = {
  contentType: string;
  kind: 'image' | 'video';
  url: string | null;
};

type State =
  | {status: 'empty'}
  | {status: 'current'; kind: 'image' | 'video'; url: string | null}
  | {status: 'uploading'; previewUrl: string; kind: 'image' | 'video'; progress: number}
  | {status: 'error'; previewUrl: string; kind: 'image' | 'video'; file: File; message: string};

type Props = {
  disabled?: boolean;
  initialMedia?: LibraryMediaValue | null;
  onBusyChange: (busy: boolean) => void;
  onChange: (mediaId: string | null) => void;
};

function Thumbnail({kind, url}: {kind: 'image' | 'video'; url: string | null}) {
  const [failed, setFailed] = useState(false);
  const className = 'size-24 rounded-xl border border-border bg-surface-secondary object-cover';

  if (!url || failed) {
    return (
      <div className="flex size-24 items-center justify-center rounded-xl border border-border bg-surface-secondary">
        {kind === 'video' ? <Video className="size-6 text-muted" /> : <ImageOff className="size-6 text-muted" />}
      </div>
    );
  }

  if (kind === 'video') {
    return (
      // biome-ignore lint/a11y/useMediaCaption: coach-uploaded exercise/food demo media has no caption track.
      <video
        className={className}
        controls
        onError={() => setFailed(true)}
        preload="metadata"
        src={url}
      />
    );
  }

  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: onError is only an image fallback handler.
    <img
      alt="Library media"
      className={className}
      onError={() => setFailed(true)}
      src={url}
    />
  );
}

export default function LibraryMediaField({disabled, initialMedia, onBusyChange, onChange}: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [createUpload] = useCreateCoachLibraryMediaUploadMutation();
  const [state, setState] = useState<State>(
    initialMedia ? {status: 'current', kind: initialMedia.kind, url: initialMedia.url} : {status: 'empty'},
  );
  const previewRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    onBusyChange(state.status === 'uploading');
  }, [state.status, onBusyChange]);

  useEffect(
    () => () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
      }
    },
    [],
  );

  const setPreview = (url: string) => {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
    }
    previewRef.current = url;
  };

  const upload = async (file: File) => {
    const error = validateFile(file);
    if (error || !isAcceptedType(file.type)) {
      setState({status: 'error', previewUrl: previewRef.current ?? '', kind: 'image', file, message: error ?? ''});
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);
    const kind = file.type.startsWith('video/') ? 'video' : 'image';
    setState({status: 'uploading', previewUrl, kind, progress: 0});

    let response: Awaited<ReturnType<ReturnType<typeof useCreateCoachLibraryMediaUploadMutation>[0]>>['data'];
    try {
      response = await createUpload({
        libraryMediaUploadRequest: {byte_size: file.size, content_type: file.type},
      }).unwrap();
    } catch (err) {
      setState({
        status: 'error',
        previewUrl,
        kind,
        file,
        message: getApiErrorMessage(err, "Couldn't prepare this upload. Try again."),
      });
      return;
    }

    try {
      await putFileToSignedUrl(response.data.upload_url, file, response.data.upload_headers, (progress) =>
        setState((current) => (current.status === 'uploading' ? {...current, progress} : current)),
      );
      onChange(response.data.id);
      setState({status: 'current', kind, url: response.data.url});
    } catch {
      setState({
        status: 'error',
        previewUrl,
        kind,
        file,
        message: "Couldn't send this file to storage. Check your connection and try again.",
      });
    }
  };

  const chooseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file && !disabled) {
      upload(file);
    }
  };

  const remove = () => {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = undefined;
    }
    onChange(null);
    setState({status: 'empty'});
  };

  const previewKind = state.status === 'empty' || state.status === 'current' ? undefined : state.kind;
  const previewUrl = state.status === 'uploading' || state.status === 'error' ? state.previewUrl : undefined;

  return (
    <div>
      <Label>Media</Label>
      <input
        accept={ACCEPT}
        className="sr-only"
        disabled={disabled}
        id={inputId}
        onChange={chooseFile}
        ref={inputRef}
        type="file"
      />
      <div className="mt-2 flex flex-col gap-3">
        {state.status === 'current' && (
          <div className="flex items-start gap-3">
            <div className="relative">
              <Thumbnail
                kind={state.kind}
                url={state.url}
              />
              <CloseButton
                aria-label="Remove media"
                className="absolute -top-2 -right-2 min-h-11 min-w-11 rounded-full bg-ink text-ink-foreground"
                onPress={remove}
              />
            </div>
            <Button
              className="min-h-11"
              isDisabled={disabled}
              onPress={() => inputRef.current?.click()}
              size="sm"
              variant="ghost"
            >
              Replace
            </Button>
          </div>
        )}

        {state.status === 'uploading' && (
          <div className="flex items-center gap-3">
            <Thumbnail
              kind={previewKind ?? 'image'}
              url={previewUrl ?? null}
            />
            <div className="flex-1">
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-secondary">
                <div
                  className="h-full rounded-full bg-accent transition-[width]"
                  style={{width: `${state.progress}%`}}
                />
              </div>
              <Typography
                className="mt-1 text-muted"
                type="body-sm"
              >
                Uploading… {state.progress}%
              </Typography>
            </div>
          </div>
        )}

        {state.status === 'error' && (
          <div className="flex items-start gap-3">
            <Thumbnail
              kind={previewKind ?? 'image'}
              url={previewUrl ?? null}
            />
            <div className="flex-1">
              <Typography
                className="text-danger"
                type="body-sm"
              >
                {state.message}
              </Typography>
              <div className="mt-2 flex gap-2">
                <Button
                  className="min-h-11"
                  isDisabled={disabled}
                  onPress={() => upload(state.file)}
                  size="sm"
                >
                  Retry
                </Button>
                <Button
                  className="min-h-11"
                  onPress={remove}
                  size="sm"
                  variant="ghost"
                >
                  Remove
                </Button>
              </div>
            </div>
          </div>
        )}

        {state.status === 'empty' && (
          <Button
            className="min-h-11 w-full rounded-xl border border-dashed border-border text-muted"
            isDisabled={disabled}
            onPress={() => inputRef.current?.click()}
            variant="ghost"
          >
            <ImagePlus className="size-4" />
            Add image or video
          </Button>
        )}
      </div>
    </div>
  );
}
