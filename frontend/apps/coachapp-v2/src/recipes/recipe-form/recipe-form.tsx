import {Description, ErrorMessage, Fieldset} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useCallback, useMemo, useState} from 'react';
import {useForm} from 'react-hook-form';
import {z} from 'zod';

import {FormActions, FormLayout, FormNumberField, FormTextAreaField, FormTextField} from '@/@components/form-fields';
import {RESPONSIVE_FORM_SECTION_CLASS} from '@/@components/form-fields/form-section';
import {MacroBreakdownCard} from '@/@components/macro-breakdown-card';
import {ServingSizesEditor} from '@/@components/serving-sizes-editor';
import type {Food, FoodServingSize, RecipeIngredient, RecipeIngredientRequest, RecipeRequest} from '@/api/generated';
import {omitUndefined, type ServingSize, toOptionalNumber, toOptionalText} from '@/api/shared';
import {
  canComputeRecipeNutrition,
  computeRecipeTotalsFromIngredients,
  createIngredientDraft,
  type RecipeTotals,
} from '@/domain/recipes';
import FoodPickerControl from '@/foods/components/food-picker-control';
import IngredientList, {type IngredientItem} from '@/foods/components/ingredient-list';

// P/C/F ratio-bar segments (grams drive segment widths), mirroring the recipe
// detail page's nutrition card. Fiber shows as a legend stat only, not a segment.
const MACRO_SEGMENTS: {color: 'accent' | 'success' | 'warning'; key: keyof RecipeTotals; label: string}[] = [
  {color: 'accent', key: 'protein_g', label: 'Protein'},
  {color: 'success', key: 'carbs_g', label: 'Carbs'},
  {color: 'warning', key: 'fats_g', label: 'Fats'},
];

const optionalNumber = z.number().min(0, 'Use 0 or higher').optional();

export const recipeFormSchema = z.object({
  name: z.string().min(1, 'Enter recipe name'),
  instructions: z.string().optional(),
  cooked_weight_g: optionalNumber,
});

export type RecipeFormValues = z.infer<typeof recipeFormSchema>;

export const RECIPE_FORM_DEFAULTS: RecipeFormValues = {
  name: '',
  instructions: '',
  cooked_weight_g: undefined,
};

export function recipeIngredientsToDrafts(ingredients: RecipeIngredient[]): IngredientItem[] {
  // Filter out any ingredients where the backend didn't hydrate the food object
  // (food is Food | null in generated; IngredientItem requires Food).
  return ingredients
    .filter(
      (ingredient): ingredient is RecipeIngredient & {food: NonNullable<RecipeIngredient['food']>} =>
        ingredient.food != null,
    )
    .map((ingredient) => ({
      food: ingredient.food,
      food_id: ingredient.food_id,
      amount: ingredient.amount ?? '',
      unit: ingredient.unit ?? '',
      weight_g: ingredient.weight_g ?? '',
    }));
}

// Array order IS the ingredient order: each mapped ingredient carries position: index.
function recipeIngredientDraftToApi(item: IngredientItem, index: number): RecipeIngredientRequest {
  return omitUndefined({
    food_id: item.food_id,
    position: index,
    unit: toOptionalText(item.unit),
    amount: toOptionalNumber(item.amount),
    weight_g: toOptionalNumber(item.weight_g),
  }) as RecipeIngredientRequest;
}

function toRecipeServingSizes(sizes: ServingSize[]): FoodServingSize[] {
  return sizes.map((s) => ({
    unit: s.unit,
    amount: s.amount ?? 1,
    weight_g: s.weight_g ?? 0,
    is_default: false,
    label: s.unit,
  }));
}

export function recipeToFormValues(recipe: {
  name: string;
  instructions: string | null;
  cooked_weight_g: number | null;
}): RecipeFormValues {
  return {
    name: recipe.name,
    instructions: recipe.instructions ?? '',
    cooked_weight_g: recipe.cooked_weight_g ?? undefined,
  };
}

type RecipeRequestArgs = {
  ingredients: IngredientItem[];
  servingSizes: ServingSize[];
  values: RecipeFormValues;
};

// Create and update build the request identically: a full replace of the
// ingredients array (position: index on each) and the serving sizes.
function buildRecipeRequest({ingredients, servingSizes, values}: RecipeRequestArgs): RecipeRequest {
  return omitUndefined({
    name: values.name,
    instructions: toOptionalText(values.instructions),
    cooked_weight_g: values.cooked_weight_g,
    recipe_ingredients: ingredients.map(recipeIngredientDraftToApi),
    serving_sizes: servingSizes.length > 0 ? toRecipeServingSizes(servingSizes) : undefined,
  }) as RecipeRequest;
}

