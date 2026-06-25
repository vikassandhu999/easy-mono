/**
 * SetSheet — keyboard-docked set value editor.
 *
 * Mobile: docked above the keyboard via KeyboardSheet.
 * Desktop (pointer: fine / ≥ md): a HeroUI Popover anchored to the set row.
 *
 * Autosave: debounced 600ms after the last field change. Rebuilds the
 * planned_sets array immutably and PATCHes the workout-element. On success,
 * updates the listWorkouts cache directly so set rows reflect the change
 * immediately (optimistic update pattern).
 */
import {Popover, toast} from '@heroui/react';
import {useCallback, useEffect, useRef, useState} from 'react';
import type {TrainingPlanPlannedSet, TrainingPlanWorkoutExercise} from '@/api/generated';
import {coachApi, useUpdateWorkoutElementMutation} from '@/api/generated';
import {KeyboardSheet} from '@/builder-kit/keyboard-sheet';
import {useAppDispatch} from '@/store';

import {fieldsForTrackingType} from './tracking-fields';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LoadUnit = 'kg' | 'lbs' | 'bodyweight' | 'none';
type DistanceUnit = 'meters' | 'km' | 'miles' | 'none';
type SetType = 'working' | 'warmup' | 'dropset';

export interface SetSheetProps {
  workoutExercise: TrainingPlanWorkoutExercise;
  setIndex: number;
  planId: string;
  open: boolean;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  /**
   * Desktop only: the element the popover anchors to.
   * If absent on desktop the sheet still renders as a bottom sheet.
   */
  anchorEl?: HTMLElement | null;
}

// tracking_type → shown fields lives in ./tracking-fields (shared with SetRow).

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SET_TYPES: {value: SetType; label: string}[] = [
  {value: 'working', label: 'Working'},
  {value: 'warmup', label: 'Warm-up'},
  {value: 'dropset', label: 'Drop'},
];

const LOAD_UNITS: {value: LoadUnit; label: string}[] = [
  {value: 'kg', label: 'kg'},
  {value: 'lbs', label: 'lbs'},
  {value: 'bodyweight', label: 'bw'},
];

const DISTANCE_UNITS: {value: DistanceUnit; label: string}[] = [
  {value: 'meters', label: 'm'},
  {value: 'km', label: 'km'},
  {value: 'miles', label: 'mi'},
];

// The editor only offers m/km/mi; a stored 'none' (or null) shows as meters,
// matching the SetRow summary which renders none→'m'.
function normalizeDistanceUnit(unit: string | null | undefined): DistanceUnit {
  return unit === 'km' || unit === 'miles' ? unit : 'meters';
}

// ---------------------------------------------------------------------------
// SetSheetContent — editor UI shared between mobile sheet and desktop popover
// ---------------------------------------------------------------------------

