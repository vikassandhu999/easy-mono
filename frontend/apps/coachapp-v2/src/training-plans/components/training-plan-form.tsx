import {Button, Input, Label, Spinner, TextArea} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {z} from 'zod';

export const trainingPlanFormSchema = z.object({
  description: z.string().optional(),
  end_date: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  start_date: z.string().optional(),
});

export type TrainingPlanFormValues = z.infer<typeof trainingPlanFormSchema>;

export const TRAINING_PLAN_FORM_DEFAULTS: TrainingPlanFormValues = {
  description: '',
  end_date: '',
  name: '',
  start_date: '',
};

export function useTrainingPlanForm(options?: {values?: TrainingPlanFormValues}) {
  return useForm<TrainingPlanFormValues>({
    defaultValues: options?.values ? undefined : TRAINING_PLAN_FORM_DEFAULTS,
    resolver: zodResolver(trainingPlanFormSchema),
    values: options?.values,
  });
}

type TrainingPlanFormProps = {
  form: ReturnType<typeof useTrainingPlanForm>;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (data: TrainingPlanFormValues) => void;
  submitLabel: string;
  submittingLabel: string;
};

export default function TrainingPlanForm({
  form,
  isSubmitting,
  onCancel,
  onSubmit,
  submitLabel,
  submittingLabel,
}: TrainingPlanFormProps) {
  const {
    formState: {errors},
    handleSubmit,
    register,
  } = form;

  return (
    <form
      className="flex max-w-lg flex-col gap-4"
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">
          Name <span className="text-danger">*</span>
        </Label>
        <Input
          id="name"
          placeholder="e.g. Push Pull Legs"
          {...register('name')}
        />
        {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <TextArea
          id="description"
          placeholder="Brief description of this training plan..."
          rows={2}
          {...register('description')}
        />
        {errors.description && <p className="text-xs text-danger">{errors.description.message}</p>}
      </div>

      {errors.root && <p className="text-sm text-danger">{errors.root.message}</p>}

      <div className="flex flex-row gap-2 pt-2">
        <Button
          isPending={isSubmitting}
          type="submit"
        >
          {isSubmitting ? (
            <>
              <Spinner
                color="current"
                size="sm"
              />
              {submittingLabel}
            </>
          ) : (
            submitLabel
          )}
        </Button>
        <Button
          onPress={onCancel}
          variant="ghost"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
