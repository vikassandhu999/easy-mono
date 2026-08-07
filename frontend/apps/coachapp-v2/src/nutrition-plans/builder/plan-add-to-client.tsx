import {getFullName} from '@easy/utils';
import {toast} from '@heroui/react';
import {generatePath, useNavigate} from 'react-router-dom';

import {toastMutationError} from '@/@components/mutation-toast';
import {assignStartDate, PlanAddToClientControl} from '@/@components/plan-add-to-client';
import {ROUTES} from '@/@config/routes';
import type {Client} from '@/api/clients';
import type {NutritionPlan} from '@/api/nutrition-plan-builder';
import {patchPlan} from '@/api/nutrition-plan-builder';
import {useAssignNutritionPlanMutation} from '@/api/nutrition-plans-list';

export type Props = {
  plan: NutritionPlan;
};

export function PlanAddToClient({plan}: Props) {
  const navigate = useNavigate();
  const assignNutrition = useAssignNutritionPlanMutation();

  // Already assigned — nothing to add to.
  if (plan.client_id) {
    return null;
  }

  const assign = async (client: Client) => {
    try {
      const result = await assignNutrition.mutateAsync({
        id: plan.id,
        // start_date: the copy is live from today; the end stays open
        // (add-to-client spec §3 — dates beyond "starts now" are builder work).
        body: {client_id: client.id, start_date: assignStartDate()},
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
      const clientName = getFullName(client.first_name, client.last_name) || client.email;
      toast.success(
        `"${plan.name}" assigned to ${clientName}`,
        // Offer the hop to the assigned copy; skip it when the assign happened
        // in place (same id): the coach is already looking at it.
        result.data.id === plan.id
          ? undefined
          : {
              actionProps: {
                children: 'Open their copy',
                onPress: () => navigate(generatePath(ROUTES.NUTRITION_PLAN_DETAIL, {id: result.data.id})),
              },
            },
      );
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