interface SetSheetContentProps {
  workoutExercise: TrainingPlanWorkoutExercise;
  setIndex: number;
  planId: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export function SetSheetContent({workoutExercise, setIndex, planId, onClose, onPrev, onNext}: SetSheetContentProps) {
  const dispatch = useAppDispatch();
  const [updateElement] = useUpdateWorkoutElementMutation();

  const currentSet = workoutExercise.planned_sets[setIndex];
  const exerciseName = workoutExercise.exercise?.name ?? 'Exercise';

  const trackingType = workoutExercise.exercise?.tracking_type ?? null;

  const fields = fieldsForTrackingType(trackingType);

  const [setType, setSetType] = useState<SetType>(currentSet?.set_type ?? 'working');
  const [reps, setReps] = useState<string>(currentSet?.reps ?? '');
  const [loadValue, setLoadValue] = useState<string>(currentSet?.load_value ?? '');
  const [loadUnit, setLoadUnit] = useState<LoadUnit>((currentSet?.load_unit as LoadUnit | null) ?? 'kg');
  const [rpe, setRpe] = useState<string>(
    currentSet?.rpe !== null && currentSet?.rpe !== undefined ? String(currentSet.rpe) : '',
  );
  const [durationSeconds, setDurationSeconds] = useState<string>(
    currentSet?.duration_seconds !== null && currentSet?.duration_seconds !== undefined
      ? String(currentSet.duration_seconds)
      : '',
  );
  const [distanceValue, setDistanceValue] = useState<string>(currentSet?.distance_value ?? '');
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>(normalizeDistanceUnit(currentSet?.distance_unit));
  const [restSeconds, setRestSeconds] = useState<string>(
    currentSet?.rest_seconds !== null && currentSet?.rest_seconds !== undefined ? String(currentSet.rest_seconds) : '',
  );
  const [notes, setNotes] = useState<string>(currentSet?.notes ?? '');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Sync local state when navigating Prev/Next
  useEffect(() => {
    const s = workoutExercise.planned_sets[setIndex];
    if (!s) {
      return;
    }
    setSetType(s.set_type ?? 'working');
    setReps(s.reps ?? '');
    setLoadValue(s.load_value ?? '');
    setLoadUnit((s.load_unit as LoadUnit | null) ?? 'kg');
    setRpe(s.rpe !== null && s.rpe !== undefined ? String(s.rpe) : '');
    setDurationSeconds(
      s.duration_seconds !== null && s.duration_seconds !== undefined ? String(s.duration_seconds) : '',
    );
    setDistanceValue(s.distance_value ?? '');
    setDistanceUnit(normalizeDistanceUnit(s.distance_unit));
    setRestSeconds(s.rest_seconds !== null && s.rest_seconds !== undefined ? String(s.rest_seconds) : '');
    setNotes(s.notes ?? '');
  }, [setIndex, workoutExercise]);

  // Debounced save — optimistic: write cache first, then PATCH, rollback on failure.
  // pendingSaveRef holds the latest patch so flush-on-close can fire it immediately.
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPatchRef = useRef<Partial<TrainingPlanPlannedSet> | null>(null);

  const executeSave = useCallback(
    async (patch: Partial<TrainingPlanPlannedSet>) => {
      const updatedSet: TrainingPlanPlannedSet = {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        ...workoutExercise.planned_sets[setIndex]!,
        ...patch,
      };
      const updatedSets = workoutExercise.planned_sets.map((s, i) => (i === setIndex ? updatedSet : s));

      // Optimistic write
      const cachePatch = dispatch(
        coachApi.util.updateQueryData('listWorkouts', {planId, limit: 100}, (draft) => {
          for (const workout of draft.data) {
            const idx = workout.workout_elements.findIndex((e) => e.id === workoutExercise.id);
            if (idx !== -1) {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              workout.workout_elements[idx] = {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                ...workout.workout_elements[idx]!,
                planned_sets: updatedSets,
              };
              break;
            }
          }
        }),
      );

      try {
        await updateElement({
          id: workoutExercise.id,
          trainingWorkoutExerciseRequest: {planned_sets: updatedSets},
        }).unwrap();
      } catch {
        cachePatch.undo();
        toast.danger("Couldn't save set");
      }
    },
    [workoutExercise, setIndex, updateElement, dispatch, planId],
  );

  const scheduleSave = useCallback(
    (patch: Partial<TrainingPlanPlannedSet>) => {
      pendingPatchRef.current = patch;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(async () => {
        saveTimerRef.current = null;
        pendingPatchRef.current = null;
        await executeSave(patch);
      }, 600);
    },
    [executeSave],
  );

  // Flush any pending debounced save on close/unmount — prevents last edit being dropped
  const flushPendingSave = useCallback(async () => {
    if (saveTimerRef.current !== null && pendingPatchRef.current !== null) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
      const patch = pendingPatchRef.current;
      pendingPatchRef.current = null;
      await executeSave(patch);
    }
  }, [executeSave]);

