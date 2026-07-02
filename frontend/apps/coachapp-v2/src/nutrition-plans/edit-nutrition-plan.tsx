import {useParams} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
import {ErrorState} from '@/@components/error-state';
import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
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
        <Page.Header>
          <Page.TitleGroup>
            <div className={'flex items-center gap-1'}>
              <BackButton onPress={goBack} />
              <Page.Title>Edit nutrition plan</Page.Title>
            </div>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content className="px-4 pb-6 pt-4 md:px-6 lg:px-8">
          <PageSkeleton />
        </Page.Content>
      </Page>
    );
  }

  if (isError || !plan) {
    return (
      <Page>
        <Page.Header>
          <Page.TitleGroup>
            <div className={'flex items-center gap-1'}>
              <BackButton onPress={goBack} />
              <Page.Title>Edit nutrition plan</Page.Title>
            </div>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content className="px-4 pb-6 pt-4 md:px-6 lg:px-8">
          <ErrorState message="Couldn't load nutrition plan." />
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
      <Page.Header>
        <Page.TitleGroup>
          <div className={'flex items-center gap-1'}>
            <BackButton onPress={goBack} />
            <Page.Title>Edit nutrition plan</Page.Title>
          </div>
          <Page.Description>{plan.name}</Page.Description>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Content className="px-4 pb-6 pt-4 md:px-6 lg:px-8">
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
