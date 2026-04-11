import {Button, Spinner} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useMemo, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';

import type {RecipeIngredientInput} from '@/api/recipes';
import type {IngredientItem} from '@/foods/components/ingredient-list';

import PageLayout from '@/@components/page-layout';
import {useGoBack} from '@/@hooks/use-go-back';
import {useGetRecipeQuery, useUpdateRecipeMutation} from '@/api/recipes';
import {applyFormErrors, normalizeMacros} from '@/api/shared';
import RecipeForm, {type RecipeFormValues, useRecipeForm} from '@/recipes/components/recipe-form';

/** Build the macros Record from form values, omitting empty fields */
function buildMacros(data: RecipeFormValues): Record<string, number> | undefined {
  const macros: Record<string, number> = {};
  const keys = ['calories_per_100g', 'protein_g', 'carbs_g', 'fats_g', 'fiber_g', 'sugar_g'] as const;
  for (const key of keys) {
    const val = data[key];
    if (val !== '' && val !== undefined && typeof val === 'number') {
      macros[key] = val;
    }
  }
  return Object.keys(macros).length > 0 ? macros : undefined;
}

/** Convert ingredient items to API format */
function buildIngredients(items: IngredientItem[]): RecipeIngredientInput[] {
  return items.map((item) => ({
    food_id: item.food_id,
    ...(item.unit && {unit: item.unit}),
    ...(item.amount !== '' &&
      typeof Number(item.amount) === 'number' &&
      !isNaN(Number(item.amount)) && {
        amount: Number(item.amount),
      }),
    ...(item.weight_g !== '' &&
      typeof Number(item.weight_g) === 'number' &&
      !isNaN(Number(item.weight_g)) && {
        weight_g: Number(item.weight_g),
      }),
  }));
}

/**
 * Inner component rendered only when recipe data is available.
 * This avoids the need for useEffect to sync server state into local state,
 * which the React Compiler lint rule forbids.
 */
function EditRecipeForm({recipeId, backPath}: {backPath: string; recipeId: string}) {
  const navigate = useNavigate();
  const goBack = useGoBack(backPath);
  const {data} = useGetRecipeQuery(recipeId);
  const [updateRecipe, {isLoading: isUpdating}] = useUpdateRecipeMutation();

  const recipe = data!.data;

  const initialIngredients = useMemo<IngredientItem[]>(
    () =>
      recipe.recipe_ingredients.map((ri) => ({
        food: ri.food,
        food_id: ri.food_id,
        amount: ri.amount ?? '',
        unit: ri.unit ?? '',
        weight_g: ri.weight_g ?? '',
      })),
    [recipe],
  );

  const [ingredients, setIngredients] = useState<IngredientItem[]>(initialIngredients);

  const macros = normalizeMacros(recipe.macros);
  const form = useRecipeForm({
    values: {
      name: recipe.name,
      category: recipe.category ?? '',
      source: recipe.source ?? '',
      instructions: recipe.instructions ?? '',
      cooked_weight_g: recipe.cooked_weight_g ?? '',
      calories_per_100g: macros.calories_per_100g ?? '',
      protein_g: macros.protein_g ?? '',
      carbs_g: macros.carbs_g ?? '',
      fats_g: macros.fats_g ?? '',
      fiber_g: macros.fiber_g ?? '',
      sugar_g: macros.sugar_g ?? '',
    },
  });

  const onSubmit = async (formData: RecipeFormValues) => {
    try {
      const macros = buildMacros(formData);
      const cookedWeight = formData.cooked_weight_g;
      const recipeIngredients = buildIngredients(ingredients);
      const body = {
        name: formData.name,
        category: formData.category || undefined,
        source: formData.source || undefined,
        instructions: formData.instructions || undefined,
        ...(cookedWeight !== '' && cookedWeight !== undefined && typeof cookedWeight === 'number'
          ? {cooked_weight_g: cookedWeight}
          : {}),
        ...(macros ? {macros} : {}),
        recipe_ingredients: recipeIngredients,
      };
      await updateRecipe({body, id: recipeId}).unwrap();
      navigate(backPath);
    } catch (err) {
      applyFormErrors(err, 'Failed to update recipe. Please try again.', form.setError);
    }
  };

  return (
    <PageLayout
      description={recipe.name}
      title="Edit Recipe"
    >
      <div className="mb-4">
        <Button
          onPress={goBack}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Back
        </Button>
      </div>

      <RecipeForm
        form={form}
        ingredients={ingredients}
        isSubmitting={isUpdating}
        onCancel={() => navigate(backPath)}
        onIngredientsChange={setIngredients}
        onSubmit={onSubmit}
        submitLabel="Save Changes"
        submittingLabel="Saving..."
      />
    </PageLayout>
  );
}

export default function EditRecipe() {
  const {id} = useParams<{id: string}>();
  const {data, isError, isLoading: isFetching} = useGetRecipeQuery(id!);
  const backPath = `/library/recipes/${id}`;
  const goBackOuter = useGoBack(backPath);

  if (isFetching || !data) {
    return (
      <PageLayout title="Edit Recipe">
        <div className="flex items-center justify-center py-20">
          <Spinner color="accent" />
        </div>
      </PageLayout>
    );
  }

  if (isError) {
    return (
      <PageLayout title="Edit Recipe">
        <div className="mb-4">
          <Button
            onPress={goBackOuter}
            size="sm"
            variant="ghost"
          >
            <ArrowLeft size={16} />
            Back
          </Button>
        </div>
        <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 text-center text-sm text-danger">
          Failed to load recipe.
        </div>
      </PageLayout>
    );
  }

  return (
    <EditRecipeForm
      backPath={backPath}
      recipeId={id!}
    />
  );
}
