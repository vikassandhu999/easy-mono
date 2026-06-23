import {Description, Switch} from '@heroui/react';
import type {ComponentProps} from 'react';
import {Controller, type FieldValues} from 'react-hook-form';

import type {BaseFormFieldProps} from './form-field-types';

type FormSwitchFieldProps<T extends FieldValues> = BaseFormFieldProps<T> &
  Omit<ComponentProps<typeof Switch>, 'children' | 'isSelected' | 'onBlur' | 'onChange'>;

export function FormSwitchField<T extends FieldValues>({
  control,
  description,
  label,
  name,
  ...props
}: FormSwitchFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({field}) => (
        <Switch
          {...props}
          isSelected={!!field.value}
          onBlur={field.onBlur}
          onChange={field.onChange}
        >
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            {label}
          </Switch.Content>
          {description ? <Description>{description}</Description> : null}
        </Switch>
      )}
    />
  );
}
