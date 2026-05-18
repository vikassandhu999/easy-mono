import {Button, useOverlayState} from '@heroui/react';
import {UserPlus} from 'lucide-react';
import {useState} from 'react';
import {useBlocker} from 'react-router-dom';

import {Client} from '@/api/clients';
import {TrainingPlan} from '@/api/trainingPlans';
import {ClientPicker} from '@/clients/components/client-picker/client-picker';

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
        variant="secondary"
      >
        <UserPlus size={18} />
        Add to client
      </Button>
      <ClientPicker
        heading={'Choose client'}
        onSelect={(selected) => {
          pickerState.close();
          setClient(selected);
        }}
        state={pickerState}
      />
    </>
  );
}
