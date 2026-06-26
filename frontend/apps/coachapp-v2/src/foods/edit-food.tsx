import {Button, Spinner, Typography} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useState} from 'react';
import {Navigate, useParams} from 'react-router-dom';
import {Page} from '@/@components/page';
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
      <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
        <Page.TitleGroup>
          <div className={'flex items-center gap-1'}>
            <Button
              onPress={goBack}
              size="md"
              variant="ghost"
              isIconOnly
            >
              <ArrowLeft size={20} />
            </Button>
            <Page.Title>Edit food</Page.Title>
          </div>
          <Page.Description>{food.name}</Page.Description>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
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

  if (isFetching || !data) {
    return (
      <Page>
        <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
          <Page.TitleGroup>
            <Page.Title>Edit food</Page.Title>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
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
        <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
          <Page.TitleGroup>
            <Page.Title>Edit food</Page.Title>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Toolbar>
          <Button
            onPress={goBackOuter}
            size="sm"
            variant="ghost"
          >
            <ArrowLeft size={16} />
            Food
          </Button>
        </Page.Toolbar>
        <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
          <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 text-center">
            <Typography
              className="text-danger"
              type="body-sm"
            >
              Food couldn't load
            </Typography>
          </div>
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
