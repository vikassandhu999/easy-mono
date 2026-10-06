import {useCallback, useEffect, useRef, useState} from 'react';
import {readDraft, writeDraft} from '../api/drafts';
import {getSession} from '../api/session';
import type {Session} from '../api/training';
import {
  emptySet,
  initialWorkoutDraft,
  parseWorkoutDraft,
  type SetEntry,
  setValues,
  type WorkoutDraft,
  workoutItems,
} from './recording';

export function newEntry(key: string, session: Session, unit: 'kg' | 'lb'): SetEntry {
  const exercise = workoutItems(session).find(
    (item) => item.sets.some((set) => set.id === key) || `extra:${item.id}` === key,
  );
  const target = exercise?.sets.find((set) => set.id === key);
  const saved = target && session.performed_sets.find((set) => set.set_id === target.id && !set.deleted_at);
  if (saved) {
    return {
      key,
      exerciseId: saved.exercise_id,
      itemId: exercise?.id,
      setId: target.id,
      values: setValues(saved, exercise, unit),
      operation: {kind: 'edit', id: saved.id},
      attempted: false,
      dirty: false,
      expectedRevision: session.revision,
    };
  }
  return {
    key,
    exerciseId: exercise?.exercise_id ?? null,
    itemId: exercise?.id,
    setId: target?.id,
    values: emptySet(exercise, unit, target),
    operation: {kind: 'create', requestId: crypto.randomUUID()},
    attempted: false,
  };
}

export function entryHasInput(entry: SetEntry) {
  if (entry.operation.kind === 'edit' && entry.dirty === false && !entry.attempted) {
    return false;
  }
  const values = entry.values;
  return (
    entry.attempted ||
    (entry.operation.kind === 'edit' && entry.dirty !== false) ||
    values.outcome !== 'done' ||
    [
      values.reps,
      values.load_value,
      values.duration_s,
      values.distance_value,
      values.rpe,
      values.rir,
      values.notes,
    ].some((value) => value.trim() !== '')
  );
}

export function useWorkoutDraft(session: Session, unit: 'kg' | 'lb') {
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
        saved.revision ??= session.revision;
        saved.date ??= session.local_date;
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
