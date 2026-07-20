import {useState} from 'react';
import {Navigate, useParams} from 'react-router-dom';
import {BackButton} from '@/@components/back-button';
import {ErrorState} from '@/@components/error-state';
import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {useGoBack} from '@/@hooks/use-go-back';
import {useGetFoodQuery, useUpdateFoodMutation} from '@/api/generated';
import type {ServingSize} from '@/api/shared';
import {applyFormErrors} from '@/api/shared';
import FoodForm, {
  type FoodFormValues,
  foodToFormValues,
  foodToUpdateRequest,
  useFoodForm,
} from '@/foods/food-form/food-form';

// Rendered only when food data is available, avoiding useEffect to sync server state
// into local state (which the React Compiler lint rule forbids).
function EditFoodForm({backPath, foodId}: {backPath: string; foodId: string}) {
  const goBack = useGoBack(backPath);
  const {data} = useGetFoodQuery({id: foodId});
  const [updateFood, {isLoading: isUpdating}] = useUpdateFoodMutation();

  const food = data!.data;

  const [servingSizes, setServingSizes] = useState<ServingSize[]>(
    food.serving_sizes.map((s) => ({unit: s.unit, amount: s.amount ?? null, weight_g: s.weight_g ?? null})),
  );

  const form = useFoodForm({
    values: foodToFormValues(food),
  });

  const onSubmit = async (formData: FoodFormValues) => {
    try {
      await updateFood({id: foodId, foodUpdateRequest: foodToUpdateRequest({servingSizes, values: formData})}).unwrap();
      goBack();
    } catch (err) {
      applyFormErrors(err, "Food wasn't updated. Check the details and try again", form.setError);
    }
  };

  return (
    <Page>
      <Page.Header size="form">
        <Page.TitleGroup>
          <div className={'flex items-center gap-1'}>
            <BackButton onPress={goBack} />
            <Page.Title>Edit food</Page.Title>
          </div>
          <Page.Description>Update this food in your library.</Page.Description>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Content className="pt-4 pb-6">
        <FoodForm
          form={form}
          isSubmitting={isUpdating}
          onCancel={goBack}
          onServingSizesChange={setServingSizes}
          onSubmit={onSubmit}
          servingSizes={servingSizes}
          submitLabel="Save changes"
          submittingLabel="Saving changes"
        />
      </Page.Content>
    </Page>
  );
}

export default function EditFood() {
  const {id} = useParams<{id: string}>();
  const {data, isError, isLoading: isFetching} = useGetFoodQuery({id: id!});
  const backPath = `/library/foods/${id}`;
  const goBackOuter = useGoBack(backPath);

  if (isFetching) {
    return (
      <Page>
        <Page.Header size="form">
          <Page.TitleGroup>
            <div className={'flex items-center gap-1'}>
              <BackButton onPress={goBackOuter} />
              <Page.Title>Edit food</Page.Title>
            </div>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content className="pt-4 pb-6">
          <PageSkeleton />
        </Page.Content>
      </Page>
    );
  }

  if (isError || !data) {
    return (
      <Page>
        <Page.Header size="form">
          <Page.TitleGroup>
            <div className={'flex items-center gap-1'}>
              <BackButton onPress={goBackOuter} />
              <Page.Title>Edit food</Page.Title>
            </div>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content className="pt-4 pb-6">
          <ErrorState message="Couldn't load food." />
        </Page.Content>
      </Page>
    );
  }

  // Guard: system foods cannot be edited — redirect to detail page
  if (data.data.source === 'system') {
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
