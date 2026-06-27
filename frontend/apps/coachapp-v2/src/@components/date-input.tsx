/**
 * Idiomatic HeroUI v3 date input: typeable segments + a calendar popover
 * (DatePicker = DateField segments inside a Group, with a Calendar in a Popover).
 * Callers pass/receive an ISO "YYYY-MM-DD" string. Shared by the client profile
 * editor, plan scheduling, and the training-plan header so date entry is
 * consistent across the app.
 */
import {Calendar, DateField, DatePicker, Label} from '@heroui/react';
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
  isRequired?: boolean;
  label?: ReactNode;
  /** Override the default label styling (e.g. compact muted labels). */
  labelClassName?: string;
  onChange: (iso: null | string) => void;
  value: null | string;
}

export default function DateInput({ariaLabel, isRequired, label, labelClassName, onChange, value}: DateInputProps) {
  return (
    <DatePicker
      aria-label={label ? undefined : ariaLabel}
      isRequired={isRequired}
      onChange={(date: DateValue | null) => onChange(date ? date.toString() : null)}
      value={toDateValue(value)}
    >
      {label ? <Label className={labelClassName ?? 'mb-1.5 block text-sm font-medium'}>{label}</Label> : null}
      <DateField.Group className="flex w-full items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus-within:border-accent">
        <DateField.Input className="flex-1">{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
        <DateField.Suffix>
          <DatePicker.Trigger className="grid place-items-center text-muted transition-colors hover:text-foreground">
            <DatePicker.TriggerIndicator />
          </DatePicker.Trigger>
        </DateField.Suffix>
      </DateField.Group>
      <DatePicker.Popover className="p-2">
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
