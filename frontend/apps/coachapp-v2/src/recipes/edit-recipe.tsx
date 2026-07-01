import {AlertDialog, Button, Spinner, Typography, toast, useOverlayState} from '@heroui/react';
import {Trash2} from 'lucide-react';
import {useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {BackButton} from '@/@components/back-button';
import {ErrorState} from '@/@components/error-state';
import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useDeleteRecipeMutation, useGetRecipeQuery, useUpdateRecipeMutation} from '@/api/generated';
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
  const navigate = useNavigate();
  const goBack = useGoBack(backPath);
  const {data} = useGetRecipeQuery({id: recipeId});
  const [updateRecipe, {isLoading: isUpdating}] = useUpdateRecipeMutation();
  const [deleteRecipe, {isLoading: isDeleting}] = useDeleteRecipeMutation();

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
  const deleteConfirm = useOverlayState();

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
      toast.success('Recipe saved');
      goBack();
    } catch (err) {
      applyFormErrors(err, "Recipe wasn't updated. Check the details and try again", form.setError);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteRecipe({id: recipeId}).unwrap();
      deleteConfirm.close();
      navigate(ROUTES.RECIPES, {replace: true});
    } catch {
      deleteConfirm.close();
      toast.danger("Couldn't delete recipe");
    }
  };

  return (
    <Page>
      <Page.Header>
        <Page.TitleGroup>
          <div className={'flex items-center gap-1'}>
            <BackButton onPress={attemptLeave} />
            <Page.Title>Edit recipe</Page.Title>
          </div>
          <Page.Description>{recipe.name}</Page.Description>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Toolbar className="flex items-center gap-2">
        <Button
          onPress={deleteConfirm.open}
          size="sm"
          variant="danger"
        >
          <Trash2 size={16} />
          Delete
        </Button>
      </Page.Toolbar>
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

      <AlertDialog.Backdrop
        isDismissable={!isDeleting}
        isOpen={deleteConfirm.isOpen}
        onOpenChange={deleteConfirm.setOpen}
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-100">
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>Delete recipe?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <Typography>
                This will permanently delete <strong>{recipe.name}</strong>. This action cannot be undone.
              </Typography>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button
                isDisabled={isDeleting}
                slot="close"
                variant="tertiary"
              >
                Cancel
              </Button>
              <Button
                isPending={isDeleting}
                onPress={handleDelete}
                variant="danger"
              >
                {isDeleting ? 'Deleting' : 'Delete'}
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
      <Page>
        <Page.Header>
          <Page.TitleGroup>
            <div className={'flex items-center gap-1'}>
              <BackButton onPress={goBackOuter} />
              <Page.Title>Edit recipe</Page.Title>
            </div>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content className="px-4 pb-6 pt-4 md:px-6 lg:px-8">
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
