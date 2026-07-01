import {Button} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

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

export default function CreateTrainingPlan() {
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.TRAINING_PLANS);
  const [createPlan, {isLoading}] = useCreateTrainingPlanMutation();

  const form = useTrainingPlanForm();

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
      <Page.Header className="pt-4 pb-2 md:pt-6 lg:pt-8">
        <Page.TitleGroup>
          <div className={'flex items-center gap-1'}>
            <Button
              aria-label="Back"
              onPress={goBack}
              size="md"
              variant="ghost"
              isIconOnly
            >
              <ArrowLeft size={20} />
            </Button>
            <Page.Title>Create training plan</Page.Title>
          </div>
          <Page.Description>Set plan details now, then build workouts next</Page.Description>
        </Page.TitleGroup>
      </Page.Header>
      <Page.Content className="px-4 pb-6 md:px-6 lg:px-8">
        <TrainingPlanForm
          form={form}
          isSubmitting={isLoading}
          onCancel={goBack}
          onSubmit={onSubmit}
          submitLabel="Create plan"
          submittingLabel="Creating plan"
        />
      </Page.Content>
    </Page>
  );
}
