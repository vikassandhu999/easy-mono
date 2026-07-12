import {IMAGE_CONTENT_TYPES, putFileToSignedUrl} from '@easy/utils';
import {Button, ProgressBar} from '@heroui/react';
import {Camera, ImagePlus, Trash2} from 'lucide-react';
import {type ChangeEvent, useEffect, useId, useRef, useState} from 'react';

import {useCreateClientUploadMutation} from '@/api/uploads';

const ACCEPTED_TYPES: readonly string[] = IMAGE_CONTENT_TYPES;
const MAX_BYTES = 15 * 1024 * 1024;
const MAX_PHOTOS = 4;

type PhotoItem = {
  attachmentId?: string;
  error?: string;
  fileName: string;
  localId: string;
  previewUrl: string;
  progress: number;
  status: 'error' | 'uploaded' | 'uploading';
};

export type PhotoUploadState = {busy: boolean; failed: boolean};

export default function PhotoAnswerField({
  label,
  onChange,
  onUploadStateChange,
  required,
  value,
}: {
  label: string;
  onChange: (ids: string[]) => void;
  onUploadStateChange: (state: PhotoUploadState) => void;
  required?: boolean;
  value: string[];
}) {
  const inputId = useId();
  const [createUpload] = useCreateClientUploadMutation();
  const [items, setItems] = useState<PhotoItem[]>([]);
  const [fieldError, setFieldError] = useState<null | string>(null);
  const itemsRef = useRef(items);
  const uploadedIdsRef = useRef(value);

  useEffect(() => {
    itemsRef.current = items;
    onUploadStateChange({
      busy: items.some((item) => item.status === 'uploading'),
      failed: Boolean(fieldError) || items.some((item) => item.status === 'error'),
    });
  }, [fieldError, items, onUploadStateChange]);

  useEffect(() => {
    uploadedIdsRef.current = value;
  }, [value]);

  useEffect(
    () => () => {
      for (const item of itemsRef.current) {
        URL.revokeObjectURL(item.previewUrl);
      }
    },
    [],
  );

  const updateItem = (localId: string, patch: Partial<PhotoItem>) => {
    setItems((current) => current.map((item) => (item.localId === localId ? {...item, ...patch} : item)));
  };

  const uploadFile = async (file: File) => {
    const localId = crypto.randomUUID();
    const previewUrl = URL.createObjectURL(file);
    const item: PhotoItem = {fileName: file.name, localId, previewUrl, progress: 0, status: 'uploading'};
    setItems((current) => [...current, item]);

    try {
      const response = await createUpload({
        attachmentUploadRequest: {
          byte_size: file.size,
          content_type: file.type as 'image/heic' | 'image/jpeg' | 'image/png' | 'image/webp',
        },
      }).unwrap();

      await putFileToSignedUrl(response.data.upload_url, file, response.data.upload_headers, (progress) =>
        updateItem(localId, {progress}),
      );

      uploadedIdsRef.current = [...uploadedIdsRef.current, response.data.id];
      onChange(uploadedIdsRef.current);
      updateItem(localId, {attachmentId: response.data.id, progress: 100, status: 'uploaded'});
    } catch {
      updateItem(localId, {error: "Couldn't upload this photo. Remove it and try again.", status: 'error'});
    }
  };

  const chooseFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];
    event.target.value = '';
    setFieldError(null);

    const available = MAX_PHOTOS - items.length;
    if (files.length > available) {
      setFieldError(`You can add up to ${MAX_PHOTOS} photos.`);
      return;
    }
    if (files.some((file) => !ACCEPTED_TYPES.includes(file.type))) {
      setFieldError('Choose JPEG, PNG, WebP, or HEIC photos.');
      return;
    }
    if (files.some((file) => file.size <= 0 || file.size > MAX_BYTES)) {
      setFieldError('Each photo must be smaller than 15 MB.');
      return;
    }

    for (const file of files) {
      uploadFile(file);
    }
  };

  const removeItem = (localId: string) => {
    const item = items.find((candidate) => candidate.localId === localId);
    if (!item || item.status === 'uploading') {
      return;
    }
    URL.revokeObjectURL(item.previewUrl);
    setItems((current) => current.filter((candidate) => candidate.localId !== localId));
    if (item.attachmentId) {
      uploadedIdsRef.current = uploadedIdsRef.current.filter((id) => id !== item.attachmentId);
      onChange(uploadedIdsRef.current);
    }
    setFieldError(null);
  };

  return (
    <div>
      <div
        className="mb-2 text-sm font-medium"
        id={`${inputId}-label`}
      >
        {label}
        {required ? <span className="ml-1 text-danger">*</span> : null}
      </div>
      <div
        aria-labelledby={`${inputId}-label`}
        className="flex flex-wrap gap-2"
        role="group"
      >
        <Button
          isDisabled={items.length >= MAX_PHOTOS}
          onPress={() => document.getElementById(`${inputId}-camera`)?.click()}
          size="sm"
          variant="secondary"
        >
          <Camera size={16} />
          Camera
        </Button>
        <Button
          isDisabled={items.length >= MAX_PHOTOS}
          onPress={() => document.getElementById(`${inputId}-library`)?.click()}
          size="sm"
          variant="secondary"
        >
          <ImagePlus size={16} />
          Library
        </Button>
        <input
          accept={ACCEPTED_TYPES.join(',')}
          capture="environment"
          className="sr-only"
          id={`${inputId}-camera`}
          onChange={chooseFiles}
          type="file"
        />
        <input
          accept={ACCEPTED_TYPES.join(',')}
          className="sr-only"
          id={`${inputId}-library`}
          multiple
          onChange={chooseFiles}
          type="file"
        />
      </div>

      {items.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {items.map((item) => (
            <div
              className="overflow-hidden rounded-xl border border-border bg-surface"
              key={item.localId}
            >
              <div className="relative aspect-[3/4] bg-surface-secondary">
                <img
                  alt={item.fileName}
                  className="size-full object-cover"
                  src={item.previewUrl}
                />
                {item.status !== 'uploading' ? (
                  <button
                    aria-label={`Remove ${item.fileName}`}
                    className="absolute right-1 top-1 grid size-8 place-items-center rounded-full bg-surface/90 text-foreground shadow-sm"
                    onClick={() => removeItem(item.localId)}
                    type="button"
                  >
                    <Trash2 size={14} />
                  </button>
                ) : null}
              </div>
              <div className="p-2">
                {item.status === 'uploading' ? (
                  <ProgressBar
                    aria-label={`Uploading ${item.fileName}`}
                    value={item.progress}
                  />
                ) : item.status === 'error' ? (
                  <p className="text-danger text-xs">Upload failed</p>
                ) : (
                  <p className="text-success text-xs">Uploaded</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {fieldError ? <p className="mt-2 text-danger text-xs">{fieldError}</p> : null}
      {items.find((item) => item.error)?.error ? (
        <p className="mt-2 text-danger text-xs">{items.find((item) => item.error)?.error}</p>
      ) : null}
    </div>
  );
}
