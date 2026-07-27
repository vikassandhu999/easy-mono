import {toast} from '@heroui/react';

import {toastMutationError} from '@/@components/mutation-toast';
import {PlanAddToClientControl} from '@/@components/plan-add-to-client';
import type {Client} from '@/api/clients';
import type {TrainingPlan} from '@/api/training-plan-builder';
import {usePlanPatcher} from '@/api/training-plan-builder';
import {useAssignTrainingPlanMutation} from '@/api/training-plans-list';

export type Props = {
  plan: TrainingPlan;
};

export function PlanAddToClient({plan}: Props) {
  const patch = usePlanPatcher(plan.id);
  const assignTrainingMutation = useAssignTrainingPlanMutation();

  // Already assigned — nothing to add to.
  if (plan.client_id) {
    return null;
  }

  const assign = async (client: Client) => {
    try {
      const result = await assignTrainingMutation.mutateAsync({
        id: plan.id,
        body: {client_id: client.id},
      });
      // Reflect the assignment in the cached detail so the header/date fields
      // update without a reload. Assign may return a copy (new id) — only
      // patch when it's the same plan.
      if (result.data.id === plan.id) {
        patch((draft) => {
          Object.assign(draft, result.data);
        });
      }
      toast.success(`"${plan.name}" assigned`);
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
