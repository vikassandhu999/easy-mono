import { Button, Popover } from '@heroui/react';
import { UserPlus } from 'lucide-react';
import { useRef, useState } from 'react';

import ClientPickerContent from '@/@components/client-picker';
import { useIsDesktop } from '@/@hooks/use-is-desktop';
import type { Client } from '@/api/clients';
import { KeyboardSheet } from '@/builder-kit/keyboard-sheet';

export type PlanAddToClientControlProps = {
  planName: string;
  /** Domain assign mutation — caller owns cache patching and toasts. */
  onAssign: (client: Client) => Promise<void>;
  isAssigning: boolean;
};

/**
 * "Add to client" button + client-search surface shared by the training and
 * nutrition plan builders. Responsive the same way as FoodPickerControl: an
 * anchored Popover on desktop, a bottom KeyboardSheet on mobile. Body is
 * ClientPickerContent.
 */
export function PlanAddToClientControl({planName, onAssign, isAssigning}: PlanAddToClientControlProps) {
  const [open, setOpen] = useState(false);
  const isDesktop = useIsDesktop();
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const close = () => {
    setOpen(false);
    // Return focus to the trigger so keyboard users aren't dropped at the top
    // of the document after the picker closes.
    triggerRef.current?.focus();
  };

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
        isPending={isAssigning}
        onPress={() => setOpen(true)}
        ref={triggerRef}
        size="sm"
        variant="secondary"
      >
        <UserPlus size={18} />
        Add to client
      </Button>

      {isDesktop ? (
        <Popover
          isOpen={open}
          onOpenChange={(v) => {
            if (!v) {
              close();
            }
          }}
        >
          <Popover.Content
            className="w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-surface p-0 shadow-xl"
            triggerRef={triggerRef}
          >
            <Popover.Dialog
              aria-label={`Add ${planName} to client`}
              className="outline-none"
            >
              {open ? content : null}
            </Popover.Dialog>
          </Popover.Content>
        </Popover>
      ) : (
        <KeyboardSheet
          onClose={close}
          open={open}
        >
          {open ? content : null}
        </KeyboardSheet>
      )}
    </>
  );
}
