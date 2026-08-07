import {formatDateISO, formatDateShort, getFullName} from '@easy/utils';
import {AlertDialog, Button} from '@heroui/react';
import {UserPlus} from 'lucide-react';
import {useState} from 'react';

import ClientPickerContent, {clientCoverage} from '@/@components/client-picker';
import type {Client} from '@/api/clients';
import {PickerModal} from '@/builder-kit/picker-modal';

/**
 * "Starts today" as a date-only value, safe on both clocks: the backend's
 * in-force checks compare `Date.utc_today()` while the coach (and client)
 * live on local calendars. Near midnight the two disagree by a day, and a
 * start date later than either "today" leaves the assigned copy out of force
 * for hours (found live: a 00:05 IST assignment was invisible to the plan
 * chips until 05:30). The EARLIER of the two dates is in force under every
 * comparison immediately.
 */
export function assignStartDate(): string {
  const local = formatDateISO(new Date());
  const utc = new Date().toISOString().slice(0, 10);
  return local < utc ? local : utc;
}

export type PlanAddToClientControlProps = {
  planName: string;
  /** Domain assign mutation — caller owns cache patching and toasts. */
  onAssign: (client: Client) => Promise<void>;
  isAssigning: boolean;
};

/**
 * "Add to client" button + picker shared by the training and nutrition plan
 * builders (add-to-client spec 2026-08-07). Picking a client who needs
 * programming assigns in one tap; picking one with live coverage asks first —
 * two active plans is a legitimate but unusual state the coach should choose,
 * never stumble into.
 */
export function PlanAddToClientControl({planName, onAssign, isAssigning}: PlanAddToClientControlProps) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState<Client | null>(null);

  const close = () => setOpen(false);

  const assign = (client: Client) => {
    if (isAssigning) {
      return;
    }
    onAssign(client).catch(() => undefined);
  };

  const pick = (client: Client) => {
    close();
    if (clientCoverage(client).covered) {
      setConfirming(client);
    } else {
      assign(client);
    }
  };

  return (
    <>
      <Button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Add to client"
        className="gap-1.5 rounded-control border border-border bg-surface font-btn type-body font-semibold leading-none text-foreground sm:px-3"
        data-testid="nb-add-client"
        isPending={isAssigning}
        onPress={() => setOpen(true)}
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
        bodyClassName="max-h-[60vh] overflow-y-auto px-4 pb-4 pt-1"
        onClose={close}
        open={open}
        title={`Add "${planName}" to client`}
      >
        <ClientPickerContent onSelect={pick} />
      </PickerModal>

      <AlertDialog.Backdrop
        isOpen={confirming !== null}
        onOpenChange={(next) => {
          if (!next) {
            setConfirming(null);
          }
        }}
      >
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="warning" />
              <AlertDialog.Heading>Add "{planName}" as well?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              {confirming
                ? `${getFullName(confirming.first_name, confirming.last_name) || 'This client'} is ${
                    confirming.covered_until
                      ? `covered until ${formatDateShort(confirming.covered_until)}`
                      : 'on an open-ended plan'
                  }. "${planName}" will run as a second active plan.`
                : null}
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button
                slot="close"
                variant="tertiary"
              >
                Cancel
              </Button>
              <Button
                onPress={() => {
                  if (confirming) {
                    assign(confirming);
                  }
                  setConfirming(null);
                }}
                variant="primary"
              >
                Add anyway
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </>
  );
}
