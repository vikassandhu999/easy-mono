import {useEffect, useState} from 'react';

/**
 * Returns a debounced version of the input value.
 * The returned value only updates after the specified delay of inactivity.
 *
 * Useful for search inputs — pass the debounced value to query hooks
 * so queries don't fire on every keystroke.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}
