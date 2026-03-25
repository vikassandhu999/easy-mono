import {Button} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {applyFormErrors} from '@/api/shared';
import {useCreateTrainingPlanMutation} from '@/api/trainingPlans';
import TrainingPlanForm, {
  type TrainingPlanFormValues,
  useTrainingPlanForm,
} from '@/training-plans/components/training-plan-form';

export default function CreateTrainingPlan() {
  const navigate = useNavigate();
  const [createPlan, {isLoading}] = useCreateTrainingPlanMutation();

  const form = useTrainingPlanForm();

  const onSubmit = async (data: TrainingPlanFormValues) => {
    try {
      const body = {
        name: data.name,
        ...(data.description && {description: data.description}),
        ...(data.status && {status: data.status}),
        ...(data.is_template !== undefined && {is_template: data.is_template}),
        ...(data.start_date && {start_date: data.start_date}),
        ...(data.end_date && {end_date: data.end_date}),
      };
      const result = await createPlan(body).unwrap();
      navigate(`/library/training-plans/${result.data.id}`);
    } catch (err) {
      applyFormErrors(err, 'Failed to create training plan. Please try again.', form.setError);
    }
  };

  return (
    <PageLayout
      description="Set up the basics, then build workouts on the next screen."
      title="Create Training Plan"
    >
      <div className="mb-4">
        <Button
          onPress={() => navigate(ROUTES.TRAINING_PLANS)}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Training Plans
        </Button>
      </div>

      <TrainingPlanForm
        form={form}
        isSubmitting={isLoading}
        onCancel={() => navigate(ROUTES.TRAINING_PLANS)}
        onSubmit={onSubmit}
        submitLabel="Create Plan"
        submittingLabel="Creating..."
      />
    </PageLayout>
  );
}
