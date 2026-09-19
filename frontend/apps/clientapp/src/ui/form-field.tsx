import type {ComponentProps} from 'react';
import {FieldError, Text, TextField} from 'react-aria-components';
import {type Control, Controller, type ControllerProps, type FieldPath, type FieldValues} from 'react-hook-form';
import {Input} from './input';
import {Label} from './label';
import {Textarea} from './textarea';

export function FormField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  rules,
  multiline = false,
  isRequired = false,
  isDisabled = false,
  emphasis,
  ...inputProps
}: {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  description?: string;
  multiline?: boolean;
  isRequired?: boolean;
  isDisabled?: boolean;
  emphasis?: 'title' | 'item';
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
          {multiline ? (
            <Textarea
              maxLength={inputProps.maxLength}
              ref={field.ref}
            />
          ) : (
            <Input
              {...inputProps}
              className={emphasis === 'title' ? 'editor-name' : emphasis === 'item' ? 'editor-item-name' : ''}
              ref={field.ref}
            />
          )}
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
