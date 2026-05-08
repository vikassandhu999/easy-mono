import {Button, Input, Label} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Plus} from 'lucide-react';
import {useId} from 'react';
import {useForm, useWatch} from 'react-hook-form';
import {z} from 'zod';

import {applyFormErrors} from '@/api/shared';

const workoutNameFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
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
  placeholder = 'e.g. Push Day',
  submitLabel,
}: WorkoutNameFormProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  const {
    control,
    formState: {errors},
    handleSubmit,
    register,
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
    <form
      className="flex flex-col gap-2"
      onSubmit={handleFormSubmit}
    >
      <div className="flex flex-col gap-1">
        <Label
          className="text-xs text-foreground-400"
          htmlFor={inputId}
        >
          {label}
        </Label>
        <Input
          id={inputId}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !isSubmitting) {
              onCancel();
            }
          }}
          placeholder={placeholder}
          {...register('name')}
        />
        {errors.name ? <p className="text-xs text-danger">{errors.name.message}</p> : null}
      </div>

      {errors.root ? (
        <p
          aria-live="polite"
          className="text-xs text-danger"
        >
          {errors.root.message}
        </p>
      ) : null}

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
    </form>
  );
}
