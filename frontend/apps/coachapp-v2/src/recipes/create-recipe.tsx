import {AlertDialog, Button, toast, useOverlayState} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useCreateRecipeMutation} from '@/api/generated';
import {applyFormErrors, type ServingSize} from '@/api/shared';
import type {IngredientItem} from '@/foods/components/ingredient-list';
import RecipeForm, {
  type RecipeFormValues,
  recipeToCreateRequest,
  useRecipeForm,
} from '@/recipes/recipe-form/recipe-form';

export default function CreateRecipe() {
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.RECIPES);
  const [createRecipe, {isLoading}] = useCreateRecipeMutation();
  const [ingredients, setIngredients] = useState<IngredientItem[]>([]);
  const [servingSizes, setServingSizes] = useState<ServingSize[]>([]);
  const leaveConfirm = useOverlayState();

  const form = useRecipeForm();

  // Unsaved-changes guard: the form's own dirtiness plus the ingredient and
  // serving-size props (which aren't react-hook-form fields).
  const hasUnsavedChanges = form.formState.isDirty || ingredients.length > 0 || servingSizes.length > 0;

  const attemptLeave = () => {
    if (hasUnsavedChanges) {
      leaveConfirm.open();
      return;
    }
    goBack();
  };

  const onSubmit = async (data: RecipeFormValues) => {
    try {
      const result = await createRecipe({
        recipeRequest: recipeToCreateRequest({ingredients, servingSizes, values: data}),
      }).unwrap();
      toast.success('Recipe created');
      navigate(`/library/recipes/${result.data.id}`, {replace: true});
    } catch (err) {
      applyFormErrors(err, "Recipe wasn't created. Check the details and try again", form.setError);
    }
  };

  return (
    <Page>
      <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
        <Page.TitleGroup>
          <div className={'flex items-center gap-1'}>
            <Button
              aria-label="Back"
              onPress={attemptLeave}
              size="md"
              variant="ghost"
              isIconOnly
            >
              <ArrowLeft size={20} />
            </Button>
            <Page.Title>Create recipe</Page.Title>
          </div>
          <Page.Description>Add ingredients, nutrition details, and instructions</Page.Description>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
        <div className="max-w-160 mt-4">
          <RecipeForm
            form={form}
            ingredients={ingredients}
            isSubmitting={isLoading}
            onCancel={attemptLeave}
            onIngredientsChange={setIngredients}
            onServingSizesChange={setServingSizes}
            onSubmit={onSubmit}
            servingSizes={servingSizes}
            submitLabel="Create recipe"
            submittingLabel="Creating recipe"
          />
        </div>
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
