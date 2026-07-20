import {AlertDialog, Button, useOverlayState} from '@heroui/react';
import {useState} from 'react';
import {useParams} from 'react-router-dom';
import {BackButton} from '@/@components/back-button';
import {ErrorState} from '@/@components/error-state';
import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {useGoBack} from '@/@hooks/use-go-back';
import {useGetRecipeQuery, useUpdateRecipeMutation} from '@/api/generated';
import {applyFormErrors, type ServingSize} from '@/api/shared';
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
  const [servingSizes, setServingSizes] = useState<ServingSize[]>(() =>
    recipe.serving_sizes.map((s) => ({unit: s.unit, amount: s.amount ?? null, weight_g: s.weight_g ?? null})),
  );
  // Ingredients and serving sizes aren't react-hook-form fields, so track their
  // edits separately from form.formState.isDirty for the unsaved-changes guard.
  const [contentChanged, setContentChanged] = useState(false);
  const leaveConfirm = useOverlayState();

  const form = useRecipeForm({
    values: recipeToFormValues(recipe),
  });

  const hasUnsavedChanges = form.formState.isDirty || contentChanged;

  const handleIngredientsChange = (items: IngredientItem[]) => {
    setIngredients(items);
    setContentChanged(true);
  };

  const handleServingSizesChange = (sizes: ServingSize[]) => {
    setServingSizes(sizes);
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
      await updateRecipe({
        id: recipeId,
        recipeRequest: recipeToUpdateRequest({ingredients, servingSizes, values: formData}),
      }).unwrap();
      goBack();
    } catch (err) {
      applyFormErrors(err, "Recipe wasn't updated. Check the details and try again", form.setError);
    }
  };

  return (
    <Page className="bg-background">
      <Page.Header>
        <Page.TitleGroup>
          <div className={'flex items-center gap-1'}>
            <BackButton onPress={attemptLeave} />
            <Page.Title>Edit recipe</Page.Title>
          </div>
          <Page.Description>Update this recipe in your library.</Page.Description>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Content className="px-4 pb-6 pt-4 md:px-6 lg:px-8">
        <RecipeForm
          form={form}
          ingredients={ingredients}
          isSubmitting={isUpdating}
          onCancel={attemptLeave}
          onIngredientsChange={handleIngredientsChange}
          onServingSizesChange={handleServingSizesChange}
          onSubmit={onSubmit}
          servingSizes={servingSizes}
          submitLabel="Save changes"
          submittingLabel="Saving changes"
        />
      </Page.Content>

      <AlertDialog.Backdrop
        isOpen={leaveConfirm.isOpen}
        onOpenChange={leaveConfirm.setOpen}
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-100">
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
  const {data, isError, isLoading: isFetching} = useGetRecipeQuery({id: id!});
  const backPath = `/library/recipes/${id}`;
  const goBackOuter = useGoBack(backPath);

  if (isFetching || !data) {
    return (
      <Page className="bg-background">
        <Page.Header>
          <Page.TitleGroup>
            <div className={'flex items-center gap-1'}>
              <BackButton onPress={goBackOuter} />
              <Page.Title>Edit recipe</Page.Title>
            </div>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content className="px-4 pb-6 pt-4 md:px-6 lg:px-8">
          <PageSkeleton />
        </Page.Content>
      </Page>
    );
  }

  if (isError) {
    return (
      <Page className="bg-background">
        <Page.Header>
          <Page.TitleGroup>
            <div className={'flex items-center gap-1'}>
              <BackButton onPress={goBackOuter} />
              <Page.Title>Edit recipe</Page.Title>
            </div>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content className="px-4 pb-6 pt-4 md:px-6 lg:px-8">
          <ErrorState message="Couldn't load recipe." />
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
