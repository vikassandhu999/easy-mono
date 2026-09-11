import {Controller, type UseFormReturn} from 'react-hook-form';
import type {CheckInSchedule, CheckInScheduleCreate} from '../api/check-in-schedules';
import {FormError} from '../ui/form-error';
import {FormField} from '../ui/form-field';
import {SelectItem} from '../ui/select';
import {SelectField} from '../ui/select-field';

export const frequencyLabels = {
  once: 'One time',
  weekly: 'Every week',
  biweekly: 'Every 2 weeks',
  monthly: 'Every month',
} satisfies Record<CheckInSchedule['frequency'], string>;
export type ScheduleFields = CheckInScheduleCreate;

export function ScheduleFields({
  form,
  disabled,
  first = false,
}: {
  form: UseFormReturn<ScheduleFields>;
  disabled: boolean;
  first?: boolean;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <FormField
        control={form.control}
        name="next_due_on"
        label={first ? 'First due date' : 'Next due date'}
        type="date"
        isRequired
        isDisabled={disabled}
      />
      <Controller
        control={form.control}
        name="frequency"
        render={({field, fieldState}) => (
          <div className="grid content-start gap-2">
            <span
              id="frequency-label"
              className="text-sm font-medium"
            >
              Repeat
            </span>
            <SelectField
              id="frequency"
              value={field.value}
              triggerRef={field.ref}
              onBlur={field.onBlur}
              isDisabled={disabled}
              isInvalid={Boolean(fieldState.error)}
              onChange={(value) => {
                if (value === 'once' || value === 'weekly' || value === 'biweekly' || value === 'monthly') {
                  field.onChange(value);
                }
              }}
            >
              <SelectItem id="once">One time</SelectItem>
              <SelectItem id="weekly">Every week</SelectItem>
              <SelectItem id="biweekly">Every 2 weeks</SelectItem>
              <SelectItem id="monthly">Every month</SelectItem>
            </SelectField>
            <FormError message={fieldState.error?.message} />
          </div>
        )}
      />
    </div>
  );
}
