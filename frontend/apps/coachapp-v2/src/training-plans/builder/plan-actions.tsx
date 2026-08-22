import {toast} from '@heroui/react';
import {useNavigate} from 'react-router-dom';
import type {TrainingPlan} from '@/api/training-plan-builder';
import {patchPlan} from '@/api/training-plan-builder';
import {trainingPlanDeleteRequest, trainingPlanRevisionRequest} from '@/api/training-plan-lifecycle';
import {
  useArchiveTrainingPlanMutation,
  useDeleteTrainingPlanMutation,
  useDuplicateTrainingPlanMutation,
  useRestoreTrainingPlanMutation,
} from '@/api/training-plans-list';
import {ROUTES} from '@/routes';
import {handleStaleTrainingPlanConflict} from '@/training-plans/stale-training-plan-conflict';
import {type PlanActionOutcome, PlanActionsMenu} from '@/ui/plan-actions-menu';

export type Props = {
  plan: TrainingPlan;
  onDeleted: () => void;
  refetchLatest: () => Promise<TrainingPlan | undefined>;
};

export function PlanActions({plan, onDeleted, refetchLatest}: Props) {
  const navigate = useNavigate();
  const archivePlanMutation = useArchiveTrainingPlanMutation();
  const restorePlanMutation = useRestoreTrainingPlanMutation();
  const duplicatePlanMutation = useDuplicateTrainingPlanMutation();
  const deletePlanMutation = useDeleteTrainingPlanMutation();

  const handleStaleConflict = (error: unknown) =>
    handleStaleTrainingPlanConflict(error, {
      refetchLatest,
      replaceWithLatest: (latest) => {
        patchPlan(plan.id, (draft) => {
          Object.assign(draft, latest);
        });
      },
      notify: (message) => {
        toast.info(message, {timeout: 4000});
      },
    });

  const setStatus = async (status: 'active' | 'archived'): Promise<PlanActionOutcome> => {
    const mutation = status === 'archived' ? archivePlanMutation : restorePlanMutation;
    let result: Awaited<ReturnType<typeof mutation.mutateAsync>>;

    try {
      result = await mutation.mutateAsync({id: plan.id, body: trainingPlanRevisionRequest(plan)});
    } catch (error) {
      if (await handleStaleConflict(error)) {
        return 'stale';
      }
      throw error;
    }

    patchPlan(plan.id, (draft) => {
      Object.assign(draft, result.data);
    });
    return 'applied';
  };

  const copy = async () => {
    const result = await duplicatePlanMutation.mutateAsync(plan.id);
    toast.success('Plan copied', {timeout: 1000});
    navigate(ROUTES.TRAINING_PLAN_DETAIL.replace(':id', result.data.id));
  };

  const remove = async (): Promise<PlanActionOutcome> => {
    // useDeleteTrainingPlanMutation invalidates the list cache itself.
    try {
      await deletePlanMutation.mutateAsync(trainingPlanDeleteRequest(plan));
    } catch (error) {
      if (await handleStaleConflict(error)) {
        return 'stale';
      }
      throw error;
    }
    return 'applied';
  };

  return (
    <PlanActionsMenu
      canCopy={plan.kind === 'template' && plan.status === 'active'}
      deleteBody="Are you sure you want to delete the training plan permanently?"
      deleting={deletePlanMutation.isPending}
      onCopy={copy}
      onDelete={remove}
      onDeleted={onDeleted}
      onEdit={() => navigate(ROUTES.EDIT_TRAINING_PLAN.replace(':id', plan.id))}
      onSetStatus={setStatus}
      pending={archivePlanMutation.isPending || restorePlanMutation.isPending || duplicatePlanMutation.isPending}
      plan={plan}
    />
  );
}
