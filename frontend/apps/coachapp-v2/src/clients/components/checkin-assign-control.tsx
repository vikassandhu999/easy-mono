import {Plus} from 'lucide-react';

import AssignSurface from '@/clients/components/assign-surface';
import CheckinAssignContent from '@/clients/components/checkin-assign-content';

interface Props {
  clientId: string;
  clientName: string;
}

export default function CheckinAssignControl({clientId, clientName}: Props) {
  return (
    <AssignSurface
      label={
        <>
          <Plus size={16} />
          Schedule check-in
        </>
      }
      popoverClassName="p-4"
    >
      {(close) => (
        <CheckinAssignContent
          clientId={clientId}
          clientName={clientName}
          onClose={close}
        />
      )}
    </AssignSurface>
  );
}
