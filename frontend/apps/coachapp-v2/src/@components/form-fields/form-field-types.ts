import type {ReactNode} from 'react';
import type {Control, FieldValues, Path} from 'react-hook-form';

export type BaseFormFieldProps<T extends FieldValues> = {
  control: Control<T>;
  description?: ReactNode;
  label: ReactNode;
  name: Path<T>;
};
