/**
 * AssignSurface — ghost trigger button plus a responsive assign surface:
 *   - desktop (pointer: fine, >= md): anchored HeroUI Popover under the button
 *   - mobile: bottom KeyboardSheet
 * Children render only while open (function-as-child receives close).
 */
import {Button, Popover} from '@heroui/react';
import {type ReactNode, useRef, useState} from 'react';

import {useIsDesktop} from '@/@hooks/use-is-desktop';
import {KeyboardSheet} from '@/builder-kit/keyboard-sheet';

interface Props {
  label: ReactNode;
  popoverClassName?: string;
  children: (close: () => void) => ReactNode;
}

export default function AssignSurface({label, popoverClassName = '', children}: Props) {
  const [open, setOpen] = useState(false);
  const isDesktop = useIsDesktop();
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const close = () => setOpen(false);

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
            className={`w-104 max-w-[calc(100vw-2rem)] rounded-2xl border-[1.5px] border-separator bg-surface shadow-xl ${popoverClassName}`}
            triggerRef={triggerRef}
          >
            <Popover.Dialog className="outline-none">{open ? children(close) : null}</Popover.Dialog>
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
