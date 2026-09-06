import {Description, ErrorMessage, Fieldset, Separator} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Controller, useForm} from 'react-hook-form';
import {
  NUTRITION_PLAN_FORM_DEFAULTS,
  type NutritionPlanFormValues,
  nutritionPlanFormSchema,
} from '@/library/nutrition-plans/nutrition-plan-form-data';
import DateInput from '@/ui/date-input';
import {FieldRow} from '@/ui/field-row';
import {FormActions} from '@/ui/form-actions';
import {FormLayout} from '@/ui/form-layout';
import {FormNumberField} from '@/ui/form-number-field';
import {FormPanel} from '@/ui/form-panel';
import {FormTextAreaField} from '@/ui/form-text-area-field';
import {FormTextField} from '@/ui/form-text-field';

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

  const coverage = form.watch('coverage');

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
          <Description>Daily targets used alongside the menu.</Description>

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
        {coverage ? (
          <Fieldset className="mt-6">
            <Fieldset.Legend>Coverage dates</Fieldset.Legend>
            <Description>When this client plan applies.</Description>
            <FieldRow>
              <Controller
                control={control}
                name="coverage.start_date"
                render={({field, fieldState}) => (
                  <DateInput
                    label="Start date"
                    value={field.value}
                    onChange={field.onChange}
                    errorMessage={fieldState.error?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="coverage.end_date"
                render={({field, fieldState}) => (
                  <DateInput
                    label="End date"
                    value={field.value}
                    onChange={field.onChange}
                    errorMessage={fieldState.error?.message}
                  />
                )}
              />
            </FieldRow>
          </Fieldset>
        ) : null}
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
