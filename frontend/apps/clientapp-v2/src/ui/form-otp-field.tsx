import {InputOTP, Label, REGEXP_ONLY_DIGITS} from '@heroui/react';
import {type Control, Controller, type FieldValues, type Path} from 'react-hook-form';

type FormOtpFieldProps<T extends FieldValues> = {
  autoFocus?: boolean;
  control: Control<T>;
  label: string;
  name: Path<T>;
};

export function FormOtpField<T extends FieldValues>({autoFocus, control, label, name}: FormOtpFieldProps<T>) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Controller
        control={control}
        name={name}
        render={({field, fieldState, formState}) => (
          <InputOTP
            autoFocus={autoFocus}
            isInvalid={!!fieldState.error || !!formState.errors.root}
            maxLength={6}
            onBlur={field.onBlur}
            onChange={field.onChange}
            pattern={REGEXP_ONLY_DIGITS}
            value={field.value}
          >
            <InputOTP.Group>
              <InputOTP.Slot index={0} />
              <InputOTP.Slot index={1} />
              <InputOTP.Slot index={2} />
            </InputOTP.Group>
            <InputOTP.Separator />
            <InputOTP.Group>
              <InputOTP.Slot index={3} />
              <InputOTP.Slot index={4} />
              <InputOTP.Slot index={5} />
            </InputOTP.Group>
          </InputOTP>
        )}
      />
    </div>
  );
}
