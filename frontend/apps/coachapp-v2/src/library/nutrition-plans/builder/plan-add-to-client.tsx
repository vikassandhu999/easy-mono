import {getFullName} from '@easy/utils';
import {toast} from '@heroui/react';
import {generatePath, useNavigate} from 'react-router-dom';
import type {Client} from '@/api/clients';
import type {NutritionPlan} from '@/api/nutrition-plans';
import {useAssignNutritionPlanMutation} from '@/api/nutrition-plans';
import {PlanAddToClientControl} from '@/library/plan-add-to-client';
import {ROUTES} from '@/routes';
import {clientRecipientName} from '@/ui/client-picker-data';
import type {PlanAssignmentDates} from '@/ui/plan-assignment-dates';

export type Props = {
  plan: NutritionPlan;
};

export function PlanAddToClient({plan}: Props) {
  const navigate = useNavigate();
  const assignNutritionMutation = useAssignNutritionPlanMutation();

  if (plan.client_id || plan.lifecycle === 'archived') {
    return null;
  }

  const assign = async (client: Client, dates: PlanAssignmentDates) => {
    const clientName = clientRecipientName(client, getFullName(client.first_name, client.last_name));
    const result = await assignNutritionMutation.mutateAsync({
      clientId: client.id,
      id: plan.id,
      body: {
        end_date: dates.endDate,
        start_date: dates.startDate,
      },
    });

    toast.success(`"${plan.name}" assigned to ${clientName}`, {timeout: 1000});
    navigate(generatePath(ROUTES.NUTRITION_PLAN_DETAIL, {id: result.data.id}));
  };

  return (
    <PlanAddToClientControl
      isAssigning={assignNutritionMutation.isPending}
      onAssign={assign}
      planKind="nutrition"
      planName={plan.name}
    />
  );
}
