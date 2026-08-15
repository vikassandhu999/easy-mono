import {toast} from '@heroui/react';
import {useNavigate} from 'react-router-dom';

import {PlanActionsMenu} from '@/@components/plan-actions-menu';
import {ROUTES} from '@/@config/routes';
import type {TrainingPlan} from '@/api/training-plan-builder';
import {patchPlan} from '@/api/training-plan-builder';
import {trainingPlanDeleteRequest, trainingPlanRevisionRequest} from '@/api/training-plan-lifecycle';
import {
  useArchiveTrainingPlanMutation,
  useDeleteTrainingPlanMutation,
  useDuplicateTrainingPlanMutation,
  useRestoreTrainingPlanMutation,
} from '@/api/training-plans-list';

export type Props = {
  plan: TrainingPlan;
  onDeleted: () => void;
};

export function PlanActions({plan, onDeleted}: Props) {
  const navigate = useNavigate();
  const archivePlanMutation = useArchiveTrainingPlanMutation();
  const restorePlanMutation = useRestoreTrainingPlanMutation();
  const duplicatePlanMutation = useDuplicateTrainingPlanMutation();
  const deletePlanMutation = useDeleteTrainingPlanMutation();

  const setStatus = async (status: 'active' | 'archived') => {
    const mutation = status === 'archived' ? archivePlanMutation : restorePlanMutation;
    const result = await mutation.mutateAsync({id: plan.id, body: trainingPlanRevisionRequest(plan)});
    patchPlan(plan.id, (draft) => {
      Object.assign(draft, result.data);
    });
  };

  const copy = async () => {
    const result = await duplicatePlanMutation.mutateAsync(plan.id);
    toast.success('Plan copied', {timeout: 1000});
    navigate(ROUTES.TRAINING_PLAN_DETAIL.replace(':id', result.data.id));
  };

  const remove = async () => {
    // useDeleteTrainingPlanMutation invalidates the list cache itself.
    await deletePlanMutation.mutateAsync(trainingPlanDeleteRequest(plan));
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
      pending={archivePlanMutation.isPending || restorePlanMutation.isPending || duplicatePlanMutation.isPending}
      plan={plan}
    />
  );
}
