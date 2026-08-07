export const KEYBOARD_SHEET_TOP_GAP = 48;

export interface SheetViewportMetrics {
  layoutHeight: number;
  viewportHeight: number;
  offsetTop: number;
  topGap: number;
}

export interface SheetGeometry {
  bottomInset: number;
  maxHeight: number;
  viewportHeight: number;
}

export function calculateSheetGeometry({
  layoutHeight,
  viewportHeight,
  offsetTop,
  topGap,
}: SheetViewportMetrics): SheetGeometry {
  const visibleHeight = Math.min(Math.max(0, viewportHeight), Math.max(0, layoutHeight));
  const bottomInset = Math.max(0, layoutHeight - visibleHeight - offsetTop);

  return {
    bottomInset,
    maxHeight: Math.max(0, visibleHeight - topGap),
    viewportHeight: visibleHeight,
  };
}

interface ScrollLockTarget {
  style: {
    overflow: string;
  };
}

interface ScrollLockState {
  count: number;
  previousOverflow: string;
}

const scrollLocks = new WeakMap<ScrollLockTarget, ScrollLockState>();

export function acquireScrollLock(target: ScrollLockTarget): () => void {
  const existing = scrollLocks.get(target);

  if (existing) {
    existing.count += 1;
  } else {
    scrollLocks.set(target, {count: 1, previousOverflow: target.style.overflow});
    target.style.overflow = 'hidden';
  }

  let released = false;

  return () => {
    if (released) {
      return;
    }

    released = true;
    const current = scrollLocks.get(target);

    if (!current) {
      return;
    }

    current.count -= 1;

    if (current.count === 0) {
      target.style.overflow = current.previousOverflow;
      scrollLocks.delete(target);
    }
  };
}
