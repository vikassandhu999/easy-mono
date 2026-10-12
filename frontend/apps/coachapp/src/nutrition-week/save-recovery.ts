import {useRef, useState} from 'react';
import {ApiError, errorMessage} from '../api/client';
import {useNutritionWeek} from '../api/nutrition-week';
import {uncertainSave} from './model';
import {matchSaveIntent, type SaveIntent} from './save-intent';

export function useSaveRecovery(clientId: string, onChecked: () => void, onDiscard = onChecked) {
  const week = useNutritionWeek(clientId);
  const [error, setError] = useState<string>();
  const [uncertain, setUncertain] = useState(false);
  const [checking, setChecking] = useState(false);
  const [conflict, setConflict] = useState(false);
  const intent = useRef<SaveIntent | null>(null);
  const begin = (attempt: SaveIntent) => {
    intent.current = structuredClone(attempt);
    setConflict(false);
    setError(undefined);
  };
  const fail = (cause: unknown, fallback: string) => {
    const ambiguous = uncertainSave(cause instanceof ApiError ? cause.status : undefined);
    setUncertain(ambiguous);
    setError(
      ambiguous
        ? 'The save could not be confirmed. Your edits are still here. Check the saved week before making another change.'
        : errorMessage(cause, fallback),
    );
  };
  const check = async () => {
    if (checking) {
      return;
    }
    setChecking(true);
    try {
      const result = await week.refetch();
      if (result.error || !result.data) {
        setError('Could not load the saved week. Your edits are still here. Check again when you have a connection.');
        return;
      }
      if (!intent.current) {
        setError('This save cannot be checked. Your edits are still here.');
        return;
      }
      const outcome = matchSaveIntent(intent.current, result.data.data);
      if (outcome === 'saved') {
        onChecked();
      } else if (outcome === 'absent') {
        setUncertain(false);
        setConflict(false);
        setError('No matching save was found. Your edits are still here. You can save again.');
      } else {
        setConflict(true);
        setError(
          'The saved week has changed, and this save cannot be confirmed. Your edits are still here. Check again or discard this draft to view the saved week.',
        );
      }
    } finally {
      setChecking(false);
    }
  };
  return {
    error,
    uncertain,
    checking,
    conflict,
    blocked: uncertain || checking,
    begin,
    fail,
    check,
    discard: onDiscard,
    clear: () => setError(undefined),
  };
}
