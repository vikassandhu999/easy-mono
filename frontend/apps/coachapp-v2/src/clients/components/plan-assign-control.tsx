import AssignSurface from '@/clients/components/assign-surface';
import PlanAssignContent, {type PlanKind} from '@/clients/components/plan-assign-content';

interface Props {
  kind: PlanKind;
  clientId: string;
  clientName: string;
  label: string;
}

export default function PlanAssignControl({kind, clientId, clientName, label}: Props) {
  // `outline` so "Change plan" matches "End plan" beside it — the design draws both
  // as the bordered secondary button, not one bordered and one bare.
  return (
    <AssignSurface
      label={label}
      triggerVariant="outline"
    >
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
