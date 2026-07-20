/**
 * ResponsiveOverlay — the one wrapper implementing UI-CONTRACT §2 "Responsive
 * overlay": ONE content component, TWO shells — an anchored `Popover` on
 * desktop, a `KeyboardSheet` on mobile (`useIsDesktop`).
 *
 * It owns the desktop popover chrome so the token string lives in exactly one
 * place. Before this existed, three palettes carried byte-identical copies of
 * it and the rest of the app had drifted across four widths, two corner radii,
 * two border widths and two border colours. Only the width is a knob (`width`);
 * everything else is fixed.
 *
 * Scope: overlays whose desktop panel is a single padded, scrollable body —
 * the pickers/palettes. Overlays that need extra desktop chrome inside the
 * dialog (an in-panel title row, a sticky confirm dock, a custom placement)
 * keep their own shell — see `search-picker-sheet.tsx`. Adding those knobs here
 * would make the wrapper a passthrough and defeat the point.
 *
 * Children are mounted only while open, matching what every call site did by
 * hand: search state and autofocus reset per opening, and the content is gone
 * during KeyboardSheet's 300ms slide-out.
 */

import {Popover} from '@heroui/react';
import type {ReactNode, RefObject} from 'react';

import {useIsDesktop} from '@/@hooks/use-is-desktop';
import {KeyboardSheet} from '@/builder-kit/keyboard-sheet';

/** Desktop popover chrome, minus the width. The single source of truth. */
const POPOVER_CHROME = 'max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-surface shadow-xl';

/** Desktop dialog body: padded, capped, scrollable. */
const POPOVER_DIALOG = 'max-h-[70vh] overflow-y-auto p-4 outline-none';

export interface ResponsiveOverlayProps {
  isOpen: boolean;
  /** Receives `false` when the user dismisses the overlay (backdrop, Esc, outside press). */
  onOpenChange: (isOpen: boolean) => void;
  /** The element the desktop popover anchors to — usually the button that opened it. */
  triggerRef: RefObject<HTMLElement | null>;
  /** Visible title row on mobile; the accessible name of the desktop dialog. */
  title: string;
  /** Desktop popover width utility. Defaults to the palette width. */
  width?: string;
  children: ReactNode;
}

export function ResponsiveOverlay({
  isOpen,
  onOpenChange,
  triggerRef,
  title,
  width = 'w-104',
  children,
}: ResponsiveOverlayProps) {
  const isDesktop = useIsDesktop();
  const body = isOpen ? children : null;

  if (isDesktop) {
    return (
      <Popover
        isOpen={isOpen}
        onOpenChange={onOpenChange}
      >
        <Popover.Content
          className={`${width} ${POPOVER_CHROME}`}
          triggerRef={triggerRef}
        >
          <Popover.Dialog
            aria-label={title}
            className={POPOVER_DIALOG}
          >
            {body}
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
    );
  }

  return (
    <KeyboardSheet
      onClose={() => onOpenChange(false)}
      open={isOpen}
      title={title}
    >
      {body}
    </KeyboardSheet>
  );
}
