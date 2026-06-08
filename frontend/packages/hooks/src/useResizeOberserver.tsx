import {useLayoutEffect} from 'react';

const observedElements = new Map<Element, (element: Element) => void>();

const resizeObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    observedElements.get(entry.target)?.(entry.target);
  }
});

// In order to avoid firing the callback at init time (and only firing it when the content size actually updated)
// we need this little tool to avoid it (see. https://github.com/WICG/resize-observer/issues/38)
const skipFirstCall = (fn: (element: Element) => void) => {
  let isFirst = true;

  return (element: Element) => {
    if (isFirst) {
      isFirst = false;
      return;
    }

    return fn(element);
  };
};

export const useResizeObserver = (
  callback: (element: Element | HTMLDivElement) => void,
  element?: Element | HTMLDivElement | null,
) => {
  // We need to use a layout effect here as we want to make sure the observer is set up (and removed!) before the component is rendered
  useLayoutEffect(() => {
    if (!element) {
      return () => {
        // no-op cleanup when no element is attached
      };
    }

    observedElements.set(element, skipFirstCall(callback));
    resizeObserver.observe(element);

    return () => {
      observedElements.delete(element);
      resizeObserver.unobserve(element);
    };
  }, [element, callback]);
};
