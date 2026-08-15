import {generatePath, useParams} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
import {ErrorState} from '@/@components/error-state';
import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {applyFormErrors} from '@/api/shared';
import {patchPlan, type TrainingPlan, useGetTrainingPlanQuery} from '@/api/training-plan-builder';
import {getStaleTrainingPlanRevision} from '@/api/training-plan-lifecycle';
import {useUpdateTrainingPlanMutation} from '@/api/training-plans-list';
import TrainingPlanForm, {useTrainingPlanForm} from '@/training-plans/training-plan-form/training-plan-form';
import {
  type TrainingPlanFormValues,
  trainingPlanToFormValues,
  trainingPlanToUpdateRequest,
} from '@/training-plans/training-plan-form/training-plan-form-data';

// The one header for every state (loading / error / loaded). Keeps the back
// button, title, and description identical so only the body swaps.
function EditTrainingPlanHeader({goBack, kind}: {goBack: () => void; kind?: TrainingPlan['kind']}) {
  const title =
    kind === 'client_plan' ? 'Edit Client Plan' : kind === 'template' ? 'Edit Training Template' : 'Edit Training';
  const shortTitle =
    kind === 'client_plan' ? 'Edit client plan' : kind === 'template' ? 'Edit template' : 'Edit training';

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
            ? 'Update Client Plan metadata and Coverage dates.'
            : kind === 'template'
              ? 'Update Template metadata. Its Prescription remains in the builder.'
              : 'Update Programming metadata.'}
        </Page.Description>
      </Page.TitleGroup>
    </Page.Header>
  );
}

function EditTrainingPlanForm({backPath, plan, planId}: {backPath: string; plan: TrainingPlan; planId: string}) {
  const goBack = useGoBack(backPath);
  const updatePlanMutation = useUpdateTrainingPlanMutation();
  const form = useTrainingPlanForm({
    defaultValues: trainingPlanToFormValues(plan),
  });

  const onSubmit = async (formData: TrainingPlanFormValues) => {
    try {
      const result = await updatePlanMutation.mutateAsync({
        id: planId,
        body: trainingPlanToUpdateRequest(formData, plan.revision),
      });
      // Sync the cached detail so the builder shows the new values.
      patchPlan(planId, (draft) => {
        Object.assign(draft, result.data);
      });
      goBack();
    } catch (err) {
      const currentRevision = getStaleTrainingPlanRevision(err);
      if (currentRevision) {
        form.setError('root', {
          message: `This plan changed elsewhere (revision ${currentRevision}). Reload it before saving again.`,
        });
      } else {
        applyFormErrors(err, "Training plan wasn't updated. Check the details and try again", form.setError);
      }
    }
  };

  return (
    <Page>
      <EditTrainingPlanHeader
        goBack={goBack}
        kind={plan.kind}
      />
      <Page.Content bare>
        <Page.Frame
          className="pt-4 pb-6"
          size="content"
        >
          <TrainingPlanForm
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

export default function EditTrainingPlan() {
  const {id} = useParams<{id: string}>();
  const {data, isError, isLoading: isFetching, refetch} = useGetTrainingPlanQuery(id ?? '');
  const backPath = generatePath(ROUTES.TRAINING_PLAN_DETAIL, {id: id!});
  const goBack = useGoBack(backPath);

  if (isFetching) {
    return (
      <Page>
        <EditTrainingPlanHeader goBack={goBack} />
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
        <EditTrainingPlanHeader goBack={goBack} />
        <Page.Content bare>
          <Page.Frame
            className="pt-4 pb-6"
            size="content"
          >
            <ErrorState
              message="Couldn't load training plan."
              onRetry={refetch}
            />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }

  return (
    <EditTrainingPlanForm
      backPath={backPath}
      plan={data.data}
      planId={id!}
    />
  );
}
