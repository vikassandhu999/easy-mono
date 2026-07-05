import {toast} from '@heroui/react';

import {toastMutationError} from '@/@components/mutation-toast';
import {PlanAddToClientControl} from '@/@components/plan-add-to-client';
import type {Client} from '@/api/clients';
import {coachApi, type NutritionPlan, useAssignNutritionPlanMutation} from '@/api/generated';
import {useAppDispatch} from '@/store';

export type Props = {
  plan: NutritionPlan;
};

export function PlanAddToClient({plan}: Props) {
  const dispatch = useAppDispatch();
  const [assignNutrition, {isLoading: isAssigning}] = useAssignNutritionPlanMutation();

  // Already assigned — nothing to add to.
  if (plan.client_id) {
    return null;
  }

  const assign = async (client: Client) => {
    try {
      const result = await assignNutrition({
        id: plan.id,
        nutritionPlanAssignRequest: {client_id: client.id},
      }).unwrap();
      // tag:false — reflect the assignment in the cached detail. Assign may
      // return a copy (new id) — only patch when it's the same plan. meals /
      // schedule_entries are optional on the assign response — keep the
      // hydrated ones from the detail fetch rather than wiping them.
      if (result.data.id === plan.id) {
        dispatch(
          coachApi.util.updateQueryData('getNutritionPlan', {id: plan.id}, (draft) => {
            draft.data = {
              ...result.data,
              meals: result.data.meals ?? draft.data.meals,
              schedule_entries: result.data.schedule_entries ?? draft.data.schedule_entries,
            };
          }),
        );
      }
      toast.success(`"${plan.name}" assigned`);
    } catch (e) {
      toastMutationError(e, "Nutrition plan wasn't assigned");
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
