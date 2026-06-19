import {Button, Description, ErrorMessage, Fieldset, Form, Spinner} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {z} from 'zod';
import {FormNumberField, FormTextAreaField, FormTextField} from '@/@components/form-fields';

const optionalNumber = z.number().min(0, 'Use 0 or higher').optional();

export const nutritionPlanFormSchema = z.object({
  calories: optionalNumber,
  carbs_g: optionalNumber,
  description: z.string().optional(),
  fats_g: optionalNumber,
  name: z.string().min(1, 'Enter plan name'),
  protein_g: optionalNumber,
});

export type NutritionPlanFormValues = z.infer<typeof nutritionPlanFormSchema>;

export const NUTRITION_PLAN_FORM_DEFAULTS: NutritionPlanFormValues = {
  calories: undefined,
  carbs_g: undefined,
  description: '',
  fats_g: undefined,
  name: '',
  protein_g: undefined,
};

export function useNutritionPlanForm(options?: {values?: NutritionPlanFormValues}) {
  return useForm<NutritionPlanFormValues>({
    defaultValues: options?.values ? undefined : NUTRITION_PLAN_FORM_DEFAULTS,
    resolver: zodResolver(nutritionPlanFormSchema),
    values: options?.values,
  });
}

type NutritionPlanFormProps = {
  form: ReturnType<typeof useNutritionPlanForm>;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (data: NutritionPlanFormValues) => void;
  submitLabel: string;
  submittingLabel: string;
};

const MACRO_FIELDS = [
  {label: 'Calories (optional)', name: 'calories', step: undefined},
  {label: 'Protein, grams (optional)', name: 'protein_g', step: 0.1},
  {label: 'Carbs, grams (optional)', name: 'carbs_g', step: 0.1},
  {label: 'Fat, grams (optional)', name: 'fats_g', step: 0.1},
] as const;

export default function NutritionPlanForm({
  form,
  isSubmitting,
  onCancel,
  onSubmit,
  submitLabel,
  submittingLabel,
}: NutritionPlanFormProps) {
  const {
    control,
    formState: {errors},
    handleSubmit,
  } = form;

  return (
    <Form onSubmit={handleSubmit(onSubmit)}>
      <Fieldset>
        <Fieldset.Legend>Plan details</Fieldset.Legend>
        <Description>Name the plan and describe who it is for</Description>

        <Fieldset.Group>
          <FormTextField
            control={control}
            description="Use a clear name, like fat loss week 1"
            fullWidth
            isRequired
            label="Name (required)"
            name="name"
          />

          <FormTextAreaField
            control={control}
            description="Add goals, constraints, or coaching notes"
            fullWidth
            label="Description (optional)"
            name="description"
            textAreaProps={{rows: 2}}
          />
        </Fieldset.Group>
      </Fieldset>

      <Fieldset>
        <Fieldset.Legend>Daily macro goal</Fieldset.Legend>
        <Description>Set optional daily targets for calories and macros</Description>

        <Fieldset.Group>
          {MACRO_FIELDS.map((fieldConfig) => (
            <FormNumberField
              control={control}
              fullWidth
              label={fieldConfig.label}
              key={fieldConfig.name}
              minValue={0}
              name={fieldConfig.name}
              step={fieldConfig.step}
            />
          ))}
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
