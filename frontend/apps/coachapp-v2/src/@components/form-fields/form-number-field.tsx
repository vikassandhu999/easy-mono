import {Description, FieldError, Label, NumberField} from '@heroui/react';
import type {ComponentProps} from 'react';
import {Controller, type FieldValues} from 'react-hook-form';

import type {BaseFormFieldProps} from './form-field-types';

type FormNumberFieldProps<T extends FieldValues> = BaseFormFieldProps<T> & {
  onFieldBlur?: () => void;
  onValueChange?: (value: number | undefined) => void;
} & Omit<ComponentProps<typeof NumberField>, 'children' | 'isInvalid' | 'name' | 'onBlur' | 'onChange' | 'value'>;

export function FormNumberField<T extends FieldValues>({
  control,
  description,
  label,
  name,
  onFieldBlur,
  onValueChange,
  ...props
}: FormNumberFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({field, fieldState}) => (
        <NumberField
          {...props}
          isInvalid={!!fieldState.error}
          name={field.name}
          onBlur={() => {
            field.onBlur();
            onFieldBlur?.();
          }}
          onChange={(value) => {
            const nextValue = Number.isNaN(value) ? undefined : value;
            field.onChange(nextValue);
            onValueChange?.(nextValue);
          }}
          value={field.value}
        >
          <Label>{label}</Label>
          {description ? <Description>{description}</Description> : null}
          {fieldState.error ? <FieldError>{fieldState.error.message}</FieldError> : null}
          <NumberField.Group>
            <NumberField.Input />
          </NumberField.Group>
        </NumberField>
      )}
    />
  );
}
