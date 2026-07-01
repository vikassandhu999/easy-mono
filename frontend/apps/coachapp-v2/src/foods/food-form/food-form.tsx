import {
  Button,
  Description,
  ErrorMessage,
  FieldError,
  Fieldset,
  Input,
  Label,
  TextField,
  Typography,
} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Plus, X} from 'lucide-react';
import {useCallback, useState} from 'react';
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
import {NumberInput} from '@/@components/number-input';
import type {Food, FoodRequest, FoodUpdateRequest} from '@/api/generated';
import {omitUndefined, type ServingSize, toOptionalText} from '@/api/shared';

export const foodFormSchema = z.object({
  name: z.string().min(1, 'Enter food name'),
  category: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
  calories_per_100g: z.number().min(0, 'Use 0 or higher').optional(),
  protein_g: z.number().min(0, 'Use 0 or higher').optional(),
  carbs_g: z.number().min(0, 'Use 0 or higher').optional(),
  fats_g: z.number().min(0, 'Use 0 or higher').optional(),
  fiber_g: z.number().min(0, 'Use 0 or higher').optional(),
  sugar_g: z.number().min(0, 'Use 0 or higher').optional(),
});

export type FoodFormValues = z.infer<typeof foodFormSchema>;

export const FOOD_FORM_DEFAULTS: FoodFormValues = {
  name: '',
  category: '',
  source: '',
  notes: '',
  calories_per_100g: undefined,
  protein_g: undefined,
  carbs_g: undefined,
  fats_g: undefined,
  fiber_g: undefined,
  sugar_g: undefined,
};

export function foodToFormValues(food: Food): FoodFormValues {
  return {
    name: food.name,
    category: food.category ?? '',
    source: food.source ?? '',
    notes: food.notes ?? '',
    calories_per_100g: food.calories_per_100g ?? undefined,
    protein_g: food.protein_g_per_100g ?? undefined,
    carbs_g: food.carbs_g_per_100g ?? undefined,
    fats_g: food.fat_g_per_100g ?? undefined,
    fiber_g: food.fiber_g_per_100g ?? undefined,
    sugar_g: undefined,
  };
}

export function foodToDuplicateFormValues(food: Food): FoodFormValues {
  return {
    ...foodToFormValues(food),
    name: `${food.name} (copy)`,
    source: '',
  };
}

function toFoodServingSizes(sizes: ServingSize[]): import('@/api/generated').FoodServingSize[] {
  return sizes.map((s) => ({
    unit: s.unit,
    amount: s.amount ?? 1,
    weight_g: s.weight_g ?? 0,
    is_default: false,
    label: s.unit,
  }));
}

export function foodToCreateRequest({
  servingSizes,
  values,
}: {
  servingSizes: ServingSize[];
  values: FoodFormValues;
}): FoodRequest {
  return omitUndefined({
    name: values.name,
    category: toOptionalText(values.category),
    source: toOptionalText(values.source) as FoodRequest['source'],
    notes: toOptionalText(values.notes),
    calories_per_100g: values.calories_per_100g,
    protein_g_per_100g: values.protein_g,
    carbs_g_per_100g: values.carbs_g,
    fat_g_per_100g: values.fats_g,
    fiber_g_per_100g: values.fiber_g,
    serving_sizes: servingSizes.length > 0 ? toFoodServingSizes(servingSizes) : undefined,
  });
}

export function foodToUpdateRequest({
  servingSizes,
  values,
}: {
  servingSizes: ServingSize[];
  values: FoodFormValues;
}): FoodUpdateRequest {
  return omitUndefined({
    name: values.name,
    category: toOptionalText(values.category),
    source: toOptionalText(values.source) as FoodUpdateRequest['source'],
    notes: toOptionalText(values.notes),
    calories_per_100g: values.calories_per_100g,
    protein_g_per_100g: values.protein_g,
    carbs_g_per_100g: values.carbs_g,
    fat_g_per_100g: values.fats_g,
    fiber_g_per_100g: values.fiber_g,
    serving_sizes: servingSizes.length > 0 ? toFoodServingSizes(servingSizes) : undefined,
  });
}

export function useFoodForm(options?: {defaultValues?: FoodFormValues; values?: FoodFormValues}) {
  return useForm<FoodFormValues>({
    defaultValues: options?.values ? undefined : (options?.defaultValues ?? FOOD_FORM_DEFAULTS),
    resolver: zodResolver(foodFormSchema),
    values: options?.values,
  });
}

type FoodFormProps = {
  form: ReturnType<typeof useFoodForm>;
  isSubmitting: boolean;
  onCancel: () => void;
  onServingSizesChange: (sizes: ServingSize[]) => void;
  onSubmit: (data: FoodFormValues) => void;
  servingSizes: ServingSize[];
  submitLabel: string;
  submittingLabel: string;
};

type MacroFieldName = 'calories_per_100g' | 'carbs_g' | 'fats_g' | 'fiber_g' | 'protein_g' | 'sugar_g';

const MACRO_FIELDS: {label: string; name: MacroFieldName; step?: number}[] = [
  {label: 'Calories', name: 'calories_per_100g'},
  {label: 'Protein (g)', name: 'protein_g', step: 0.1},
  {label: 'Carbs (g)', name: 'carbs_g', step: 0.1},
  {label: 'Fat (g)', name: 'fats_g', step: 0.1},
  {label: 'Fiber (g)', name: 'fiber_g', step: 0.1},
  {label: 'Sugar (g)', name: 'sugar_g', step: 0.1},
];

