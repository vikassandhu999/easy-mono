import type { Ref, RefCallback, MutableRefObject } from 'react';
import { useCallback, useLayoutEffect, useRef } from 'react';

const isRefCallback = <T>(x: unknown): x is RefCallback<T> => typeof x === 'function';
const isMutableRefObject = <T>(x: unknown): x is MutableRefObject<T> => typeof x === 'object';

export const useMergedRefs = <T>(...refs: Ref<T>[]): RefCallback<T> => {
  const refsRef = useRef(refs);

  useLayoutEffect(() => {
    refsRef.current = refs;
  });

  return useCallback((refValue: T) => {
    const refs = refsRef.current;

    refs.filter(Boolean).forEach((ref) => {
      if (isRefCallback<T>(ref)) {
        ref(refValue);
        return;
      }

      if (isMutableRefObject<T>(ref)) {
        ref.current = refValue;
      }
    });
  }, []);
};
