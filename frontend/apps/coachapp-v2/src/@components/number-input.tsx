import {Description, FieldError, Input, Label, TextField} from '@heroui/react';
import {type ComponentProps, type ReactNode, useEffect, useState} from 'react';

// A numeric input backed by a plain text field (inputMode="decimal") instead of
// react-aria's NumberField. NumberField is controlled by the *numeric* value and
// re-pushes a reformatted string on every keystroke; on mobile soft keyboards
// that races with the virtual keyboard and drops characters after a couple of
// digits. Holding the raw string here and only parsing up to a number keeps
// typing intact — the same approach the plan builders' inputs already use.

type NumberInputProps = {
  onChange: (value: number | undefined) => void;
  value: number | undefined;
  description?: ReactNode;
  error?: string;
  fullWidth?: boolean;
  inputProps?: Omit<ComponentProps<typeof Input>, 'onBlur' | 'onChange' | 'value'>;
  isRequired?: boolean;
  label?: ReactNode;
  minValue?: number;
  name?: string;
  onBlur?: () => void;
};

function toText(value: number | undefined): string {
  return typeof value === 'number' && !Number.isNaN(value) ? String(value) : '';
}

export function NumberInput({
  description,
  error,
  fullWidth,
  inputProps,
  isRequired,
  label,
  minValue,
  name,
  onBlur,
  onChange,
  value,
}: NumberInputProps) {
  const [text, setText] = useState(() => toText(value));

  // Re-sync the visible text when the numeric value changes from the outside
  // (form reset / server re-sync). Skipped while the entry is mid-way (e.g. "1."
  // parses fine but "." does not) so we never wipe what the user is typing.
  useEffect(() => {
    const parsed = text.trim() === '' ? undefined : Number(text);
    if (parsed !== undefined && Number.isNaN(parsed)) {
      return;
    }
    if (value !== parsed) {
      setText(toText(value));
    }
  }, [value, text]);

  const handleChange = (raw: string) => {
    // Keep digits and a single decimal point; drop everything else so a stray
    // letter (full keyboard) or a second dot can't wedge entry.
    let cleaned = raw.replace(/[^0-9.]/g, '');
    const firstDot = cleaned.indexOf('.');
    if (firstDot !== -1) {
      cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
    }
    setText(cleaned);

    const trimmed = cleaned.trim();
    if (trimmed === '') {
      onChange(undefined);
      return;
    }
    const num = Number(trimmed);
    if (!Number.isNaN(num) && (minValue === undefined || num >= minValue)) {
      onChange(num);
    }
  };

  return (
    <TextField
      fullWidth={fullWidth}
      isInvalid={!!error}
      isRequired={isRequired}
      name={name}
      onBlur={onBlur}
      onChange={handleChange}
      value={text}
    >
      {label !== undefined && label !== '' ? <Label>{label}</Label> : null}
      {description ? <Description>{description}</Description> : null}
      {error ? <FieldError>{error}</FieldError> : null}
      <Input
        inputMode="decimal"
        {...inputProps}
      />
    </TextField>
  );
}
