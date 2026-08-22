import {Description, FieldError, Label, ListBox, Select} from '@heroui/react';
import type {ComponentProps, ReactNode} from 'react';
import {Controller, type FieldValues} from 'react-hook-form';

import type {BaseFormFieldProps} from '@/ui/form-field-types';

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
      render={({field, fieldState}) => {
        const {className: triggerClassName, ...restTriggerProps} = triggerProps ?? {};

        return (
          // `selectedKey`/`onSelectionChange`, not `value`/`onChange`: HeroUI's Select
          // wraps react-aria's, which has no `value` prop at all — it was being
          // dropped, so a pre-selected value never displayed and every edit form with
          // a select opened showing its placeholder. (The prop type above already
          // Omits these two, which is the intent that was never wired.) Found on
          // CD-ED, where a client with an assigned coach rendered "Select a trainer…".
          <Select
            {...props}
            isInvalid={!!fieldState.error}
            onSelectionChange={(key) => field.onChange(key ?? undefined)}
            selectedKey={field.value || null}
          >
            {/* Label · Description · FieldError · control — the same order as
              `form-text-field`, `form-text-area-field` and `number-input`. The
              description used to sit AFTER the trigger here, so a select's help
              text rendered below its control while every other field's rendered
              above it. */}
            <Label>{label}</Label>
            {description ? <Description className={descriptionClassName}>{description}</Description> : null}
            {fieldState.error ? <FieldError>{fieldState.error.message}</FieldError> : null}
            <Select.Trigger
              {...restTriggerProps}
              {...(triggerClassName ? {className: triggerClassName} : {})}
            >
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox {...listBoxProps}>{children}</ListBox>
            </Select.Popover>
          </Select>
        );
      }}
    />
  );
}
