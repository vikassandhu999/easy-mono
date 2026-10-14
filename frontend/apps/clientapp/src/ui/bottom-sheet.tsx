import {X} from 'lucide-react';
import {type ReactNode, useEffect, useState} from 'react';
import {Dialog, Heading, Modal, ModalOverlay} from 'react-aria-components';
import {Button} from './button';

export function BottomSheet({
  title,
  children,
  onClose,
  pending = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  pending?: boolean;
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
      isDismissable={!pending}
      isKeyboardDismissDisabled={pending}
      onOpenChange={(open) => {
        if (!open && !pending) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/35"
    >
      <Modal className="w-full max-w-[30rem] max-h-[90dvh] overflow-y-auto rounded-t-[2rem] bg-background px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-xl">
        <div
          className="mx-auto mb-3 h-1 w-9 rounded-full bg-border"
          aria-hidden="true"
        />
        <Dialog className="outline-none">
          <div className="flex items-center justify-between gap-3 mb-5">
            <Heading
              slot="title"
              className="text-xl font-bold tracking-tight"
            >
              {title}
            </Heading>
            <Button
              variant="ghost"
              aria-label="Close"
              onPress={onClose}
              isDisabled={pending}
              className="size-11 shrink-0 rounded-full p-0"
            >
              <X
                className="size-5"
                aria-hidden="true"
              />
            </Button>
          </div>
          {children}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
