import {Button, Spinner} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useNavigate, useParams} from 'react-router-dom';

import PageLayout from '@/@components/page-layout';
import {applyFormErrors} from '@/api/shared';
import {useGetTrainingPlanQuery, useUpdateTrainingPlanMutation} from '@/api/trainingPlans';
import TrainingPlanForm, {
  type TrainingPlanFormValues,
  useTrainingPlanForm,
} from '@/training-plans/components/training-plan-form';

/**
 * Inner component rendered only when plan data is available.
 * This avoids the need for useEffect to sync server state into local state,
 * which the React Compiler lint rule forbids.
 */
function EditTrainingPlanForm({backPath, planId}: {backPath: string; planId: string}) {
  const navigate = useNavigate();
  const {data} = useGetTrainingPlanQuery(planId);
  const [updatePlan, {isLoading: isUpdating}] = useUpdateTrainingPlanMutation();

  const plan = data!.data;

  const form = useTrainingPlanForm({
    values: {
      name: plan.name,
      description: plan.description ?? '',
      status: (plan.status as 'active' | 'archived' | 'draft') ?? 'draft',
      is_template: plan.is_template,
      start_date: plan.start_date ?? '',
      end_date: plan.end_date ?? '',
    },
  });

  const onSubmit = async (formData: TrainingPlanFormValues) => {
    try {
      const body = {
        name: formData.name,
        description: formData.description || undefined,
        status: formData.status || undefined,
        is_template: formData.is_template,
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
      };
      await updatePlan({body, id: planId}).unwrap();
      navigate(backPath);
    } catch (err) {
      applyFormErrors(err, 'Failed to update training plan. Please try again.', form.setError);
    }
  };

  return (
    <PageLayout
      description={plan.name}
      title="Edit Training Plan"
    >
      <div className="mb-4">
        <Button
          onPress={() => navigate(backPath)}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Back
        </Button>
      </div>

      <TrainingPlanForm
        form={form}
        isSubmitting={isUpdating}
        onCancel={() => navigate(backPath)}
        onSubmit={onSubmit}
        submitLabel="Save Changes"
        submittingLabel="Saving..."
      />
    </PageLayout>
  );
}

export default function EditTrainingPlan() {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const {data, isError, isLoading: isFetching} = useGetTrainingPlanQuery(id!);
  const backPath = `/library/training-plans/${id}`;

  if (isFetching || !data) {
    return (
      <PageLayout title="Edit Training Plan">
        <div className="flex items-center justify-center py-20">
          <Spinner color="accent" />
        </div>
      </PageLayout>
    );
  }

  if (isError) {
    return (
      <PageLayout title="Edit Training Plan">
        <div className="mb-4">
          <Button
            onPress={() => navigate(backPath)}
            size="sm"
            variant="ghost"
          >
            <ArrowLeft size={16} />
            Back
          </Button>
        </div>
        <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 text-center text-sm text-danger">
          Failed to load training plan.
        </div>
      </PageLayout>
    );
  }

  return (
    <EditTrainingPlanForm
      backPath={backPath}
      planId={id!}
    />
  );
}
