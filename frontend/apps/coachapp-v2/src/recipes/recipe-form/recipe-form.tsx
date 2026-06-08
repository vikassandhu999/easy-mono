import {Button, Description, ErrorMessage, Fieldset, Form, Spinner} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Calculator} from 'lucide-react';
import {useCallback, useMemo, useState} from 'react';
import {useForm, useWatch} from 'react-hook-form';
import {z} from 'zod';

import {FormNumberField, FormTextAreaField, FormTextField} from '@/@components/form-fields';
import type {Food} from '@/api/foods';
import {
  canComputeRecipeNutrition,
  computeRecipeNutritionFromIngredients,
  createIngredientDraft,
} from '@/domain/recipes';
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
  return (
    <FormNumberField
      control={form.control}
      description={fieldConfig.description}
      fullWidth
      label={fieldConfig.label}
      minValue={0}
      name={fieldConfig.name}
      step={fieldConfig.step}
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

  const canCompute = useMemo(() => canComputeRecipeNutrition(ingredients), [ingredients]);

  const computeNutrition = useCallback(() => {
    const computedNutrition = computeRecipeNutritionFromIngredients({
      cookedWeight,
      ingredients,
    });

    if (!computedNutrition) {
      return;
    }

    setValue('calories_per_100g', computedNutrition.calories_per_100g, {shouldDirty: true});
    setValue('protein_g', computedNutrition.protein_g, {shouldDirty: true});
    setValue('carbs_g', computedNutrition.carbs_g, {shouldDirty: true});
    setValue('fats_g', computedNutrition.fats_g, {shouldDirty: true});

    if (computedNutrition.fiber_g !== undefined) {
      setValue('fiber_g', computedNutrition.fiber_g, {shouldDirty: true});
    }
    if (computedNutrition.sugar_g !== undefined) {
      setValue('sugar_g', computedNutrition.sugar_g, {shouldDirty: true});
    }
  }, [cookedWeight, ingredients, setValue]);

  const handleFoodSelect = useCallback(
    (food: Food) => {
      onIngredientsChange([...ingredients, createIngredientDraft(food)]);
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
          <FormTextField
            control={control}
            description="Use the name clients will recognize"
            fullWidth
            isRequired
            label="Name (required)"
            name="name"
          />

          <Fieldset.Group>
            <FormTextField
              control={control}
              description="Group similar recipes, like breakfast or snack"
              fullWidth
              label="Category (optional)"
              name="category"
            />
            <FormTextField
              control={control}
              description="Add where the recipe came from"
              fullWidth
              label="Source (optional)"
              name="source"
            />
          </Fieldset.Group>

          <FormTextAreaField
            control={control}
            description="Add prep steps or serving notes"
            fullWidth
            label="Instructions (optional)"
            name="instructions"
            textAreaProps={{rows: 4}}
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
