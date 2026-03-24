import {Button} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';

import type {RecipeIngredientInput} from '@/api/recipes';
import type {IngredientItem} from '@/foods/components/ingredient-list';

import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {useCreateRecipeMutation} from '@/api/recipes';
import {applyFormErrors} from '@/api/shared';
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
function buildIngredients(items: IngredientItem[]): RecipeIngredientInput[] | undefined {
  if (items.length === 0) return undefined;
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

export default function CreateRecipe() {
  const navigate = useNavigate();
  const [createRecipe, {isLoading}] = useCreateRecipeMutation();
  const [ingredients, setIngredients] = useState<IngredientItem[]>([]);

  const form = useRecipeForm();

  const onSubmit = async (data: RecipeFormValues) => {
    try {
      const macros = buildMacros(data);
      const cookedWeight = data.cooked_weight_g;
      const recipeIngredients = buildIngredients(ingredients);
      const body = {
        name: data.name,
        ...(data.category && {category: data.category}),
        ...(data.source && {source: data.source}),
        ...(data.instructions && {instructions: data.instructions}),
        ...(cookedWeight !== '' &&
          cookedWeight !== undefined &&
          typeof cookedWeight === 'number' && {
            cooked_weight_g: cookedWeight,
          }),
        ...(macros && {macros}),
        ...(recipeIngredients && {recipe_ingredients: recipeIngredients}),
      };
      const result = await createRecipe(body).unwrap();
      navigate(`/library/recipes/${result.data.id}`);
    } catch (err) {
      applyFormErrors(err, 'Failed to create recipe. Please try again.', form.setError);
    }
  };

  return (
    <PageLayout
      description="Add a new recipe to your library."
      title="Create Recipe"
    >
      <div className="mb-4">
        <Button
          onPress={() => navigate(ROUTES.RECIPES)}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Recipes
        </Button>
      </div>

      <RecipeForm
        form={form}
        ingredients={ingredients}
        isSubmitting={isLoading}
        onCancel={() => navigate(ROUTES.RECIPES)}
        onIngredientsChange={setIngredients}
        onSubmit={onSubmit}
        submitLabel="Create Recipe"
        submittingLabel="Creating..."
      />
    </PageLayout>
  );
}
