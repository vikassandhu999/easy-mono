/**
 * AssignSurface — ghost trigger button plus the canonical picker shell
 * (centered PickerModal on desktop, KeyboardSheet on mobile). Children render
 * only while open (function-as-child receives close) and carry their own
 * header row, so the shell renders no title band.
 */
import {Button} from '@heroui/react';
import {type ReactNode, useState} from 'react';

import {PickerModal} from '@/builder-kit/picker-modal';

interface Props {
  label: ReactNode;
  /** Accessible name for the titleless picker dialog. */
  ariaLabel: string;
  /** Trigger look. `ghost` by default so existing callers are unchanged. */
  triggerVariant?: 'ghost' | 'outline';
  /** Styles the built-in trigger (ports need it to match a spec'd button). */
  triggerClassName?: string;
  /** Test id for the built-in trigger (style-diff manifests select on it). */
  triggerTestId?: string;
  /**
   * Controlled mode: drive the surface from elsewhere (e.g. a ⋯ menu item) and
   * render no trigger of its own.
   */
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: (close: () => void) => ReactNode;
}

export default function AssignSurface({
  label,
  ariaLabel,
  triggerVariant = 'ghost',
  triggerClassName = 'text-muted',
  triggerTestId,
  isOpen,
  onOpenChange,
  children,
}: Props) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = isOpen !== undefined;
  const open = isControlled ? isOpen : uncontrolledOpen;

  const setOpen = (next: boolean) => {
    if (isControlled) {
      onOpenChange?.(next);
    } else {
      setUncontrolledOpen(next);
    }
  };
  const close = () => setOpen(false);

  return (
    <>
      {isControlled ? null : (
        <Button
          className={triggerClassName}
          data-testid={triggerTestId}
          onPress={() => setOpen(true)}
          size="sm"
          variant={triggerVariant}
        >
          {label}
        </Button>
      )}

      <PickerModal
        ariaLabel={ariaLabel}
        bodyClassName="max-h-[70vh] overflow-y-auto p-4"
        onClose={close}
        open={open}
      >
        {open ? children(close) : null}
      </PickerModal>
    </>
  );
}
