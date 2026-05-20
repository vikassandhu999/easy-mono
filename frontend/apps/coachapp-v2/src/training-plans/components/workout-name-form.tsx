import {Button, ErrorMessage, FieldError, Form, Input, Label, TextField} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Plus} from 'lucide-react';
import {useId} from 'react';
import {Controller, useForm, useWatch} from 'react-hook-form';
import {z} from 'zod';

import {applyFormErrors} from '@/api/shared';

const workoutNameFormSchema = z.object({
  name: z.string().trim().min(1, 'Enter workout name'),
});

export type WorkoutNameFormValues = z.infer<typeof workoutNameFormSchema>;

type WorkoutNameFormProps = {
  fallbackError: string;
  id?: string;
  isSubmitting: boolean;
  label: string;
  onCancel: () => void;
  onSubmit: (values: WorkoutNameFormValues) => Promise<void>;
  placeholder?: string;
  submitLabel: string;
};

export default function WorkoutNameForm({
  fallbackError,
  id,
  isSubmitting,
  label,
  onCancel,
  onSubmit,
  placeholder = 'e.g. Push day',
  submitLabel,
}: WorkoutNameFormProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  const {
    control,
    formState: {errors},
    handleSubmit,
    reset,
    setError,
  } = useForm<WorkoutNameFormValues>({
    defaultValues: {name: ''},
    mode: 'onChange',
    resolver: zodResolver(workoutNameFormSchema),
  });

  const nameValue = useWatch({control, name: 'name'}) ?? '';

  const handleFormSubmit = handleSubmit(async (values) => {
    try {
      await onSubmit(values);
      reset();
    } catch (error) {
      applyFormErrors(error, fallbackError, setError, ['name']);
    }
  });

  return (
    <Form
      className="flex flex-col gap-2"
      onSubmit={handleFormSubmit}
    >
      <Controller
        control={control}
        name="name"
        render={({field}) => (
          <TextField
            fullWidth
            isInvalid={!!errors.name}
            name={field.name}
            onBlur={field.onBlur}
            onChange={field.onChange}
            value={field.value}
          >
            <Label>{label}</Label>
            {errors.name && <FieldError>{errors.name.message}</FieldError>}
            <Input
              id={inputId}
              onKeyDown={(event) => {
                if (event.key === 'Escape' && !isSubmitting) {
                  onCancel();
                }
              }}
              placeholder={placeholder}
            />
          </TextField>
        )}
      />

      {errors.root && <ErrorMessage>{errors.root.message}</ErrorMessage>}

      <div className="flex flex-wrap gap-2">
        <Button
          className="min-h-11"
          isDisabled={!nameValue.trim() || isSubmitting}
          isPending={isSubmitting}
          size="sm"
          type="submit"
        >
          <Plus size={14} />
          {submitLabel}
        </Button>
        <Button
          className="min-h-11"
          isDisabled={isSubmitting}
          onPress={onCancel}
          size="sm"
          type="button"
          variant="ghost"
        >
          Cancel
        </Button>
      </div>
    </Form>
  );
}
