import {getFullName} from '@easy/utils';
import {Button} from '@heroui/react';
import {UserPlus} from 'lucide-react';
import {useState} from 'react';
import type {Client} from '@/api/clients';
import ClientPickerContent from '@/ui/client-picker';
import {clientRecipientName} from '@/ui/client-picker-data';
import {PickerModal} from '@/ui/picker-modal';
import {type PlanAssignmentDates, type PlanKind, planAssignmentConflictMessage} from '@/ui/plan-assignment-dates';
import PlanScheduleStep from '@/ui/plan-schedule-step';

export type PlanAddToClientControlProps = {
  planKind: PlanKind;
  planName: string;
  /** Domain assign mutation — caller owns cache patching and success toasts. */
  onAssign: (client: Client, dates: PlanAssignmentDates) => Promise<void>;
  isAssigning: boolean;
};

/** The whole flow is one value, so a prompt can never coexist with the modal. */
type Flow = {step: 'closed'} | {step: 'pick'} | {step: 'dates'; client: Client; error: null | string};

function recipientName(client: Client): string {
  return clientRecipientName(client, getFullName(client.first_name, client.last_name));
}

export function PlanAddToClientControl({planKind, planName, onAssign, isAssigning}: PlanAddToClientControlProps) {
  const [flow, setFlow] = useState<Flow>({step: 'closed'});

  const close = () => {
    if (!isAssigning) {
      setFlow({step: 'closed'});
    }
  };

  const assign = async (client: Client, dates: PlanAssignmentDates) => {
    if (isAssigning) {
      return;
    }
    try {
      await onAssign(client, dates);
      setFlow({step: 'closed'});
    } catch (error) {
      setFlow({
        client,
        error:
          planAssignmentConflictMessage(error, planKind, recipientName(client)) ??
          `Couldn't assign the ${planKind} plan. Check the dates and try again.`,
        step: 'dates',
      });
    }
  };

  return (
    <>
      <Button
        aria-expanded={flow.step !== 'closed'}
        aria-haspopup="dialog"
        aria-label="Add to client"
        className="gap-1.5 rounded-control border border-border bg-surface font-btn type-body font-semibold leading-none text-foreground sm:px-3"
        data-testid="nb-add-client"
        isPending={isAssigning}
        onPress={() => setFlow({step: 'pick'})}
        size="sm"
        variant="secondary"
      >
        <UserPlus size={15} />
        {/* Icon-only below `sm`, the same way the list screens' create button
            collapses. At 375 the full label left the plan title 113px to render
            in, so every builder title truncated to "Test N…" / "TB fixt…". */}
        <span className="hidden sm:inline">Add to client</span>
      </Button>

      <PickerModal
        bodyClassName="max-h-[80vh] overflow-y-auto px-4 pb-4 pt-1"
        isDismissable={!isAssigning}
        onClose={close}
        open={flow.step === 'pick' || flow.step === 'dates'}
        title={flow.step === 'dates' ? `Set dates for "${planName}"` : `Add "${planName}" to client`}
      >
        {flow.step === 'dates' ? (
          <PlanScheduleStep
            backLabel="Back to clients"
            clientName={recipientName(flow.client)}
            defaultStart={flow.client.local_date}
            errorMessage={flow.error}
            isSubmitting={isAssigning}
            kind={planKind}
            onBack={() => setFlow({step: 'pick'})}
            onChange={() => {
              if (flow.error) {
                setFlow({...flow, error: null});
              }
            }}
            onConfirm={(dates) => assign(flow.client, dates)}
            planName={planName}
          />
        ) : (
          <ClientPickerContent onSelect={(client) => setFlow({client, error: null, step: 'dates'})} />
        )}
      </PickerModal>
    </>
  );
}
