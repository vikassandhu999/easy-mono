import {useNavigate} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useCreateTrainingPlanMutation} from '@/api/generated';
import {applyFormErrors} from '@/api/shared';
import TrainingPlanForm, {
  type TrainingPlanFormValues,
  trainingPlanToCreateRequest,
  useTrainingPlanForm,
} from '@/training-plans/training-plan-form/training-plan-form';

export default function CreateTrainingPlan({onClose}: {onClose?: () => void} = {}) {
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.TRAINING_PLANS);
  const [createPlan, {isLoading}] = useCreateTrainingPlanMutation();

  const form = useTrainingPlanForm();
  const close = onClose ?? goBack;

  const onSubmit = async (data: TrainingPlanFormValues) => {
    try {
      const result = await createPlan({trainingPlanCreateRequest: trainingPlanToCreateRequest(data)}).unwrap();
      navigate(`/library/training-plans/${result.data.id}`, {replace: true});
    } catch (err) {
      applyFormErrors(err, "Training plan wasn't created. Check the details and try again", form.setError);
    }
  };

  return (
    <Page>
      <Page.Header size="content">
        <Page.TitleGroup>
          <div className="flex items-center gap-1">
            <BackButton onPress={close} />
            <Page.Title>Create training plan</Page.Title>
          </div>
          <Page.Description>Name the plan now, then build workouts next.</Page.Description>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Content className="pt-4 pb-6">
        <TrainingPlanForm
          form={form}
          isSubmitting={isLoading}
          onCancel={close}
          onSubmit={onSubmit}
          submitLabel="Create plan"
          submittingLabel="Creating plan"
        />
      </Page.Content>
    </Page>
  );
}
