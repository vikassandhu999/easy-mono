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
import {Calculator} from 'lucide-react';
import {useCallback, useMemo, useState} from 'react';
import {Controller, useForm, useWatch} from 'react-hook-form';
import {z} from 'zod';

import type {Food} from '@/api/foods';

import {normalizeMacros} from '@/api/shared';
import FoodPicker from '@/foods/components/food-picker';
import IngredientList, {type IngredientItem} from '@/foods/components/ingredient-list';

const optionalNumber = z.number().min(0, 'Use 0 or higher').optional();

export const recipeFormSchema = z.object({
  name: z.string().min(1, 'Enter recipe name'),
  category: z.string().optional(),
  source: z.string().optional(),
  instructions: z.string().optional(),
  cooked_weight_g: optionalNumber,
  calories_per_100g: optionalNumber,
  protein_g: optionalNumber,
  carbs_g: optionalNumber,
  fats_g: optionalNumber,
  fiber_g: optionalNumber,
  sugar_g: optionalNumber,
});

export type RecipeFormValues = z.infer<typeof recipeFormSchema>;

export const RECIPE_FORM_DEFAULTS: RecipeFormValues = {
  name: '',
  category: '',
  source: '',
  instructions: '',
  cooked_weight_g: undefined,
  calories_per_100g: undefined,
  protein_g: undefined,
  carbs_g: undefined,
  fats_g: undefined,
  fiber_g: undefined,
  sugar_g: undefined,
};

export function useRecipeForm(options?: {values?: RecipeFormValues}) {
  return useForm<RecipeFormValues>({
    defaultValues: options?.values ? undefined : RECIPE_FORM_DEFAULTS,
    resolver: zodResolver(recipeFormSchema),
    values: options?.values,
  });
}

type RecipeFormProps = {
  form: ReturnType<typeof useRecipeForm>;
  ingredients: IngredientItem[];
  isSubmitting: boolean;
  onCancel: () => void;
  onIngredientsChange: (items: IngredientItem[]) => void;
  onSubmit: (data: RecipeFormValues) => void;
  submitLabel: string;
  submittingLabel: string;
};

type MacroFieldName =
  | 'calories_per_100g'
  | 'carbs_g'
  | 'cooked_weight_g'
  | 'fats_g'
  | 'fiber_g'
  | 'protein_g'
  | 'sugar_g';

type NumberFieldConfig = {
  description?: string;
  label: string;
  name: MacroFieldName;
  step?: number;
};

const MACRO_FIELDS: NumberFieldConfig[] = [
  {label: 'Calories (optional)', name: 'calories_per_100g'},
  {label: 'Protein, grams (optional)', name: 'protein_g', step: 0.1},
  {label: 'Carbs, grams (optional)', name: 'carbs_g', step: 0.1},
  {label: 'Fat, grams (optional)', name: 'fats_g', step: 0.1},
  {label: 'Fiber, grams (optional)', name: 'fiber_g', step: 0.1},
  {label: 'Sugar, grams (optional)', name: 'sugar_g', step: 0.1},
];

function RecipeNumberField({
  fieldConfig,
  form,
}: {
  fieldConfig: NumberFieldConfig;
  form: ReturnType<typeof useRecipeForm>;
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
          {fieldConfig.description && <Description>{fieldConfig.description}</Description>}
          {error && <FieldError>{error}</FieldError>}
          <NumberField.Group>
            <NumberField.Input />
          </NumberField.Group>
        </NumberField>
      )}
    />
  );
}

