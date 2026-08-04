import AssignSurface from '@/clients/components/assign-surface';
import PlanAssignContent, {type PlanKind} from '@/clients/components/plan-assign-content';

interface Props {
  kind: PlanKind;
  clientId: string;
  clientName: string;
  /** Only used when the control renders its own trigger. */
  label?: string;
  /**
   * Controlled mode — `PlanPanel` opens this from its ⋯ menu (or its empty-state
   * button), so the surface renders no trigger of its own.
   */
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function PlanAssignControl({
  clientId,
  clientName,
  isOpen,
  kind,
  label = 'Change plan',
  onOpenChange,
}: Props) {
  return (
    <AssignSurface
      isOpen={isOpen}
      label={label}
      onOpenChange={onOpenChange}
      // `outline` for a standalone trigger — the design draws plan controls as the
      // bordered secondary button, never bare.
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
