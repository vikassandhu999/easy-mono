import {Button, Description, ErrorMessage, Fieldset, Form, Spinner} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {Calculator} from 'lucide-react';
import {useCallback, useMemo, useState} from 'react';
import {useForm, useWatch} from 'react-hook-form';
import {z} from 'zod';

import {FormNumberField, FormTextAreaField, FormTextField} from '@/@components/form-fields';
import type {Food} from '@/api/foods';
import type {
  Recipe,
  RecipeCreateRequest,
  RecipeIngredient,
  RecipeIngredientInput,
  RecipeUpdateRequest,
} from '@/api/recipes';
import {omitUndefined, pickDefined, toOptionalText} from '@/api/shared';
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

const RECIPE_MACRO_KEYS = ['calories_per_100g', 'protein_g', 'carbs_g', 'fats_g', 'fiber_g', 'sugar_g'] as const;

function toOptionalNumber(value: number | string): number | undefined {
  if (value === '' || value == null) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toOptionalMacros(values: RecipeFormValues): RecipeCreateRequest['macros'] | undefined {
  const macros = pickDefined(values, RECIPE_MACRO_KEYS);
  return Object.keys(macros).length > 0 ? macros : undefined;
}

export function recipeIngredientsToDrafts(ingredients: RecipeIngredient[]): IngredientItem[] {
  return ingredients.map((ingredient) => ({
    food: ingredient.food,
    food_id: ingredient.food_id,
    amount: ingredient.amount ?? '',
    unit: ingredient.unit ?? '',
    weight_g: ingredient.weight_g ?? '',
  }));
}

function recipeIngredientDraftToApi(item: IngredientItem): RecipeIngredientInput {
  return omitUndefined({
    food_id: item.food_id,
    unit: toOptionalText(item.unit),
    amount: toOptionalNumber(item.amount),
    weight_g: toOptionalNumber(item.weight_g),
  });
}

function toOptionalRecipeIngredients(items: IngredientItem[]): RecipeIngredientInput[] | undefined {
  return items.length > 0 ? items.map(recipeIngredientDraftToApi) : undefined;
}

export function recipeToFormValues(recipe: Recipe): RecipeFormValues {
  return {
    name: recipe.name,
    category: recipe.category ?? '',
    source: recipe.source ?? '',
    instructions: recipe.instructions ?? '',
    cooked_weight_g: recipe.cooked_weight_g ?? undefined,
    calories_per_100g: recipe.macros.calories_per_100g,
    protein_g: recipe.macros.protein_g,
    carbs_g: recipe.macros.carbs_g,
    fats_g: recipe.macros.fats_g,
    fiber_g: recipe.macros.fiber_g,
    sugar_g: recipe.macros.sugar_g,
  };
}

export function recipeToCreateRequest({
  ingredients,
  values,
}: {
  ingredients: IngredientItem[];
  values: RecipeFormValues;
}): RecipeCreateRequest {
  return omitUndefined({
    name: values.name,
    category: toOptionalText(values.category),
    source: toOptionalText(values.source),
    instructions: toOptionalText(values.instructions),
    cooked_weight_g: values.cooked_weight_g,
    macros: toOptionalMacros(values),
    recipe_ingredients: toOptionalRecipeIngredients(ingredients),
  });
}

export function recipeToUpdateRequest({
  ingredients,
  values,
}: {
  ingredients: IngredientItem[];
  values: RecipeFormValues;
}): RecipeUpdateRequest {
  return omitUndefined({
    name: values.name,
    category: toOptionalText(values.category),
    source: toOptionalText(values.source),
    instructions: toOptionalText(values.instructions),
    cooked_weight_g: values.cooked_weight_g,
    macros: toOptionalMacros(values),
    recipe_ingredients: ingredients.map(recipeIngredientDraftToApi),
  });
}

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
          <FormNumberField
            control={control}
            description="Use the final cooked weight for more accurate per-100 g nutrition"
            fullWidth
            label="Cooked weight, grams (optional)"
            minValue={0}
            name="cooked_weight_g"
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
              <FormNumberField
                control={control}
                description={fieldConfig.description}
                fullWidth
                key={fieldConfig.name}
                label={fieldConfig.label}
                minValue={0}
                name={fieldConfig.name}
                step={fieldConfig.step}
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
