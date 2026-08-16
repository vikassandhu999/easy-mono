import {Description, ErrorMessage, Fieldset, Separator} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useCallback, useMemo, useState} from 'react';
import {useForm} from 'react-hook-form';

import {FormActions} from '@/@components/form-fields/form-actions';
import {FormLayout} from '@/@components/form-fields/form-layout';
import {FormNumberField} from '@/@components/form-fields/form-number-field';
import {FormPanel} from '@/@components/form-fields/form-panel';
import {FormTextAreaField} from '@/@components/form-fields/form-text-area-field';
import {FormTextField} from '@/@components/form-fields/form-text-field';
import {MacroBreakdownCard} from '@/@components/macro-breakdown-card';
import type {Food} from '@/api/nutrition-foods';
import FoodPickerControl from '@/recipes/components/food-picker-control';
import IngredientList from '@/recipes/components/ingredient-list';
import {
  canComputeRecipeNutrition,
  computeRecipeTotalsFromIngredients,
  createIngredientDraft,
  type IngredientItem,
  type RecipeTotals,
} from '@/recipes/lib/recipe-math';
import {RECIPE_FORM_DEFAULTS, type RecipeFormValues, recipeFormSchema} from '@/recipes/recipe-form/recipe-form-data';

// P/C/F ratio-bar segments (grams drive segment widths), mirroring the recipe
// detail page's nutrition card. Fiber shows as a legend stat only, not a segment.
const MACRO_SEGMENTS: {
  color: 'accent' | 'success' | 'warning';
  key: keyof Pick<RecipeTotals, 'carbohydrates' | 'fat' | 'protein'>;
  label: string;
}[] = [
  {color: 'accent', key: 'protein', label: 'Protein'},
  {color: 'success', key: 'carbohydrates', label: 'Carbs'},
  {color: 'warning', key: 'fat', label: 'Fats'},
];

export function useRecipeForm(options?: {defaultValues?: RecipeFormValues}) {
  return useForm<RecipeFormValues>({
    defaultValues: options?.defaultValues ?? RECIPE_FORM_DEFAULTS,
    resolver: zodResolver(recipeFormSchema),
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
  const segments = totals
    ? MACRO_SEGMENTS.map((s) => ({...s, value: totals[s.key]})).filter(
        (s): s is typeof s & {value: number} => s.value != null && s.value > 0,
      )
    : [];

  // Batch, not per-food: appending one at a time from a loop would spread the
  // same stale `ingredients` array and keep only the last pick.
  const handleFoodsSelect = useCallback(
    (foods: Food[]) => {
      if (foods.length === 0) {
        return;
      }
      onIngredientsChange([...ingredients, ...foods.map(createIngredientDraft)]);
      setAutoExpandId(foods[foods.length - 1]?.id ?? null);
      // The "add at least one ingredient" root error is satisfied now — don't
      // make the coach resubmit to find out.
      clearErrors('root');
    },
    [clearErrors, ingredients, onIngredientsChange],
  );

  // Ingredients are a separate prop (not a zod field), so the "at least one"
  // rule is enforced here in the submit path via a root form error.
  const handleValidSubmit = useCallback(
    (data: RecipeFormValues) => {
      if (ingredients.length === 0) {
        setError('root', {message: 'Add at least one ingredient'});
        return;
      }
      // The backend requires a positive weight on every ingredient. Fresh rows
      // start empty — say that, instead of a generic 422.
      if (!canComputeRecipeNutrition(ingredients)) {
        setError('root', {message: 'Set a weight (g) on every ingredient.'});
        return;
      }
      clearErrors('root');
      onSubmit(data);
    },
    [clearErrors, ingredients, onSubmit, setError],
  );

  return (
    <FormLayout onSubmit={handleSubmit(handleValidSubmit)}>
      <FormPanel>
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
              description="How many portions this recipe makes"
              fullWidth
              label="Servings"
              minValue={1}
              name="servings_count"
            />

            <FormNumberField
              control={control}
              description="Optional — weigh the finished dish to log it in grams"
              fullWidth
              label="Cooked weight (g)"
              minValue={0.1}
              name="cooked_weight_g"
            />
          </Fieldset.Group>
        </Fieldset>

        <Separator className="my-6" />

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
              onSelect={handleFoodsSelect}
              triggerClassName="w-full rounded-panel border border-dashed border-border text-muted"
              triggerVariant="ghost"
            />
          </Fieldset.Group>
        </Fieldset>

        {totals && (
          <>
            <Separator className="my-6" />
            <Fieldset>
              <Fieldset.Legend>
                Nutrition <span className="font-normal text-muted">· recipe totals</span>
              </Fieldset.Legend>
              <MacroBreakdownCard
                caption="kcal total"
                fiber={totals.fiber}
                kcal={totals.calories}
                segments={segments}
              />
            </Fieldset>
          </>
        )}
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
