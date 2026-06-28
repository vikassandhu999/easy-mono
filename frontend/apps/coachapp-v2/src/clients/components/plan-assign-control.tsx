/**
 * PlanAssignControl — the "+ Nutrition/Training plan" button plus its assign
 * surface, which is RESPONSIVE per spec:
 *   - desktop (pointer: fine, >= md): anchored HeroUI Popover under the button
 *   - mobile: bottom KeyboardSheet
 * Same routing pattern as the training SetSheet. Body is PlanAssignContent.
 */
import {Button, Popover} from '@heroui/react';
import {useRef, useState} from 'react';

import {useIsDesktop} from '@/@hooks/use-is-desktop';
import {KeyboardSheet} from '@/builder-kit/keyboard-sheet';
import PlanAssignContent, {type PlanKind} from '@/clients/components/plan-assign-content';

interface Props {
  kind: PlanKind;
  clientId: string;
  clientName: string;
  label: string;
}

export default function PlanAssignControl({kind, clientId, clientName, label}: Props) {
  const [open, setOpen] = useState(false);
  const isDesktop = useIsDesktop();
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const close = () => setOpen(false);
  const content = (
    <PlanAssignContent
      clientId={clientId}
      clientName={clientName}
      kind={kind}
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
        {label}
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
            className="w-104 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-surface shadow-xl"
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
