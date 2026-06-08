import {Button, useOverlayState} from '@heroui/react';
import {UserPlus} from 'lucide-react';
import {useBlocker} from 'react-router-dom';

import {TrainingPlan} from '@/api/trainingPlans';
import {ClientSingleSelectPicker} from '@/clients/client-pickers';

export type Props = {
  plan: TrainingPlan;
};

export function PlanAddToClient({plan}: Props) {
  const pickerState = useOverlayState();

  useBlocker(() => {
    return pickerState.isOpen;
  });

  return (
    <>
      <Button
        aria-label={`Add ${plan.name} to client`}
        isDisabled={pickerState.isOpen}
        onPress={() => pickerState.open()}
        size={'sm'}
        variant="secondary"
      >
        <UserPlus size={18} />
        Add to client
      </Button>
      <ClientSingleSelectPicker
        heading="Choose client"
        onSelect={() => {
          pickerState.close();
        }}
        state={pickerState}
      />
    </>
  );
}
