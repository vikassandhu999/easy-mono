import {Button} from '@heroui/react';
import {UserPlus} from 'lucide-react';
import {useState} from 'react';

import ClientPickerContent from '@/@components/client-picker';
import type {Client} from '@/api/clients';
import {PickerModal} from '@/builder-kit/picker-modal';

export type PlanAddToClientControlProps = {
  planName: string;
  /** Domain assign mutation — caller owns cache patching and toasts. */
  onAssign: (client: Client) => Promise<void>;
  isAssigning: boolean;
};

/**
 * "Add to client" button + client-search surface shared by the training and
 * nutrition plan builders. Renders in the canonical picker shell (centered
 * PickerModal on desktop, KeyboardSheet on mobile). Body is ClientPickerContent;
 * picking a client assigns immediately.
 */
export function PlanAddToClientControl({planName, onAssign, isAssigning}: PlanAddToClientControlProps) {
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  const content = (
    <ClientPickerContent
      onSelect={(client) => {
        if (isAssigning) {
          return;
        }
        close();
        onAssign(client).catch(() => undefined);
      }}
    />
  );

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
        {content}
      </PickerModal>
    </>
  );
}
