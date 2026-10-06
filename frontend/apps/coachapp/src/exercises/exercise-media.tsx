import type {Exercise} from '../api/exercises';
import {LibraryMediaField} from '../ui/library-media-field';
export function ExerciseMedia({
  media,
  disabled,
  readOnly,
  onChange,
  onBusy,
}: {
  media: Exercise['media'];
  disabled: boolean;
  readOnly: boolean;
  onChange: (media: Exercise['media']) => void;
  onBusy: (busy: boolean) => void;
}) {
  return (
    <section
      aria-label="Exercise demonstration"
      className="space-y-3"
    >
      <h2 className="text-sm font-medium">Demonstration</h2>
      <LibraryMediaField
        media={media}
        noun="demonstration"
        label="Exercise demonstration"
        disabled={disabled}
        readOnly={readOnly}
        onBusy={onBusy}
        onUpload={onChange}
        onRemove={() => onChange(null)}
      />
    </section>
  );
}
