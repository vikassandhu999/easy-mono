import {toast} from '@heroui/react';
import {useNavigate} from 'react-router-dom';

import {PlanActionsMenu} from '@/@components/plan-actions-menu';
import {ROUTES} from '@/@config/routes';
import type {NutritionPlan} from '@/api/nutrition-plan-builder';
import {usePlanPatcher} from '@/api/nutrition-plan-builder';
import {
  useDeleteNutritionPlanMutation,
  useDuplicateNutritionPlanMutation,
  useUpdateNutritionPlanMutation,
} from '@/api/nutrition-plans-list';

export type Props = {
  plan: NutritionPlan;
  onDeleted: () => void;
};

export function NutritionPlanActions({plan, onDeleted}: Props) {
  const navigate = useNavigate();
  const patch = usePlanPatcher(plan.id);
  const updatePlan = useUpdateNutritionPlanMutation();
  const duplicatePlan = useDuplicateNutritionPlanMutation();
  const deletePlan = useDeleteNutritionPlanMutation();

  // Optimistically patch the cached detail so the dropdown flips
  // Archive<->Restore immediately, roll back on failure.
  const setStatus = async (status: 'active' | 'archived') => {
    const patched = patch((draft) => {
      draft.status = status;
    });
    try {
      await updatePlan.mutateAsync({id: plan.id, body: {name: plan.name, status}});
    } catch (e) {
      patched.undo();
      throw e;
    }
  };

  const copy = async () => {
    const result = await duplicatePlan.mutateAsync(plan.id);
    toast.success('Plan copied', {timeout: 1000});
    navigate(ROUTES.NUTRITION_PLAN_DETAIL.replace(':id', result.data.id));
  };

  const remove = async () => {
    // The delete mutation already invalidates nutritionPlanKeys.lists() onSuccess.
    await deletePlan.mutateAsync(plan.id);
  };

  return (
    <PlanActionsMenu
      deleteBody="Are you sure you want to delete this nutrition plan permanently?"
      deleting={deletePlan.isPending}
      onCopy={copy}
      onDelete={remove}
      onDeleted={onDeleted}
      onEdit={() => navigate(ROUTES.EDIT_NUTRITION_PLAN.replace(':id', plan.id))}
      onSetStatus={setStatus}
      pending={updatePlan.isPending || duplicatePlan.isPending}
      plan={plan}
    />
  );
}
