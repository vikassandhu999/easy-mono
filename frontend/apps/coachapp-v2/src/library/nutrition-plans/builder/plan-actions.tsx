import {toast} from '@heroui/react';
import {useNavigate} from 'react-router-dom';
import type {NutritionPlan} from '@/api/nutrition-plans';
import {
  useArchiveNutritionPlanMutation,
  useDeleteNutritionPlanMutation,
  useDuplicateNutritionPlanMutation,
  useRestoreNutritionPlanMutation,
} from '@/api/nutrition-plans';
import {handleStaleNutritionPlanConflict} from '@/library/nutrition-plans/stale-nutrition-plan-conflict';
import {type PlanActionOutcome, PlanActionsMenu} from '@/library/plan-actions-menu';
import {ROUTES} from '@/routes';

export type Props = {
  plan: NutritionPlan;
  onDeleted: () => void;
  refetchLatest: () => Promise<NutritionPlan | undefined>;
};

export function NutritionPlanActions({plan, onDeleted, refetchLatest}: Props) {
  const navigate = useNavigate();
  const archivePlanMutation = useArchiveNutritionPlanMutation();
  const restorePlanMutation = useRestoreNutritionPlanMutation();
  const duplicatePlanMutation = useDuplicateNutritionPlanMutation();
  const deletePlanMutation = useDeleteNutritionPlanMutation();

  const handleStaleConflict = (error: unknown) =>
    handleStaleNutritionPlanConflict(error, {
      refetchLatest,
      notify: (message) => {
        toast.info(message, {timeout: 4000});
      },
    });

  const setStatus = async (status: 'active' | 'archived'): Promise<PlanActionOutcome> => {
    const mutation = status === 'archived' ? archivePlanMutation : restorePlanMutation;

    try {
      await mutation.mutateAsync({id: plan.id, body: {expected_revision: plan.revision}});
    } catch (error) {
      if (await handleStaleConflict(error)) {
        return 'stale';
      }
      throw error;
    }

    return 'applied';
  };

  const copy = async () => {
    const result = await duplicatePlanMutation.mutateAsync({
      id: plan.id,
      body: {expected_revision: plan.revision},
    });
    toast.success('Plan copied', {timeout: 1000});
    navigate(ROUTES.NUTRITION_PLAN_DETAIL.replace(':id', result.data.id));
  };

  const remove = async (): Promise<PlanActionOutcome> => {
    try {
      await deletePlanMutation.mutateAsync({id: plan.id, expectedRevision: plan.revision});
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
      deleteBody="Are you sure you want to delete this nutrition plan permanently?"
      deleting={deletePlanMutation.isPending}
      onCopy={copy}
      onDelete={remove}
      onDeleted={onDeleted}
      onEdit={() => navigate(ROUTES.EDIT_NUTRITION_PLAN.replace(':id', plan.id))}
      onSetStatus={setStatus}
      pending={archivePlanMutation.isPending || restorePlanMutation.isPending || duplicatePlanMutation.isPending}
      plan={plan}
    />
  );
}
