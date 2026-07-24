import {Button, Popover} from '@heroui/react';
import {UserPlus} from 'lucide-react';
import {useRef, useState} from 'react';

import ClientPickerContent from '@/@components/client-picker';
import {useIsDesktop} from '@/@hooks/use-is-desktop';
import type {Client} from '@/api/clients';
import {KeyboardSheet} from '@/builder-kit/keyboard-sheet';

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
        className="gap-1.5 rounded-control border border-border bg-surface font-btn text-body font-semibold leading-none text-foreground [box-shadow:none] sm:h-9.5 sm:px-3"
        data-testid="nb-add-client"
        isPending={isAssigning}
        onPress={() => setOpen(true)}
        ref={triggerRef}
        size="sm"
        variant="secondary"
      >
        <UserPlus size={15} />
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
            className="w-80 rounded-panel p-0"
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
