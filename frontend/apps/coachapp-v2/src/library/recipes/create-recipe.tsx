import {AlertDialog, Button, toast, useOverlayState} from '@heroui/react';
import {generatePath, useNavigate} from 'react-router-dom';
import {useCreateRecipeMutation} from '@/api/nutrition-foods';
import {applyFormErrors} from '@/api/shared';
import RecipeForm, {useRecipeForm} from '@/library/recipes/recipe-form';
import {type RecipeFormValues, recipeToCreateRequest} from '@/library/recipes/recipe-form-data';
import {ROUTES} from '@/routes';
import {BackButton} from '@/ui/back-button';
import {Page} from '@/ui/page';
import {useGoBack} from '@/ui/use-go-back';

export default function CreateRecipe() {
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.RECIPES);
  const createRecipe = useCreateRecipeMutation();
  const leaveConfirm = useOverlayState();

  const form = useRecipeForm();

  const hasUnsavedChanges = form.formState.isDirty;

  const attemptLeave = () => {
    if (hasUnsavedChanges) {
      leaveConfirm.open();
      return;
    }
    goBack();
  };

  const onSubmit = async (data: RecipeFormValues) => {
    try {
      const result = await createRecipe.mutateAsync(recipeToCreateRequest(data));
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
          <div className={'flex items-center'}>
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
            isSubmitting={createRecipe.isPending}
            onCancel={attemptLeave}
            onSubmit={onSubmit}
            submitLabel="Create recipe"
            submittingLabel="Creating recipe"
          />
        </Page.Frame>
      </Page.Content>

      <AlertDialog.Backdrop
        isOpen={leaveConfirm.isOpen}
        onOpenChange={leaveConfirm.setOpen}
        variant="transparent"
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
