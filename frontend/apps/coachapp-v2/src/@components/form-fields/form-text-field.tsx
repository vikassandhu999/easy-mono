import {Description, FieldError, Input, Label, TextField} from '@heroui/react';
import {cn} from '@heroui/styles';
import type {ComponentProps} from 'react';
import {Controller, type FieldValues} from 'react-hook-form';
import {INPUT_SKIN_CLASS} from '@/@components/form-fields/form-classes';

import type {BaseFormFieldProps} from './form-field-types';

type FormTextFieldProps<T extends FieldValues> = BaseFormFieldProps<T> & {
  inputProps?: Omit<ComponentProps<typeof Input>, 'name' | 'onBlur' | 'onChange' | 'value'>;
  onFieldBlur?: () => void;
  onValueChange?: (value: string) => void;
} & Omit<ComponentProps<typeof TextField>, 'children' | 'isInvalid' | 'name' | 'onBlur' | 'onChange' | 'value'>;

export function FormTextField<T extends FieldValues>({
  control,
  description,
  inputProps,
  label,
  name,
  onFieldBlur,
  onValueChange,
  ...props
}: FormTextFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({field, fieldState}) => (
        <TextField
          {...props}
          isInvalid={!!fieldState.error}
          name={field.name}
          onBlur={() => {
            field.onBlur();
            onFieldBlur?.();
          }}
          onChange={(value) => {
            field.onChange(value);
            onValueChange?.(value);
          }}
          value={field.value ?? ''}
        >
          <Label>{label}</Label>
          {description ? <Description>{description}</Description> : null}
          {fieldState.error ? <FieldError>{fieldState.error.message}</FieldError> : null}
          <Input
            {...inputProps}
            className={cn(INPUT_SKIN_CLASS, inputProps?.className)}
          />
        </TextField>
      )}
    />
  );
}
