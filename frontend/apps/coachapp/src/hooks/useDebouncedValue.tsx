import {Dispatch, SetStateAction, useEffect, useState} from 'react';

export const useDebouncedValue = <V,>(initial: V, delayMs: number): [V, V, Dispatch<SetStateAction<V>>] => {
  const [debouncedValue, setDebouncedValue] = useState(initial);
  const [value, setValue] = useState(initial);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(() => value);
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return [value, debouncedValue, setValue];
};
