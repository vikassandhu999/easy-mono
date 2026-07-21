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
import {
  Button,
  Disclosure,
  Input,
  Label,
  Popover,
  TextArea,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@heroui/react';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import {useCallback, useEffect, useRef, useState} from 'react';
import {toastMutationError} from '@/@components/mutation-toast';
import {useIsDesktop} from '@/@hooks/use-is-desktop';
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

// RECIPES.md R3 — segmented control. HeroUI signals selection with
// `data-selected="true"`; the `selected:` Tailwind prefix is a no-op here, and
// ToggleButton paints a grey fill at rest unless bg-transparent is explicit.
const SEGMENT_GROUP_CLASS = 'flex w-full gap-0.5 rounded-control border border-border bg-surface p-0.5';
const SEGMENT_BUTTON_CLASS =
  'min-h-11 flex-1 rounded-chip border-0 bg-transparent px-3 py-2 text-pill font-medium text-muted ' +
  'data-[selected=true]:bg-ink data-[selected=true]:font-semibold data-[selected=true]:text-ink-foreground';

// Unit chips (kg/lbs/bw, m/km/mi) — GAPS #7: also a ToggleButtonGroup.
const UNIT_BUTTON_CLASS =
  'min-h-9 rounded-chip border border-border bg-transparent px-2 text-chip font-medium text-muted ' +
  'data-[selected=true]:border-accent data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent';

// min-w-0 is load-bearing: TextField is w-full, so without it the first field
// claims its intrinsic width and pushes the rest out of the popover.
const FIELD_BOX_CLASS = 'min-w-0 flex-1 rounded-control border border-border bg-surface px-2 pt-1.5 pb-2 text-center';
const FIELD_LABEL_CLASS = 'mb-1 block text-chip uppercase tracking-wider text-muted';
const FIELD_INPUT_CLASS =
  'h-auto border-0 bg-transparent px-0 text-center text-lg font-semibold text-foreground shadow-none';

// The editor only offers m/km/mi; a stored 'none' (or null) shows as meters,
// matching the SetRow summary which renders none→'m'.
function normalizeDistanceUnit(unit: string | null | undefined): DistanceUnit {
  return unit === 'km' || unit === 'miles' ? unit : 'meters';
}

// The sheet's edit buffer: the planned set as strings, keyed like the API set
// so a field's draft patch and its save patch share names.
type SetDraft = {
  set_type: SetType;
  reps: string;
  load_value: string;
  load_unit: LoadUnit;
  rpe: string;
  duration_seconds: string;
  distance_value: string;
  distance_unit: DistanceUnit;
  rest_seconds: string;
  notes: string;
};

function draftFromSet(s: TrainingPlanPlannedSet | undefined): SetDraft {
  return {
    set_type: s?.set_type ?? 'working',
    reps: s?.reps ?? '',
    load_value: s?.load_value ?? '',
    load_unit: (s?.load_unit as LoadUnit | null) ?? 'kg',
    rpe: s?.rpe == null ? '' : String(s.rpe),
    duration_seconds: s?.duration_seconds == null ? '' : String(s.duration_seconds),
    distance_value: s?.distance_value ?? '',
    distance_unit: normalizeDistanceUnit(s?.distance_unit),
    rest_seconds: s?.rest_seconds == null ? '' : String(s.rest_seconds),
    notes: s?.notes ?? '',
  };
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

  const [draft, setDraft] = useState<SetDraft>(() => draftFromSet(currentSet));
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Re-seed the draft only when the set being edited actually changes (Prev/Next).
  // NOT on every workoutExercise identity change: our own optimistic saves rewrite
  // that object, and re-running the reset would clobber in-progress field edits
  // (e.g. a not-yet-valid RPE the coach is still typing).
  const syncedSetIndexRef = useRef(setIndex);
  useEffect(() => {
    if (syncedSetIndexRef.current === setIndex) {
      return;
    }
    syncedSetIndexRef.current = setIndex;
    const s = workoutExercise.planned_sets[setIndex];
    if (s) {
      setDraft(draftFromSet(s));
    }
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
      } catch (e) {
        cachePatch.undo();
        toastMutationError(e, "Couldn't save set");
      }
    },
    [workoutExercise, setIndex, updateElement, dispatch, planId],
  );

  const scheduleSave = useCallback(
    (patch: Partial<TrainingPlanPlannedSet>) => {
      // Accumulate patches within the debounce window: a second field edited
      // before the timer fires must merge in, not replace, or its value is lost
      // when executeSave rebuilds the set from the cached base + patch.
      pendingPatchRef.current = {...(pendingPatchRef.current ?? {}), ...patch};
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(async () => {
        saveTimerRef.current = null;
        const merged = pendingPatchRef.current ?? patch;
        pendingPatchRef.current = null;
        await executeSave(merged);
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

  // Flush on UNMOUNT ONLY, via a ref: flushPendingSave's identity changes after
  // every save (executeSave closes over workoutExercise, which our own cache
  // writes rewrite), so depending on it would fire the cleanup mid-session and
  // defeat the debounce (same bug amount-sheet fixed with flushRef).
  const flushRef = useRef(flushPendingSave);
  flushRef.current = flushPendingSave;
  useEffect(() => {
    return () => {
      flushRef.current().catch(() => undefined);
    };
  }, []);

  // Every field edit: buffer the keystroke, autosave when it's a saveable value.
  const update = (patch: Partial<SetDraft>, save?: Partial<TrainingPlanPlannedSet>) => {
    setDraft((d) => ({...d, ...patch}));
    if (save) {
      scheduleSave(save);
    }
  };

  // Unparseable text must not save null — that wipes the stored value.
  const intPatch = (
    key: 'duration_seconds' | 'rest_seconds',
    v: string,
  ): Partial<TrainingPlanPlannedSet> | undefined => {
    if (v === '') {
      return {[key]: null};
    }
    const num = Number.parseInt(v, 10);
    return Number.isNaN(num) ? undefined : {[key]: num};
  };

  // RPE is bounded 1–10 by the API contract — don't autosave a value the
  // server would 422 (which would optimistically write then silently roll back).
  const rpePatch = (v: string): Partial<TrainingPlanPlannedSet> | undefined => {
    if (v === '') {
      return {rpe: null};
    }
    const num = Number.parseFloat(v);
    return Number.isNaN(num) || num < 1 || num > 10 ? undefined : {rpe: num};
  };

  const hasPrev = setIndex > 0;
  const hasNext = setIndex < workoutExercise.planned_sets.length - 1;

  return (
    <div className="w-full">
      {/* Header: exercise + Done on top, then a "Set N of M" nav row.
          Prev/Next move between sets without closing (spec — replaces swipe). */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-sm font-semibold text-foreground">{exerciseName}</span>
          <Button
            className="min-h-11 shrink-0 px-2 text-sm font-semibold text-accent"
            onPress={() => {
              flushPendingSave()
                .then(onClose)
                .catch(() => undefined);
            }}
            variant="ghost"
          >
            Done
          </Button>
        </div>

        <div className="mt-1.5 flex items-center justify-center gap-4">
          <Button
            aria-label="Previous set"
            className="size-11 min-w-11 text-muted"
            isDisabled={!hasPrev}
            isIconOnly
            onPress={() => {
              flushPendingSave().catch(() => undefined);
              onPrev?.();
            }}
            variant="ghost"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Typography
            color="muted"
            type="body-xs"
            weight="medium"
          >
            Set {setIndex + 1} of {workoutExercise.planned_sets.length}
          </Typography>
          <Button
            aria-label="Next set"
            className="size-11 min-w-11 text-muted"
            isDisabled={!hasNext}
            isIconOnly
            onPress={() => {
              flushPendingSave().catch(() => undefined);
              onNext?.();
            }}
            variant="ghost"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="px-4 pb-4">
        {/* set_type segmented control */}
        <ToggleButtonGroup
          aria-label="Set type"
          className={`${SEGMENT_GROUP_CLASS} mb-3`}
          onSelectionChange={(keys) => {
            const next = [...keys][0] as SetType | undefined;
            if (next) {
              update({set_type: next}, {set_type: next});
            }
          }}
          selectedKeys={[draft.set_type]}
          selectionMode="single"
        >
          {SET_TYPES.map(({value, label}) => (
            <ToggleButton
              className={SEGMENT_BUTTON_CLASS}
              id={value}
              key={value}
            >
              {label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        {/* tracking_type-driven numeric fields */}
        <div className="mb-3 flex gap-2">
          {fields.showReps ? (
            <TextField
              className={FIELD_BOX_CLASS}
              onChange={(v) => update({reps: v}, {reps: v || null})}
              value={draft.reps}
            >
              <Label className={FIELD_LABEL_CLASS}>Reps</Label>
              <Input
                className={FIELD_INPUT_CLASS}
                inputMode="numeric"
                placeholder="—"
              />
            </TextField>
          ) : null}

          {fields.showLoad ? (
            <div className={FIELD_BOX_CLASS}>
              <TextField
                onChange={(v) => update({load_value: v}, {load_value: v || null})}
                value={draft.load_value}
              >
                <Label className={FIELD_LABEL_CLASS}>Weight</Label>
                <Input
                  className={FIELD_INPUT_CLASS}
                  inputMode="decimal"
                  placeholder="—"
                />
              </TextField>
              <ToggleButtonGroup
                aria-label="Weight unit"
                className="mt-1.5 flex justify-center gap-1"
                onSelectionChange={(keys) => {
                  const next = [...keys][0] as LoadUnit | undefined;
                  if (next) {
                    update({load_unit: next}, {load_unit: next});
                  }
                }}
                selectedKeys={[draft.load_unit]}
                selectionMode="single"
              >
                {LOAD_UNITS.map(({value, label}) => (
                  <ToggleButton
                    className={UNIT_BUTTON_CLASS}
                    id={value}
                    key={value}
                  >
                    {label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </div>
          ) : null}

          {fields.showRpe ? (
            <TextField
              className={FIELD_BOX_CLASS}
              onChange={(v) => update({rpe: v}, rpePatch(v))}
              value={draft.rpe}
            >
              <Label className={FIELD_LABEL_CLASS}>RPE</Label>
              <Input
                className={FIELD_INPUT_CLASS}
                inputMode="decimal"
                placeholder="—"
              />
            </TextField>
          ) : null}

          {fields.showDuration ? (
            <TextField
              className={FIELD_BOX_CLASS}
              onChange={(v) => update({duration_seconds: v}, intPatch('duration_seconds', v))}
              value={draft.duration_seconds}
            >
              <Label className={FIELD_LABEL_CLASS}>Secs</Label>
              <Input
                className={FIELD_INPUT_CLASS}
                inputMode="numeric"
                placeholder="—"
              />
            </TextField>
          ) : null}

          {fields.showDistance ? (
            <div className={FIELD_BOX_CLASS}>
              <TextField
                onChange={(v) => update({distance_value: v}, {distance_value: v || null})}
                value={draft.distance_value}
              >
                <Label className={FIELD_LABEL_CLASS}>Dist</Label>
                <Input
                  className={FIELD_INPUT_CLASS}
                  inputMode="decimal"
                  placeholder="—"
                />
              </TextField>
              <ToggleButtonGroup
                aria-label="Distance unit"
                className="mt-1.5 flex justify-center gap-1"
                onSelectionChange={(keys) => {
                  const next = [...keys][0] as DistanceUnit | undefined;
                  if (next) {
                    update({distance_unit: next}, {distance_unit: next});
                  }
                }}
                selectedKeys={[draft.distance_unit]}
                selectionMode="single"
              >
                {DISTANCE_UNITS.map(({value, label}) => (
                  <ToggleButton
                    className={UNIT_BUTTON_CLASS}
                    id={value}
                    key={value}
                  >
                    {label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </div>
          ) : null}
        </div>

        {/* Advanced: rest timer + notes */}
        <Disclosure
          isExpanded={showAdvanced}
          onExpandedChange={setShowAdvanced}
        >
          <Disclosure.Heading>
            <Disclosure.Trigger className="flex min-h-11 items-center gap-1 text-sm font-medium text-accent">
              <Disclosure.Indicator />
              Rest timer and notes
            </Disclosure.Trigger>
          </Disclosure.Heading>
          <Disclosure.Content>
            <Disclosure.Body className="flex flex-col gap-2 px-0 pb-0">
              <TextField
                onChange={(v) => update({rest_seconds: v}, intPatch('rest_seconds', v))}
                value={draft.rest_seconds}
              >
                <Label className={FIELD_LABEL_CLASS}>Rest (seconds)</Label>
                <Input
                  inputMode="numeric"
                  placeholder="90"
                />
              </TextField>
              <TextField
                onChange={(v) => update({notes: v}, {notes: v || null})}
                value={draft.notes}
              >
                <Label className={FIELD_LABEL_CLASS}>Notes</Label>
                <TextArea
                  placeholder="Tempo, cues, %1RM targets…"
                  rows={2}
                />
              </TextField>
            </Disclosure.Body>
          </Disclosure.Content>
        </Disclosure>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SetSheet — routes mobile → KeyboardSheet, desktop → HeroUI Popover
// ---------------------------------------------------------------------------

export function SetSheet({workoutExercise, setIndex, planId, open, onClose, onPrev, onNext, anchorEl}: SetSheetProps) {
  const isDesktop = useIsDesktop();

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
          className="w-104 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-surface p-0 shadow-xl"
          triggerRef={triggerRef}
        >
          <Popover.Dialog className="max-h-[70vh] overflow-y-auto px-4 py-3 outline-none">
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
