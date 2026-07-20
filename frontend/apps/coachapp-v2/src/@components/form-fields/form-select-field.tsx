import {Description, FieldError, Label, ListBox, Select} from '@heroui/react';
import {cn} from '@heroui/styles';
import type {ComponentProps, ReactNode} from 'react';
import {Controller, type FieldValues} from 'react-hook-form';

import type {BaseFormFieldProps} from './form-field-types';

type FormSelectFieldProps<T extends FieldValues> = BaseFormFieldProps<T> & {
  children: ReactNode;
  descriptionClassName?: string;
  listBoxProps?: ComponentProps<typeof ListBox>;
  triggerProps?: ComponentProps<typeof Select.Trigger>;
} & Omit<ComponentProps<typeof Select>, 'children' | 'isInvalid' | 'onSelectionChange' | 'selectedKey'>;

export function FormSelectField<T extends FieldValues>({
  children,
  control,
  description,
  descriptionClassName,
  label,
  listBoxProps,
  name,
  triggerProps,
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
          {fieldState.error ? <FieldError>{fieldState.error.message}</FieldError> : null}
          <Select.Trigger
            {...triggerProps}
            className={cn('min-h-11 border border-border bg-surface shadow-none ', triggerProps?.className)}
          >
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          {description ? <Description className={descriptionClassName}>{description}</Description> : null}
          <Select.Popover>
            <ListBox {...listBoxProps}>{children}</ListBox>
          </Select.Popover>
        </Select>
      )}
    />
  );
}
