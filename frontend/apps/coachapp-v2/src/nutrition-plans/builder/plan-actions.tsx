import {toast} from '@heroui/react';
import {useNavigate} from 'react-router-dom';
import type {NutritionPlan} from '@/api/nutrition-plan-builder';
import {patchPlan} from '@/api/nutrition-plan-builder';
import {nutritionPlanDeleteRequest, nutritionPlanRevisionRequest} from '@/api/nutrition-plan-lifecycle';
import {
  useArchiveNutritionPlanMutation,
  useDeleteNutritionPlanMutation,
  useDuplicateNutritionPlanMutation,
  useRestoreNutritionPlanMutation,
} from '@/api/nutrition-plans-list';
import {handleStaleNutritionPlanConflict} from '@/nutrition-plans/stale-nutrition-plan-conflict';
import {ROUTES} from '@/routes';
import {type PlanActionOutcome, PlanActionsMenu} from '@/ui/plan-actions-menu';

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
      result = await mutation.mutateAsync({id: plan.id, body: nutritionPlanRevisionRequest(plan)});
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
    const result = await duplicatePlanMutation.mutateAsync({
      id: plan.id,
      body: nutritionPlanRevisionRequest(plan),
    });
    toast.success('Plan copied', {timeout: 1000});
    navigate(ROUTES.NUTRITION_PLAN_DETAIL.replace(':id', result.data.id));
  };

  const remove = async (): Promise<PlanActionOutcome> => {
    try {
      await deletePlanMutation.mutateAsync(nutritionPlanDeleteRequest(plan));
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
