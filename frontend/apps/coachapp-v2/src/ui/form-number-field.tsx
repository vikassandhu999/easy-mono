import {type ComponentProps} from 'react';
import {Controller, type FieldValues} from 'react-hook-form';
import type {BaseFormFieldProps} from '@/ui/form-field-types';
import {toNumberFieldValue} from '@/ui/number-field-value';
import {NumberInput} from '@/ui/number-input';

// Number field for react-hook-form. Delegates to the shared NumberInput (a plain
// text input) so mobile soft keyboards don't drop digits the way react-aria's
// NumberField does — see number-input.tsx.

type FormNumberFieldProps<T extends FieldValues> = BaseFormFieldProps<T> & {
  fullWidth?: boolean;
  inputProps?: ComponentProps<typeof NumberInput>['inputProps'];
  isRequired?: boolean;
  minValue?: number;
  onFieldBlur?: () => void;
  onValueChange?: (value: number | undefined) => void;
};

export function FormNumberField<T extends FieldValues>({
  control,
  description,
  fullWidth,
  inputProps,
  isRequired,
  label,
  minValue,
  name,
  onFieldBlur,
  onValueChange,
}: FormNumberFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({field, fieldState}) => (
        <NumberInput
          description={description}
          {...(fieldState.error?.message ? {error: fieldState.error.message} : {})}
          {...(fullWidth != null ? {fullWidth} : {})}
          {...(inputProps ? {inputProps} : {})}
          {...(isRequired != null ? {isRequired} : {})}
          label={label}
          {...(minValue != null ? {minValue} : {})}
          name={field.name}
          onBlur={() => {
            field.onBlur();
            onFieldBlur?.();
          }}
          onChange={(value) => {
            field.onChange(toNumberFieldValue(value));
            onValueChange?.(value);
          }}
          value={typeof field.value === 'number' ? field.value : undefined}
        />
      )}
    />
  );
}
