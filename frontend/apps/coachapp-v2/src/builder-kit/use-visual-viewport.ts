import {useEffect, useState} from 'react';

import {calculateSheetGeometry, KEYBOARD_SHEET_TOP_GAP, type SheetGeometry} from './keyboard-sheet-state';

export type VisualViewportState = SheetGeometry;

function readViewportState(): VisualViewportState {
  const layoutHeight = window.innerHeight;
  const viewport = window.visualViewport;

  return calculateSheetGeometry({
    layoutHeight,
    offsetTop: viewport?.offsetTop ?? 0,
    topGap: KEYBOARD_SHEET_TOP_GAP,
    viewportHeight: viewport?.height ?? layoutHeight,
  });
}

/** Tracks visible mobile viewport geometry, including iOS viewport panning. */
export function useVisualViewport(): VisualViewportState {
  const [state, setState] = useState<VisualViewportState>(() => {
    if (typeof window === 'undefined') {
      return {bottomInset: 0, maxHeight: 0, viewportHeight: 0};
    }

    return readViewportState();
  });

  useEffect(() => {
    const viewport = window.visualViewport;
    const update = () => {
      const next = readViewportState();
      setState((current) =>
        current.bottomInset === next.bottomInset &&
        current.maxHeight === next.maxHeight &&
        current.viewportHeight === next.viewportHeight
          ? current
          : next,
      );
    };

    update();

    if (!viewport) {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }

    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);

    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
    };
  }, []);

  return state;
}
