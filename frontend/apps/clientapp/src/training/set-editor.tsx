import {useEffect} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {Button} from '../ui/button';
import {FormField} from '../ui/form-field';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {SubmitButton} from '../ui/submit-button';
import {measurementFields, type SetEntry, type SetValues, trackingOptions} from './recording';

const numeric = (integer = false, minimum = 0, maximum = Number.POSITIVE_INFINITY) => ({
  validate: (value: string) =>
    value.trim() === '' ||
    (Number.isFinite(Number(value)) &&
      Number(value) >= minimum &&
      Number(value) <= maximum &&
      (!integer || Number.isInteger(Number(value)))) ||
    (maximum !== Number.POSITIVE_INFINITY
      ? `Enter a number from ${minimum} to ${maximum}.`
      : `Enter a ${integer ? 'whole ' : ''}number of ${minimum} or more.`),
});

export function SetEditor({
  entry,
  pending,
  canSave,
  previous,
  onChange,
  onSave,
  onClear,
}: {
  entry: SetEntry;
  pending: boolean;
  canSave: boolean;
  previous: SetValues | undefined;
  onChange: (values: SetValues) => void;
  onSave: (values: SetValues) => void;
  onClear: () => void;
}) {
  const form = useForm<SetValues>({defaultValues: entry.values});
  const tracking = form.watch('tracking');
  const loadUnit = form.watch('load_unit');
  const distanceUnit = form.watch('distance_unit');
  const fields = measurementFields(tracking);
  const locked = entry.attempted || pending;
  useEffect(() => {
    const subscription = form.watch(() => {
      if (!locked) {
        onChange(form.getValues());
      }
    });
    return () => subscription.unsubscribe();
  }, [form, onChange, locked]);

  return (
    <form
      className="rounded-[2rem] bg-surface p-5 space-y-4"
      onSubmit={form.handleSubmit(onSave)}
    >
      <h3 className="text-lg font-semibold">{entry.operation.kind === 'edit' ? 'Edit saved set' : 'Record a set'}</h3>
      {previous && !locked && (
        <Button
          variant="secondary"
          onPress={() => form.reset(previous)}
        >
          Use last set
        </Button>
      )}
      {entry.attempted && (
        <p
          role="status"
          className="text-sm text-muted-foreground"
        >
          This entry is kept unchanged until its save is confirmed. Retry to check for the same saved set.
        </p>
      )}
      {entry.key === 'freestyle' && (
        <>
          <FormField
            control={form.control}
            name="exercise_name"
            label="Exercise name"
            isRequired
            isDisabled={locked}
            maxLength={255}
          />
          <Controller
            control={form.control}
            name="tracking"
            render={({field}) => (
              <SelectField
                aria-label="What to record"
                value={field.value}
                onChange={field.onChange}
                isDisabled={locked}
              >
                {trackingOptions.map((option) => (
                  <SelectItem
                    id={option.id}
                    key={option.id}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectField>
            )}
          />
        </>
      )}
      <div className="grid grid-cols-2 gap-3 [&_input]:h-16 [&_input]:text-2xl [&_input]:font-bold [&_input]:text-center">
        {fields.reps && (
          <FormField
            control={form.control}
            name="reps"
            label="Reps"
            inputMode="numeric"
            isDisabled={locked}
          />
        )}
        {fields.load && (
          <>
            <FormField
              control={form.control}
              name="load_value"
              label={`${tracking === 'assisted_bodyweight' ? 'Assistance' : tracking === 'weighted_bodyweight' ? 'Added weight' : 'Weight'}${loadUnit === 'none' ? '' : ` (${loadUnit === 'lbs' ? 'lb' : loadUnit})`}`}
              inputMode="decimal"
              rules={numeric()}
              isDisabled={locked}
            />
          </>
        )}
        {fields.duration && (
          <FormField
            control={form.control}
            name="duration_seconds"
            label="Time (seconds)"
            inputMode="numeric"
            rules={numeric(true)}
            isDisabled={locked}
          />
        )}
        {fields.distance && (
          <>
            <FormField
              control={form.control}
              name="distance_value"
              label={`Distance${distanceUnit === 'none' ? '' : ` (${distanceUnit})`}`}
              inputMode="decimal"
              rules={numeric()}
              isDisabled={locked}
            />
          </>
        )}
      </div>
      <details
        className="space-y-4"
        open={entry.attempted ? true : undefined}
      >
        <summary className="cursor-pointer min-h-12 py-3 font-semibold">Units, set type & notes</summary>
        {fields.load && (
          <Controller
            control={form.control}
            name="load_unit"
            render={({field}) => (
              <SelectField
                aria-label="Weight unit"
                value={field.value}
                onChange={field.onChange}
                isDisabled={locked}
              >
                <SelectItem id="kg">kg</SelectItem>
                <SelectItem id="lbs">lb</SelectItem>
                <SelectItem id="bodyweight">Bodyweight</SelectItem>
                <SelectItem id="none">No unit</SelectItem>
              </SelectField>
            )}
          />
        )}
        {fields.distance && (
          <Controller
            control={form.control}
            name="distance_unit"
            render={({field}) => (
              <SelectField
                aria-label="Distance unit"
                value={field.value}
                onChange={field.onChange}
                isDisabled={locked}
              >
                <SelectItem id="km">km</SelectItem>
                <SelectItem id="meters">meters</SelectItem>
                <SelectItem id="miles">miles</SelectItem>
                <SelectItem id="none">No unit</SelectItem>
              </SelectField>
            )}
          />
        )}
        <Controller
          control={form.control}
          name="set_type"
          render={({field}) => (
            <SelectField
              aria-label="Set type"
              value={field.value}
              onChange={field.onChange}
              isDisabled={locked}
            >
              <SelectItem id="working">Working set</SelectItem>
              <SelectItem id="warmup">Warm-up</SelectItem>
              <SelectItem id="dropset">Drop set</SelectItem>
            </SelectField>
          )}
        />
        <FormField
          control={form.control}
          name="rpe"
          label="Effort (1–10)"
          inputMode="decimal"
          rules={numeric(false, 1, 10)}
          isDisabled={locked}
        />
        <FormField
          control={form.control}
          name="notes"
          label="Set notes"
          multiline
          maxLength={5000}
          isDisabled={locked}
        />
      </details>
      <div className="mobile-save-bar">
        <SubmitButton
          preventFocusOnPress
          pending={pending}
          isDisabled={!canSave}
        >
          {entry.attempted ? 'Retry set save' : entry.operation.kind === 'edit' ? 'Save set changes' : 'Save set'}
        </SubmitButton>
      </div>
      <Button
        variant="ghost"
        isDisabled={pending}
        onPress={onClear}
      >
        Clear this entry
      </Button>
    </form>
  );
}
