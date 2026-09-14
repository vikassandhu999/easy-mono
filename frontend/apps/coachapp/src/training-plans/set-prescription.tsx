import {Controller, useForm} from 'react-hook-form';
import {Button} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormField} from '../ui/form-field';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import type {DraftSet} from './prescription';
export type SetTargets = Pick<DraftSet, 'reps' | 'load_value' | 'load_unit' | 'rest_seconds'>;
type ExtraTargets = Pick<DraftSet, 'duration_seconds' | 'distance_value' | 'distance_unit' | 'rpe' | 'notes'>;
export type SetPrescriptionMode = {kind: 'add'} | {kind: 'matching' | 'shared'; source: DraftSet};
export function matchesTargets(set: DraftSet, source: DraftSet) {
  return (
    set.set_type === source.set_type &&
    set.reps === source.reps &&
    set.load_value === source.load_value &&
    set.load_unit === source.load_unit &&
    set.rest_seconds === source.rest_seconds
  );
}
export function SetPrescription({
  mode,
  onApply,
  onClose,
}: {
  mode: SetPrescriptionMode;
  onApply: (targets: SetTargets & Partial<ExtraTargets>, count: number) => void;
  onClose: () => void;
}) {
  const source = mode.kind !== 'add' ? mode.source : undefined;
  const form = useForm<SetTargets & ExtraTargets & {count: string}>({
    defaultValues: {
      count: '3',
      reps: source?.reps ?? '',
      load_value: source?.load_value ?? '',
      load_unit: source ? (source.load_unit ?? null) : 'kg',
      rest_seconds: source?.rest_seconds ?? '',
      duration_seconds: source?.duration_seconds ?? '',
      distance_value: source?.distance_value ?? '',
      distance_unit: source?.distance_unit ?? null,
      rpe: source?.rpe ?? '',
      notes: source?.notes ?? '',
    },
  });
  return (
    <Dialog
      isOpen
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogHeader>
        <DialogTitle>
          {mode.kind === 'add'
            ? 'Prescribe sets'
            : mode.kind === 'shared'
              ? 'Targets for all sets'
              : 'Edit matching sets'}
        </DialogTitle>
      </DialogHeader>
      <div className="dialog-body">
        <form
          noValidate
          className="space-y-5"
          onSubmit={(event) => {
            event.stopPropagation();
            form.handleSubmit(({count, ...targets}) => {
              if (mode.kind === 'matching') {
                const {reps, load_value, load_unit, rest_seconds} = targets;
                onApply({reps, load_value, load_unit: load_unit ?? null, rest_seconds}, Number(count));
              } else {
                onApply(targets, Number(count));
              }
            })(event);
          }}
        >
          <p className="text-sm text-muted-foreground">
            {mode.kind === 'add'
              ? 'Set the targets once. You can adjust individual sets afterward.'
              : mode.kind === 'shared'
                ? 'Applies to every set in this exercise. Fill in only the targets your client needs.'
                : 'Updates sets of the same type with these exact reps, load and rest targets. Individual exceptions and extra instructions stay as they are.'}
          </p>
          {mode.kind !== 'shared' && (
            <div className="grid grid-cols-2 items-start gap-4">
              {mode.kind === 'add' && (
                <FormField
                  control={form.control}
                  name="count"
                  label="Number of sets"
                  inputMode="numeric"
                  isRequired
                  rules={{
                    validate: (value) =>
                      (typeof value === 'string' && /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 30) ||
                      'Choose 1 to 30 sets.',
                  }}
                />
              )}
              <FormField
                control={form.control}
                name="reps"
                label="Reps"
                description="For example, 8–10."
              />
              <FormField
                control={form.control}
                name="load_value"
                label="Load"
                inputMode="decimal"
                rules={{
                  validate: (value) =>
                    value === '' || (typeof value === 'string' && Number.isFinite(Number(value))) || 'Enter a number.',
                }}
              />
              <div className="grid content-start gap-2">
                <label
                  id="prescribe-load-unit-label"
                  htmlFor="prescribe-load-unit"
                  className="text-sm font-medium"
                >
                  Load unit
                </label>
                <Controller
                  control={form.control}
                  name="load_unit"
                  render={({field}) => (
                    <SelectField
                      id="prescribe-load-unit"
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
                name="rest_seconds"
                label="Rest (seconds)"
                inputMode="numeric"
                rules={{
                  validate: (value) =>
                    value === '' ||
                    (typeof value === 'string' && /^\d+$/.test(value)) ||
                    'Enter whole seconds, zero or greater.',
                }}
              />
            </div>
          )}
          {mode.kind !== 'matching' && (
            <div className="grid grid-cols-2 items-start gap-4">
              <h3 className="col-span-full text-sm font-medium">Duration, distance & effort · optional</h3>
              <FormField
                control={form.control}
                name="duration_seconds"
                label="Duration (seconds)"
                inputMode="numeric"
                rules={{
                  validate: (value) =>
                    value === '' ||
                    (typeof value === 'string' && /^\d+$/.test(value)) ||
                    'Enter whole seconds, zero or greater.',
                }}
              />
              <FormField
                control={form.control}
                name="rpe"
                label="RPE"
                description="Effort from 1 to 10."
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
                name="distance_value"
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
                  id="prescribe-distance-unit-label"
                  htmlFor="prescribe-distance-unit"
                  className="text-sm font-medium"
                >
                  Distance unit
                </label>
                <Controller
                  control={form.control}
                  name="distance_unit"
                  render={({field}) => (
                    <SelectField
                      id="prescribe-distance-unit"
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
                  name="notes"
                  label="Set notes"
                  multiline
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onPress={onClose}
            >
              Cancel
            </Button>
            <Button type="submit">
              {mode.kind === 'add' ? 'Add sets' : mode.kind === 'shared' ? 'Apply to all sets' : 'Update matching sets'}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
