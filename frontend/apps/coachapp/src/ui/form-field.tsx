import type {ComponentProps} from 'react';
import {FieldError, Text, TextField} from 'react-aria-components';
import {type Control, Controller, type ControllerProps, type FieldPath, type FieldValues} from 'react-hook-form';
import {Input} from './input';
import {Label} from './label';

export function FormField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  rules,
  isRequired = false,
  isDisabled = false,
  ...inputProps
}: {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  description?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  rules?: ControllerProps<T>['rules'];
} & Pick<ComponentProps<typeof Input>, 'type' | 'autoComplete' | 'inputMode' | 'maxLength'>) {
  return (
    <Controller
      control={control}
      name={name}
      rules={{
        required: isRequired ? `Enter ${label.toLowerCase()}.` : false,
        ...(inputProps.type === 'email'
          ? {pattern: {value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address.'}}
          : {}),
        ...rules,
      }}
      render={({field, fieldState}) => (
        <TextField
          className="grid gap-2"
          name={field.name}
          value={field.value ?? ''}
          onChange={field.onChange}
          onBlur={field.onBlur}
          isInvalid={Boolean(fieldState.error)}
          validationBehavior="aria"
          isRequired={isRequired}
          isDisabled={isDisabled}
        >
          <Label>{label}</Label>
          <Input
            {...inputProps}
            ref={field.ref}
          />
          {description && (
            <Text
              slot="description"
              className="text-sm text-muted-foreground"
            >
              {description}
            </Text>
          )}
          <FieldError className="text-sm text-destructive">{fieldState.error?.message}</FieldError>
        </TextField>
      )}
    />
  );
}
