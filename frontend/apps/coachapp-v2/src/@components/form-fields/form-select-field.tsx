import {Description, FieldError, Label, ListBox, Select} from '@heroui/react';
import type {ComponentProps, ReactNode} from 'react';
import {Controller, type FieldValues} from 'react-hook-form';

import type {BaseFormFieldProps} from './form-field-types';

type FormSelectFieldProps<T extends FieldValues> = BaseFormFieldProps<T> & {
  children: ReactNode;
  listBoxProps?: ComponentProps<typeof ListBox>;
} & Omit<ComponentProps<typeof Select>, 'children' | 'isInvalid' | 'onSelectionChange' | 'selectedKey'>;

export function FormSelectField<T extends FieldValues>({
  children,
  control,
  description,
  label,
  listBoxProps,
  name,
  ...props
}: FormSelectFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({field, fieldState}) => (
        <Select
          {...props}
          isInvalid={!!fieldState.error}
          onChange={(key) => field.onChange(key ?? undefined)}
          value={field.value || null}
        >
          <Label>{label}</Label>
          {description ? <Description>{description}</Description> : null}
          {fieldState.error ? <FieldError>{fieldState.error.message}</FieldError> : null}
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox {...listBoxProps}>{children}</ListBox>
          </Select.Popover>
        </Select>
      )}
    />
  );
}
