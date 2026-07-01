import {ErrorMessage, Fieldset} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {z} from 'zod';
import {
  FieldRow,
  FormActions,
  FormLayout,
  FormNumberField,
  FormTextAreaField,
  FormTextField,
} from '@/@components/form-fields';
import type {NutritionPlan, NutritionPlanRequest} from '@/api/generated';
import {omitUndefined, toOptionalText} from '@/api/shared';

const optionalNumber = z.number().min(0, 'Use 0 or higher').optional();

export const nutritionPlanFormSchema = z.object({
  calories: optionalNumber,
  carbs_g: optionalNumber,
  description: z.string().optional(),
  fats_g: optionalNumber,
  fiber_g: optionalNumber,
  name: z.string().min(1, 'Enter plan name'),
  protein_g: optionalNumber,
});

export type NutritionPlanFormValues = z.infer<typeof nutritionPlanFormSchema>;

export const NUTRITION_PLAN_FORM_DEFAULTS: NutritionPlanFormValues = {
  calories: undefined,
  carbs_g: undefined,
  description: '',
  fats_g: undefined,
  fiber_g: undefined,
  name: '',
  protein_g: undefined,
};

/**
 * Map the form's macro fields (`calories`/`protein_g`/`carbs_g`/`fats_g`/`fiber_g`)
 * onto the backend's `target_*` request fields. Undefined entries are stripped
 * by `omitUndefined` on the caller side.
 */
function toTargetFields(values: NutritionPlanFormValues): Partial<NutritionPlanRequest> {
  return {
    target_calories: values.calories,
    target_protein_g: values.protein_g,
    target_carbs_g: values.carbs_g,
    target_fat_g: values.fats_g,
    target_fiber_g: values.fiber_g,
  };
}

export function nutritionPlanToFormValues(plan: NutritionPlan): NutritionPlanFormValues {
  return {
    calories: plan.target_calories ?? undefined,
    carbs_g: plan.target_carbs_g ?? undefined,
    description: plan.description ?? '',
    fats_g: plan.target_fat_g ?? undefined,
    fiber_g: plan.target_fiber_g ?? undefined,
    name: plan.name,
    protein_g: plan.target_protein_g ?? undefined,
  };
}

export function nutritionPlanToCreateRequest(values: NutritionPlanFormValues): NutritionPlanRequest {
  return omitUndefined({
    name: values.name,
    description: toOptionalText(values.description),
    ...toTargetFields(values),
  });
}

export function nutritionPlanToUpdateRequest(values: NutritionPlanFormValues): NutritionPlanRequest {
  return omitUndefined({
    name: values.name,
    description: toOptionalText(values.description),
    ...toTargetFields(values),
  });
}

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
  {label: 'Calories', name: 'calories', step: undefined},
  {label: 'Protein (g)', name: 'protein_g', step: 0.1},
  {label: 'Carbs (g)', name: 'carbs_g', step: 0.1},
  {label: 'Fat (g)', name: 'fats_g', step: 0.1},
  {label: 'Fiber (g)', name: 'fiber_g', step: 0.1},
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
    <FormLayout onSubmit={handleSubmit(onSubmit)}>
      <Fieldset>
        <Fieldset.Legend>Plan details</Fieldset.Legend>

        <Fieldset.Group>
          <FormTextField
            control={control}
            fullWidth
            isRequired
            label="Name"
            name="name"
          />

          <FormTextAreaField
            control={control}
            fullWidth
            label="Description"
            name="description"
            textAreaProps={{rows: 2}}
          />
        </Fieldset.Group>
      </Fieldset>

      <Fieldset>
        <Fieldset.Legend>Daily macro goal</Fieldset.Legend>

        <Fieldset.Group>
          <FieldRow>
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
