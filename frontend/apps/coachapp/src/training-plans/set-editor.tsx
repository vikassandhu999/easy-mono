import {MoreHorizontal} from 'lucide-react';
import {useState} from 'react';
import {Controller, useFormContext, useWatch} from 'react-hook-form';
import {Button} from '../ui/button';
import {DropdownMenu, DropdownMenuItem, DropdownMenuTrigger} from '../ui/dropdown-menu';
import {FormField} from '../ui/form-field';
import {Input} from '../ui/input';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import {newSet, type PrescriptionDraft} from './prescription';
export function SetEditor({
  workoutIndex,
  exerciseIndex,
  index,
  count,
  onMove,
  onRemove,
  onEditMatching,
}: {
  workoutIndex: number;
  exerciseIndex: number;
  index: number;
  count: number;
  onMove: (target: number) => void;
  onRemove: () => void;
  onEditMatching: () => void;
}) {
  const form = useFormContext<PrescriptionDraft>();
  const path = `workouts.${workoutIndex}.prescribed_exercises.${exerciseIndex}.prescribed_sets.${index}` as const;
  const set = useWatch({control: form.control, name: path}) ?? newSet();
  const [expanded, setExpanded] = useState(false);
  const advancedError = Boolean(
    form.getFieldState(`${path}.rpe`, form.formState).error ||
      form.getFieldState(`${path}.duration_seconds`, form.formState).error ||
      form.getFieldState(`${path}.distance_value`, form.formState).error,
  );
  const open = expanded || advancedError;
  const extras = [
    ...(set.rpe ? [`RPE ${set.rpe}`] : []),
    ...(set.duration_seconds ? [`${set.duration_seconds} sec`] : []),
    ...(set.distance_value ? [`${set.distance_value} ${set.distance_unit ?? ''}`] : []),
    ...(set.notes ? [set.notes] : []),
  ].join(' · ');
  return (
    <div
      role="group"
      aria-label={`Set ${index + 1}`}
      className="border-b border-border pb-2"
    >
      <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_2.75rem] items-start gap-1.5">
        <span
          className="flex h-12 items-center text-xs font-medium"
          title={set.set_type === 'warmup' ? 'Warm-up' : set.set_type === 'dropset' ? 'Drop set' : `Set ${index + 1}`}
        >
          {set.set_type === 'warmup' ? 'W' : set.set_type === 'dropset' ? 'D' : index + 1}
        </span>
        {(['reps', 'load_value', 'rest_seconds'] as const).map((key) => (
          <div
            key={key}
            className="min-w-0"
          >
            <Controller
              control={form.control}
              name={`${path}.${key}`}
              rules={{
                validate: (value) =>
                  key === 'reps' ||
                  value === '' ||
                  (key === 'rest_seconds' ? /^\d+$/.test(value) : Number.isFinite(Number(value))) ||
                  (key === 'rest_seconds' ? 'Use whole seconds.' : 'Enter a number.'),
              }}
              render={({field, fieldState}) => (
                <>
                  <Input
                    {...field}
                    aria-label={key === 'reps' ? 'Reps' : key === 'load_value' ? 'Load' : 'Rest (seconds)'}
                    aria-invalid={Boolean(fieldState.error)}
                    aria-describedby={fieldState.error ? `${path}.${key}-error` : undefined}
                    inputMode={key === 'reps' ? 'text' : key === 'load_value' ? 'decimal' : 'numeric'}
                    className="px-2 text-center"
                  />
                  <span
                    id={`${path}.${key}-error`}
                    className="block text-xs text-destructive"
                  >
                    {fieldState.error?.message}
                  </span>
                </>
              )}
            />
            {key === 'load_value' && (
              <span className="block text-center text-xs text-muted-foreground">
                {set.load_unit === 'bodyweight'
                  ? 'Bodyweight'
                  : set.load_unit === 'none'
                    ? 'No unit'
                    : set.load_unit || 'No unit'}
              </span>
            )}
          </div>
        ))}
        <DropdownMenuTrigger>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Set ${index + 1} actions`}
          >
            <MoreHorizontal aria-hidden="true" />
          </Button>
          <DropdownMenu
            aria-label={`Set ${index + 1} actions`}
            placement="bottom end"
          >
            <DropdownMenuItem onAction={() => setExpanded(!open)}>
              {open ? 'Hide details' : 'More details'}
            </DropdownMenuItem>
            <DropdownMenuItem onAction={onEditMatching}>Edit matching sets</DropdownMenuItem>
            <DropdownMenuItem
              isDisabled={index === 0}
              onAction={() => onMove(index - 1)}
            >
              Move up
            </DropdownMenuItem>
            <DropdownMenuItem
              isDisabled={index === count - 1}
              onAction={() => onMove(index + 1)}
            >
              Move down
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onAction={onRemove}
            >
              Remove set
            </DropdownMenuItem>
          </DropdownMenu>
        </DropdownMenuTrigger>
      </div>
      {extras && !open && <p className="mt-1 break-words pl-7 text-xs text-muted-foreground">{extras}</p>}
      <div
        hidden={!open}
        className="mt-3 space-y-4 rounded-xl bg-muted/40 p-3"
      >
        <div className="grid grid-cols-2 items-start gap-4">
          <div className="grid gap-2">
            <label
              className="text-sm font-medium"
              id={`${path}.type-label`}
              htmlFor={`${path}.type`}
            >
              Set type
            </label>
            <Controller
              control={form.control}
              name={`${path}.set_type`}
              render={({field}) => (
                <SelectField
                  id={`${path}.type`}
                  name={field.name}
                  triggerRef={field.ref}
                  value={field.value ?? ''}
                  onBlur={field.onBlur}
                  onChange={(value) => field.onChange(value || null)}
                >
                  <SelectItem id="">Not specified</SelectItem>
                  <SelectItem id="working">Working</SelectItem>
                  <SelectItem id="warmup">Warm-up</SelectItem>
                  <SelectItem id="dropset">Drop set</SelectItem>
                </SelectField>
              )}
            />
          </div>
          <div className="grid gap-2">
            <label
              className="text-sm font-medium"
              id={`${path}.load-unit-label`}
              htmlFor={`${path}.load-unit`}
            >
              Load unit
            </label>
            <Controller
              control={form.control}
              name={`${path}.load_unit`}
              render={({field}) => (
                <SelectField
                  id={`${path}.load-unit`}
                  name={field.name}
                  triggerRef={field.ref}
                  value={field.value ?? ''}
                  onBlur={field.onBlur}
                  onChange={(value) => field.onChange(value || null)}
                >
                  <SelectItem id="">Not specified</SelectItem>
                  <SelectItem id="kg">kg</SelectItem>
                  <SelectItem id="lbs">lbs</SelectItem>
                  <SelectItem id="bodyweight">Bodyweight</SelectItem>
                  <SelectItem id="none">No unit</SelectItem>
                </SelectField>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name={`${path}.rpe`}
            label="RPE"
            inputMode="decimal"
            rules={{
              validate: (value) =>
                value === '' ||
                (typeof value === 'string' &&
                  Number.isFinite(Number(value)) &&
                  Number(value) >= 1 &&
                  Number(value) <= 10) ||
                'Enter an RPE from 1 to 10.',
            }}
          />
          <FormField
            control={form.control}
            name={`${path}.duration_seconds`}
            label="Duration (seconds)"
            inputMode="numeric"
            rules={{validate: integer}}
          />
          <FormField
            control={form.control}
            name={`${path}.distance_value`}
            label="Distance"
            inputMode="decimal"
            rules={{
              validate: (value) =>
                value === '' ||
                (typeof value === 'string' && Number.isFinite(Number(value)) && Number(value) >= 0) ||
                'Enter a positive distance or zero.',
            }}
          />
          <div className="grid gap-2">
            <label
              className="text-sm font-medium"
              id={`${path}.distance-unit-label`}
              htmlFor={`${path}.distance-unit`}
            >
              Distance unit
            </label>
            <Controller
              control={form.control}
              name={`${path}.distance_unit`}
              render={({field}) => (
                <SelectField
                  id={`${path}.distance-unit`}
                  name={field.name}
                  triggerRef={field.ref}
                  value={field.value ?? ''}
                  onBlur={field.onBlur}
                  onChange={(value) => field.onChange(value || null)}
                >
                  <SelectItem id="">Not specified</SelectItem>
                  <SelectItem id="meters">Meters</SelectItem>
                  <SelectItem id="km">km</SelectItem>
                  <SelectItem id="miles">Miles</SelectItem>
                  <SelectItem id="none">No unit</SelectItem>
                </SelectField>
              )}
            />
          </div>
          <div className="col-span-full">
            <FormField
              control={form.control}
              name={`${path}.notes`}
              label="Set notes"
              multiline
            />
          </div>
        </div>
        <Button
          variant="outline"
          onPress={async () => {
            if (
              await form.trigger([`${path}.rpe`, `${path}.duration_seconds`, `${path}.distance_value`], {
                shouldFocus: true,
              })
            ) {
              setExpanded(false);
            }
          }}
        >
          Done
        </Button>
      </div>
    </div>
  );
}
function integer(value: unknown) {
  return value === '' || (typeof value === 'string' && /^\d+$/.test(value)) || 'Enter whole seconds, zero or greater.';
}