export default function RecipeForm({
  form,
  ingredients,
  isSubmitting,
  onCancel,
  onIngredientsChange,
  onSubmit,
  submitLabel,
  submittingLabel,
}: RecipeFormProps) {
  const {
    control,
    formState: {errors},
    handleSubmit,
    setValue,
  } = form;

  const [autoExpandId, setAutoExpandId] = useState<null | string>(null);
  const excludeIds = useMemo(() => ingredients.map((item) => item.food_id), [ingredients]);
  const cookedWeight = useWatch({control, name: 'cooked_weight_g'});

  const canCompute = useMemo(
    () => ingredients.some((item) => item.weight_g !== '' && item.weight_g != null && Number(item.weight_g) > 0),
    [ingredients],
  );

  const computeNutrition = useCallback(() => {
    const totals: Record<string, number> = {};
    let totalWeight = 0;

    for (const item of ingredients) {
      const weightG = Number(item.weight_g);
      if (!weightG || weightG <= 0) {
        continue;
      }
      totalWeight += weightG;

      const normalized = normalizeMacros(item.food.macros);
      for (const [key, value] of Object.entries(normalized)) {
        if (typeof value !== 'number') {
          continue;
        }
        totals[key] = (totals[key] ?? 0) + value * (weightG / 100);
      }
    }

    if (totalWeight === 0) {
      return;
    }

    const divisor = cookedWeight && cookedWeight > 0 ? cookedWeight : totalWeight;
    const per100g = (value: number) => Math.round(value * (100 / divisor) * 10) / 10;

    setValue('calories_per_100g', per100g(totals.calories_per_100g ?? 0), {shouldDirty: true});
    setValue('protein_g', per100g(totals.protein_g ?? 0), {shouldDirty: true});
    setValue('carbs_g', per100g(totals.carbs_g ?? 0), {shouldDirty: true});
    setValue('fats_g', per100g(totals.fats_g ?? 0), {shouldDirty: true});

    if (totals.fiber_g != null) {
      setValue('fiber_g', per100g(totals.fiber_g), {shouldDirty: true});
    }
    if (totals.sugar_g != null) {
      setValue('sugar_g', per100g(totals.sugar_g), {shouldDirty: true});
    }
  }, [cookedWeight, ingredients, setValue]);

  const handleFoodSelect = useCallback(
    (food: Food) => {
      const newItem: IngredientItem = {
        amount: '',
        food,
        food_id: food.id,
        unit: '',
        weight_g: '',
      };
      onIngredientsChange([...ingredients, newItem]);
      setAutoExpandId(food.id);
    },
    [ingredients, onIngredientsChange],
  );

  return (
    <Form onSubmit={handleSubmit(onSubmit)}>
      <Fieldset>
        <Fieldset.Legend>Recipe details</Fieldset.Legend>
        <Description>Name the recipe and add instructions</Description>

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
                <Description>Use the name clients will recognize</Description>
                {errors.name && <FieldError>{errors.name.message}</FieldError>}
                <Input />
              </TextField>
            )}
          />

          <Fieldset.Group>
            <Controller
              control={control}
              name="category"
              render={({field}) => (
                <TextField
                  fullWidth
                  isInvalid={!!errors.category}
                  name={field.name}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                  value={field.value ?? ''}
                >
                  <Label>Category (optional)</Label>
                  <Description>Group similar recipes, like breakfast or snack</Description>
                  {errors.category && <FieldError>{errors.category.message}</FieldError>}
                  <Input />
                </TextField>
              )}
            />
            <Controller
              control={control}
              name="source"
              render={({field}) => (
                <TextField
                  fullWidth
                  isInvalid={!!errors.source}
                  name={field.name}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                  value={field.value ?? ''}
                >
                  <Label>Source (optional)</Label>
                  <Description>Add where the recipe came from</Description>
                  {errors.source && <FieldError>{errors.source.message}</FieldError>}
                  <Input />
                </TextField>
              )}
            />
          </Fieldset.Group>

          <Controller
            control={control}
            name="instructions"
            render={({field}) => (
              <TextField
                fullWidth
                isInvalid={!!errors.instructions}
                name={field.name}
                onBlur={field.onBlur}
                onChange={field.onChange}
                value={field.value ?? ''}
              >
                <Label>Instructions (optional)</Label>
                <Description>Add prep steps or serving notes</Description>
                {errors.instructions && <FieldError>{errors.instructions.message}</FieldError>}
                <TextArea rows={4} />
              </TextField>
            )}
          />
        </Fieldset.Group>
      </Fieldset>

      <Fieldset>
        <Fieldset.Legend>Ingredients</Fieldset.Legend>
        <Description>Search and add foods to this recipe</Description>
        <Fieldset.Group>
          <FoodPicker
            excludeIds={excludeIds}
            onSelect={handleFoodSelect}
          />
          <IngredientList
            autoExpandId={autoExpandId}
            onChange={onIngredientsChange}
            value={ingredients}
          />
        </Fieldset.Group>
      </Fieldset>

      <Fieldset>
        <Fieldset.Legend>Nutrition</Fieldset.Legend>
        <Description>Enter values for 100 g, or calculate them from ingredient weights</Description>

        <Fieldset.Group>
          <RecipeNumberField
            fieldConfig={{
              description: 'Use the final cooked weight for more accurate per-100 g nutrition',
              label: 'Cooked weight, grams (optional)',
              name: 'cooked_weight_g',
            }}
            form={form}
          />

          <Fieldset.Actions>
            <Button
              isDisabled={!canCompute}
              onPress={computeNutrition}
              size="sm"
              variant="ghost"
            >
              <Calculator size={14} />
              {canCompute ? 'Calculate from ingredients' : 'Set ingredient weights first'}
            </Button>
          </Fieldset.Actions>

          <Fieldset.Group>
            {MACRO_FIELDS.map((fieldConfig) => (
              <RecipeNumberField
                fieldConfig={fieldConfig}
                form={form}
                key={fieldConfig.name}
              />
            ))}
          </Fieldset.Group>
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
