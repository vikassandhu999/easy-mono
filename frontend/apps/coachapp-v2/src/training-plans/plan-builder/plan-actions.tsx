import {toast} from '@heroui/react';
import {useNavigate} from 'react-router-dom';

import {PlanActionsMenu} from '@/@components/plan-actions-menu';
import {ROUTES} from '@/@config/routes';
import {
  coachApi,
  type TrainingPlan,
  useDeleteTrainingPlanMutation,
  useDuplicateTrainingPlanMutation,
  useUpdateTrainingPlanMutation,
} from '@/api/generated';
import {useAppDispatch} from '@/store';

export type Props = {
  plan: TrainingPlan;
  onDeleted: () => void;
};

export function PlanActions({plan, onDeleted}: Props) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [updatePlan, {isLoading: updating}] = useUpdateTrainingPlanMutation();
  const [duplicatePlan, {isLoading: duplicating}] = useDuplicateTrainingPlanMutation();
  const [deletePlan, {isLoading: deleting}] = useDeleteTrainingPlanMutation();

  // Generated endpoints are tag:false — optimistically patch the cached detail
  // so the dropdown flips Archive<->Restore immediately, roll back on failure.
  const setStatus = async (status: 'active' | 'archived') => {
    const patch = dispatch(
      coachApi.util.updateQueryData('getTrainingPlan', {id: plan.id}, (draft) => {
        draft.data.status = status;
      }),
    );
    try {
      await updatePlan({id: plan.id, trainingPlanUpdateRequest: {status}}).unwrap();
    } catch (e) {
      patch.undo();
      throw e;
    }
  };

  const copy = async () => {
    const result = await duplicatePlan({id: plan.id}).unwrap();
    toast.success('Plan copied', {timeout: 1000});
    navigate(ROUTES.TRAINING_PLAN_DETAIL.replace(':id', result.data.id));
  };

  const remove = async () => {
    await deletePlan({id: plan.id}).unwrap();
    // tag:false — refresh the plan list.
    dispatch(coachApi.util.invalidateTags([{type: 'TrainingPlan', id: 'LIST'}]));
  };

  return (
    <PlanActionsMenu
      deleteBody="Are you sure you want to delete the training plan permanently?"
      deleting={deleting}
      onCopy={copy}
      onDelete={remove}
      onDeleted={onDeleted}
      onEdit={() => navigate(ROUTES.EDIT_TRAINING_PLAN.replace(':id', plan.id))}
      onSetStatus={setStatus}
      pending={updating || duplicating}
      plan={plan}
    />
  );
}
