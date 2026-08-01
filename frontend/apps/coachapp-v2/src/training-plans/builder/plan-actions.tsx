import {toast} from '@heroui/react';
import {useNavigate} from 'react-router-dom';

import {PlanActionsMenu} from '@/@components/plan-actions-menu';
import {ROUTES} from '@/@config/routes';
import type {TrainingPlan} from '@/api/training-plan-builder';
import {patchPlan} from '@/api/training-plan-builder';
import {
  useDeleteTrainingPlanMutation,
  useDuplicateTrainingPlanMutation,
  useUpdateTrainingPlanMutation,
} from '@/api/training-plans-list';

export type Props = {
  plan: TrainingPlan;
  onDeleted: () => void;
};

export function PlanActions({plan, onDeleted}: Props) {
  const navigate = useNavigate();
  const updatePlanMutation = useUpdateTrainingPlanMutation();
  const duplicatePlanMutation = useDuplicateTrainingPlanMutation();
  const deletePlanMutation = useDeleteTrainingPlanMutation();

  // Optimistically patch the cached detail so the dropdown flips
  // Archive<->Restore immediately, roll back on failure.
  const setStatus = async (status: 'active' | 'archived') => {
    const patched = patchPlan(plan.id, (draft) => {
      draft.status = status;
    });
    try {
      await updatePlanMutation.mutateAsync({id: plan.id, body: {status}});
    } catch (e) {
      patched.undo();
      throw e;
    }
  };

  const copy = async () => {
    const result = await duplicatePlanMutation.mutateAsync(plan.id);
    toast.success('Plan copied', {timeout: 1000});
    navigate(ROUTES.TRAINING_PLAN_DETAIL.replace(':id', result.data.id));
  };

  const remove = async () => {
    // useDeleteTrainingPlanMutation invalidates the list cache itself.
    await deletePlanMutation.mutateAsync(plan.id);
  };

  return (
    <PlanActionsMenu
      deleteBody="Are you sure you want to delete the training plan permanently?"
      deleting={deletePlanMutation.isPending}
      onCopy={copy}
      onDelete={remove}
      onDeleted={onDeleted}
      onEdit={() => navigate(ROUTES.EDIT_TRAINING_PLAN.replace(':id', plan.id))}
      onSetStatus={setStatus}
      pending={updatePlanMutation.isPending || duplicatePlanMutation.isPending}
      plan={plan}
    />
  );
}
