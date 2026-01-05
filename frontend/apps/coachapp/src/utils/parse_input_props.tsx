import {InputProps} from '@mantine/core';
import {ControllerFieldState, ControllerRenderProps, UseFormStateReturn} from 'react-hook-form';

export const parse_input_props = ({
  field,
  fieldState,
}: {
  field: ControllerRenderProps<any, any>;
  fieldState: ControllerFieldState;
  formState: UseFormStateReturn<any>;
}): InputProps => {
  return {
    ...field,
    disabled: field.disabled,
    error: fieldState.error?.message,
    required: fieldState.isTouched,
  };
};
