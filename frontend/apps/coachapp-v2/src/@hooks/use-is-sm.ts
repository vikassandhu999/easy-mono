import {useEffect, useState} from 'react';

const QUERY = '(min-width: 640px)';

/**
 * Mirrors Tailwind's `sm` breakpoint for copy that changes with the rendered
 * layout. SSR-safe: returns false until hydrated.
 */
export function useIsSm(): boolean {
  const [isSm, setIsSm] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia(QUERY).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const handler = (event: MediaQueryListEvent) => setIsSm(event.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isSm;
}
