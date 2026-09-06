import {AlertDialog, Button, useOverlayState} from '@heroui/react';
import {useState} from 'react';
import {generatePath} from 'react-router-dom';
import {ApiError} from '@/api/client';
import {type Recipe, useGetRecipeQuery, useUpdateRecipeMutation} from '@/api/nutrition-foods';
import {applyFormErrors} from '@/api/shared';
import {libraryInUseMessage} from '@/library/library-impact';
import RecipeForm, {useRecipeForm} from '@/library/recipes/recipe-form';
import {type RecipeFormValues, recipeToFormValues, recipeToUpdateRequest} from '@/library/recipes/recipe-form-data';
import {ROUTES} from '@/routes';
import {BackButton} from '@/ui/back-button';
import {ErrorState} from '@/ui/error-state';
import {Page} from '@/ui/page';
import {PageSkeleton} from '@/ui/page-skeleton';
import {useGoBack} from '@/ui/use-go-back';
import {useRouteParam} from '@/ui/use-route-param';

function EditRecipeForm({
  backPath,
  recipe: initial,
  recipeId,
  reload,
}: {
  backPath: string;
  recipe: Recipe;
  recipeId: string;
  reload: () => Promise<Recipe | undefined>;
}) {
  const goBack = useGoBack(backPath);
  const updateRecipe = useUpdateRecipeMutation();
  const leaveConfirm = useOverlayState();

  const [recipe, setBase] = useState(initial);
  const [reloading, setReloading] = useState(false);

  const form = useRecipeForm({
    defaultValues: recipeToFormValues(recipe),
  });

  const hasUnsavedChanges = form.formState.isDirty;

  const attemptLeave = () => {
    if (hasUnsavedChanges) {
      leaveConfirm.open();
      return;
    }
    goBack();
  };

  const discard = async () => {
    setReloading(true);
    try {
      const latest = await reload();
      if (!latest) {
        throw new Error('Missing recipe');
      }
      form.reset(recipeToFormValues(latest));
      setBase(latest);
    } catch {
      form.setError('root', {message: "Couldn't reload. Your draft is still here."});
    } finally {
      setReloading(false);
    }
  };

  const onSubmit = async (formData: RecipeFormValues) => {
    try {
      await updateRecipe.mutateAsync({
        id: recipeId,
        body: recipeToUpdateRequest(formData, recipe.revision),
      });
      goBack();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        form.setError('root', {
          message: 'Changed elsewhere. Your draft is still here. Discard changes to load the saved version.',
        });
        return;
      }
      applyFormErrors(
        err,
        libraryInUseMessage(err, "Recipe wasn't updated. Check the details and try again"),
        form.setError,
      );
    }
  };

  return (
    <Page>
      <Page.Header size="content">
        <Page.TitleGroup>
          <div className={'flex items-center'}>
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
          <Button
            isDisabled={updateRecipe.isPending || reloading}
            onPress={discard}
            variant="tertiary"
          >
            Discard changes and reload
          </Button>
          <RecipeForm
            form={form}
            isSubmitting={updateRecipe.isPending || reloading}
            onCancel={attemptLeave}
            onSubmit={onSubmit}
            submitLabel="Save changes"
            submittingLabel="Saving changes"
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

export default function EditRecipe() {
  const id = useRouteParam('id');
  const {data, isError, isLoading: isFetching, refetch} = useGetRecipeQuery(id);
  const backPath = generatePath(ROUTES.RECIPE_DETAIL, {id});
  const goBackOuter = useGoBack(backPath);

  if (isError && !data) {
    return (
      <Page>
        <Page.Header size="content">
          <Page.TitleGroup>
            <div className={'flex items-center'}>
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
            <ErrorState
              message="Couldn't load recipe."
              onRetry={refetch}
            />
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
            <div className={'flex items-center'}>
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
      key={id}
      reload={async () => (await refetch({throwOnError: true})).data?.data}
      backPath={backPath}
      recipe={data.data}
      recipeId={id}
    />
  );
}
