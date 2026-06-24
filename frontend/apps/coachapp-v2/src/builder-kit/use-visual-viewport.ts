import {useEffect, useState} from 'react';

export interface VisualViewportState {
  keyboardHeight: number;
  viewportHeight: number;
}

/**
 * Tracks the visual viewport to derive the on-screen keyboard height.
 *
 * Formula: keyboardHeight = window.innerHeight - vv.height - vv.offsetTop
 *   - vv.height shrinks when the keyboard opens.
 *   - vv.offsetTop accounts for any top-pinned browser chrome (e.g. iOS Safari
 *     address bar in compact mode) so we don't over-count.
 *   - Clamped ≥ 0 to guard against browser quirks that momentarily report a
 *     viewport taller than the window.
 *
 * SSR-safe: initial state uses window.innerHeight only when window exists.
 */
export function useVisualViewport(): VisualViewportState {
  const [state, setState] = useState<VisualViewportState>({
    keyboardHeight: 0,
    viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) {
      return;
    }

    const update = () => {
      const keyboardHeight = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setState({keyboardHeight, viewportHeight: vv.height});
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);

    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return state;
}
