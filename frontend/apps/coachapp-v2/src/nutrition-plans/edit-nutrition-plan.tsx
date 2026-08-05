import {generatePath, useParams} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
import {ErrorState} from '@/@components/error-state';
import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {nutritionPlanKeys} from '@/api/keys';
import {useGetNutritionPlanQuery} from '@/api/nutrition-plan-builder';
import {type NutritionPlan, useUpdateNutritionPlanMutation} from '@/api/nutrition-plans-list';
import {patchQueryData} from '@/api/query-client';
import {applyFormErrors} from '@/api/shared';
import NutritionPlanForm, {
  type NutritionPlanFormValues,
  nutritionPlanToFormValues,
  nutritionPlanToUpdateRequest,
  useNutritionPlanForm,
} from '@/nutrition-plans/nutrition-plan-form/nutrition-plan-form';

// NE/TE mobile ref shortens the title; desktop keeps the COPY.md string.
const TITLE = (
  <>
    <span className="sm:hidden">Edit plan</span>
    <span className="hidden sm:inline">Edit nutrition plan</span>
  </>
);

function EditNutritionPlanForm({backPath, plan, planId}: {backPath: string; plan: NutritionPlan; planId: string}) {
  const goBack = useGoBack(backPath);
  const updatePlan = useUpdateNutritionPlanMutation();
  const form = useNutritionPlanForm({defaultValues: nutritionPlanToFormValues(plan)});

  const onSubmit = async (formData: NutritionPlanFormValues) => {
    try {
      const result = await updatePlan.mutateAsync({body: nutritionPlanToUpdateRequest(formData), id: planId});
      // Keep the hydrated builder tree when the metadata response omits it.
      patchQueryData<{data: NutritionPlan}>(nutritionPlanKeys.detail(planId), (draft) => {
        draft.data = {
          ...result.data,
          meals: result.data.meals ?? draft.data.meals,
          days: result.data.days ?? draft.data.days,
          weekday_assignments: result.data.weekday_assignments ?? draft.data.weekday_assignments,
        };
      });
      goBack();
    } catch (err) {
      applyFormErrors(err, "Nutrition plan wasn't updated. Check the details and try again", form.setError);
    }
  };

  return (
    <Page>
      <Page.Header size="content">
        <Page.TitleGroup>
          <div className={'flex items-center'}>
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
            isSubmitting={updatePlan.isPending}
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

export default function EditNutritionPlan() {
  const {id} = useParams<{id: string}>();
  const {data, isError, isLoading: isFetching, refetch} = useGetNutritionPlanQuery(id!);

  const plan = data?.data;
  const backPath = generatePath(ROUTES.NUTRITION_PLAN_DETAIL, {id: id!});
  const goBack = useGoBack(backPath);

  if (isFetching) {
    return (
      <Page>
        <Page.Header size="content">
          <Page.TitleGroup>
            <div className={'flex items-center'}>
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
            <div className={'flex items-center'}>
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
            <ErrorState
              message="Couldn't load nutrition plan."
              onRetry={refetch}
            />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }

  return (
    <EditNutritionPlanForm
      backPath={backPath}
      plan={plan}
      planId={id!}
    />
  );
}
