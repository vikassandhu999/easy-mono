import {Button} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useMemo, useState} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import type {Food} from '@/api/foods';
import {useCreateFoodMutation} from '@/api/foods';
import {foodToCreateRequest, foodToDuplicateFormValues} from '@/api/mappers/foods';
import type {ServingSize} from '@/api/shared';
import {applyFormErrors} from '@/api/shared';
import FoodForm, {type FoodFormValues, useFoodForm} from '@/foods/food-form';

export default function CreateFood() {
  const navigate = useNavigate();
  const location = useLocation();
  const goBack = useGoBack(ROUTES.FOODS);
  const [createFood, {isLoading}] = useCreateFoodMutation();

  // Duplicate pre-fill: read food data passed via route state
  const duplicateFrom = (location.state as null | {duplicateFrom?: Food})?.duplicateFrom ?? null;

  const duplicateFormValues = useMemo<FoodFormValues | undefined>(
    () => (duplicateFrom ? foodToDuplicateFormValues(duplicateFrom) : undefined),
    [duplicateFrom],
  );

  const [servingSizes, setServingSizes] = useState<ServingSize[]>(duplicateFrom?.serving_sizes ?? []);

  const form = useFoodForm(duplicateFormValues ? {defaultValues: duplicateFormValues} : undefined);

  const onSubmit = async (data: FoodFormValues) => {
    try {
      const result = await createFood(foodToCreateRequest({servingSizes, values: data})).unwrap();
      navigate(`/library/foods/${result.data.id}`, {replace: true});
    } catch (err) {
      applyFormErrors(err, "Food wasn't created. Check the details and try again", form.setError);
    }
  };

  return (
    <Page>
      <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
        <Page.TitleGroup>
          <Page.Title>Create food</Page.Title>
          <Page.Description>Add nutrition details, serving sizes, and notes</Page.Description>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Toolbar>
        <Button
          onPress={goBack}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Foods
        </Button>
      </Page.Toolbar>
      <Page.Content className="px-4 pb-6 md:px-6 lg:px-8  max-w-2xl">
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