export function recipeToCreateRequest(args: RecipeRequestArgs): RecipeRequest {
  return buildRecipeRequest(args);
}

export function recipeToUpdateRequest(args: RecipeRequestArgs): RecipeRequest {
  return buildRecipeRequest(args);
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
  onServingSizesChange: (sizes: ServingSize[]) => void;
  onSubmit: (data: RecipeFormValues) => void;
  servingSizes: ServingSize[];
  submitLabel: string;
  submittingLabel: string;
};

export default function RecipeForm({
  form,
  ingredients,
  isSubmitting,
  onCancel,
  onIngredientsChange,
  onServingSizesChange,
  onSubmit,
  servingSizes,
  submitLabel,
  submittingLabel,
}: RecipeFormProps) {
  const {
    clearErrors,
    control,
    formState: {errors},
    handleSubmit,
    setError,
  } = form;

  const [autoExpandId, setAutoExpandId] = useState<null | string>(null);
  const excludeIds = useMemo(() => ingredients.map((item) => item.food_id), [ingredients]);

  const totals = useMemo(
    () => (canComputeRecipeNutrition(ingredients) ? computeRecipeTotalsFromIngredients(ingredients) : null),
    [ingredients],
  );
  const segments = totals ? MACRO_SEGMENTS.map((s) => ({...s, value: totals[s.key]})).filter((s) => s.value > 0) : [];

  const handleFoodSelect = useCallback(
    (food: Food) => {
      onIngredientsChange([...ingredients, createIngredientDraft(food)]);
      setAutoExpandId(food.id);
    },
    [ingredients, onIngredientsChange],
  );

  // Ingredients are a separate prop (not a zod field), so the "at least one"
  // rule is enforced here in the submit path via a root form error.
  const handleValidSubmit = useCallback(
    (data: RecipeFormValues) => {
      if (ingredients.length === 0) {
        setError('root', {message: 'Add at least one ingredient'});
        return;
      }
      // The backend rejects a recipe whose ingredients can't be costed into macros;
      // catch it here with an actionable message instead of a generic 422.
      if (!canComputeRecipeNutrition(ingredients)) {
        setError('root', {message: 'An ingredient is missing nutrition data — edit that food to add its macros.'});
        return;
      }
      clearErrors('root');
      onSubmit(data);
    },
    [clearErrors, ingredients, onSubmit, setError],
  );

  return (
    <FormLayout onSubmit={handleSubmit(handleValidSubmit)}>
      <div className={RESPONSIVE_FORM_SECTION_CLASS}>
        <Fieldset>
          <Fieldset.Legend>Details</Fieldset.Legend>
          <Description>Name the dish and describe how it's made.</Description>
          <Fieldset.Group>
            <FormTextField
              control={control}
              fullWidth
              inputProps={{placeholder: 'e.g. Chicken & Rice Bowl'}}
              isRequired
              label="Name"
              name="name"
            />

            <FormTextAreaField
              control={control}
              fullWidth
              label="Instructions"
              name="instructions"
              textAreaProps={{placeholder: 'Steps to prepare the recipe…', rows: 4}}
            />

            <FormNumberField
              control={control}
              description="Optional — total cooked weight"
              fullWidth
              label="Cooked weight (g)"
              minValue={0}
              name="cooked_weight_g"
            />
          </Fieldset.Group>
        </Fieldset>

        <div className="my-6 border-t border-separator" />

        <Fieldset>
          <Fieldset.Legend>Ingredients</Fieldset.Legend>
          <Description>Add foods and set the amount used.</Description>
          <Fieldset.Group>
            <IngredientList
              autoExpandId={autoExpandId}
              onAutoExpandConsumed={() => setAutoExpandId(null)}
              onChange={onIngredientsChange}
              value={ingredients}
            />
            <FoodPickerControl
              excludeIds={excludeIds}
              onSelect={handleFoodSelect}
              triggerClassName="w-full rounded-xl border border-dashed border-border text-muted"
              triggerVariant="ghost"
            />
          </Fieldset.Group>
        </Fieldset>

        {totals && (
          <>
            <div className="my-6 border-t border-separator" />
            <Fieldset>
              <Fieldset.Legend>
                Nutrition <span className="font-normal text-muted">· recipe totals</span>
              </Fieldset.Legend>
              <MacroBreakdownCard
                caption="kcal total"
                fiber={totals.fiber_g}
                kcal={totals.calories}
                segments={segments}
              />
            </Fieldset>
          </>
        )}

        <div className="my-6 border-t border-separator" />

        <Fieldset>
          <Fieldset.Legend>Serving sizes</Fieldset.Legend>
          <Description>Optional presets clients can log against.</Description>
          <ServingSizesEditor
            onChange={onServingSizesChange}
            value={servingSizes}
          />
        </Fieldset>
      </div>

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
