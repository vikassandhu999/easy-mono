import {Description, ErrorMessage, Fieldset} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {
  TRAINING_PLAN_FORM_DEFAULTS,
  type TrainingPlanFormValues,
  trainingPlanFormSchema,
} from '@/library/training-plans/training-plan-form-data';
import {FormActions} from '@/ui/form-actions';
import {FormLayout} from '@/ui/form-layout';
import {FormPanel} from '@/ui/form-panel';
import {FormTextAreaField} from '@/ui/form-text-area-field';
import {FormTextField} from '@/ui/form-text-field';

export function useTrainingPlanForm(options?: {defaultValues?: TrainingPlanFormValues}) {
  return useForm<TrainingPlanFormValues>({
    defaultValues: options?.defaultValues ?? TRAINING_PLAN_FORM_DEFAULTS,
    resolver: zodResolver(trainingPlanFormSchema),
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
    control,
    formState: {errors},
    handleSubmit,
  } = form;

  return (
    <FormLayout onSubmit={handleSubmit(onSubmit)}>
      <FormPanel>
        <Fieldset>
          <Fieldset.Legend>Template details</Fieldset.Legend>
          <Description>Name the reusable Training Template and describe its purpose.</Description>

          <Fieldset.Group>
            <FormTextField
              control={control}
              fullWidth
              inputProps={{placeholder: 'e.g. Push Pull Legs'}}
              isRequired
              label="Name"
              name="name"
            />

            <FormTextAreaField
              control={control}
              fullWidth
              label="Description"
              name="description"
              textAreaProps={{placeholder: 'Goals, training split, or coaching notes…', rows: 2}}
            />
          </Fieldset.Group>
        </Fieldset>
      </FormPanel>

      {errors.root && <ErrorMessage>{errors.root.message}</ErrorMessage>}

      <FormActions
        isSubmitting={isSubmitting}
        onCancel={onCancel}
        submitLabel={submitLabel}
        submittingLabel={submittingLabel}
      />
    </FormLayout>
  );
}
