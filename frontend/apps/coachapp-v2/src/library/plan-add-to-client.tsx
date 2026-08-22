import {formatDateShort, getFullName} from '@easy/utils';
import {AlertDialog, Button} from '@heroui/react';
import {UserPlus} from 'lucide-react';
import {useState} from 'react';
import type {Client} from '@/api/clients';
import ClientPickerContent from '@/ui/client-picker';
import {clientRecipientName, type PlanAddDecision, planAddDecision} from '@/ui/client-picker-data';
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
type Flow =
  | {step: 'closed'}
  | {step: 'pick'}
  | {step: 'prompt'; client: Client; decision: Exclude<PlanAddDecision, {kind: 'schedule'}>}
  | {step: 'dates'; client: Client; error: null | string};

function recipientName(client: Client): string {
  return clientRecipientName(client, getFullName(client.first_name, client.last_name));
}

/**
 * "Add to client" button + flow shared by the training and nutrition plan
 * builders (add-to-client spec 2026-08-07, amended 2026-08-08): pick a client,
 * resolve coverage (same-discipline plan blocks, other coverage confirms),
 * choose assignment dates, then let the discipline adapter create the copy.
 */
export function PlanAddToClientControl({planKind, planName, onAssign, isAssigning}: PlanAddToClientControlProps) {
  const [flow, setFlow] = useState<Flow>({step: 'closed'});
  const otherPlanKind = planKind === 'nutrition' ? 'training' : 'nutrition';

  const close = () => {
    if (!isAssigning) {
      setFlow({step: 'closed'});
    }
  };

  const pick = (client: Client) => {
    const decision = planAddDecision(client, planKind);
    if (decision.kind === 'schedule') {
      setFlow({client, error: null, step: 'dates'});
    } else {
      setFlow({client, decision, step: 'prompt'});
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

  const prompt = flow.step === 'prompt' ? flow : null;
  const promptBody = () => {
    if (!prompt) {
      return null;
    }
    const name = recipientName(prompt.client);
    const {decision} = prompt;
    if (decision.kind === 'blocked') {
      return `${name} already has "${decision.existingPlanName}" active as their ${planKind} plan. End or reschedule it before adding another ${planKind} plan.`;
    }
    const coverage = decision.otherPlanName
      ? `currently has "${decision.otherPlanName}" as their ${otherPlanKind} plan`
      : decision.coveredUntil
        ? `is covered until ${formatDateShort(decision.coveredUntil)}`
        : 'is on an open-ended plan';
    return `${name} ${coverage}. Choose dates for "${planName}" as their ${planKind} plan too?`;
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
          <ClientPickerContent onSelect={pick} />
        )}
      </PickerModal>

      <AlertDialog.Backdrop
        isOpen={prompt !== null}
        onOpenChange={(next) => {
          if (!next) {
            setFlow({step: 'closed'});
          }
        }}
        variant="transparent"
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="warning" />
              <AlertDialog.Heading>
                {prompt?.decision.kind === 'blocked' ? `Can't add "${planName}" yet` : `Add "${planName}" too?`}
              </AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>{promptBody()}</AlertDialog.Body>
            <AlertDialog.Footer>
              <Button
                slot="close"
                variant="tertiary"
              >
                {prompt?.decision.kind === 'blocked' ? 'Close' : 'Cancel'}
              </Button>
              {prompt?.decision.kind === 'confirm' ? (
                <Button
                  onPress={() => setFlow({client: prompt.client, error: null, step: 'dates'})}
                  variant="primary"
                >
                  Choose dates
                </Button>
              ) : null}
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </>
  );
}
