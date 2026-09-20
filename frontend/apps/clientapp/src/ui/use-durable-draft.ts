import {useCallback, useEffect, useRef, useState} from 'react';
import {readDraft, writeDraft} from '../api/drafts';
import {getSession} from '../api/session';

export function useDurableDraft<T>({
  initial: seed,
  resource,
  parse,
  label,
}: {
  initial: T;
  resource: string;
  parse: (raw: unknown) => T | null;
  label: string;
}) {
  const [initial] = useState(seed);
  const [owner] = useState(() => getSession()?.id);
  const current = useRef<T | null>(null);
  const [draft, setDraft] = useState<T | null>(null);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [loadError, setLoadError] = useState('');
  const sequence = useRef(0);
  const mounted = useRef(true);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Parent keys this controller by account and resource.
  useEffect(() => {
    mounted.current = true;
    if (!owner) {
      return;
    }
    readDraft(owner, resource)
      .then((raw) => {
        if (!mounted.current || getSession()?.id !== owner) {
          return;
        }
        const saved = raw === null ? initial : parse(raw);
        if (!saved) {
          setLoadError(`This ${label} draft could not be read. Your saved data is still available.`);
          return;
        }
        current.current = saved;
        setDraft(saved);
      })
      .catch(() => {
        if (mounted.current && getSession()?.id === owner) {
          setLoadError(`Your ${label} draft could not be opened. Reopen this screen to retry.`);
        }
      });
    return () => {
      mounted.current = false;
    };
  }, []);
  const update = useCallback(
    async (change: (draft: T) => T, durable = false) => {
      if (!owner || getSession()?.id !== owner) {
        return false;
      }
      const next = change(current.current ?? initial);
      if (!durable) {
        current.current = next;
        setDraft(next);
      }
      const write = ++sequence.current;
      setState('saving');
      try {
        await writeDraft(owner, resource, next);
        if (getSession()?.id !== owner) {
          return false;
        }
        if (durable) {
          current.current = next;
          if (mounted.current) {
            setDraft(next);
          }
        }
        if (mounted.current && write === sequence.current) {
          setState('saved');
          setLoadError('');
        }
        return true;
      } catch {
        if (mounted.current && write === sequence.current) {
          setState('error');
        }
        return false;
      }
    },
    [owner, resource, initial],
  );
  return {draft, state, loadError, update};
}
