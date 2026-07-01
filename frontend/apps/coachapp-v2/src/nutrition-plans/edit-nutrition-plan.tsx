import {Button, Spinner, Typography} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useParams} from 'react-router-dom';

import {Page} from '@/@components/page';
import {useGoBack} from '@/@hooks/use-go-back';
import {useGetNutritionPlanQuery, useUpdateNutritionPlanMutation} from '@/api/generated';
import {applyFormErrors} from '@/api/shared';
import NutritionPlanForm, {
  type NutritionPlanFormValues,
  nutritionPlanToFormValues,
  nutritionPlanToUpdateRequest,
  useNutritionPlanForm,
} from '@/nutrition-plans/nutrition-plan-form/nutrition-plan-form';

export default function EditNutritionPlan() {
  const {id} = useParams<{id: string}>();
  const {data, isError, isLoading: isFetching} = useGetNutritionPlanQuery({id: id!});
  const [updatePlan, {isLoading: isUpdating}] = useUpdateNutritionPlanMutation();

  const plan = data?.data;
  const backPath = `/library/nutrition-plans/${id}`;
  const goBack = useGoBack(backPath);

  const form = useNutritionPlanForm({
    values: plan ? nutritionPlanToFormValues(plan) : undefined,
  });

  if (isFetching) {
    return (
      <Page>
        <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
          <Page.TitleGroup>
            <Page.Title>Edit nutrition plan</Page.Title>
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

  if (isError || !plan) {
    return (
      <Page>
        <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
          <Page.TitleGroup>
            <Page.Title>Edit nutrition plan</Page.Title>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Toolbar>
          <Button
            onPress={goBack}
            size="sm"
            variant="ghost"
          >
            <ArrowLeft size={16} />
            Back
          </Button>
        </Page.Toolbar>
        <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
          <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 text-center">
            <Typography
              className="text-danger"
              type="body-sm"
            >
              Nutrition plan couldn't load
            </Typography>
          </div>
        </Page.Content>
      </Page>
    );
  }

  const onSubmit = async (formData: NutritionPlanFormValues) => {
    try {
      await updatePlan({nutritionPlanRequest: nutritionPlanToUpdateRequest(formData), id: id!}).unwrap();
      goBack();
    } catch (err) {
      applyFormErrors(err, "Nutrition plan wasn't updated. Check the details and try again", form.setError);
    }
  };

  return (
    <Page>
      <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
        <Page.TitleGroup>
          <div className={'flex items-center gap-1'}>
            <Button
              aria-label="Back"
              onPress={goBack}
              size="md"
              variant="ghost"
              isIconOnly
            >
              <ArrowLeft size={20} />
            </Button>
            <Page.Title>Edit nutrition plan</Page.Title>
          </div>
          <Page.Description>{plan.name}</Page.Description>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
        <NutritionPlanForm
          form={form}
          isSubmitting={isUpdating}
          onCancel={goBack}
          onSubmit={onSubmit}
          submitLabel="Save changes"
          submittingLabel="Saving changes"
        />
      </Page.Content>
    </Page>
  );
}
