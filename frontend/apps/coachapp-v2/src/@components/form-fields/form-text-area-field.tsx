import {Description, FieldError, Label, TextArea, TextField} from '@heroui/react';
import {cn} from '@heroui/styles';
import type {ComponentProps} from 'react';
import {Controller, type FieldValues} from 'react-hook-form';

import type {BaseFormFieldProps} from './form-field-types';

type FormTextAreaFieldProps<T extends FieldValues> = BaseFormFieldProps<T> & {
  onValueChange?: (value: string) => void;
  textAreaProps?: Omit<ComponentProps<typeof TextArea>, 'name' | 'onBlur' | 'onChange' | 'value'>;
} & Omit<ComponentProps<typeof TextField>, 'children' | 'isInvalid' | 'name' | 'onBlur' | 'onChange' | 'value'>;

export function FormTextAreaField<T extends FieldValues>({
  control,
  description,
  label,
  name,
  onValueChange,
  textAreaProps,
  ...props
}: FormTextAreaFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({field, fieldState}) => (
        <TextField
          {...props}
          isInvalid={!!fieldState.error}
          name={field.name}
          onBlur={field.onBlur}
          onChange={(value) => {
            field.onChange(value);
            onValueChange?.(value);
          }}
          value={field.value ?? ''}
        >
          <Label>{label}</Label>
          {description ? <Description>{description}</Description> : null}
          {fieldState.error ? <FieldError>{fieldState.error.message}</FieldError> : null}
          <TextArea
            {...textAreaProps}
            className={cn('border border-border bg-surface shadow-none', textAreaProps?.className)}
          />
        </TextField>
      )}
    />
  );
}
