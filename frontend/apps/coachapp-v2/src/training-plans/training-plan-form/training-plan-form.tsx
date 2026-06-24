import {Button, Description, ErrorMessage, Fieldset, Form, Spinner} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {z} from 'zod';
import {FormTextAreaField, FormTextField} from '@/@components/form-fields';
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
    <Form onSubmit={handleSubmit(onSubmit)}>
      <Fieldset>
        <Fieldset.Legend>Plan details</Fieldset.Legend>
        <Description>Name the plan and add optional coaching context</Description>

        <Fieldset.Group>
          <FormTextField
            control={control}
            description="Use a clear name, like push pull legs"
            fullWidth
            isRequired
            label="Name (required)"
            name="name"
          />

          <FormTextAreaField
            control={control}
            description="Add goals, training split, or coaching notes"
            fullWidth
            label="Description (optional)"
            name="description"
            textAreaProps={{rows: 2}}
          />
        </Fieldset.Group>
      </Fieldset>

      <Fieldset>
        <Fieldset.Legend>Schedule</Fieldset.Legend>
        <Description>Set dates only if this plan has a fixed timeline</Description>

        <Fieldset.Group>
          <FormTextField
            control={control}
            fullWidth
            label="Start date (optional)"
            name="start_date"
            type="date"
          />

          <FormTextField
            control={control}
            fullWidth
            label="End date (optional)"
            name="end_date"
            type="date"
          />
        </Fieldset.Group>
      </Fieldset>

      {errors.root && <ErrorMessage>{errors.root.message}</ErrorMessage>}

      <Fieldset.Actions>
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
      </Fieldset.Actions>
    </Form>
  );
}
