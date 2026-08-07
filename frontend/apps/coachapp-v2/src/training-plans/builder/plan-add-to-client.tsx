import {getFullName} from '@easy/utils';
import {toast} from '@heroui/react';
import {generatePath, useNavigate} from 'react-router-dom';

import {toastMutationError} from '@/@components/mutation-toast';
import {assignStartDate, PlanAddToClientControl} from '@/@components/plan-add-to-client';
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

  const assign = async (client: Client) => {
    try {
      const result = await assignTrainingMutation.mutateAsync({
        id: plan.id,
        // start_date: the copy is live from today; the end stays open
        // (add-to-client spec §3 — dates beyond "starts now" are builder work).
        body: {client_id: client.id, start_date: assignStartDate()},
      });
      // Reflect the assignment in the cached detail so the header/date fields
      // update without a reload. Assign may return a copy (new id) — only
      // patch when it's the same plan.
      if (result.data.id === plan.id) {
        patchPlan(plan.id, (draft) => {
          Object.assign(draft, result.data);
        });
      }
      const clientName = getFullName(client.first_name, client.last_name) || client.email;
      toast.success(
        `"${plan.name}" assigned to ${clientName}`,
        // Setting an end date or tweaking the copy is the natural next step —
        // offer the hop without forcing it. No action when the assign happened
        // in place (same id): the coach is already looking at it.
        result.data.id === plan.id
          ? undefined
          : {
              actionProps: {
                children: 'Open their copy',
                onPress: () => navigate(generatePath(ROUTES.TRAINING_PLAN_DETAIL, {id: result.data.id})),
              },
            },
      );
    } catch (e) {
      toastMutationError(e, "Training plan wasn't assigned");
    }
  };

  return (
    <PlanAddToClientControl
      isAssigning={assignTrainingMutation.isPending}
      onAssign={assign}
      planName={plan.name}
    />
  );
}
