import {useCallback, useEffect, useRef, useState} from 'react';

// ── Types ────────────────────────────────────────────────────

type Replacement = {exerciseId: string; exerciseName: string};
type AddedExercise = {exerciseId: string; exerciseName: string};

type WorkoutLocalState = {
  addedExercises: AddedExercise[];
  replacements: Map<string, Replacement>;
  skippedElementIds: Set<string>;
};

type SerializedState = {
  addedExercises: AddedExercise[];
  replacements: Array<[string, Replacement]>;
  skippedElementIds: string[];
};

// ── Storage helpers ──────────────────────────────────────────

const STORAGE_PREFIX = 'workout_state_';

function getStorageKey(sessionId: string): string {
  return `${STORAGE_PREFIX}${sessionId}`;
}

function loadState(sessionId: string): WorkoutLocalState {
  try {
    const raw = sessionStorage.getItem(getStorageKey(sessionId));
    if (!raw) return emptyState();
    const parsed: SerializedState = JSON.parse(raw);
    return {
      addedExercises: parsed.addedExercises ?? [],
      replacements: new Map(parsed.replacements ?? []),
      skippedElementIds: new Set(parsed.skippedElementIds ?? []),
    };
  } catch {
    return emptyState();
  }
}

function saveState(sessionId: string, state: WorkoutLocalState): void {
  try {
    const serialized: SerializedState = {
      addedExercises: state.addedExercises,
      replacements: Array.from(state.replacements.entries()),
      skippedElementIds: Array.from(state.skippedElementIds),
    };
    sessionStorage.setItem(getStorageKey(sessionId), JSON.stringify(serialized));
  } catch {
    // sessionStorage may be full or unavailable — silently ignore
  }
}

function emptyState(): WorkoutLocalState {
  return {
    addedExercises: [],
    replacements: new Map(),
    skippedElementIds: new Set(),
  };
}

/** Remove persisted workout state for a session (call on complete/discard). */
export function clearWorkoutLocalState(sessionId: string): void {
  try {
    sessionStorage.removeItem(getStorageKey(sessionId));
  } catch {
    // ignore
  }
}

// ── Hook ─────────────────────────────────────────────────────

export function useWorkoutLocalState(sessionId: null | string) {
  // Load once on init, not 3x
  const [initial] = useState<WorkoutLocalState>(() => (sessionId ? loadState(sessionId) : emptyState()));

  const [skippedElementIds, setSkippedElementIdsRaw] = useState<Set<string>>(() => initial.skippedElementIds);
  const [replacements, setReplacementsRaw] = useState<Map<string, Replacement>>(() => initial.replacements);
  const [addedExercises, setAddedExercisesRaw] = useState<AddedExercise[]>(() => initial.addedExercises);

  // Use ref to always have fresh values in persist — avoids stale closure problem.
  // Synced via useEffect (not during render) to satisfy React Compiler rules.
  const stateRef = useRef<WorkoutLocalState>({addedExercises, replacements, skippedElementIds});
  useEffect(() => {
    stateRef.current = {addedExercises, replacements, skippedElementIds};
  }, [addedExercises, replacements, skippedElementIds]);

  const persist = useCallback(() => {
    if (!sessionId) return;
    saveState(sessionId, stateRef.current);
  }, [sessionId]);

  const setSkippedElementIds = useCallback(
    (updater: (prev: Set<string>) => Set<string>) => {
      setSkippedElementIdsRaw((prev) => {
        const next = updater(prev);
        // Update ref synchronously so persist reads fresh value
        stateRef.current = {...stateRef.current, skippedElementIds: next};
        persist();
        return next;
      });
    },
    [persist],
  );

  const setReplacements = useCallback(
    (updater: (prev: Map<string, Replacement>) => Map<string, Replacement>) => {
      setReplacementsRaw((prev) => {
        const next = updater(prev);
        stateRef.current = {...stateRef.current, replacements: next};
        persist();
        return next;
      });
    },
    [persist],
  );

  const setAddedExercises = useCallback(
    (updater: (prev: AddedExercise[]) => AddedExercise[]) => {
      setAddedExercisesRaw((prev) => {
        const next = updater(prev);
        stateRef.current = {...stateRef.current, addedExercises: next};
        persist();
        return next;
      });
    },
    [persist],
  );

  return {
    addedExercises,
    replacements,
    setAddedExercises,
    setReplacements,
    setSkippedElementIds,
    skippedElementIds,
  };
}
