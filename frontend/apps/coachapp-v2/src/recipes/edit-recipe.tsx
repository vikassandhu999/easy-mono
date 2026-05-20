import {Button, Spinner, Typography} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useMemo, useState} from 'react';
import {useParams} from 'react-router-dom';

import type {RecipeIngredientInput} from '@/api/recipes';
import type {IngredientItem} from '@/foods/components/ingredient-list';

import {Page} from '@/@components/page';
import {useGoBack} from '@/@hooks/use-go-back';
import {useGetRecipeQuery, useUpdateRecipeMutation} from '@/api/recipes';
import {applyFormErrors, normalizeMacros} from '@/api/shared';
import RecipeForm, {type RecipeFormValues, useRecipeForm} from '@/recipes/recipe-form/recipe-form';

function buildMacros(data: RecipeFormValues): Record<string, number> | undefined {
  const macros: Record<string, number> = {};
  const keys = ['calories_per_100g', 'protein_g', 'carbs_g', 'fats_g', 'fiber_g', 'sugar_g'] as const;
  for (const key of keys) {
    const val = data[key];
    if (val !== undefined) {
      macros[key] = val;
    }
  }
  return Object.keys(macros).length > 0 ? macros : undefined;
}

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

// Rendered only when recipe data is available, avoiding useEffect to sync server state
// into local state (which the React Compiler lint rule forbids).
function EditRecipeForm({recipeId, backPath}: {backPath: string; recipeId: string}) {
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
      cooked_weight_g: recipe.cooked_weight_g ?? undefined,
      calories_per_100g: macros.calories_per_100g ?? undefined,
      protein_g: macros.protein_g ?? undefined,
      carbs_g: macros.carbs_g ?? undefined,
      fats_g: macros.fats_g ?? undefined,
      fiber_g: macros.fiber_g ?? undefined,
      sugar_g: macros.sugar_g ?? undefined,
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
        ...(cookedWeight !== undefined ? {cooked_weight_g: cookedWeight} : {}),
        ...(macros ? {macros} : {}),
        recipe_ingredients: recipeIngredients,
      };
      await updateRecipe({body, id: recipeId}).unwrap();
      goBack();
    } catch (err) {
      applyFormErrors(err, "Recipe wasn't updated. Check the details and try again", form.setError);
    }
  };

  return (
    <Page>
      <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
        <Page.TitleGroup>
          <Page.Title>Edit recipe</Page.Title>
          <Page.Description>{recipe.name}</Page.Description>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Toolbar>
        <Button
          onPress={goBack}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Recipe
        </Button>
      </Page.Toolbar>
      <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
        <RecipeForm
          form={form}
          ingredients={ingredients}
          isSubmitting={isUpdating}
          onCancel={goBack}
          onIngredientsChange={setIngredients}
          onSubmit={onSubmit}
          submitLabel="Save changes"
          submittingLabel="Saving changes"
        />
      </Page.Content>
    </Page>
  );
}

export default function EditRecipe() {
  const {id} = useParams<{id: string}>();
  const {data, isError, isLoading: isFetching} = useGetRecipeQuery(id!);
  const backPath = `/library/recipes/${id}`;
  const goBackOuter = useGoBack(backPath);

  if (isFetching || !data) {
    return (
      <Page>
        <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
          <Page.TitleGroup>
            <Page.Title>Edit recipe</Page.Title>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
          <div className="flex items-center justify-center py-20">
            <Spinner color="accent" />
          </div>
        </Page.Content>
      </Page>
    );
  }

  if (isError) {
    return (
      <Page>
        <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
          <Page.TitleGroup>
            <Page.Title>Edit recipe</Page.Title>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Toolbar>
          <Button
            onPress={goBackOuter}
            size="sm"
            variant="ghost"
          >
            <ArrowLeft size={16} />
            Recipe
          </Button>
        </Page.Toolbar>
        <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
          <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 text-center">
            <Typography
              className="text-danger"
              type="body-sm"
            >
              Recipe couldn't load
            </Typography>
          </div>
        </Page.Content>
      </Page>
    );
  }

  return (
    <EditRecipeForm
      backPath={backPath}
      recipeId={id!}
    />
  );
}
