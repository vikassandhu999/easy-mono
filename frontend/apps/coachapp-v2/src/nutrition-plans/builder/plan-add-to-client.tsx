import {getFullName} from '@easy/utils';
import {toast} from '@heroui/react';
import {generatePath, useNavigate} from 'react-router-dom';

import {clientRecipientName} from '@/@components/client-picker-data';
import {PlanAddToClientControl} from '@/@components/plan-add-to-client';
import type {PlanAssignmentDates} from '@/@components/plan-assignment-dates';
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

  const assign = async (client: Client, dates: PlanAssignmentDates) => {
    const clientName = clientRecipientName(client, getFullName(client.first_name, client.last_name));
    const result = await assignNutrition.mutateAsync({
      id: plan.id,
      body: {client_id: client.id, end_date: dates.endDate, start_date: dates.startDate},
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
    toast.success(`"${plan.name}" assigned to ${clientName}`, {timeout: 1000});
    // Assign from a template creates a client copy (new id) — go straight to it.
    if (result.data.id !== plan.id) {
      navigate(generatePath(ROUTES.NUTRITION_PLAN_DETAIL, {id: result.data.id}));
    }
  };

  return (
    <PlanAddToClientControl
      isAssigning={assignNutrition.isPending}
      onAssign={assign}
      planKind="nutrition"
      planName={plan.name}
    />
  );
}
