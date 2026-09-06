import {Button} from '@heroui/react';
import {useState} from 'react';
import {generatePath, Navigate} from 'react-router-dom';
import {ApiError} from '@/api/client';
import {type Food, useGetFoodQuery, useUpdateFoodMutation} from '@/api/nutrition-foods';
import {applyFormErrors} from '@/api/shared';
import FoodForm, {foodToFormValues, foodToMediaValue, useFoodForm} from '@/library/foods/food-form';
import {type FoodFormValues, foodToUpdateRequest, isFoodEditable} from '@/library/foods/food-form-data';
import {ROUTES} from '@/routes';
import {BackButton} from '@/ui/back-button';
import {ErrorState} from '@/ui/error-state';
import {Page} from '@/ui/page';
import {PageSkeleton} from '@/ui/page-skeleton';
import {useGoBack} from '@/ui/use-go-back';
import {useRouteParam} from '@/ui/use-route-param';

function EditFoodForm({
  backPath,
  food: initial,
  foodId,
  reload,
}: {
  backPath: string;
  food: Food;
  foodId: string;
  reload: () => Promise<Food | undefined>;
}) {
  const goBack = useGoBack(backPath);
  const updateFoodMutation = useUpdateFoodMutation();

  const [food, setBase] = useState(initial);
  const [reloading, setReloading] = useState(false);

  const form = useFoodForm({
    defaultValues: foodToFormValues(food),
  });

  const discard = async () => {
    setReloading(true);
    try {
      const latest = await reload();
      if (!latest) {
        throw new Error('Missing food');
      }
      form.reset(foodToFormValues(latest));
      setBase(latest);
    } catch {
      form.setError('root', {message: "Couldn't reload. Your draft is still here."});
    } finally {
      setReloading(false);
    }
  };

  const onSubmit = async (formData: FoodFormValues) => {
    try {
      await updateFoodMutation.mutateAsync({
        id: foodId,
        body: foodToUpdateRequest(formData, food.revision),
      });
      goBack();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        form.setError('root', {
          message: 'Changed elsewhere. Your draft is still here. Discard changes to load the saved version.',
        });
        return;
      }
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
          <Button
            isDisabled={updateFoodMutation.isPending || reloading}
            onPress={discard}
            variant="tertiary"
          >
            Discard changes and reload
          </Button>
          <FoodForm
            form={form}
            initialMedia={foodToMediaValue(food)}
            isSubmitting={updateFoodMutation.isPending || reloading}
            onCancel={goBack}
            onSubmit={onSubmit}
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
  const {data, isLoading: isFetching, refetch} = useGetFoodQuery(id);
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

  if (!data) {
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
      key={id}
      reload={async () => (await refetch({throwOnError: true})).data?.data}
      backPath={backPath}
      food={data.data}
      foodId={id}
    />
  );
}
