import {useCallback, useEffect, useRef, useState} from 'react';
import {readDraft, writeDraft} from '../api/drafts';
import {getSession} from '../api/session';
import type {Session} from '../api/training';
import {emptySet, initialWorkoutDraft, parseWorkoutDraft, type SetEntry, type WorkoutDraft} from './recording';

export function newEntry(key: string, session: Session, unit: 'kg' | 'lbs'): SetEntry {
  const exercise = session.prescription_snapshot?.workout.exercises.find((item) => item.ref === key);
  return {
    key,
    exerciseId: exercise?.exercise_id ?? null,
    values: emptySet(exercise, unit),
    operation: {kind: 'create', requestId: crypto.randomUUID()},
    attempted: false,
  };
}

export function entryHasInput(entry: SetEntry) {
  const values = entry.values;
  return (
    entry.attempted ||
    entry.operation.kind === 'edit' ||
    [values.reps, values.load_value, values.duration_seconds, values.distance_value, values.rpe, values.notes].some(
      (value) => value.trim() !== '',
    )
  );
}

export function useWorkoutDraft(session: Session, unit: 'kg' | 'lbs') {
  const [owner] = useState(() => getSession()?.id);
  const resource = `training.${session.id}`;
  const current = useRef<WorkoutDraft | null>(null);
  const [draft, setDraft] = useState<WorkoutDraft | null>(null);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [loadError, setLoadError] = useState('');
  const sequence = useRef(0);
  const mounted = useRef(true);
  // biome-ignore lint/correctness/useExhaustiveDependencies: The parent keys this controller by account and session ID.
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
        const saved = parseWorkoutDraft(raw) ?? initialWorkoutDraft(session);
        if (!saved.entries.some((entry) => entry.key === saved.selected)) {
          saved.entries.push(newEntry(saved.selected, session, unit));
        }
        current.current = saved;
        setDraft(saved);
      })
      .catch(() => {
        if (mounted.current) {
          setLoadError('Your workout draft could not be opened. Reopen this screen to retry.');
        }
      });
    return () => {
      mounted.current = false;
    };
  }, []);

  const update = useCallback(
    async (change: (draft: WorkoutDraft) => WorkoutDraft, durable = false) => {
      if (!owner || getSession()?.id !== owner || !current.current) {
        return false;
      }
      const next = change(current.current);
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
        if (mounted.current && sequence.current === write) {
          setState('saved');
        }
        return true;
      } catch {
        if (mounted.current && sequence.current === write) {
          setState('error');
        }
        return false;
      }
    },
    [owner, resource],
  );

  return {draft, state, loadError, update};
}
