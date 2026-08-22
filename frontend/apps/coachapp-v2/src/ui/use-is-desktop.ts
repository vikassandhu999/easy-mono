import {useEffect, useState} from 'react';

const QUERY = '(pointer: fine) and (min-width: 768px)';

/**
 * True when the viewport is a desktop-class pointer surface (fine pointer,
 * >= md). Drives responsive routing between anchored Popovers (desktop) and
 * bottom KeyboardSheets (mobile). SSR-safe: returns false until hydrated.
 */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia(QUERY).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isDesktop;
}
