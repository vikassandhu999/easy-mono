import AssignSurface from '@/clients/components/assign-surface';
import IntakeAssignContent from '@/clients/components/intake-assign-content';

interface Props {
  clientId: string;
  clientName: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function IntakeAssignControl({clientId, clientName, isOpen, onOpenChange}: Props) {
  return (
    <AssignSurface
      ariaLabel="Assign intake"
      isOpen={isOpen}
      label="Assign intake"
      onOpenChange={onOpenChange}
    >
      {(close) => (
        <IntakeAssignContent
          clientId={clientId}
          clientName={clientName}
          onClose={close}
        />
      )}
    </AssignSurface>
  );
}
