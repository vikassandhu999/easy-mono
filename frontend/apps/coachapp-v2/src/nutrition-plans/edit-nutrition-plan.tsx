import {useParams} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
import {ErrorState} from '@/@components/error-state';
import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {useGoBack} from '@/@hooks/use-go-back';
import {coachApi, useGetNutritionPlanQuery, useUpdateNutritionPlanMutation} from '@/api/generated';
import {applyFormErrors} from '@/api/shared';
import NutritionPlanForm, {
  type NutritionPlanFormValues,
  nutritionPlanToFormValues,
  nutritionPlanToUpdateRequest,
  useNutritionPlanForm,
} from '@/nutrition-plans/nutrition-plan-form/nutrition-plan-form';
import {useAppDispatch} from '@/store';

// NE/TE mobile ref shortens the title; desktop keeps the COPY.md string.
const TITLE = (
  <>
    <span className="sm:hidden">Edit plan</span>
    <span className="hidden sm:inline">Edit nutrition plan</span>
  </>
);

export default function EditNutritionPlan() {
  const dispatch = useAppDispatch();
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
        <Page.Header size="content">
          <Page.TitleGroup>
            <div className={'flex items-center gap-1'}>
              <BackButton onPress={goBack} />
              <Page.Title>{TITLE}</Page.Title>
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

  if (isError || !plan) {
    return (
      <Page>
        <Page.Header size="content">
          <Page.TitleGroup>
            <div className={'flex items-center gap-1'}>
              <BackButton onPress={goBack} />
              <Page.Title>{TITLE}</Page.Title>
            </div>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content bare>
          <Page.Frame
            className="pt-4 pb-6"
            size="content"
          >
            <ErrorState message="Couldn't load nutrition plan." />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }

  const onSubmit = async (formData: NutritionPlanFormValues) => {
    try {
      const result = await updatePlan({nutritionPlanRequest: nutritionPlanToUpdateRequest(formData), id: id!}).unwrap();
      // tag:false — sync the cached detail so the builder shows the new values.
      // meals/days/weekday_assignments are optional on the update response —
      // keep the hydrated ones from the detail fetch rather than wiping them.
      dispatch(
        coachApi.util.updateQueryData('getNutritionPlan', {id: id!}, (draft) => {
          draft.data = {
            ...result.data,
            meals: result.data.meals ?? draft.data.meals,
            days: result.data.days ?? draft.data.days,
            weekday_assignments: result.data.weekday_assignments ?? draft.data.weekday_assignments,
          };
        }),
      );
      goBack();
    } catch (err) {
      applyFormErrors(err, "Nutrition plan wasn't updated. Check the details and try again", form.setError);
    }
  };

  return (
    <Page>
      <Page.Header size="content">
        <Page.TitleGroup>
          <div className={'flex items-center gap-1'}>
            <BackButton onPress={goBack} />
            <Page.Title>{TITLE}</Page.Title>
          </div>
          <Page.Description>Update the plan's goals. Meals &amp; days live in the builder.</Page.Description>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Content bare>
        <Page.Frame
          className="pt-4 pb-6"
          size="content"
        >
          <NutritionPlanForm
            form={form}
            isSubmitting={isUpdating}
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
