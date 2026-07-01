import {Spinner} from '@heroui/react';
import {useParams} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
import {ErrorState} from '@/@components/error-state';
import {Page} from '@/@components/page';
import {useGoBack} from '@/@hooks/use-go-back';
import {useGetTrainingPlanQuery, useUpdateTrainingPlanMutation} from '@/api/generated';
import {applyFormErrors} from '@/api/shared';
import TrainingPlanForm, {
  type TrainingPlanFormValues,
  trainingPlanToFormValues,
  trainingPlanToUpdateRequest,
  useTrainingPlanForm,
} from '@/training-plans/training-plan-form/training-plan-form';

// The one header for every state (loading / error / loaded). Keeps the back
// button, title, and reserved description slot identical so only the body swaps.
function EditTrainingPlanHeader({description, goBack}: {description?: string; goBack: () => void}) {
  return (
    <Page.Header>
      <Page.TitleGroup>
        <div className="flex items-center gap-1">
          <BackButton onPress={goBack} />
          <Page.Title>Edit training plan</Page.Title>
        </div>
        {description ? <Page.Description>{description}</Page.Description> : null}
      </Page.TitleGroup>
    </Page.Header>
  );
}

function EditTrainingPlanForm({backPath, planId}: {backPath: string; planId: string}) {
  const goBack = useGoBack(backPath);
  const {data} = useGetTrainingPlanQuery({id: planId});
  const [updatePlan, {isLoading: isUpdating}] = useUpdateTrainingPlanMutation();

  const plan = data!.data;

  const form = useTrainingPlanForm({
    values: trainingPlanToFormValues(plan),
  });

  const onSubmit = async (formData: TrainingPlanFormValues) => {
    try {
      await updatePlan({id: planId, trainingPlanUpdateRequest: trainingPlanToUpdateRequest(formData)}).unwrap();
      goBack();
    } catch (err) {
      applyFormErrors(err, "Training plan wasn't updated. Check the details and try again", form.setError);
    }
  };

  return (
    <Page>
      <EditTrainingPlanHeader
        description={plan.name}
        goBack={goBack}
      />
      <Page.Content className="px-4 pb-6 pt-4 md:px-6 lg:px-8">
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
        <Page.Content className="px-4 pb-6 pt-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-center py-20">
            <Spinner color="accent" />
          </div>
        </Page.Content>
      </Page>
    );
  }

  if (isError || !data) {
    return (
      <Page>
        <EditTrainingPlanHeader goBack={goBack} />
        <Page.Content className="px-4 pb-6 pt-4 md:px-6 lg:px-8">
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
