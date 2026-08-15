import {Description, ErrorMessage, Fieldset} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {FormActions} from '@/@components/form-fields/form-actions';
import {FormLayout} from '@/@components/form-fields/form-layout';
import {FormPanel} from '@/@components/form-fields/form-panel';
import {FormTextAreaField} from '@/@components/form-fields/form-text-area-field';
import {FormTextField} from '@/@components/form-fields/form-text-field';
import {
  TRAINING_PLAN_FORM_DEFAULTS,
  type TrainingPlanFormValues,
  trainingPlanFormSchema,
} from './training-plan-form-data';

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
