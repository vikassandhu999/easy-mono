import AssignSurface from '@/clients/components/assign-surface';
import PlanAssignContent, {type PlanKind} from '@/clients/components/plan-assign-content';

interface Props {
  kind: PlanKind;
  clientId: string;
  clientName: string;
  label: string;
}

export default function PlanAssignControl({kind, clientId, clientName, label}: Props) {
  return (
    <AssignSurface label={label}>
      {(close) => (
        <PlanAssignContent
          clientId={clientId}
          clientName={clientName}
          kind={kind}
          onClose={close}
        />
      )}
    </AssignSurface>
  );
}
