import {getFullName} from '@easy/utils';
import {toast} from '@heroui/react';
import {generatePath, useNavigate} from 'react-router-dom';
import type {Client} from '@/api/clients';
import type {TrainingPlan} from '@/api/training-plans';
import {patchPlan, useAssignTrainingPlanMutation} from '@/api/training-plans';
import {PlanAddToClientControl} from '@/library/plan-add-to-client';
import {ROUTES} from '@/routes';
import {clientRecipientName} from '@/ui/client-picker-data';
import type {PlanAssignmentDates} from '@/ui/plan-assignment-dates';

export type Props = {
  plan: TrainingPlan;
};

export function PlanAddToClient({plan}: Props) {
  const navigate = useNavigate();
  const assignTrainingMutation = useAssignTrainingPlanMutation();

  // Already assigned — nothing to add to.
  if (plan.client_id) {
    return null;
  }

  const assign = async (client: Client, dates: PlanAssignmentDates) => {
    const clientName = clientRecipientName(client, getFullName(client.first_name, client.last_name));
    const result = await assignTrainingMutation.mutateAsync({
      clientId: client.id,
      id: plan.id,
      body: {end_date: dates.endDate, start_date: dates.startDate},
    });
    // Reflect the assignment in the cached detail so the header/date fields
    // update without a reload. Assign may return a copy (new id) — only
    // patch when it's the same plan.
    if (result.data.id === plan.id) {
      patchPlan(plan.id, (draft) => {
        Object.assign(draft, result.data);
      });
    }
    toast.success(`"${plan.name}" assigned to ${clientName}`, {timeout: 1000});
    // Assign from a template creates a client copy (new id) — go straight to it.
    if (result.data.id !== plan.id) {
      navigate(generatePath(ROUTES.TRAINING_PLAN_DETAIL, {id: result.data.id}));
    }
  };

  return (
    <PlanAddToClientControl
      isAssigning={assignTrainingMutation.isPending}
      onAssign={assign}
      planKind="training"
      planName={plan.name}
    />
  );
}
