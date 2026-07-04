import {toast} from '@heroui/react';
import {useNavigate} from 'react-router-dom';

import {PlanActionsMenu} from '@/@components/plan-actions-menu';
import {ROUTES} from '@/@config/routes';
import {
  coachApi,
  type NutritionPlan,
  useDeleteNutritionPlanMutation,
  useDuplicateNutritionPlanMutation,
  useUpdateNutritionPlanMutation,
} from '@/api/generated';
import {useAppDispatch} from '@/store';

export type Props = {
  plan: NutritionPlan;
  onDeleted: () => void;
};

export function NutritionPlanActions({plan, onDeleted}: Props) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [updatePlan, {isLoading: updating}] = useUpdateNutritionPlanMutation();
  const [duplicatePlan, {isLoading: duplicating}] = useDuplicateNutritionPlanMutation();
  const [deletePlan, {isLoading: deleting}] = useDeleteNutritionPlanMutation();

  // Generated endpoints are tag:false — optimistically patch the cached detail
  // so the dropdown flips Archive<->Restore immediately, roll back on failure.
  const setStatus = async (status: 'active' | 'archived') => {
    const patch = dispatch(
      coachApi.util.updateQueryData('getNutritionPlan', {id: plan.id}, (draft) => {
        draft.data.status = status;
      }),
    );
    try {
      await updatePlan({id: plan.id, nutritionPlanRequest: {name: plan.name, status}}).unwrap();
    } catch (e) {
      patch.undo();
      throw e;
    }
  };

  const copy = async () => {
    const result = await duplicatePlan({id: plan.id}).unwrap();
    toast.success('Plan copied', {timeout: 1000});
    navigate(ROUTES.NUTRITION_PLAN_DETAIL.replace(':id', result.data.id));
  };

  const remove = async () => {
    await deletePlan({id: plan.id}).unwrap();
    // tag:false — refresh the plan list.
    dispatch(coachApi.util.invalidateTags([{type: 'NutritionPlan', id: 'LIST'}]));
  };

  return (
    <PlanActionsMenu
      deleteBody="Are you sure you want to delete this nutrition plan permanently?"
      deleting={deleting}
      onCopy={copy}
      onDelete={remove}
      onDeleted={onDeleted}
      onEdit={() => navigate(ROUTES.EDIT_NUTRITION_PLAN.replace(':id', plan.id))}
      onSetStatus={setStatus}
      pending={updating || duplicating}
      plan={plan}
    />
  );
}
