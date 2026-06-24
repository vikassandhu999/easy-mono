import {Button, toast} from '@heroui/react';
import {UserPlus} from 'lucide-react';
import {useState} from 'react';

import ClientPicker from '@/@components/client-picker';
import {type TrainingPlan, useAssignTrainingPlanMutation} from '@/api/generated';

export type Props = {
  plan: TrainingPlan;
};

export function PlanAddToClient({plan}: Props) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [assignTraining] = useAssignTrainingPlanMutation();

  return (
    <div className="relative">
      <Button
        aria-label={`Add ${plan.name} to client`}
        onPress={() => setIsPickerOpen((open) => !open)}
        size={'sm'}
        variant="secondary"
      >
        <UserPlus size={18} />
        Add to client
      </Button>
      {isPickerOpen ? (
        <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-lg border border-border bg-surface p-3 shadow-lg">
          <ClientPicker
            autoFocus
            excludeIds={plan.client_id ? [plan.client_id] : undefined}
            onSelect={async (client) => {
              try {
                await assignTraining({
                  id: plan.id,
                  trainingPlanAssignRequest: {client_id: client.id},
                }).unwrap();
                toast.success(`"${plan.name}" assigned`);
                setIsPickerOpen(false);
              } catch {
                toast.danger("Training plan wasn't assigned");
              }
            }}
            placeholder="Search clients"
          />
        </div>
      ) : null}
    </div>
  );
}
