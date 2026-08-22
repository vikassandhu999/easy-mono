import {generatePath, useNavigate} from 'react-router-dom';
import {applyFormErrors} from '@/api/shared';
import {useCreateTrainingPlanMutation} from '@/api/training-plans-list';
import TrainingPlanForm, {useTrainingPlanForm} from '@/library/training-plans/training-plan-form';
import {
  type TrainingPlanFormValues,
  trainingPlanToCreateRequest,
} from '@/library/training-plans/training-plan-form-data';
import {ROUTES} from '@/routes';
import {BackButton} from '@/ui/back-button';
import {Page} from '@/ui/page';
import {useGoBack} from '@/ui/use-go-back';

export default function CreateTrainingPlan() {
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.TRAINING_PLANS);
  const createPlanMutation = useCreateTrainingPlanMutation();

  const form = useTrainingPlanForm();

  const onSubmit = async (data: TrainingPlanFormValues) => {
    try {
      const result = await createPlanMutation.mutateAsync(trainingPlanToCreateRequest(data));
      navigate(generatePath(ROUTES.TRAINING_PLAN_DETAIL, {id: result.data.id}), {replace: true});
    } catch (err) {
      applyFormErrors(err, "Training plan wasn't created. Check the details and try again", form.setError);
    }
  };

  return (
    <Page>
      <Page.Header size="content">
        <Page.TitleGroup>
          <div className="flex items-center">
            <BackButton onPress={goBack} />
            <Page.Title>Create training template</Page.Title>
          </div>
          <Page.Description>Name the reusable template now, then build its Prescription next.</Page.Description>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Content bare>
        <Page.Frame
          className="pt-4 pb-6"
          size="content"
        >
          <TrainingPlanForm
            form={form}
            isSubmitting={createPlanMutation.isPending}
            onCancel={goBack}
            onSubmit={onSubmit}
            submitLabel="Create template"
            submittingLabel="Creating template"
          />
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}
