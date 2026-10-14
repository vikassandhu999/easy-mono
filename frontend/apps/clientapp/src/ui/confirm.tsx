import {type ReactNode, useEffect, useState} from 'react';
import {Dialog, Heading, Modal, ModalOverlay} from 'react-aria-components';
import {Button} from './button';

export function Confirm({
  title,
  children,
  action,
  pending,
  destructive = false,
  cancel = 'Keep editing',
  onConfirm,
  onClose,
}: {
  title: string;
  children: ReactNode;
  action: string;
  pending: boolean;
  /** A destructive action is red and is not dismissed by a stray tap outside the dialog. */
  destructive?: boolean;
  cancel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [trigger] = useState(() => document.activeElement);
  useEffect(() => {
    return () => {
      requestAnimationFrame(() => {
        if (trigger instanceof HTMLElement && trigger.isConnected) {
          trigger.focus({preventScroll: true});
        }
      });
    };
  }, [trigger]);
  return (
    <ModalOverlay
      isOpen
      isDismissable={!pending && !destructive}
      isKeyboardDismissDisabled={pending}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <Modal className="w-full max-w-[28rem] rounded-2xl bg-surface p-5 shadow-xl max-h-[85dvh] overflow-y-auto">
        <Dialog className="outline-none space-y-4">
          <Heading
            slot="title"
            className="text-xl font-semibold"
          >
            {title}
          </Heading>
          <div className="text-muted-foreground">{children}</div>
          <Button
            className="w-full"
            variant={destructive ? 'destructive' : 'default'}
            isPending={pending}
            onPress={onConfirm}
          >
            {action}
          </Button>
          <Button
            className="w-full"
            variant="outline"
            isDisabled={pending}
            onPress={onClose}
          >
            {cancel}
          </Button>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
