import {CloseButton} from '@heroui/react';
import {cn} from '@heroui/styles';
import {type ReactNode, useEffect} from 'react';
import {Dialog, Heading, Modal, ModalOverlay} from 'react-aria-components';

import {acquireScrollLock} from './keyboard-sheet-state';
import {useVisualViewport} from './use-visual-viewport';

export interface KeyboardSheetProps {
  /** Whether the sheet is visible. */
  open: boolean;
  /** Called when the user dismisses the sheet. */
  onClose: () => void;
  /** Prevent backdrop, Escape, and Close-button dismissal while work is pending. */
  isDismissable?: boolean;
  /** Optional visible title and accessible dialog name. */
  title?: ReactNode;
  /** Accessible dialog name when the sheet renders no title. */
  ariaLabel?: string;
  /** Optional committed action replacing the default close button. */
  headerAction?: ReactNode;
  /** Action dock pinned below the scrollable body. */
  footer?: ReactNode;
  children: ReactNode;
  /** Additional classes for the sheet panel. */
  className?: string;
}

function AppScrollLock() {
  useEffect(() => {
    const scroller = document.querySelector<HTMLElement>('.easy_main-content');
    return scroller ? acquireScrollLock(scroller) : undefined;
  }, []);

  return null;
}

/**
 * Bottom sheet with custom visual-viewport geometry and React Aria modal
 * semantics. The custom position keeps the sheet above mobile keyboards while
 * React Aria owns focus, dismissal, overlay stacking, and exit lifecycle.
 */
export function KeyboardSheet({
  open,
  onClose,
  isDismissable = true,
  title,
  ariaLabel,
  headerAction,
  footer,
  children,
  className,
}: KeyboardSheetProps) {
  const {bottomInset, maxHeight} = useVisualViewport();

  return (
    <ModalOverlay
      className="keyboard-sheet__backdrop fixed inset-0 z-50 bg-transparent"
      isDismissable={isDismissable}
      isOpen={open}
      onOpenChange={(next) => {
        if (!next && isDismissable) {
          onClose();
        }
      }}
    >
      <AppScrollLock />
      <Modal
        className={cn(
          'keyboard-sheet__panel fixed right-0 left-0 z-50 flex flex-col overflow-hidden rounded-t-panel border border-border bg-surface shadow-overlay',
          'md:right-auto md:left-1/2 md:w-full md:max-w-lg md:-translate-x-1/2',
          className,
        )}
        style={() => ({
          /* ui-contract-allow -- live visual-viewport geometry */
          bottom: bottomInset,
          maxHeight,
        })}
      >
        <Dialog
          aria-label={title === undefined ? ariaLabel : undefined}
          className="flex min-h-0 flex-1 flex-col outline-none"
        >
          <div
            aria-hidden="true"
            className="flex justify-center py-2"
          >
            <div className="h-1 w-10 rounded-pill bg-default" />
          </div>

          {title !== undefined ? (
            <div className="flex items-center justify-between gap-3 px-4 pb-2">
              <Heading
                className="min-w-0 flex-1 type-body font-semibold text-foreground"
                slot="title"
              >
                {title}
              </Heading>
              {headerAction ??
                (isDismissable ? (
                  <CloseButton
                    aria-label="Close"
                    className="-mr-2 bg-transparent text-muted"
                    onPress={onClose}
                  />
                ) : null)}
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2 text-foreground">{children}</div>

          {footer !== undefined ? (
            <div className="border-t border-separator bg-background px-4 pt-3 pb-[calc(var(--spacing)*3+env(safe-area-inset-bottom))]">
              {footer}
            </div>
          ) : null}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
