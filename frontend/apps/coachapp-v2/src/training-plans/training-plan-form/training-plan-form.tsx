import {
  Button,
  Description,
  ErrorMessage,
  FieldError,
  Fieldset,
  Form,
  Input,
  Label,
  Spinner,
  TextArea,
  TextField,
} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Controller, useForm} from 'react-hook-form';
import {z} from 'zod';

export const trainingPlanFormSchema = z.object({
  description: z.string().optional(),
  end_date: z.string().optional(),
  name: z.string().min(1, 'Enter plan name'),
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
          <Controller
            control={control}
            name="name"
            render={({field}) => (
              <TextField
                fullWidth
                isInvalid={!!errors.name}
                isRequired
                name={field.name}
                onBlur={field.onBlur}
                onChange={field.onChange}
                value={field.value}
              >
                <Label>Name (required)</Label>
                <Description>Use a clear name, like push pull legs</Description>
                {errors.name && <FieldError>{errors.name.message}</FieldError>}
                <Input />
              </TextField>
            )}
          />

          <Controller
            control={control}
            name="description"
            render={({field}) => (
              <TextField
                fullWidth
                isInvalid={!!errors.description}
                name={field.name}
                onBlur={field.onBlur}
                onChange={field.onChange}
                value={field.value ?? ''}
              >
                <Label>Description (optional)</Label>
                <Description>Add goals, training split, or coaching notes</Description>
                {errors.description && <FieldError>{errors.description.message}</FieldError>}
                <TextArea rows={2} />
              </TextField>
            )}
          />
        </Fieldset.Group>
      </Fieldset>

      <Fieldset>
        <Fieldset.Legend>Schedule</Fieldset.Legend>
        <Description>Set dates only if this plan has a fixed timeline</Description>

        <Fieldset.Group>
          <Controller
            control={control}
            name="start_date"
            render={({field}) => (
              <TextField
                fullWidth
                isInvalid={!!errors.start_date}
                name={field.name}
                onBlur={field.onBlur}
                onChange={field.onChange}
                type="date"
                value={field.value ?? ''}
              >
                <Label>Start date (optional)</Label>
                {errors.start_date && <FieldError>{errors.start_date.message}</FieldError>}
                <Input />
              </TextField>
            )}
          />

          <Controller
            control={control}
            name="end_date"
            render={({field}) => (
              <TextField
                fullWidth
                isInvalid={!!errors.end_date}
                name={field.name}
                onBlur={field.onBlur}
                onChange={field.onChange}
                type="date"
                value={field.value ?? ''}
              >
                <Label>End date (optional)</Label>
                {errors.end_date && <FieldError>{errors.end_date.message}</FieldError>}
                <Input />
              </TextField>
            )}
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
