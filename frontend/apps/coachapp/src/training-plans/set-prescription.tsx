import {Controller, useForm} from 'react-hook-form';
import {Button} from '../ui/button';
import {Dialog, DialogHeader, DialogTitle} from '../ui/dialog';
import {FormField} from '../ui/form-field';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';
import type {DraftSet} from './prescription';
export type SetTargets = Pick<DraftSet, 'reps' | 'load_value' | 'load_unit' | 'rest_seconds'>;
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
  mode: {kind: 'add'} | {kind: 'matching'; source: DraftSet};
  onApply: (targets: SetTargets, count: number) => void;
  onClose: () => void;
}) {
  const source = mode.kind === 'matching' ? mode.source : undefined;
  const form = useForm<SetTargets & {count: string}>({
    defaultValues: {
      count: '3',
      reps: source?.reps ?? '',
      load_value: source?.load_value ?? '',
      load_unit: source ? (source.load_unit ?? null) : 'kg',
      rest_seconds: source?.rest_seconds ?? '',
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
        <DialogTitle>{mode.kind === 'add' ? 'Prescribe sets' : 'Edit matching sets'}</DialogTitle>
      </DialogHeader>
      <div className="dialog-body">
        <form
          noValidate
          className="space-y-5"
          onSubmit={(event) => {
            event.stopPropagation();
            form.handleSubmit(({count, ...targets}) => onApply(targets, Number(count)))(event);
          }}
        >
          <p className="text-sm text-muted-foreground">
            {mode.kind === 'add'
              ? 'Set the targets once. You can adjust individual sets afterward.'
              : 'Updates sets of the same type with these exact reps, load and rest targets. Individual exceptions and extra instructions stay as they are.'}
          </p>
          <div className="grid grid-cols-2 gap-4">
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
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onPress={onClose}
            >
              Cancel
            </Button>
            <Button type="submit">{mode.kind === 'add' ? 'Add sets' : 'Update matching sets'}</Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
