import {toast} from '@heroui/react';

import {toastMutationError} from '@/@components/mutation-toast';
import {PlanAddToClientControl} from '@/@components/plan-add-to-client';
import type {Client} from '@/api/clients';
import {coachApi, type TrainingPlan, useAssignTrainingPlanMutation} from '@/api/generated';
import {useAppDispatch} from '@/store';

export type Props = {
  plan: TrainingPlan;
};

export function PlanAddToClient({plan}: Props) {
  const dispatch = useAppDispatch();
  const [assignTraining, {isLoading: isAssigning}] = useAssignTrainingPlanMutation();

  // Already assigned — nothing to add to.
  if (plan.client_id) {
    return null;
  }

  const assign = async (client: Client) => {
    try {
      const result = await assignTraining({
        id: plan.id,
        trainingPlanAssignRequest: {client_id: client.id},
      }).unwrap();
      // tag:false — reflect the assignment in the cached detail so the
      // header/date fields update without a reload. Assign may return a copy
      // (new id) — only patch when it's the same plan.
      if (result.data.id === plan.id) {
        dispatch(
          coachApi.util.updateQueryData('getTrainingPlan', {id: plan.id}, (draft) => {
            draft.data = result.data;
          }),
        );
      }
      toast.success(`"${plan.name}" assigned`);
    } catch (e) {
      toastMutationError(e, "Training plan wasn't assigned");
    }
  };

  return (
    <PlanAddToClientControl
      isAssigning={isAssigning}
      onAssign={assign}
      planName={plan.name}
    />
  );
}
