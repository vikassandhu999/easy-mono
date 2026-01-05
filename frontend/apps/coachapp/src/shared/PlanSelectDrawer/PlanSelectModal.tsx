import {Drawer} from '@mantine/core';
import {FC} from 'react';

import {Plan} from '@/services/plans';

import PlanSelect from './PlanSelectDrawer';

type PlanSelectModalProps = {
  clientID: string;
  close: () => void;
  onComplete?: (selectedPlanId: string, selectedPlan?: Plan) => void;
  open: () => void;
  opened: boolean;
};

export const PlanSelectModal: FC<PlanSelectModalProps> = ({opened, close, clientID, onComplete}) => {
  const handleComplete = (selectedPlanId: string, selectedPlan?: Plan) => {
    onComplete?.(selectedPlanId, selectedPlan);
    close();
  };

  return (
    <Drawer
      onClose={close}
      opened={opened}
      padding={0}
      styles={{
        body: {
          height: '80vh',
          maxHeight: '800px',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
        },
        content: {
          display: 'flex',
          flexDirection: 'column',
        },
      }}
      withCloseButton={false}
    >
      <PlanSelect
        clientID={clientID}
        onClose={close}
        onComplete={handleComplete}
      />
    </Drawer>
  );
};
