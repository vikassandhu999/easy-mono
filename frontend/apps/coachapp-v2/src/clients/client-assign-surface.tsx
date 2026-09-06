import type {ReactNode} from 'react';
import {PickerModal} from '@/ui/picker-modal';

export default function AssignSurface({
  ariaLabel,
  isOpen,
  onOpenChange,
  children,
}: {
  ariaLabel: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  children: (close: () => void) => ReactNode;
}) {
  const close = () => onOpenChange(false);
  return (
    <PickerModal
      ariaLabel={ariaLabel}
      bodyClassName="max-h-[70vh] overflow-y-auto p-4"
      onClose={close}
      open={isOpen}
    >
      {isOpen ? children(close) : null}
    </PickerModal>
  );
}
