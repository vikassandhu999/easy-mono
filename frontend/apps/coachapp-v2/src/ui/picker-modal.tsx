/**
 * PickerModal — the one responsive shell for picker surfaces (decision
 * 2026-08-04: pickers are CENTERED MODALS on desktop, not anchored popovers —
 * a stable, predictable position instead of panels popping up wherever the
 * trigger happens to sit).
 *
 * Desktop: centered `Modal` with the three-band picker anatomy the nutrition
 * add-items flow established — title row · scrollable body · sticky footer.
 * Mobile: `KeyboardSheet` (which renders its own title row and footer dock).
 *
 * Children mount only while open, so search state and autofocus reset per
 * opening. Anchored popovers remain correct for select-like controls (meal
 * slot) and inline editors (set editor, amount sheet) via `ResponsiveOverlay`.
 */
import {CloseButton, Modal} from '@heroui/react';
import type {ReactNode} from 'react';
import {KeyboardSheet} from '@/ui/keyboard-sheet';
import {useIsDesktop} from '@/ui/use-is-desktop';

export interface PickerModalProps {
  open: boolean;
  /** Receives the dismiss (backdrop, Esc, close button). */
  onClose: () => void;
  /** Prevent dismissal while a committed action is pending. */
  isDismissable?: boolean;
  /** Title band on both shells; also the dialog's accessible name. Omit when
   *  the content renders its own header row. */
  title?: string;
  /** Accessible dialog name when the content owns the visible header. */
  ariaLabel?: string;
  /** Sticky confirm dock. Omit for instant-select pickers. */
  footer?: ReactNode;
  /** Desktop body override. Default is the fixed-height scroll body every
   *  search picker uses; a content-sized step (e.g. an amount form) passes its
   *  own padding instead. */
  bodyClassName?: string;
  children: ReactNode;
}

export function PickerModal({
  open,
  onClose,
  isDismissable = true,
  title,
  ariaLabel,
  footer,
  bodyClassName,
  children,
}: PickerModalProps) {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <Modal.Backdrop
        isDismissable={isDismissable}
        isOpen={open}
        onOpenChange={(next) => {
          if (!next && isDismissable) {
            onClose();
          }
        }}
        variant="transparent"
      >
        <Modal.Container
          placement="center"
          size="md"
        >
          {/* p-0: the bands own their insets (SearchPickerBody's sticky search
              assumes the px-4 gutter). */}
          <Modal.Dialog
            {...((title ?? ariaLabel) ? {'aria-label': title ?? ariaLabel} : {})}
            className="overflow-hidden p-0"
          >
            {open ? (
              <>
                {title !== undefined ? (
                  <div className="flex items-center justify-between px-4 pb-1 pt-3">
                    <span className="type-body font-semibold text-foreground">{title}</span>
                    {isDismissable ? (
                      <CloseButton
                        aria-label="Close"
                        className="-mr-2 text-muted"
                        onPress={onClose}
                      />
                    ) : null}
                  </div>
                ) : null}
                <div className={bodyClassName ?? 'h-[60vh] overflow-y-auto px-4 pb-2'}>{children}</div>
                {footer !== undefined ? (
                  <div className="border-t border-separator bg-background px-4 py-3">{footer}</div>
                ) : null}
              </>
            ) : null}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    );
  }

  return (
    <KeyboardSheet
      {...(ariaLabel ? {ariaLabel} : {})}
      {...(open && footer !== undefined ? {footer} : {})}
      isDismissable={isDismissable}
      onClose={onClose}
      open={open}
      {...(title !== undefined ? {title} : {})}
    >
      {open ? children : null}
    </KeyboardSheet>
  );
}
