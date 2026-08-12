import {Description, ErrorMessage, Fieldset, Separator} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {FieldRow} from '@/@components/form-fields/field-row';
import {FormActions} from '@/@components/form-fields/form-actions';
import {FormLayout} from '@/@components/form-fields/form-layout';
import {FormNumberField} from '@/@components/form-fields/form-number-field';
import {FormPanel} from '@/@components/form-fields/form-panel';
import {FormTextAreaField} from '@/@components/form-fields/form-text-area-field';
import {FormTextField} from '@/@components/form-fields/form-text-field';
import {
  NUTRITION_PLAN_FORM_DEFAULTS,
  type NutritionPlanFormValues,
  nutritionPlanFormSchema,
} from './nutrition-plan-form-data';

export function useNutritionPlanForm(options?: {defaultValues?: NutritionPlanFormValues}) {
  return useForm<NutritionPlanFormValues>({
    defaultValues: options?.defaultValues ?? NUTRITION_PLAN_FORM_DEFAULTS,
    resolver: zodResolver(nutritionPlanFormSchema),
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
  {label: 'Calories', name: 'calories'},
  {label: 'Protein (g)', name: 'protein_g'},
  {label: 'Carbs (g)', name: 'carbs_g'},
  {label: 'Fat (g)', name: 'fats_g'},
  {label: 'Fiber (g)', name: 'fiber_g'},
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
      <FormPanel>
        <Fieldset>
          <Fieldset.Legend>Plan details</Fieldset.Legend>
          <Description>Name the plan and describe who it's for.</Description>

          <Fieldset.Group>
            <FormTextField
              control={control}
              fullWidth
              inputProps={{placeholder: 'e.g. High-Protein Cut'}}
              isRequired
              label="Name"
              name="name"
            />

            <FormTextAreaField
              control={control}
              fullWidth
              label="Description"
              name="description"
              textAreaProps={{placeholder: 'Who this plan is for, phase, or any coaching notes…', rows: 2}}
            />
          </Fieldset.Group>
        </Fieldset>

        <Separator className="my-6" />

        <Fieldset>
          <Fieldset.Legend>Daily macro goal</Fieldset.Legend>
          <Description>Optional daily targets. You can fine-tune these in the builder.</Description>

          <Fieldset.Group>
            <FieldRow className="grid-cols-2 md:grid-cols-3">
              {MACRO_FIELDS.map((fieldConfig) => (
                <FormNumberField
                  control={control}
                  fullWidth
                  label={fieldConfig.label}
                  key={fieldConfig.name}
                  minValue={0}
                  name={fieldConfig.name}
                />
              ))}
            </FieldRow>
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
