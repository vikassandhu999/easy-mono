import {Description, ErrorMessage, Fieldset} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {z} from 'zod';
import {FormActions, FormLayout, FormTextAreaField, FormTextField} from '@/@components/form-fields';
import {RESPONSIVE_FORM_SECTION_CLASS} from '@/@components/form-fields/form-section';
import type {TrainingPlan, TrainingPlanCreateRequest, TrainingPlanUpdateRequest} from '@/api/generated';
import {omitUndefined, toNullableText, toOptionalText} from '@/api/shared';

// No date fields here: start/end dates only apply once a plan is assigned to a
// client, and the builder's PlanHeader owns editing them (canonical DateInput).
export const schema = z.object({
  description: z.string().optional(),
  name: z.string().min(1, 'Enter plan name'),
});

export type TrainingPlanFormValues = z.infer<typeof schema>;

export const TRAINING_PLAN_FORM_DEFAULTS: TrainingPlanFormValues = {
  description: '',
  name: '',
};

export function trainingPlanToFormValues(plan: TrainingPlan): TrainingPlanFormValues {
  return {
    description: plan.description ?? '',
    name: plan.name,
  };
}

export function trainingPlanToCreateRequest(values: TrainingPlanFormValues): TrainingPlanCreateRequest {
  return omitUndefined({
    name: values.name,
    description: toOptionalText(values.description),
  });
}

// Dates are deliberately absent — including them here would wipe an assigned
// plan's dates on every "Save changes".
export function trainingPlanToUpdateRequest(values: TrainingPlanFormValues): TrainingPlanUpdateRequest {
  return {
    name: values.name,
    description: toNullableText(values.description),
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
      <div className={RESPONSIVE_FORM_SECTION_CLASS}>
        <Fieldset>
          <Fieldset.Legend>Plan details</Fieldset.Legend>
          <Description>Name the plan and describe who it's for.</Description>

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
      </div>

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
