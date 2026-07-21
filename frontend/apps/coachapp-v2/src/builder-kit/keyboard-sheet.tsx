/**
 * KeyboardSheet — a bottom-anchored sheet that docks above the mobile keyboard.
 *
 * Design choice: raw React portal + fixed-position div, NOT HeroUI Modal/Drawer.
 *
 * Why: the defining behaviour is `bottom = keyboardHeight` updated in real-time
 * as the VisualViewport fires resize/scroll events. HeroUI Modal and Drawer both
 * manage their own `position`/`transform`/`bottom` internally; wiring a dynamic
 * offset through them would require CSS !important overrides or imperative DOM
 * work and is fragile across HeroUI versions. A portal + fixed div gives us full
 * control over the single `bottom` inline style with zero framework conflict, is
 * trivially typed, and matches how the app already builds overlays
 * (plan-add-to-client.tsx). Animations are handled with a CSS transition on
 * `transform` — a slide-up that respects the current `bottom` offset.
 *
 * Z-index: the app's mobile bottom-nav sits at z-40; this sheet uses z-50 so it
 * layers above it when open. Backdrops use the same z-index (z-50) with the
 * sheet rendered after them so it paints on top.
 *
 * Desktop (keyboardHeight === 0, ≥ md breakpoint): the sheet sits flush at the
 * bottom of the viewport, max-width constrained and centred — still bottom-
 * anchored, just without a keyboard offset. This keeps the component single-
 * purpose rather than switching to a different layout mode.
 */

import {type ReactNode, useEffect, useId, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

import {useVisualViewport} from './use-visual-viewport';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KeyboardSheetProps {
  /** Whether the sheet is visible. */
  open: boolean;
  /** Called when the user taps the backdrop or the grip/close area. */
  onClose: () => void;
  /** Optional header title rendered in the title row. */
  title?: ReactNode;
  /**
   * Sticky footer slot — rendered as a dock pinned to the bottom of the sheet
   * (above the keyboard). Intended for primary action buttons like "Add N" or
   * "Done".
   */
  footer?: ReactNode;
  children: ReactNode;
  /** Forwarded to the sheet panel for additional class names. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function KeyboardSheet({open, onClose, title, footer, children, className}: KeyboardSheetProps) {
  const {keyboardHeight} = useVisualViewport();

  // Track mount state for the slide-in animation: mount immediately on open,
  // then set `visible` one frame later so the CSS transition fires.
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const rafRef = useRef<number | null>(null);

  // Stable id for aria-labelledby — only used when title is provided.
  const titleId = useId();

  useEffect(() => {
    if (open) {
      setMounted(true);
      // Defer `visible` by one rAF so the element is in the DOM before the
      // transition starts (avoids the "already at destination" no-op).
      rafRef.current = requestAnimationFrame(() => {
        setVisible(true);
      });
    } else {
      setVisible(false);
      // Wait for the slide-out transition to finish before unmounting.
      const t = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(t);
    }

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [open]);

  // Escape-to-close: bind while open, clean up on close/unmount.
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  // Body scroll-lock: prevent background scrolling while the sheet is open.
  useEffect(() => {
    if (!open) {
      return;
    }

    // The app scrolls inside `.easy_main-content` (see Page), not <body>, so lock
    // that element or the background keeps scrolling behind the open sheet. Fall
    // back to <body> on surfaces that don't use Page (e.g. auth).
    const scroller = document.querySelector<HTMLElement>('.easy_main-content') ?? document.body;
    const previousOverflow = scroller.style.overflow;
    scroller.style.overflow = 'hidden';
    return () => {
      scroller.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-50 bg-black/60"
        onClick={onClose}
        style={{
          opacity: visible ? 1 : 0,
          transition: 'opacity 300ms ease',
        }}
      />

      {/* Sheet panel */}
      <div
        aria-labelledby={title !== undefined ? titleId : undefined}
        aria-modal="true"
        className={[
          // Positioning
          'fixed left-0 right-0 z-50',
          // Shape
          'rounded-t-2xl',
          // Colours — HeroUI CSS-var tokens matching mockup's #16161b card / #34343d border
          'bg-surface border border-border',
          // Shadow
          'shadow-[0_-12px_30px_rgba(0,0,0,0.55)]',
          // Layout
          'flex flex-col',
          // Desktop: max-width + centred
          'md:left-1/2 md:right-auto md:w-full md:max-w-lg md:-translate-x-1/2',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        role="dialog"
        style={{
          bottom: keyboardHeight,
          // Height ceiling so the inner overflow-y-auto engages instead of growing
          // off-screen. Subtract keyboardHeight: the panel is anchored at
          // bottom:keyboardHeight and grows upward, so the keyboard's height must
          // come out of the ceiling or the grip/title/search get pushed above the
          // visible viewport when the keyboard is open. On desktop keyboardHeight
          // is 0, so this is identical to calc(100dvh - 3rem).
          maxHeight: `calc(100dvh - 3rem - ${keyboardHeight}px)`,
          // Y-axis ONLY. Horizontal centering on desktop (>=md) is owned by the
          // `md:-translate-x-1/2` utility, which in Tailwind v4 emits the CSS
          // `translate` property — independent of `transform`. Putting translateX
          // here too would STACK with it (both apply), shifting the panel a second
          // -50% and clipping it off the left edge at >=768px. Animate only Y. RM-124.
          transform: visible ? undefined : 'translateY(100%)',
          transition: 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Grip handle */}
        <div
          className="flex justify-center pb-2 pt-2"
          aria-hidden="true"
        >
          <div className="h-1 w-10 rounded-full bg-default" />
        </div>

        {/* Title row — only rendered when a title is provided */}
        {title !== undefined ? (
          <div className="flex items-center justify-between px-4 pb-2 pt-1">
            <span
              className="text-sm font-semibold text-foreground"
              id={titleId}
            >
              {title}
            </span>
            <button
              aria-label="Close"
              className="-mr-2 flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted transition-colors hover:text-foreground"
              onClick={onClose}
              type="button"
            >
              ✕
            </button>
          </div>
        ) : null}

        {/* Scrollable content area */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">{children}</div>

        {/* Sticky footer dock */}
        {footer !== undefined ? (
          <div className="border-t border-separator bg-background px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            {footer}
          </div>
        ) : null}
      </div>
    </>,
    document.body,
  );
}
