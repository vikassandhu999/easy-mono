import {useState} from 'react';
import {generatePath, Navigate, useParams} from 'react-router-dom';
import {BackButton} from '@/@components/back-button';
import {ErrorState} from '@/@components/error-state';
import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useGetFoodQuery, useUpdateFoodMutation} from '@/api/nutrition-foods';
import type {ServingSize} from '@/api/shared';
import {applyFormErrors} from '@/api/shared';
import FoodForm, {foodToFormValues, foodToMediaValue, useFoodForm} from '@/foods/food-form/food-form';
import {type FoodFormValues, foodToUpdateRequest, isFoodEditable} from '@/foods/food-form/food-form-data';

// Rendered only when food data is available, avoiding useEffect to sync server state
// into local state (which the React Compiler lint rule forbids).
function EditFoodForm({backPath, foodId}: {backPath: string; foodId: string}) {
  const goBack = useGoBack(backPath);
  const {data} = useGetFoodQuery(foodId);
  const updateFoodMutation = useUpdateFoodMutation();

  const food = data!.data;

  const [servingSizes, setServingSizes] = useState<ServingSize[]>(
    food.serving_sizes.map((s) => ({unit: s.unit, amount: s.amount ?? null, weight_g: s.weight_g ?? null})),
  );

  const form = useFoodForm({
    defaultValues: foodToFormValues(food),
  });

  const onSubmit = async (formData: FoodFormValues) => {
    try {
      await updateFoodMutation.mutateAsync({id: foodId, body: foodToUpdateRequest({servingSizes, values: formData})});
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
  const {id} = useParams<{id: string}>();
  const {data, isError, isLoading: isFetching, refetch} = useGetFoodQuery(id!);
  const backPath = generatePath(ROUTES.FOOD_DETAIL, {id: id!});
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
      foodId={id!}
    />
  );
}