  useEffect(() => {
    return () => {
      // Fire on unmount — don't just discard
      flushPendingSave().catch(() => undefined);
    };
  }, [flushPendingSave]);

  const handleSetType = (v: SetType) => {
    setSetType(v);
    scheduleSave({set_type: v});
  };
  const handleReps = (v: string) => {
    setReps(v);
    scheduleSave({reps: v || null});
  };
  const handleLoadValue = (v: string) => {
    setLoadValue(v);
    scheduleSave({load_value: v || null});
  };
  const handleLoadUnit = (v: LoadUnit) => {
    setLoadUnit(v);
    scheduleSave({load_unit: v});
  };
  const handleRpe = (v: string) => {
    setRpe(v);
    if (v === '') {
      scheduleSave({rpe: null});
      return;
    }
    // RPE is bounded 1–10 by the API contract — don't autosave a value the
    // server would 422 (which would optimistically write then silently roll back).
    const num = Number.parseFloat(v);
    if (Number.isNaN(num) || num < 1 || num > 10) {
      return;
    }
    scheduleSave({rpe: num});
  };
  const handleDuration = (v: string) => {
    setDurationSeconds(v);
    const num = Number.parseInt(v, 10);
    scheduleSave({duration_seconds: Number.isNaN(num) ? null : num});
  };
  const handleDistanceValue = (v: string) => {
    setDistanceValue(v);
    scheduleSave({distance_value: v || null});
  };
  const handleDistanceUnit = (v: DistanceUnit) => {
    setDistanceUnit(v);
    scheduleSave({distance_unit: v});
  };
  const handleRestSeconds = (v: string) => {
    setRestSeconds(v);
    const num = Number.parseInt(v, 10);
    scheduleSave({rest_seconds: Number.isNaN(num) ? null : num});
  };
  const handleNotes = (v: string) => {
    setNotes(v);
    scheduleSave({notes: v || null});
  };

  // An exercise must keep at least one set (planned_sets minItems: 1); to clear the
  // last set you remove the exercise instead.
  const canRemoveSet = workoutExercise.planned_sets.length > 1;

