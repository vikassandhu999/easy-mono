/**
 * Idiomatic HeroUI v3 date input: typeable segments + a calendar popover
 * (DatePicker = DateField segments inside a Group, with a Calendar in a Popover).
 * Callers pass/receive an ISO "YYYY-MM-DD" string. Shared by the client profile
 * editor, plan scheduling, and the training-plan header so date entry is
 * consistent across the app.
 */
import {Calendar, DateField, DatePicker, FieldError, Label} from '@heroui/react';
import {type DateValue, parseDate} from '@internationalized/date';
import type {ReactNode} from 'react';

/** ISO "YYYY-MM-DD" -> DateValue (or null). Tolerates a datetime by slicing. */
function toDateValue(iso: null | string): DateValue | null {
  if (!iso) {
    return null;
  }
  try {
    return parseDate(iso.slice(0, 10));
  } catch {
    return null;
  }
}

interface DateInputProps {
  ariaLabel?: string;
  errorMessage?: ReactNode;
  isDisabled?: boolean;
  isRequired?: boolean;
  label?: ReactNode;
  /** Override the default label styling (e.g. compact muted labels). */
  labelClassName?: string;
  /** Inclusive earliest selectable day (`YYYY-MM-DD`). */
  min?: null | string;
  onBlur?: () => void;
  onChange: (iso: null | string) => void;
  value: null | string;
}

export default function DateInput({
  ariaLabel,
  errorMessage,
  isDisabled,
  isRequired,
  label,
  labelClassName,
  min,
  onBlur,
  onChange,
  value,
}: DateInputProps) {
  const minValue = toDateValue(min ?? null) ?? undefined;

  return (
    <DatePicker
      {...(label ? {} : ariaLabel ? {'aria-label': ariaLabel} : {})}
      {...(isDisabled != null ? {isDisabled} : {})}
      isInvalid={Boolean(errorMessage)}
      {...(isRequired != null ? {isRequired} : {})}
      {...(minValue !== undefined ? {minValue} : {})}
      {...(onBlur ? {onBlur} : {})}
      onChange={(date: DateValue | null) => onChange(date ? date.toString() : null)}
      value={toDateValue(value)}
    >
      {label ? <Label className={labelClassName}>{label}</Label> : null}
      <DateField.Group fullWidth>
        <DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
        <DateField.Suffix>
          <DatePicker.Trigger>
            <DatePicker.TriggerIndicator />
          </DatePicker.Trigger>
        </DateField.Suffix>
      </DateField.Group>
      {errorMessage ? <FieldError>{errorMessage}</FieldError> : null}
      <DatePicker.Popover>
        <Calendar aria-label={ariaLabel ?? (typeof label === 'string' ? label : 'Choose date')}>
          <Calendar.Header>
            <Calendar.NavButton slot="previous" />
            <Calendar.Heading />
            <Calendar.NavButton slot="next" />
          </Calendar.Header>
          <Calendar.Grid>
            <Calendar.GridHeader>{(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}</Calendar.GridHeader>
            <Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody>
          </Calendar.Grid>
        </Calendar>
      </DatePicker.Popover>
    </DatePicker>
  );
}
