import {Button, Spinner} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useParams} from 'react-router-dom';

import PageLayout from '@/@components/page-layout';
import {useGoBack} from '@/@hooks/use-go-back';
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
  const goBack = useGoBack(backPath);
  const {data} = useGetTrainingPlanQuery(planId);
  const [updatePlan, {isLoading: isUpdating}] = useUpdateTrainingPlanMutation();

  const plan = data!.data;

  const form = useTrainingPlanForm({
    values: {
      description: plan.description ?? '',
      end_date: plan.end_date ?? '',
      name: plan.name,
      start_date: plan.start_date ?? '',
    },
  });

  const onSubmit = async (formData: TrainingPlanFormValues) => {
    try {
      const body = {
        description: formData.description || undefined,
        end_date: formData.end_date || undefined,
        name: formData.name,
        start_date: formData.start_date || undefined,
      };
      await updatePlan({body, id: planId}).unwrap();
      goBack();
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
          onPress={goBack}
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
        onCancel={goBack}
        onSubmit={onSubmit}
        submitLabel="Save Changes"
        submittingLabel="Saving..."
      />
    </PageLayout>
  );
}

export default function EditTrainingPlan() {
  const {id} = useParams<{id: string}>();
  const {data, isError, isLoading: isFetching} = useGetTrainingPlanQuery(id!);
  const backPath = `/library/training-plans/${id}`;
  const goBackOuter = useGoBack(backPath);

  if (isFetching) {
    return (
      <PageLayout title="Edit Training Plan">
        <div className="flex items-center justify-center py-20">
          <Spinner color="accent" />
        </div>
      </PageLayout>
    );
  }

  if (isError || !data) {
    return (
      <PageLayout title="Edit Training Plan">
        <div className="mb-4">
          <Button
            onPress={goBackOuter}
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
