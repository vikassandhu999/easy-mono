import {useState} from 'react';
import {generatePath, Navigate} from 'react-router-dom';
import {type Food, useGetFoodQuery, useUpdateFoodMutation} from '@/api/nutrition-foods';
import type {ServingSize} from '@/api/shared';
import {applyFormErrors} from '@/api/shared';
import FoodForm, {foodToFormValues, foodToMediaValue, useFoodForm} from '@/library/foods/food-form';
import {
  editorServingSizesFromFood,
  type FoodFormValues,
  foodToUpdateRequest,
  isFoodEditable,
} from '@/library/foods/food-form-data';
import {ROUTES} from '@/routes';
import {BackButton} from '@/ui/back-button';
import {ErrorState} from '@/ui/error-state';
import {Page} from '@/ui/page';
import {PageSkeleton} from '@/ui/page-skeleton';
import {useGoBack} from '@/ui/use-go-back';
import {useRouteParam} from '@/ui/use-route-param';

// Rendered only when food data is available, avoiding useEffect to sync server state
// into local state (which the React Compiler lint rule forbids).
function EditFoodForm({backPath, food, foodId}: {backPath: string; food: Food; foodId: string}) {
  const goBack = useGoBack(backPath);
  const updateFoodMutation = useUpdateFoodMutation();

  const [servingSizes, setServingSizes] = useState<ServingSize[]>(editorServingSizesFromFood(food.serving_sizes));

  const form = useFoodForm({
    defaultValues: foodToFormValues(food),
  });

  const onSubmit = async (formData: FoodFormValues) => {
    try {
      await updateFoodMutation.mutateAsync({
        id: foodId,
        body: foodToUpdateRequest({expectedRevision: food.revision, servingSizes, values: formData}),
      });
      goBack();
    } catch (err) {
      applyFormErrors(err, "Food wasn't updated. Check the details and try again", form.setError);
    }
  };

  return (
    <Page>
      <Page.Header size="content">
        <Page.TitleGroup>
          <div className={'flex items-center'}>
            <BackButton onPress={goBack} />
            <Page.Title>Edit food</Page.Title>
          </div>
          <Page.Description>Update this food in your library.</Page.Description>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Content bare>
        <Page.Frame
          className="pt-4 pb-6"
          size="content"
        >
          <FoodForm
            form={form}
            initialMedia={foodToMediaValue(food)}
            isSubmitting={updateFoodMutation.isPending}
            onCancel={goBack}
            onServingSizesChange={setServingSizes}
            onSubmit={onSubmit}
            servingSizes={servingSizes}
            submitLabel="Save changes"
            submittingLabel="Saving changes"
          />
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}

export default function EditFood() {
  const id = useRouteParam('id');
  const {data, isError, isLoading: isFetching, refetch} = useGetFoodQuery(id);
  const backPath = generatePath(ROUTES.FOOD_DETAIL, {id});
  const goBackOuter = useGoBack(backPath);

  if (isFetching) {
    return (
      <Page>
        <Page.Header size="content">
          <Page.TitleGroup>
            <div className={'flex items-center'}>
              <BackButton onPress={goBackOuter} />
              <Page.Title>Edit food</Page.Title>
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

  if (isError || !data) {
    return (
      <Page>
        <Page.Header size="content">
          <Page.TitleGroup>
            <div className={'flex items-center'}>
              <BackButton onPress={goBackOuter} />
              <Page.Title>Edit food</Page.Title>
            </div>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content bare>
          <Page.Frame
            className="pt-4 pb-6"
            size="content"
          >
            <ErrorState
              message="Couldn't load food."
              onRetry={refetch}
            />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }

  // `source` is server-owned provenance; only coach-created foods are mutable.
  if (!isFoodEditable(data.data.source)) {
    return (
      <Navigate
        replace
        to={backPath}
      />
    );
  }

  return (
    <EditFoodForm
      backPath={backPath}
      food={data.data}
      foodId={id}
    />
  );
}
