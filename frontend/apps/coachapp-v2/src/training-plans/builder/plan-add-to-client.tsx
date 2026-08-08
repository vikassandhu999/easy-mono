import {getFullName} from '@easy/utils';
import {toast} from '@heroui/react';
import {generatePath, useNavigate} from 'react-router-dom';

import {clientRecipientName} from '@/@components/client-picker-data';
import {PlanAddToClientControl} from '@/@components/plan-add-to-client';
import type {PlanAssignmentDates} from '@/@components/plan-assignment-dates';
import {ROUTES} from '@/@config/routes';
import type {Client} from '@/api/clients';
import type {TrainingPlan} from '@/api/training-plan-builder';
import {patchPlan} from '@/api/training-plan-builder';
import {useAssignTrainingPlanMutation} from '@/api/training-plans-list';

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
      id: plan.id,
      body: {client_id: client.id, end_date: dates.endDate, start_date: dates.startDate},
    });
    // Reflect the assignment in the cached detail so the header/date fields
    // update without a reload. Assign may return a copy (new id) — only
    // patch when it's the same plan.
    if (result.data.id === plan.id) {
      patchPlan(plan.id, (draft) => {
        Object.assign(draft, result.data);
      });
    }
    toast.success(
      `"${plan.name}" assigned to ${clientName}`,
      // Editing the assigned copy is the natural next step — offer the hop
      // without forcing it. No action when the assign happened in place.
      result.data.id === plan.id
        ? undefined
        : {
            actionProps: {
              children: 'Open their copy',
              onPress: () => navigate(generatePath(ROUTES.TRAINING_PLAN_DETAIL, {id: result.data.id})),
            },
          },
    );
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
