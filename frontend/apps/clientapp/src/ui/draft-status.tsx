import {useCallback, useEffect, useRef, useState} from 'react';
import {writeDraft} from '../api/drafts';
import {getSession} from '../api/session';

type DraftState = 'idle' | 'saving' | 'saved' | 'error';
export function useDraftWriter(sessionId: string | undefined, resource: string) {
  const [state, setState] = useState<DraftState>('idle');
  const sequence = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const saveDraft = useCallback(
    async (value: unknown) => {
      if (!sessionId || getSession()?.id !== sessionId) {
        return;
      }
      const write = ++sequence.current;
      setState('saving');
      const isCurrent = () => mounted.current && write === sequence.current && getSession()?.id === sessionId;
      try {
        await writeDraft(sessionId, resource, value);
        if (isCurrent()) {
          setState('saved');
        }
      } catch {
        if (isCurrent()) {
          setState('error');
        }
      }
    },
    [sessionId, resource],
  );
  return {saveDraft, state};
}
export function DraftStatus({state}: {state: DraftState}) {
  if (state === 'idle') {
    return null;
  }
  return (
    <p
      role={state === 'error' ? 'alert' : 'status'}
      className={`text-sm ${state === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}
    >
      {state === 'saving'
        ? 'Saving draft…'
        : state === 'saved'
          ? 'Draft saved on this device.'
          : 'Your draft could not be saved on this device. Keep this screen open until you send your changes.'}
    </p>
  );
}
