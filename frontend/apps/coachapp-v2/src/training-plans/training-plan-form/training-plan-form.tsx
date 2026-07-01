import {ErrorMessage, Fieldset} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {z} from 'zod';
import {FieldRow, FormActions, FormLayout, FormTextAreaField, FormTextField} from '@/@components/form-fields';
import type {TrainingPlan, TrainingPlanCreateRequest, TrainingPlanUpdateRequest} from '@/api/generated';
import {omitUndefined, toNullableText, toOptionalText} from '@/api/shared';

export const schema = z.object({
  description: z.string().optional(),
  end_date: z.string().optional(),
  name: z.string().min(1, 'Enter plan name'),
  start_date: z.string().optional(),
});

export type TrainingPlanFormValues = z.infer<typeof schema>;

export const TRAINING_PLAN_FORM_DEFAULTS: TrainingPlanFormValues = {
  description: '',
  end_date: '',
  name: '',
  start_date: '',
};

export function trainingPlanToFormValues(plan: TrainingPlan): TrainingPlanFormValues {
  return {
    description: plan.description ?? '',
    end_date: plan.end_date ?? '',
    name: plan.name,
    start_date: plan.start_date ?? '',
  };
}

export function trainingPlanToCreateRequest(values: TrainingPlanFormValues): TrainingPlanCreateRequest {
  return omitUndefined({
    name: values.name,
    description: toOptionalText(values.description),
    start_date: values.start_date || undefined,
    end_date: values.end_date || undefined,
  });
}

export function trainingPlanToUpdateRequest(values: TrainingPlanFormValues): TrainingPlanUpdateRequest {
  return {
    name: values.name,
    description: toNullableText(values.description),
    start_date: values.start_date || null,
    end_date: values.end_date || null,
  };
}

export function useTrainingPlanForm(options?: {values?: TrainingPlanFormValues}) {
  return useForm<TrainingPlanFormValues>({
    defaultValues: options?.values ? undefined : TRAINING_PLAN_FORM_DEFAULTS,
    resolver: zodResolver(schema),
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
    control,
    formState: {errors},
    handleSubmit,
  } = form;

  return (
    <FormLayout onSubmit={handleSubmit(onSubmit)}>
      <Fieldset>
        <Fieldset.Legend>Plan details</Fieldset.Legend>

        <Fieldset.Group>
          <FormTextField
            control={control}
            fullWidth
            inputProps={{placeholder: 'Push pull legs'}}
            isRequired
            label="Name"
            name="name"
          />

          <FormTextAreaField
            control={control}
            fullWidth
            label="Description"
            name="description"
            textAreaProps={{placeholder: 'Goals, training split, or coaching notes', rows: 2}}
          />
        </Fieldset.Group>
      </Fieldset>

      <Fieldset>
        <Fieldset.Legend>Schedule</Fieldset.Legend>

        <Fieldset.Group>
          <FieldRow>
            <FormTextField
              control={control}
              fullWidth
              label="Start date"
              name="start_date"
              type="date"
            />

            <FormTextField
              control={control}
              fullWidth
              label="End date"
              name="end_date"
              type="date"
            />
          </FieldRow>
        </Fieldset.Group>
      </Fieldset>

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
