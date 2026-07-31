import {AlertDialog, Button, useOverlayState} from '@heroui/react';
import {useState} from 'react';
import {generatePath, useParams} from 'react-router-dom';
import {BackButton} from '@/@components/back-button';
import {ErrorState} from '@/@components/error-state';
import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useGetRecipeQuery, useUpdateRecipeMutation} from '@/api/nutrition-foods';
import {applyFormErrors} from '@/api/shared';
import type {IngredientItem} from '@/domain/recipes';
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
  const {data} = useGetRecipeQuery(recipeId);
  const updateRecipe = useUpdateRecipeMutation();

  const recipe = data!.data;
  const [ingredients, setIngredients] = useState<IngredientItem[]>(() =>
    recipeIngredientsToDrafts(recipe.recipe_ingredients),
  );
  // Ingredients and serving sizes aren't react-hook-form fields, so track their
  // edits separately from form.formState.isDirty for the unsaved-changes guard.
  const [contentChanged, setContentChanged] = useState(false);
  const leaveConfirm = useOverlayState();

  const form = useRecipeForm({
    values: recipeToFormValues({...recipe, servings_count: recipe.servings_count ?? null}),
  });

  const hasUnsavedChanges = form.formState.isDirty || contentChanged;

  const handleIngredientsChange = (items: IngredientItem[]) => {
    setIngredients(items);
    setContentChanged(true);
  };

  const attemptLeave = () => {
    if (hasUnsavedChanges) {
      leaveConfirm.open();
      return;
    }
    goBack();
  };

  const onSubmit = async (formData: RecipeFormValues) => {
    try {
      await updateRecipe.mutateAsync({
        id: recipeId,
        body: recipeToUpdateRequest({ingredients, values: formData}),
      });
      goBack();
    } catch (err) {
      applyFormErrors(err, "Recipe wasn't updated. Check the details and try again", form.setError);
    }
  };

  return (
    <Page>
      <Page.Header size="content">
        <Page.TitleGroup>
          <div className={'flex items-center gap-1'}>
            <BackButton onPress={attemptLeave} />
            <Page.Title>Edit recipe</Page.Title>
          </div>
          <Page.Description>Update this recipe in your library.</Page.Description>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Content bare>
        <Page.Frame
          className="pt-4 pb-6"
          size="content"
        >
          <RecipeForm
            form={form}
            ingredients={ingredients}
            isSubmitting={updateRecipe.isPending}
            onCancel={attemptLeave}
            onIngredientsChange={handleIngredientsChange}
            onSubmit={onSubmit}
            submitLabel="Save changes"
            submittingLabel="Saving changes"
          />
        </Page.Frame>
      </Page.Content>

      <AlertDialog.Backdrop
        isOpen={leaveConfirm.isOpen}
        onOpenChange={leaveConfirm.setOpen}
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="warning" />
              <AlertDialog.Heading>Discard changes?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>You have unsaved changes. Leaving now will discard them.</AlertDialog.Body>
            <AlertDialog.Footer>
              <Button
                slot="close"
                variant="tertiary"
              >
                Keep editing
              </Button>
              <Button
                onPress={() => {
                  leaveConfirm.close();
                  goBack();
                }}
                variant="danger"
              >
                Discard
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </Page>
  );
}

export default function EditRecipe() {
  const {id} = useParams<{id: string}>();
  const {data, isError, isLoading: isFetching} = useGetRecipeQuery(id!);
  const backPath = generatePath(ROUTES.RECIPE_DETAIL, {id: id!});
  const goBackOuter = useGoBack(backPath);

  if (isError) {
    return (
      <Page>
        <Page.Header size="content">
          <Page.TitleGroup>
            <div className={'flex items-center gap-1'}>
              <BackButton onPress={goBackOuter} />
              <Page.Title>Edit recipe</Page.Title>
            </div>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content bare>
          <Page.Frame
            className="pt-4 pb-6"
            size="content"
          >
            <ErrorState message="Couldn't load recipe." />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }

  if (isFetching || !data) {
    return (
      <Page>
        <Page.Header size="content">
          <Page.TitleGroup>
            <div className={'flex items-center gap-1'}>
              <BackButton onPress={goBackOuter} />
              <Page.Title>Edit recipe</Page.Title>
            </div>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content bare>
          <Page.Frame
            className="pt-4 pb-6"
            size="content"
          >
            <PageSkeleton />
          </Page.Frame>
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
