import {useMemo, useState} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {BackButton} from '@/@components/back-button';
import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import type {Food} from '@/api/generated';
import {useCreateCoachFoodMutation} from '@/api/nutrition-foods';
import type {ServingSize} from '@/api/shared';
import {applyFormErrors} from '@/api/shared';
import FoodForm, {
  type FoodFormValues,
  foodToCreateRequest,
  foodToDuplicateFormValues,
  useFoodForm,
} from '@/foods/food-form/food-form';

export default function CreateFood() {
  const navigate = useNavigate();
  const location = useLocation();
  const goBack = useGoBack(ROUTES.FOODS);
  const [createFood, {isLoading}] = useCreateCoachFoodMutation();

  // Duplicate pre-fill: read food data passed via route state
  const duplicateFrom = (location.state as null | {duplicateFrom?: Food})?.duplicateFrom ?? null;

  const duplicateFormValues = useMemo<FoodFormValues | undefined>(
    () => (duplicateFrom ? foodToDuplicateFormValues(duplicateFrom) : undefined),
    [duplicateFrom],
  );

  const [servingSizes, setServingSizes] = useState<ServingSize[]>(
    (duplicateFrom?.serving_sizes ?? []).map((s) => ({
      unit: s.unit,
      amount: s.amount ?? null,
      weight_g: s.weight_g ?? null,
    })),
  );

  const form = useFoodForm(duplicateFormValues ? {defaultValues: duplicateFormValues} : undefined);

  const onSubmit = async (data: FoodFormValues) => {
    try {
      const result = await createFood({foodRequest: foodToCreateRequest({servingSizes, values: data})}).unwrap();
      navigate(`/library/foods/${result.data.id}`, {replace: true});
    } catch (err) {
      applyFormErrors(err, "Food wasn't created. Check the details and try again", form.setError);
    }
  };

  return (
    <Page className="bg-background">
      <Page.Header>
        <Page.TitleGroup>
          <div className={'flex items-center gap-1'}>
            <BackButton onPress={goBack} />
            <Page.Title>Create food</Page.Title>
          </div>
          <Page.Description>Add a custom food to your library.</Page.Description>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Content className="px-4 pb-6 pt-4 md:px-6 lg:px-8">
        <FoodForm
          form={form}
          isSubmitting={isLoading}
          onCancel={() => navigate(ROUTES.FOODS)}
          onServingSizesChange={setServingSizes}
          onSubmit={onSubmit}
          servingSizes={servingSizes}
          submitLabel="Create food"
          submittingLabel="Creating food"
        />
      </Page.Content>
    </Page>
  );
}
