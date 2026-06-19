import {Button, Spinner, Typography} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useParams} from 'react-router-dom';

import {Page} from '@/@components/page';
import {useGoBack} from '@/@hooks/use-go-back';
import {applyFormErrors} from '@/api/shared';
import {useGetTrainingPlanQuery, useUpdateTrainingPlanMutation} from '@/api/trainingPlans';
import TrainingPlanForm, {
  type TrainingPlanFormValues,
  trainingPlanToFormValues,
  trainingPlanToUpdateRequest,
  useTrainingPlanForm,
} from '@/training-plans/training-plan-form/training-plan-form';

function EditTrainingPlanForm({backPath, planId}: {backPath: string; planId: string}) {
  const goBack = useGoBack(backPath);
  const {data} = useGetTrainingPlanQuery(planId);
  const [updatePlan, {isLoading: isUpdating}] = useUpdateTrainingPlanMutation();

  const plan = data!.data;

  const form = useTrainingPlanForm({
    values: trainingPlanToFormValues(plan),
  });

  const onSubmit = async (formData: TrainingPlanFormValues) => {
    try {
      await updatePlan({body: trainingPlanToUpdateRequest(formData), id: planId}).unwrap();
      goBack();
    } catch (err) {
      applyFormErrors(err, "Training plan wasn't updated. Check the details and try again", form.setError);
    }
  };

  return (
    <Page>
      <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
        <Page.TitleGroup>
          <Page.Title>Edit training plan</Page.Title>
          <Page.Description>{plan.name}</Page.Description>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Toolbar>
        <Button
          onPress={goBack}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Training plan
        </Button>
      </Page.Toolbar>
      <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
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
  const {data, isError, isLoading: isFetching} = useGetTrainingPlanQuery(id!);
  const backPath = `/library/training-plans/${id}`;
  const goBackOuter = useGoBack(backPath);

  if (isFetching) {
    return (
      <Page>
        <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
          <Page.TitleGroup>
            <Page.Title>Edit training plan</Page.Title>
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

  if (isError || !data) {
    return (
      <Page>
        <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
          <Page.TitleGroup>
            <Page.Title>Edit training plan</Page.Title>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Toolbar>
          <Button
            onPress={goBackOuter}
            size="sm"
            variant="ghost"
          >
            <ArrowLeft size={16} />
            Training plan
          </Button>
        </Page.Toolbar>
        <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
          <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 text-center">
            <Typography
              className="text-danger"
              type="body-sm"
            >
              Training plan couldn't load
            </Typography>
          </div>
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
