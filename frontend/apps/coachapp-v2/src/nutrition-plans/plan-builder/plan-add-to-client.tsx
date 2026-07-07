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
      // days / weekday_assignments are optional on the assign response — keep
      // the hydrated ones from the detail fetch rather than wiping them.
      if (result.data.id === plan.id) {
        dispatch(
          coachApi.util.updateQueryData('getNutritionPlan', {id: plan.id}, (draft) => {
            draft.data = {
              ...result.data,
              meals: result.data.meals ?? draft.data.meals,
              days: result.data.days ?? draft.data.days,
              weekday_assignments: result.data.weekday_assignments ?? draft.data.weekday_assignments,
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