export default function FoodForm({
  form,
  isSubmitting,
  onCancel,
  onServingSizesChange,
  onSubmit,
  servingSizes,
  submitLabel,
  submittingLabel,
}: FoodFormProps) {
  const {
    control,
    formState: {errors},
    handleSubmit,
  } = form;

  const [isAddingServing, setIsAddingServing] = useState(false);
  const [newUnit, setNewUnit] = useState('');
  const [newAmount, setNewAmount] = useState<number | undefined>();
  const [newWeightG, setNewWeightG] = useState<number | undefined>();
  const [servingError, setServingError] = useState('');

  const resetServingForm = useCallback(() => {
    setNewUnit('');
    setNewAmount(undefined);
    setNewWeightG(undefined);
    setServingError('');
  }, []);

  const handleAddServing = useCallback(() => {
    const unit = newUnit.trim();
    if (!unit) {
      setServingError('Enter serving unit');
      return;
    }
    const amount = newAmount ?? null;
    const weightG = newWeightG ?? null;
    const serving: ServingSize = {unit, amount, weight_g: weightG};
    onServingSizesChange([...servingSizes, serving]);
    resetServingForm();
    setIsAddingServing(false);
  }, [newUnit, newAmount, newWeightG, servingSizes, onServingSizesChange, resetServingForm]);

  const handleRemoveServing = useCallback(
    (index: number) => {
      onServingSizesChange(servingSizes.filter((_, i) => i !== index));
    },
    [servingSizes, onServingSizesChange],
  );

  return (
    <FormLayout onSubmit={handleSubmit(onSubmit)}>
      <Fieldset>
        <Fieldset.Legend>Food details</Fieldset.Legend>
        <Fieldset.Group>
          <FormTextField
            control={control}
            fullWidth
            isRequired
            label="Name"
            name="name"
          />

          <FieldRow>
            <FormTextField
              control={control}
              fullWidth
              label="Category"
              name="category"
            />
            <FormTextField
              control={control}
              fullWidth
              label="Source"
              name="source"
            />
          </FieldRow>

          <FormTextAreaField
            control={control}
            fullWidth
            label="Notes"
            name="notes"
            textAreaProps={{rows: 2}}
          />
        </Fieldset.Group>
      </Fieldset>

      <Fieldset>
        <Fieldset.Legend>Nutrition</Fieldset.Legend>
        <Description>Enter values per 100 g.</Description>
        <Fieldset.Group>
          <FieldRow>
            {MACRO_FIELDS.map((fieldConfig) => (
              <FormNumberField
                control={control}
                fullWidth
                key={fieldConfig.name}
                label={fieldConfig.label}
                minValue={0}
                name={fieldConfig.name}
                step={fieldConfig.step}
              />
            ))}
          </FieldRow>
        </Fieldset.Group>
      </Fieldset>

      <Fieldset>
        <Fieldset.Legend>Serving sizes</Fieldset.Legend>

        <Fieldset.Group>
          {servingSizes.length > 0 && (
            <Fieldset.Group>
              {servingSizes.map((serving, i) => (
                <Fieldset.Group key={i}>
                  <Typography>
                    {serving.amount ?? 1} {serving.unit}
                  </Typography>
                  <Fieldset.Actions>
                    {serving.weight_g != null && serving.weight_g > 0 && (
                      <Typography
                        color="muted"
                        type="body-sm"
                      >
                        {serving.weight_g}g
                      </Typography>
                    )}
                    <Button
                      aria-label={`Remove ${serving.unit}`}
                      onPress={() => handleRemoveServing(i)}
                      size="sm"
                      variant="ghost"
                    >
                      <X size={14} />
                    </Button>
                  </Fieldset.Actions>
                </Fieldset.Group>
              ))}
            </Fieldset.Group>
          )}

          {isAddingServing ? (
            <Fieldset>
              <Fieldset.Group>
                <TextField
                  fullWidth
                  isInvalid={!!servingError}
                  isRequired
                  variant="secondary"
                >
                  <Label>Unit</Label>
                  {servingError && <FieldError>{servingError}</FieldError>}
                  <Input
                    onChange={(e) => {
                      setNewUnit(e.target.value);
                      setServingError('');
                    }}
                    placeholder="e.g. scoop, cup"
                    value={newUnit}
                  />
                </TextField>
                <NumberInput
                  fullWidth
                  label="Amount"
                  minValue={0}
                  onChange={setNewAmount}
                  value={newAmount}
                />
                <NumberInput
                  fullWidth
                  label="Weight (g)"
                  minValue={0}
                  onChange={setNewWeightG}
                  value={newWeightG}
                />
              </Fieldset.Group>
              <Fieldset.Actions>
                <Button
                  onPress={handleAddServing}
                  size="sm"
                >
                  <Plus size={14} />
                  Add
                </Button>
                <Button
                  onPress={() => {
                    setIsAddingServing(false);
                    resetServingForm();
                  }}
                  size="sm"
                  variant="ghost"
                >
                  Cancel
                </Button>
              </Fieldset.Actions>
            </Fieldset>
          ) : (
            <Button
              onPress={() => setIsAddingServing(true)}
              size="sm"
              variant="ghost"
            >
              <Plus size={14} />
              Add serving size
            </Button>
          )}
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
