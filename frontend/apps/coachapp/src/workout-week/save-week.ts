import {useRef, useState} from 'react';
import {ApiError, errorMessage} from '../api/client';
import {getSession} from '../api/session';
import {
  useAddWorkoutSchedule,
  useRemoveWorkoutSchedule,
  useSaveWorkoutSchedule,
  useUndoWorkoutWeek,
  useWorkoutWeek,
} from '../api/workout-week';
import {matchSaveIntent, readIntent, type SaveIntent} from './model';

export function useSaveWeek(clientId: string) {
  const key = `easy:workout-week:${getSession()?.id}:${clientId}`;
  const [intent, setIntent] = useState(() => {
    try {
      return readIntent(localStorage.getItem(key));
    } catch {
      return null;
    }
  });
  const [uncertain, setUncertain] = useState(intent !== null);
  const [conflict, setConflict] = useState(false);
  const [error, setError] = useState<string | undefined>(
    intent ? 'An earlier save could not be confirmed. Check the saved week before making another change.' : undefined,
  );
  const [checking, setChecking] = useState(false);
  const [undo, setUndo] = useState<{message: string; before: {token: string; expected: SaveIntent['before']}} | null>(
    null,
  );
  const [sending, setSending] = useState(false);
  const busy = useRef(false);
  const week = useWorkoutWeek(clientId);
  const add = useAddWorkoutSchedule(clientId);
  const save = useSaveWorkoutSchedule(clientId);
  const remove = useRemoveWorkoutSchedule(clientId);
  const undoWrite = useUndoWorkoutWeek(clientId);
  const clear = () => {
    localStorage.removeItem(key);
    setIntent(null);
    setUncertain(false);
    setConflict(false);
    setError(undefined);
  };
  const execute = async (attempt: SaveIntent) => {
    if (busy.current || checking || uncertain) {
      return false;
    }
    try {
      localStorage.setItem(key, JSON.stringify(attempt));
    } catch {
      setError('Could not keep your changes on this device. Check device storage and try again.');
      return false;
    }
    busy.current = true;
    try {
      setIntent(attempt);
      setError(undefined);
      setSending(true);
      const result =
        attempt.kind === 'add'
          ? await add.mutateAsync(attempt.body)
          : attempt.kind === 'schedule'
            ? await save.mutateAsync({id: attempt.id, body: attempt.body})
            : attempt.kind === 'remove'
              ? await remove.mutateAsync({id: attempt.id, weekday: attempt.weekday})
              : await undoWrite.mutateAsync(attempt.token);
      if ('undo_token' in result) {
        setUndo({message: attempt.message, before: {token: result.undo_token, expected: attempt.before}});
      } else {
        setUndo(null);
      }
      clear();
      return true;
    } catch (cause) {
      const ambiguous = !(cause instanceof ApiError) || cause.status >= 500 || cause.status === 408;
      setUncertain(ambiguous);
      setError(
        ambiguous
          ? 'The save could not be confirmed. Your changes stay on this device. Check the saved week before trying again.'
          : errorMessage(cause, 'Not saved. Your changes stay on this device. Try again.'),
      );
      return false;
    } finally {
      busy.current = false;
      setSending(false);
    }
  };
  const check = async () => {
    if (checking || sending || !intent) {
      return;
    }
    setChecking(true);
    try {
      const result = await week.refetch();
      if (result.error || !result.data) {
        setError('Could not load the saved week. Check again when you have a connection.');
        return;
      }
      const match = matchSaveIntent(intent, result.data.data);
      if (match === 'saved') {
        clear();
        return true;
      } else if (match === 'absent') {
        setUncertain(false);
        setConflict(false);
        setError('No matching save was found. Your changes stay on this device. Retry to save.');
      } else {
        setConflict(true);
        setError(
          'The saved week has changed. This save cannot be confirmed. Check again or discard this draft to view the saved week.',
        );
      }
    } finally {
      setChecking(false);
    }
    return false;
  };
  return {
    intent,
    undo,
    setUndo,
    pending: sending || checking,
    blocked: intent !== null,
    uncertain,
    conflict,
    checking,
    error,
    execute,
    check,
    discard: clear,
    retry: async () => (intent ? execute(intent) : false),
  };
}
