import {useEffect, useRef, useState} from 'react';
import type {DurableDraft} from './use-durable-draft.ts';

type ControllerAdapter<L, D, O> = {
  getLog: () => L | null;
  getDraft: () => D | null;
  isCurrent: () => boolean;
  writeDraft: (draft: D, durable: boolean) => Promise<boolean>;
  execute: (operation: O) => Promise<{data: L}>;
  reload: (id: string) => Promise<{data: L}>;
  setLog: (log: L) => void;
  setBusy: (busy: boolean) => void;
  setError: (message: string) => void;
  createId: () => string;
  onAcknowledged: (operation: O, log: L) => void;
  onSaved: () => void;
};
type Options<L, D, O, C> = {
  initial: L | null;
  durable: DurableDraft<D>;
  execute: (operation: O) => Promise<{data: L}>;
  reload: (id: string) => Promise<{data: L}>;
  createController: (adapter: ControllerAdapter<L, D, O>) => C;
  onAcknowledged?: (operation: O, log: L) => void;
};
type Result<L, D, C> = {local: L; busy: boolean; error: string; saved: boolean; durable: DurableDraft<D>; session: C};

export function useDraftController<L, D, O, C extends {isBusy: () => boolean}>(
  options: Options<L, D, O, C> & {initial: L},
): Result<L, D, C>;
export function useDraftController<L, D, O, C extends {isBusy: () => boolean}>(
  options: Options<L, D, O, C>,
): Result<L | null, D, C>;
export function useDraftController<L, D, O, C extends {isBusy: () => boolean}>(
  options: Options<L, D, O, C>,
): Result<L | null, D, C> {
  const {initial, durable} = options;
  const [local, setLocal] = useState(initial);
  const localRef = useRef(local);
  const draftRef = useRef(durable.draft);
  draftRef.current = durable.draft;
  const latest = useRef(options);
  latest.current = options;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const controller = useRef<C | null>(null);
  if (!controller.current) {
    controller.current = options.createController({
      getLog: () => localRef.current,
      getDraft: () => draftRef.current,
      isCurrent: () => latest.current.durable.isCurrent(),
      writeDraft: async (next, persist) => {
        setSaved(false);
        if (!persist) {
          draftRef.current = next;
        }
        const written = await latest.current.durable.update(() => next, persist);
        if (persist && written && latest.current.durable.isCurrent()) {
          draftRef.current = next;
        }
        return written;
      },
      execute: (operation) => latest.current.execute(operation),
      reload: (id) => latest.current.reload(id),
      setLog: (log) => {
        localRef.current = log;
        setLocal(log);
      },
      setBusy,
      setError,
      createId: () => crypto.randomUUID(),
      onAcknowledged: (operation, log) => latest.current.onAcknowledged?.(operation, log),
      onSaved: () => setSaved(true),
    });
  }
  const session = controller.current;
  useEffect(() => {
    if (!session.isBusy()) {
      localRef.current = initial;
      setLocal(initial);
    }
  }, [initial, session]);
  return {local, busy, error: error || durable.loadError, saved, durable, session};
}
