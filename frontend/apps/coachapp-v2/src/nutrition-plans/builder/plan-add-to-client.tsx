import {toast} from '@heroui/react';

import {toastMutationError} from '@/@components/mutation-toast';
import {PlanAddToClientControl} from '@/@components/plan-add-to-client';
import type {Client} from '@/api/clients';
import type {NutritionPlan} from '@/api/nutrition-plan-builder';
import {patchPlan} from '@/api/nutrition-plan-builder';
import {useAssignNutritionPlanMutation} from '@/api/nutrition-plans-list';

export type Props = {
  plan: NutritionPlan;
};

export function PlanAddToClient({plan}: Props) {
  const assignNutrition = useAssignNutritionPlanMutation();

  // Already assigned — nothing to add to.
  if (plan.client_id) {
    return null;
  }

  const assign = async (client: Client) => {
    try {
      const result = await assignNutrition.mutateAsync({
        id: plan.id,
        body: {client_id: client.id},
      });
      // Reflect the assignment in the cached detail. Assign may return a copy
      // (new id) — only patch when it's the same plan. meals /
      // days / weekday_assignments are optional on the assign response — keep
      // the hydrated ones from the detail fetch rather than wiping them.
      if (result.data.id === plan.id) {
        patchPlan(plan.id, (draft) => {
          Object.assign(draft, {
            ...result.data,
            meals: result.data.meals ?? draft.meals,
            days: result.data.days ?? draft.days,
            weekday_assignments: result.data.weekday_assignments ?? draft.weekday_assignments,
          });
        });
      }
      toast.success(`"${plan.name}" assigned`);
    } catch (e) {
      toastMutationError(e, "Nutrition plan wasn't assigned");
    }
  };

  return (
    <PlanAddToClientControl
      isAssigning={assignNutrition.isPending}
      onAssign={assign}
      planName={plan.name}
    />
  );
}
