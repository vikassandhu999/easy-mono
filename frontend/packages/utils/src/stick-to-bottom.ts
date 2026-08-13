/**
 * Keeps a scroll container pinned to its ABSOLUTE bottom.
 *
 * Two independent defects break the usual "scrollIntoView a sentinel from an
 * effect keyed on the last message id" approach, and both were live in chat:
 *
 *  1. A zero-height sentinel aligns *itself* with the scrollport, not the
 *     scroll extent, so the container's own bottom padding is never covered.
 *     Measured: 11px short with media fully loaded and layout settled.
 *  2. The effect runs before images/audio/video have intrinsic size, so late
 *     media grows the content *after* the scroll already happened.
 *
 * Observing the container's scroll size fixes both with one mechanism, and
 * gets new messages, font swaps and viewport resizes for free.
 */

/** Slack for sub-pixel scroll offsets and momentum scrolling. */
export const STICK_TO_BOTTOM_THRESHOLD_PX = 24;

export type ScrollMetrics = {clientHeight: number; scrollHeight: number; scrollTop: number};

/**
 * Is the viewer at (or within a hair of) the bottom — i.e. should growth keep
 * pulling them down? False means they scrolled up to read history, and new
 * content must NOT yank them away.
 */
export function isScrolledToBottom(
  {clientHeight, scrollHeight, scrollTop}: ScrollMetrics,
  threshold: number = STICK_TO_BOTTOM_THRESHOLD_PX,
): boolean {
  return scrollHeight - clientHeight - scrollTop <= threshold;
}

/** Pins `element` to its bottom until the viewer scrolls away. Returns a teardown. */
export function stickToBottom(element: HTMLElement | null): () => void {
  if (!element) {
    return () => undefined;
  }

  let pinned = true;
  const pin = () => {
    if (pinned) {
      element.scrollTop = element.scrollHeight;
    }
  };

  // Scrolling up releases the pin; scrolling back to the bottom re-arms it.
  const onScroll = () => {
    pinned = isScrolledToBottom(element);
  };

  // Content growth shows up as a size change on the children, not on the
  // (flex-sized) container itself.
  const sizeObserver = new ResizeObserver(pin);
  const observeChildren = () => {
    for (const child of element.children) {
      sizeObserver.observe(child);
    }
  };
  sizeObserver.observe(element);
  observeChildren();

  // The scroller swaps its whole child subtree between loading / error / list.
  const childObserver = new MutationObserver(observeChildren);
  childObserver.observe(element, {childList: true});

  // <img>/<video>/<audio> only reflow their parent once decode finishes, and
  // these events don't bubble — capture them.
  element.addEventListener('load', pin, true);
  element.addEventListener('loadedmetadata', pin, true);
  element.addEventListener('scroll', onScroll, {passive: true});

  pin();

  return () => {
    sizeObserver.disconnect();
    childObserver.disconnect();
    element.removeEventListener('load', pin, true);
    element.removeEventListener('loadedmetadata', pin, true);
    element.removeEventListener('scroll', onScroll);
  };
}
