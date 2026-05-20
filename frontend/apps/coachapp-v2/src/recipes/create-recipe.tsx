import {Button} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import type {RecipeIngredientInput} from '@/api/recipes';
import {useCreateRecipeMutation} from '@/api/recipes';
import {applyFormErrors} from '@/api/shared';
import type {IngredientItem} from '@/foods/components/ingredient-list';
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

function buildIngredients(items: IngredientItem[]): RecipeIngredientInput[] | undefined {
  if (items.length === 0) {
    return undefined;
  }
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
  const goBack = useGoBack(ROUTES.RECIPES);
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
        ...(cookedWeight !== undefined && {cooked_weight_g: cookedWeight}),
        ...(macros && {macros}),
        ...(recipeIngredients && {recipe_ingredients: recipeIngredients}),
      };
      const result = await createRecipe(body).unwrap();
      navigate(`/library/recipes/${result.data.id}`, {replace: true});
    } catch (err) {
      applyFormErrors(err, "Recipe wasn't created. Check the details and try again", form.setError);
    }
  };

  return (
    <Page>
      <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
        <Page.TitleGroup>
          <Page.Title>Create recipe</Page.Title>
          <Page.Description>Add ingredients, nutrition details, and instructions</Page.Description>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Toolbar>
        <Button
          onPress={goBack}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Recipes
        </Button>
      </Page.Toolbar>
      <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
        <RecipeForm
          form={form}
          ingredients={ingredients}
          isSubmitting={isLoading}
          onCancel={goBack}
          onIngredientsChange={setIngredients}
          onSubmit={onSubmit}
          submitLabel="Create recipe"
          submittingLabel="Creating recipe"
        />
      </Page.Content>
    </Page>
  );
}
