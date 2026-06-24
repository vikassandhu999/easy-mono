import {Button, Description, ErrorMessage, Fieldset, Form, Spinner} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useCallback, useMemo, useState} from 'react';
import {useForm} from 'react-hook-form';
import {z} from 'zod';

import {FormTextAreaField, FormTextField} from '@/@components/form-fields';
import type {Food, RecipeIngredient, RecipeIngredientRequest, RecipeRequest} from '@/api/generated';
import {omitUndefined, toOptionalText} from '@/api/shared';
import {createIngredientDraft} from '@/domain/recipes';
import FoodPicker from '@/foods/components/food-picker';
import IngredientList, {type IngredientItem} from '@/foods/components/ingredient-list';

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

function toOptionalNumber(value: number | string): number | undefined {
  if (value === '' || value == null) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

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

function recipeIngredientDraftToApi(item: IngredientItem): RecipeIngredientRequest {
  return omitUndefined({
    food_id: item.food_id,
    unit: toOptionalText(item.unit),
    amount: toOptionalNumber(item.amount),
    weight_g: toOptionalNumber(item.weight_g),
  }) as RecipeIngredientRequest;
}

function toOptionalRecipeIngredients(items: IngredientItem[]): RecipeIngredientRequest[] | undefined {
  return items.length > 0 ? items.map(recipeIngredientDraftToApi) : undefined;
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

export function recipeToCreateRequest({
  ingredients,
  values,
}: {
  ingredients: IngredientItem[];
  values: RecipeFormValues;
}): RecipeRequest {
  return omitUndefined({
    name: values.name,
    instructions: toOptionalText(values.instructions),
    cooked_weight_g: values.cooked_weight_g,
    recipe_ingredients: toOptionalRecipeIngredients(ingredients),
  }) as RecipeRequest;
}

export function recipeToUpdateRequest({
  ingredients,
  values,
}: {
  ingredients: IngredientItem[];
  values: RecipeFormValues;
}): RecipeRequest {
  return omitUndefined({
    name: values.name,
    instructions: toOptionalText(values.instructions),
    cooked_weight_g: values.cooked_weight_g,
    recipe_ingredients: ingredients.map(recipeIngredientDraftToApi),
  }) as RecipeRequest;
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
  } = form;

  const [autoExpandId, setAutoExpandId] = useState<null | string>(null);
  const excludeIds = useMemo(() => ingredients.map((item) => item.food_id), [ingredients]);

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
