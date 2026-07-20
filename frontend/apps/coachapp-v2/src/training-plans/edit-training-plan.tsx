import {useParams} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
import {ErrorState} from '@/@components/error-state';
import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {useGoBack} from '@/@hooks/use-go-back';
import {coachApi, useGetTrainingPlanQuery, useUpdateTrainingPlanMutation} from '@/api/generated';
import {applyFormErrors} from '@/api/shared';
import {useAppDispatch} from '@/store';
import TrainingPlanForm, {
  type TrainingPlanFormValues,
  trainingPlanToFormValues,
  trainingPlanToUpdateRequest,
  useTrainingPlanForm,
} from '@/training-plans/training-plan-form/training-plan-form';

// The one header for every state (loading / error / loaded). Keeps the back
// button, title, and description identical so only the body swaps.
function EditTrainingPlanHeader({goBack}: {goBack: () => void}) {
  return (
    <Page.Header size="content">
      <Page.TitleGroup>
        <div className="flex items-center gap-1">
          <BackButton onPress={goBack} />
          <Page.Title>Edit training plan</Page.Title>
        </div>
        <Page.Description>Update the plan's details. Workouts &amp; schedule live in the builder.</Page.Description>
      </Page.TitleGroup>
    </Page.Header>
  );
}

function EditTrainingPlanForm({backPath, planId}: {backPath: string; planId: string}) {
  const dispatch = useAppDispatch();
  const goBack = useGoBack(backPath);
  const {data} = useGetTrainingPlanQuery({id: planId});
  const [updatePlan, {isLoading: isUpdating}] = useUpdateTrainingPlanMutation();

  const plan = data!.data;

  const form = useTrainingPlanForm({
    values: trainingPlanToFormValues(plan),
  });

  const onSubmit = async (formData: TrainingPlanFormValues) => {
    try {
      const result = await updatePlan({
        id: planId,
        trainingPlanUpdateRequest: trainingPlanToUpdateRequest(formData),
      }).unwrap();
      // tag:false — sync the cached detail so the builder shows the new values.
      dispatch(
        coachApi.util.updateQueryData('getTrainingPlan', {id: planId}, (draft) => {
          draft.data = result.data;
        }),
      );
      goBack();
    } catch (err) {
      applyFormErrors(err, "Training plan wasn't updated. Check the details and try again", form.setError);
    }
  };

  return (
    <Page>
      <EditTrainingPlanHeader goBack={goBack} />
      <Page.Content className="pt-4 pb-6">
        <TrainingPlanForm
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

export default function EditTrainingPlan() {
  const {id} = useParams<{id: string}>();
  const {data, isError, isLoading: isFetching} = useGetTrainingPlanQuery({id: id!});
  const backPath = `/library/training-plans/${id}`;
  const goBack = useGoBack(backPath);

  if (isFetching) {
    return (
      <Page>
        <EditTrainingPlanHeader goBack={goBack} />
        <Page.Content className="pt-4 pb-6">
          <PageSkeleton />
        </Page.Content>
      </Page>
    );
  }

  if (isError || !data) {
    return (
      <Page>
        <EditTrainingPlanHeader goBack={goBack} />
        <Page.Content className="pt-4 pb-6">
          <ErrorState message="Couldn't load training plan." />
        </Page.Content>
      </Page>
    );
  }

  return (
    <EditTrainingPlanForm
      backPath={backPath}
      planId={id!}
    />
  );
}
