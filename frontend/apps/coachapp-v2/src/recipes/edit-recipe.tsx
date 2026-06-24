import {Button, Spinner, Typography} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useState} from 'react';
import {useParams} from 'react-router-dom';
import {Page} from '@/@components/page';
import {useGoBack} from '@/@hooks/use-go-back';
import {useGetRecipeQuery, useUpdateRecipeMutation} from '@/api/generated';
import {applyFormErrors} from '@/api/shared';
import type {IngredientItem} from '@/foods/components/ingredient-list';
import RecipeForm, {
  type RecipeFormValues,
  recipeIngredientsToDrafts,
  recipeToFormValues,
  recipeToUpdateRequest,
  useRecipeForm,
} from '@/recipes/recipe-form/recipe-form';

// Rendered only when recipe data is available, avoiding useEffect to sync server state
// into local state (which the React Compiler lint rule forbids).
function EditRecipeForm({recipeId, backPath}: {backPath: string; recipeId: string}) {
  const goBack = useGoBack(backPath);
  const {data} = useGetRecipeQuery({id: recipeId});
  const [updateRecipe, {isLoading: isUpdating}] = useUpdateRecipeMutation();

  const recipe = data!.data;
  const [ingredients, setIngredients] = useState<IngredientItem[]>(() =>
    recipeIngredientsToDrafts(recipe.recipe_ingredients),
  );

  const form = useRecipeForm({
    values: recipeToFormValues(recipe),
  });

  const onSubmit = async (formData: RecipeFormValues) => {
    try {
      await updateRecipe({
        id: recipeId,
        recipeRequest: recipeToUpdateRequest({ingredients, values: formData}),
      }).unwrap();
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
  const {data, isError, isLoading: isFetching} = useGetRecipeQuery({id: id!});
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