  const handleRemoveSet = useCallback(async () => {
    // Cancel any pending autosave — this set is being removed.
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
      pendingPatchRef.current = null;
    }
    const updatedSets = workoutExercise.planned_sets.filter((_, i) => i !== setIndex);
    const cachePatch = dispatch(
      coachApi.util.updateQueryData('listWorkouts', {planId, limit: 100}, (draft) => {
        for (const workout of draft.data) {
          const idx = workout.workout_elements.findIndex((e) => e.id === workoutExercise.id);
          if (idx !== -1) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            workout.workout_elements[idx] = {...workout.workout_elements[idx]!, planned_sets: updatedSets};
            break;
          }
        }
      }),
    );
    onClose();
    try {
      await updateElement({
        id: workoutExercise.id,
        trainingWorkoutExerciseRequest: {planned_sets: updatedSets},
      }).unwrap();
    } catch {
      cachePatch.undo();
      toast.danger("Couldn't remove set");
    }
  }, [workoutExercise, setIndex, updateElement, dispatch, planId, onClose]);

  const hasPrev = setIndex > 0;
  const hasNext = setIndex < workoutExercise.planned_sets.length - 1;

  return (
    <div className="w-full">
      {/* Header row: Prev · title · Next on left, Done on right */}
      <div className="flex items-center justify-between px-4 pb-2 pt-3">
        <div className="flex items-center gap-1.5">
          {onPrev !== undefined ? (
            <button
              aria-label="Previous set"
              className={[
                'rounded border px-2 py-0.5 text-xs transition-colors',
                hasPrev
                  ? 'border-border text-muted hover:border-default-hover hover:text-foreground'
                  : 'cursor-default border-transparent text-muted',
              ].join(' ')}
              disabled={!hasPrev}
              onClick={hasPrev ? onPrev : undefined}
              type="button"
            >
              ‹ Prev
            </button>
          ) : null}
          <span className="text-sm font-semibold text-foreground">
            {exerciseName} · Set {setIndex + 1}
          </span>
          {onNext !== undefined ? (
            <button
              aria-label="Next set"
              className={[
                'rounded border px-2 py-0.5 text-xs transition-colors',
                hasNext
                  ? 'border-border text-muted hover:border-default-hover hover:text-foreground'
                  : 'cursor-default border-transparent text-muted',
              ].join(' ')}
              disabled={!hasNext}
              onClick={hasNext ? onNext : undefined}
              type="button"
            >
              Next ›
            </button>
          ) : null}
        </div>
        <button
          className="text-sm font-semibold text-accent hover:text-accent/80 transition-colors"
          onClick={() => {
            flushPendingSave()
              .then(onClose)
              .catch(() => undefined);
          }}
          type="button"
        >
          Done
        </button>
      </div>

      <div className="px-4 pb-4">
        {/* set_type segmented control */}
        <div className="mb-3 flex gap-1.5">
          {SET_TYPES.map(({value, label}) => (
            <button
              className={[
                'flex-1 rounded-lg border px-2 py-1.5 text-center text-xs font-medium transition-colors',
                setType === value
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-muted hover:border-default-hover hover:text-foreground',
              ].join(' ')}
              key={value}
              onClick={() => handleSetType(value)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        {/* tracking_type-driven numeric fields */}
        <div className="mb-3 flex gap-2">
          {fields.showReps ? (
            <div className="flex-1 rounded-lg border border-border bg-background px-2 pb-2 pt-1.5 text-center">
              <div className="mb-1 text-[9px] uppercase tracking-wider text-muted">Reps</div>
              <input
                className="w-full bg-transparent text-center text-lg font-semibold text-foreground outline-none"
                inputMode="text"
                onChange={(e) => handleReps(e.target.value)}
                placeholder="—"
                type="text"
                value={reps}
              />
            </div>
          ) : null}

          {fields.showLoad ? (
            <div className="flex-1 rounded-lg border border-accent/40 bg-accent/5 px-2 pb-2 pt-1.5 text-center">
              <div className="mb-1 text-[9px] uppercase tracking-wider text-muted">Weight</div>
              <input
                className="w-full bg-transparent text-center text-lg font-semibold text-foreground outline-none"
                inputMode="decimal"
                onChange={(e) => handleLoadValue(e.target.value)}
                placeholder="—"
                type="text"
                value={loadValue}
              />
              <div className="mt-1.5 flex justify-center gap-1">
                {LOAD_UNITS.map(({value, label}) => (
                  <button
                    className={[
                      'rounded border px-1.5 py-0.5 text-[9px] transition-colors',
                      loadUnit === value
                        ? 'border-accent text-accent'
                        : 'border-border text-muted hover:text-foreground',
                    ].join(' ')}
                    key={value}
                    onClick={() => handleLoadUnit(value)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {fields.showRpe ? (
            <div className="flex-1 rounded-lg border border-border bg-background px-2 pb-2 pt-1.5 text-center">
              <div className="mb-1 text-[9px] uppercase tracking-wider text-muted">RPE</div>
              <input
                className="w-full bg-transparent text-center text-lg font-semibold text-foreground outline-none"
                inputMode="decimal"
                onChange={(e) => handleRpe(e.target.value)}
                placeholder="—"
                type="text"
                value={rpe}
              />
            </div>
          ) : null}

          {fields.showDuration ? (
            <div className="flex-1 rounded-lg border border-border bg-background px-2 pb-2 pt-1.5 text-center">
              <div className="mb-1 text-[9px] uppercase tracking-wider text-muted">Secs</div>
              <input
                className="w-full bg-transparent text-center text-lg font-semibold text-foreground outline-none"
                inputMode="numeric"
                onChange={(e) => handleDuration(e.target.value)}
                placeholder="—"
                type="text"
                value={durationSeconds}
              />
            </div>
          ) : null}

          {fields.showDistance ? (
            <div className="flex-1 rounded-lg border border-border bg-background px-2 pb-2 pt-1.5 text-center">
              <div className="mb-1 text-[9px] uppercase tracking-wider text-muted">Dist</div>
              <input
                className="w-full bg-transparent text-center text-lg font-semibold text-foreground outline-none"
                inputMode="decimal"
                onChange={(e) => handleDistanceValue(e.target.value)}
                placeholder="—"
                type="text"
                value={distanceValue}
              />
              <div className="mt-1.5 flex justify-center gap-1">
                {DISTANCE_UNITS.map(({value, label}) => (
                  <button
                    className={[
                      'rounded border px-1.5 py-0.5 text-[9px] transition-colors',
                      distanceUnit === value
                        ? 'border-accent text-accent'
                        : 'border-border text-muted hover:text-foreground',
                    ].join(' ')}
                    key={value}
                    onClick={() => handleDistanceUnit(value)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Advanced disclosure: rest timer + notes */}
        <button
          className="mb-2 text-xs text-accent hover:text-accent/80 transition-colors"
          onClick={() => setShowAdvanced((v) => !v)}
          type="button"
        >
          {showAdvanced ? '− rest timer · notes' : '+ rest timer · notes'}
        </button>

        {showAdvanced ? (
          <div className="space-y-2">
            <div>
              <label
                className="mb-1 block text-[10px] uppercase tracking-wider text-muted"
                htmlFor="rest-seconds"
              >
                Rest (seconds)
              </label>
              <input
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                id="rest-seconds"
                inputMode="numeric"
                onChange={(e) => handleRestSeconds(e.target.value)}
                placeholder="90"
                type="text"
                value={restSeconds}
              />
            </div>
            <div>
              <label
                className="mb-1 block text-[10px] uppercase tracking-wider text-muted"
                htmlFor="set-notes"
              >
                Notes
              </label>
              <textarea
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                id="set-notes"
                onChange={(e) => handleNotes(e.target.value)}
                placeholder="Tempo, cues, %1RM targets…"
                rows={2}
                value={notes}
              />
            </div>
          </div>
        ) : null}

        {canRemoveSet ? (
          <button
            className="mt-3 w-full text-center text-xs font-medium text-danger transition-colors hover:text-danger/80"
            onClick={() => {
              handleRemoveSet().catch(() => undefined);
            }}
            type="button"
          >
            Remove set
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SetSheet — routes mobile → KeyboardSheet, desktop → HeroUI Popover
// ---------------------------------------------------------------------------

export function SetSheet({workoutExercise, setIndex, planId, open, onClose, onPrev, onNext, anchorEl}: SetSheetProps) {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia('(pointer: fine) and (min-width: 768px)').matches;
  });

  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine) and (min-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Stable ref object pointing at the row element the popover anchors to.
  // react-aria's Popover (Popover.Content) reads `triggerRef`, not the root
  // DialogTrigger — so the anchor must live on Content.
  const triggerRef = useRef<HTMLElement | null>(null);
  triggerRef.current = anchorEl ?? null;

  const contentProps: SetSheetContentProps = {
    workoutExercise,
    setIndex,
    planId,
    onClose,
    onPrev,
    onNext,
  };

  if (isDesktop && anchorEl) {
    return (
      <Popover
        isOpen={open}
        onOpenChange={(v) => {
          if (!v) {
            onClose();
          }
        }}
      >
        <Popover.Content
          className="w-80 rounded-xl border border-border bg-surface p-0 shadow-xl"
          triggerRef={triggerRef}
        >
          <Popover.Dialog className="outline-none">
            <SetSheetContent {...contentProps} />
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
    );
  }

  return (
    <KeyboardSheet
      onClose={onClose}
      open={open}
    >
      <SetSheetContent {...contentProps} />
    </KeyboardSheet>
  );
}
