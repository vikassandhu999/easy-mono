/**
 * CheckinAssignControl — "Assign check-in" button + its responsive assign
 * surface (desktop popover / mobile KeyboardSheet), mirroring PlanAssignControl
 * so check-in assignment matches plan assignment on the client detail page.
 */
import {Button, Popover} from '@heroui/react';
import {Plus} from 'lucide-react';
import {useRef, useState} from 'react';

import {useIsDesktop} from '@/@hooks/use-is-desktop';
import {KeyboardSheet} from '@/builder-kit/keyboard-sheet';
import CheckinAssignContent from '@/clients/components/checkin-assign-content';

interface Props {
  clientId: string;
  clientName: string;
}

export default function CheckinAssignControl({clientId, clientName}: Props) {
  const [open, setOpen] = useState(false);
  const isDesktop = useIsDesktop();
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const close = () => setOpen(false);
  const content = (
    <CheckinAssignContent
      clientId={clientId}
      clientName={clientName}
      onClose={close}
    />
  );

  return (
    <>
      <Button
        className="text-muted"
        onPress={() => setOpen(true)}
        ref={triggerRef}
        size="sm"
        variant="ghost"
      >
        <Plus size={16} />
        Assign check-in
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
            className="w-[26rem] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-surface p-4 shadow-xl"
            triggerRef={triggerRef}
          >
            <Popover.Dialog className="outline-none">{open ? content : null}</Popover.Dialog>
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
