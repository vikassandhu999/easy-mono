import {Button, useOverlayState} from '@heroui/react';
import {UserPlus} from 'lucide-react';
import {useState} from 'react';
import {useBlocker} from 'react-router-dom';

import {Client} from '@/api/clients';
import {TrainingPlan} from '@/api/trainingPlans';
import {ClientSingleSelectPicker} from '@/clients/client-pickers';

export type Props = {
  plan: TrainingPlan;
};

export function PlanAddToClient({plan}: Props) {
  const pickerState = useOverlayState();
  const [client, setClient] = useState<Client | null>(null);

  useBlocker(() => {
    return pickerState.isOpen;
  });

  return (
    <>
      <Button
        aria-label="Menu"
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
        onSelect={(selected) => {
          pickerState.close();
          setClient(selected);
        }}
        state={pickerState}
      />
    </>
  );
}
