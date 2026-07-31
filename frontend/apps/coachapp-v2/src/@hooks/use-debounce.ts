import {useEffect, useState} from 'react';

/**
 * Returns a debounced copy of `value` that updates only after `delay` ms of
 * silence. Useful for wiring a controlled search input to a query arg without
 * firing a request on every keystroke.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debounced;
}
