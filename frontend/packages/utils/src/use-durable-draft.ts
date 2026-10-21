import {useCallback, useEffect, useRef, useState} from 'react';

export type DraftStorage = {
  getOwner: () => string | undefined;
  read: (owner: string, resource: string) => Promise<unknown>;
  write: (owner: string, resource: string, value: unknown) => Promise<void>;
  remove: (owner: string, resource: string) => Promise<void>;
};
export type DurableDraftOptions<T> = {
  initial: T;
  resource: string | ((owner: string) => string);
  parse: (raw: unknown) => T | null;
  label: string;
};
export type DurableDraft<T> = {
  draft: T | null;
  state: 'idle' | 'saving' | 'saved' | 'error';
  loadError: string;
  isCurrent: () => boolean;
  update: (change: (draft: T) => T, durable?: boolean) => Promise<boolean>;
};

export async function loadDurableDraft<T>(
  storage: DraftStorage,
  owner: string,
  resource: string,
  initial: T,
  parse: (raw: unknown) => T | null,
): Promise<{draft: T; failure: 'read' | 'parse' | null}> {
  let raw: unknown;
  try {
    raw = await storage.read(owner, resource);
  } catch {
    return {draft: initial, failure: 'read'};
  }
  if (storage.getOwner() !== owner) {
    return {draft: initial, failure: null};
  }
  if (raw === null) {
    return {draft: initial, failure: null};
  }
  let draft: T | null;
  try {
    draft = parse(raw);
  } catch {
    draft = null;
  }
  if (draft !== null) {
    return {draft, failure: null};
  }
  try {
    await storage.remove(owner, resource);
  } catch {
    /* A storage failure must not hide the saved server record. */
  }
  return {draft: initial, failure: 'parse'};
}

export function useDurableDraft<T>({
  initial: seed,
  resource: name,
  parse,
  label,
  storage,
}: DurableDraftOptions<T> & {storage: DraftStorage}): DurableDraft<T> {
  const [initial] = useState(seed);
  const [owner] = useState(storage.getOwner);
  const [resource] = useState(() => (typeof name === 'string' ? name : name(owner ?? '')));
  const current = useRef<T | null>(null);
  const [draft, setDraft] = useState<T | null>(null);
  const [state, setState] = useState<DurableDraft<T>['state']>('idle');
  const [loadError, setLoadError] = useState('');
  const sequence = useRef(0);
  const mounted = useRef(true);
  const isCurrent = useCallback(() => Boolean(owner && storage.getOwner() === owner), [owner, storage]);
  // The caller keys the screen by account and resource; read its draft once.
  // biome-ignore lint/correctness/useExhaustiveDependencies: Storage identity is fixed for this keyed screen.
  useEffect(() => {
    mounted.current = true;
    if (!owner) {
      return;
    }
    const active = () => mounted.current && isCurrent();
    loadDurableDraft(storage, owner, resource, initial, parse).then(({draft: restored, failure}) => {
      if (!active()) {
        return;
      }
      current.current = restored;
      setDraft(restored);
      if (failure) {
        setLoadError(
          failure === 'parse'
            ? `This ${label} draft could not be read. Your saved data is shown.`
            : `Your ${label} draft could not be opened. Your saved data is shown.`,
        );
      }
    });
    return () => {
      mounted.current = false;
    };
  }, []);
  const update = useCallback(
    async (change: (draft: T) => T, durable = false) => {
      if (!owner || !isCurrent()) {
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
        await storage.write(owner, resource, next);
        if (!isCurrent()) {
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
    [owner, isCurrent, initial, storage, resource],
  );
  return {draft, state, loadError, isCurrent, update};
}
