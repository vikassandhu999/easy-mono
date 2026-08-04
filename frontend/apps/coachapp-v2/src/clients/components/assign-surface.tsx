/**
 * AssignSurface — ghost trigger button plus a responsive assign surface:
 *   - desktop (pointer: fine, >= md): anchored HeroUI Popover under the button
 *   - mobile: bottom KeyboardSheet
 * Children render only while open (function-as-child receives close).
 */
import {Button, Popover} from '@heroui/react';
import {type ReactNode, type RefObject, useRef, useState} from 'react';

import {useIsDesktop} from '@/@hooks/use-is-desktop';
import {KeyboardSheet} from '@/builder-kit/keyboard-sheet';

interface Props {
  label: ReactNode;
  /** Trigger look. `ghost` by default so existing callers are unchanged. */
  triggerVariant?: 'ghost' | 'outline';
  popoverClassName?: string;
  /** Styles the built-in trigger (ports need it to match a spec'd button). */
  triggerClassName?: string;
  /** Test id for the built-in trigger (style-diff manifests select on it). */
  triggerTestId?: string;
  /**
   * Controlled mode: drive the surface from elsewhere (e.g. a ⋯ menu item) and
   * render no trigger of its own. Pass `anchorRef` so the desktop popover still
   * anchors to whatever opened it.
   */
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  anchorRef?: RefObject<HTMLButtonElement | null>;
  children: (close: () => void) => ReactNode;
}

export default function AssignSurface({
  label,
  triggerVariant = 'ghost',
  popoverClassName = '',
  triggerClassName = 'text-muted',
  triggerTestId,
  isOpen,
  onOpenChange,
  anchorRef,
  children,
}: Props) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = isOpen !== undefined;
  const open = isControlled ? isOpen : uncontrolledOpen;
  const isDesktop = useIsDesktop();
  const ownTriggerRef = useRef<HTMLButtonElement | null>(null);
  const triggerRef = anchorRef ?? ownTriggerRef;

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
          ref={triggerRef}
          size="sm"
          variant={triggerVariant}
        >
          {label}
        </Button>
      )}

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
            className={`w-104 max-w-[calc(100vw-2rem)] rounded-card [border-width:1.5px] border-separator bg-surface shadow-xl ${popoverClassName}`}
            triggerRef={triggerRef}
          >
            <Popover.Dialog className="max-h-[inherit] overflow-y-auto outline-none">{open ? children(close) : null}</Popover.Dialog>
          </Popover.Content>
        </Popover>
      ) : (
        <KeyboardSheet
          onClose={close}
          open={open}
        >
          {open ? children(close) : null}
        </KeyboardSheet>
      )}
    </>
  );
}
