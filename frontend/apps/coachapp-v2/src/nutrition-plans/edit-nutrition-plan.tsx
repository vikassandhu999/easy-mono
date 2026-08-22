import {generatePath} from 'react-router-dom';
import {type NutritionPlan, patchPlan, useGetNutritionPlanQuery} from '@/api/nutrition-plan-builder';
import {useUpdateNutritionPlanMutation} from '@/api/nutrition-plans-list';
import {applyFormErrors} from '@/api/shared';
import NutritionPlanForm, {useNutritionPlanForm} from '@/nutrition-plans/nutrition-plan-form';
import {
  type NutritionPlanFormValues,
  nutritionPlanToFormValues,
  nutritionPlanToUpdateRequest,
} from '@/nutrition-plans/nutrition-plan-form-data';
import {handleStaleNutritionPlanConflict} from '@/nutrition-plans/stale-nutrition-plan-conflict';
import {ROUTES} from '@/routes';
import {BackButton} from '@/ui/back-button';
import {ErrorState} from '@/ui/error-state';
import {Page} from '@/ui/page';
import {PageSkeleton} from '@/ui/page-skeleton';
import {useGoBack} from '@/ui/use-go-back';
import {useRouteParam} from '@/ui/use-route-param';

function EditNutritionPlanHeader({goBack, kind}: {goBack: () => void; kind?: NutritionPlan['kind']}) {
  const title =
    kind === 'client_plan'
      ? 'Edit Client Plan'
      : kind === 'template'
        ? 'Edit Nutrition Template'
        : 'Edit nutrition plan';
  const shortTitle = kind === 'client_plan' ? 'Edit client plan' : kind === 'template' ? 'Edit template' : 'Edit plan';

  return (
    <Page.Header size="content">
      <Page.TitleGroup>
        <div className="flex items-center">
          <BackButton onPress={goBack} />
          <Page.Title>
            <span className="sm:hidden">{shortTitle}</span>
            <span className="hidden sm:inline">{title}</span>
          </Page.Title>
        </div>
        <Page.Description>
          {kind === 'client_plan'
            ? 'Update Client Plan metadata and targets. Coverage dates live in the builder.'
            : kind === 'template'
              ? 'Update Template metadata and targets. Its Menu remains in the builder.'
              : "Update the plan's goals. Meals & days live in the builder."}
        </Page.Description>
      </Page.TitleGroup>
    </Page.Header>
  );
}

function EditNutritionPlanForm({
  backPath,
  plan,
  planId,
  refetchLatest,
}: {
  backPath: string;
  plan: NutritionPlan;
  planId: string;
  refetchLatest: () => Promise<NutritionPlan | undefined>;
}) {
  const goBack = useGoBack(backPath);
  const updatePlanMutation = useUpdateNutritionPlanMutation();
  const form = useNutritionPlanForm({defaultValues: nutritionPlanToFormValues(plan)});

  const onSubmit = async (formData: NutritionPlanFormValues) => {
    try {
      const result = await updatePlanMutation.mutateAsync({
        id: planId,
        body: nutritionPlanToUpdateRequest(formData, plan.revision),
      });
      patchPlan(planId, (draft) => {
        Object.assign(draft, result.data);
      });
      goBack();
    } catch (err) {
      const handled = await handleStaleNutritionPlanConflict(err, {
        refetchLatest,
        replaceWithLatest: (latest) => {
          form.reset(nutritionPlanToFormValues(latest));
        },
        notify: (message) => {
          form.setError('root', {message});
        },
      });

      if (!handled) {
        applyFormErrors(err, "Nutrition plan wasn't updated. Check the details and try again", form.setError);
      }
    }
  };

  return (
    <Page>
      <EditNutritionPlanHeader
        goBack={goBack}
        kind={plan.kind}
      />
      <Page.Content bare>
        <Page.Frame
          className="pt-4 pb-6"
          size="content"
        >
          <NutritionPlanForm
            form={form}
            isSubmitting={updatePlanMutation.isPending}
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
  const id = useRouteParam('id');
  const {data, isError, isLoading: isFetching, refetch} = useGetNutritionPlanQuery(id);
  const backPath = generatePath(ROUTES.NUTRITION_PLAN_DETAIL, {id});
  const goBack = useGoBack(backPath);

  if (isFetching) {
    return (
      <Page>
        <EditNutritionPlanHeader goBack={goBack} />
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
        <EditNutritionPlanHeader goBack={goBack} />
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
      plan={data.data}
      planId={id}
      refetchLatest={async () => (await refetch()).data?.data}
    />
  );
}
