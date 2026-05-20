import {
  Button,
  Description,
  ErrorMessage,
  FieldError,
  Fieldset,
  Form,
  Input,
  Label,
  NumberField,
  Spinner,
  TextArea,
  TextField,
} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Controller, useForm} from 'react-hook-form';
import {z} from 'zod';

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

type MacroFieldName = 'calories' | 'carbs_g' | 'fats_g' | 'protein_g';

type MacroFieldConfig = {
  label: string;
  name: MacroFieldName;
  step?: number;
};

const MACRO_FIELDS: MacroFieldConfig[] = [
  {label: 'Calories (optional)', name: 'calories'},
  {label: 'Protein, grams (optional)', name: 'protein_g', step: 0.1},
  {label: 'Carbs, grams (optional)', name: 'carbs_g', step: 0.1},
  {label: 'Fat, grams (optional)', name: 'fats_g', step: 0.1},
];

function MacroNumberField({
  fieldConfig,
  form,
}: {
  fieldConfig: MacroFieldConfig;
  form: ReturnType<typeof useNutritionPlanForm>;
}) {
  const error = form.formState.errors[fieldConfig.name]?.message;

  return (
    <Controller
      control={form.control}
      name={fieldConfig.name}
      render={({field}) => (
        <NumberField
          fullWidth
          isInvalid={!!error}
          minValue={0}
          name={field.name}
          onBlur={field.onBlur}
          onChange={(value) => field.onChange(Number.isNaN(value) ? undefined : value)}
          step={fieldConfig.step}
          value={field.value}
        >
          <Label>{fieldConfig.label}</Label>
          {error && <FieldError>{error}</FieldError>}
          <NumberField.Group>
            <NumberField.Input />
          </NumberField.Group>
        </NumberField>
      )}
    />
  );
}

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
                <Description>Use a clear name, like fat loss week 1</Description>
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
                <Description>Add goals, constraints, or coaching notes</Description>
                {errors.description && <FieldError>{errors.description.message}</FieldError>}
                <TextArea rows={2} />
              </TextField>
            )}
          />
        </Fieldset.Group>
      </Fieldset>

      <Fieldset>
        <Fieldset.Legend>Daily macro goal</Fieldset.Legend>
        <Description>Set optional daily targets for calories and macros</Description>

        <Fieldset.Group>
          {MACRO_FIELDS.map((fieldConfig) => (
            <MacroNumberField
              fieldConfig={fieldConfig}
              form={form}
              key={fieldConfig.name}
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
