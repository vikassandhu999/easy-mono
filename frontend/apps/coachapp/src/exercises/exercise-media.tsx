import {useState} from 'react';
import type {Exercise} from '../api/exercises';
import {Button} from '../ui/button';
import {LibraryMediaField} from '../ui/library-media-field';
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
  const [removed, setRemoved] = useState<
    {kind: 'media'; value: NonNullable<Exercise['media']>} | {kind: 'image'; url: string; index: number} | null
  >(null);
  return (
    <section
      aria-label="Exercise demonstration"
      className="space-y-3"
    >
      <h2 className="text-sm font-medium">Demonstration</h2>
      {!media && images.length === 0 && readOnly && (
        <p className="text-sm text-muted-foreground">No demonstration added.</p>
      )}
      <LibraryMediaField
        media={media}
        noun="demonstration"
        label="Exercise demonstration"
        disabled={disabled}
        readOnly={readOnly}
        onBusy={onBusy}
        onUpload={(uploaded) => {
          setRemoved(null);
          onChange(uploaded);
        }}
        onRemove={() => {
          if (media) {
            setRemoved({kind: 'media', value: media});
            onChange(null);
          }
        }}
      />
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
