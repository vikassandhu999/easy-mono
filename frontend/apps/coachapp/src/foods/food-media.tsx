import {useState} from 'react';
import type {Food} from '../api/foods';
import {Button} from '../ui/button';
import {LibraryMediaField} from '../ui/library-media-field';

export function FoodMedia({
  media,
  disabled,
  readOnly,
  onChange,
  onBusy,
}: {
  media: Food['media'];
  disabled: boolean;
  readOnly: boolean;
  onChange: (media: Food['media']) => void;
  onBusy: (busy: boolean) => void;
}) {
  const [removed, setRemoved] = useState<Food['media']>(null);
  return (
    <section
      aria-label="Food media"
      className="space-y-3"
    >
      <h2 className="text-xl font-bold">Photo or video</h2>
      {!readOnly && (
        <p className="text-sm text-muted-foreground">
          Help identify this food or show how to prepare it. Save food to apply your media changes.
        </p>
      )}
      {readOnly && !media && <p className="text-sm text-muted-foreground">No photo or video added.</p>}
      <LibraryMediaField
        media={media}
        label="Food photo or video"
        noun="photo or video"
        disabled={disabled}
        readOnly={readOnly}
        onBusy={onBusy}
        onUpload={(uploaded) => {
          setRemoved(null);
          onChange(uploaded);
        }}
        onRemove={() => {
          setRemoved(media);
          onChange(null);
        }}
      />
      {removed && !readOnly && (
        <Button
          variant="outline"
          isDisabled={disabled}
          onPress={() => {
            onChange(removed);
            setRemoved(null);
          }}
        >
          Undo media removal
        </Button>
      )}
    </section>
  );
}
