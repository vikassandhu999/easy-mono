import {useEffect} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {Button} from '../ui/button';
import {FormField} from '../ui/form-field';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {SubmitButton} from '../ui/submit-button';
import {type SetEntry, type SetValues} from './recording';

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
  const loadUnit = form.watch('load_unit');
  const distanceUnit = form.watch('distance_unit');

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
        </>
      )}
      <Controller
        control={form.control}
        name="outcome"
        render={({field}) => (
          <SelectField
            aria-label="Set outcome"
            value={field.value}
            onChange={field.onChange}
            isDisabled={locked}
          >
            <SelectItem id="done">Done</SelectItem>
            <SelectItem id="failed">Failed</SelectItem>
            <SelectItem id="skipped">Skipped</SelectItem>
          </SelectField>
        )}
      />
      <div className="grid grid-cols-2 gap-3 [&_input]:h-16 [&_input]:text-2xl [&_input]:font-bold [&_input]:text-center">
        {
          <FormField
            control={form.control}
            name="reps"
            label="Reps"
            inputMode="numeric"
            rules={numeric(true)}
            isDisabled={locked}
          />
        }
        {
          <>
            <FormField
              control={form.control}
              name="load_value"
              label={`Load (${loadUnit})`}
              inputMode="decimal"
              rules={numeric(false, Number.NEGATIVE_INFINITY)}
              isDisabled={locked}
            />
          </>
        }
        {
          <FormField
            control={form.control}
            name="duration_s"
            label="Time (seconds)"
            inputMode="numeric"
            rules={numeric(true)}
            isDisabled={locked}
          />
        }
        {
          <>
            <FormField
              control={form.control}
              name="distance_value"
              label={`Distance (${distanceUnit})`}
              inputMode="decimal"
              rules={numeric()}
              isDisabled={locked}
            />
          </>
        }
      </div>
      <details
        className="space-y-4"
        open={entry.attempted ? true : undefined}
      >
        <summary className="cursor-pointer min-h-12 py-3 font-semibold">Units & set type</summary>
        {
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
                <SelectItem id="lb">lb</SelectItem>
              </SelectField>
            )}
          />
        }
        {
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
                <SelectItem id="m">meters</SelectItem>
                <SelectItem id="mi">miles</SelectItem>
              </SelectField>
            )}
          />
        }
        <Controller
          control={form.control}
          name="kind"
          render={({field}) => (
            <SelectField
              aria-label="Set type"
              value={field.value}
              onChange={field.onChange}
              isDisabled={locked}
            >
              <SelectItem id="working">Working set</SelectItem>
              <SelectItem id="warmup">Warm-up</SelectItem>
              <SelectItem id="drop">Drop set</SelectItem>
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
          name="rir"
          label="Reps in reserve (0–10)"
          inputMode="numeric"
          rules={numeric(true, 0, 10)}
          isDisabled={locked}
        />
        <FormField
          control={form.control}
          name="notes"
          label="Set notes"
          multiline
          isDisabled={locked}
        />
        {entry.values.notes && (
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">Recorded detail: {entry.values.notes}</p>
        )}
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
