import {AlertDialog, Button, toast, useOverlayState} from '@heroui/react';
import {useState} from 'react';
import {generatePath, useNavigate} from 'react-router-dom';
import {BackButton} from '@/@components/back-button';
import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useCreateRecipeMutation} from '@/api/nutrition-foods';
import {applyFormErrors} from '@/api/shared';
import type {IngredientItem} from '@/recipes/lib/recipe-math';
import RecipeForm, {
  type RecipeFormValues,
  recipeToCreateRequest,
  useRecipeForm,
} from '@/recipes/recipe-form/recipe-form';

export default function CreateRecipe() {
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.RECIPES);
  const createRecipe = useCreateRecipeMutation();
  const [ingredients, setIngredients] = useState<IngredientItem[]>([]);
  const leaveConfirm = useOverlayState();

  const form = useRecipeForm();

  // Unsaved-changes guard: the form's own dirtiness plus the ingredient and
  // serving-size props (which aren't react-hook-form fields).
  const hasUnsavedChanges = form.formState.isDirty || ingredients.length > 0;

  const attemptLeave = () => {
    if (hasUnsavedChanges) {
      leaveConfirm.open();
      return;
    }
    goBack();
  };

  const onSubmit = async (data: RecipeFormValues) => {
    try {
      const result = await createRecipe.mutateAsync(recipeToCreateRequest({ingredients, values: data}));
      toast.success('Recipe created');
      navigate(generatePath(ROUTES.RECIPE_DETAIL, {id: result.data.id}), {replace: true});
    } catch (err) {
      applyFormErrors(err, "Recipe wasn't created. Check the details and try again", form.setError);
    }
  };

  return (
    <Page>
      <Page.Header size="content">
        <Page.TitleGroup>
          <div className={'flex items-center gap-1'}>
            <BackButton onPress={attemptLeave} />
            <Page.Title>Create recipe</Page.Title>
          </div>
          <Page.Description>Combine foods into a reusable dish.</Page.Description>
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
            isSubmitting={createRecipe.isPending}
            onCancel={attemptLeave}
            onIngredientsChange={setIngredients}
            onSubmit={onSubmit}
            submitLabel="Create recipe"
            submittingLabel="Creating recipe"
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
