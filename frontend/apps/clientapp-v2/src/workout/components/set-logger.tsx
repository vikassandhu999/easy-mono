import {Button, Input} from '@heroui/react';
import {Check, Circle, Pencil, Plus, SkipForward, Trash2} from 'lucide-react';
import {useCallback, useState} from 'react';

import type {ClientPerformedSet, PlannedSnapshotSet} from '@/api/workoutSessions';
import {
  useDeletePerformedSetMutation,
  useLogPerformedSetMutation,
  useUpdatePerformedSetMutation,
} from '@/api/workoutSessions';
import RestTimer from '@/workout/components/rest-timer';
import type {WorkoutExercise} from '@/workout/components/workout-types';

const LOAD_UNITS = ['kg', 'lbs', 'bodyweight'] as const;
type LoadUnitOption = (typeof LOAD_UNITS)[number];

const LOAD_UNIT_LABELS: Record<LoadUnitOption, string> = {
  bodyweight: 'BW',
  kg: 'kg',
  lbs: 'lbs',
};

function nextLoadUnit(current: LoadUnitOption): LoadUnitOption {
  const idx = LOAD_UNITS.indexOf(current);
  return LOAD_UNITS[(idx + 1) % LOAD_UNITS.length] ?? 'kg';
}

function toLoadUnitOption(unit: null | string): LoadUnitOption {
  if (unit === 'lbs') {
    return 'lbs';
  }
  if (unit === 'bodyweight') {
    return 'bodyweight';
  }
  return 'kg';
}

function parseLoadValue(value: string): null | number {
  if (!value.trim()) {
    return null;
  }
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

function formatLoad(value: null | string, unit: null | string): string {
  if (!value) {
    return '';
  }
  if (unit === 'bodyweight') {
    return 'BW';
  }
  if (!unit || unit === 'none') {
    return String(value);
  }
  return `${value} ${unit}`;
}

function formatPlannedTarget(planned: PlannedSnapshotSet | undefined): string {
  if (!planned) {
    return 'Plan: —';
  }
  const reps = planned.target_reps ? `${planned.target_reps}` : '—';
  const load = formatLoad(planned.load_value, planned.load_unit);
  return `Plan: ${reps}${load ? ` @ ${load}` : ''}`;
}

function formatNextSetSummary(planned: PlannedSnapshotSet | undefined, setIndex: number): null | string {
  if (!planned) {
    return null;
  }
  const reps = planned.target_reps ? `${planned.target_reps}` : '—';
  const load = formatLoad(planned.load_value, planned.load_unit);
  return `Set ${setIndex + 1} · ${reps}${load ? ` @ ${load}` : ''}`;
}

function formatDoneTarget(set: ClientPerformedSet): string {
  if (!set.completed) {
    return 'Done: skipped';
  }
  const reps = set.actual_reps ?? '—';
  const load = formatLoad(set.load_value, set.load_unit);
  return `Done: ${reps}${load ? ` @ ${load}` : ''}`;
}

function UnitToggle({onChange, value}: {onChange: (unit: LoadUnitOption) => void; value: LoadUnitOption}) {
  return (
    <Button
      isIconOnly
      onPress={() => onChange(nextLoadUnit(value))}
      size="sm"
      title="Change unit"
      variant="ghost"
    >
      {LOAD_UNIT_LABELS[value]}
    </Button>
  );
}

function LoggedSetCard({
  index,
  planned,
  sessionId,
  set,
}: {
  index: number;
  planned: PlannedSnapshotSet | undefined;
  sessionId: string;
  set: ClientPerformedSet;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editReps, setEditReps] = useState(set.actual_reps ?? '');
  const [editLoad, setEditLoad] = useState(set.load_value != null ? String(set.load_value) : '');
  const [editUnit, setEditUnit] = useState<LoadUnitOption>(toLoadUnitOption(set.load_unit));
  const [updateSet, {isLoading: isUpdating}] = useUpdatePerformedSetMutation();
  const [deleteSet, {isLoading: isDeleting}] = useDeletePerformedSetMutation();

  const handleSave = async () => {
    try {
      await updateSet({
        body: {
          actual_reps: editReps || null,
          load_unit: editUnit,
          load_value: parseLoadValue(editLoad),
        },
        id: set.id,
        sessionId,
      }).unwrap();
      setIsEditing(false);
    } catch {
      // Error handled by RTK Query
    }
  };

  const handleDelete = async () => {
    try {
      await deleteSet({id: set.id, sessionId}).unwrap();
    } catch {
      // Error handled by RTK Query
    }
  };

  const isBusy = isUpdating || isDeleting;

  if (isEditing) {
    return (
      <div className="rounded-lg border border-border bg-surface-secondary/40 p-3">
        <p className="text-xs font-medium text-muted">Set {index + 1}</p>
        <p className="mt-1 text-xs text-muted">{formatPlannedTarget(planned)}</p>

        <div className="mt-3 flex flex-wrap items-end gap-2">
          <Input
            className="w-20"
            inputMode="numeric"
            onChange={(e) => setEditReps(e.target.value)}
            placeholder="Reps"
            value={editReps}
          />
          <Input
            className="w-24"
            inputMode="decimal"
            onChange={(e) => setEditLoad(e.target.value)}
            placeholder="Load"
            value={editLoad}
          />
          <UnitToggle
            onChange={setEditUnit}
            value={editUnit}
          />
          <Button
            isDisabled={isDeleting}
            isPending={isUpdating}
            onPress={handleSave}
            size="sm"
            variant="ghost"
          >
            <Check size={14} />
            Save
          </Button>
          <Button
            isDisabled={isBusy}
            onPress={handleDelete}
            size="sm"
            variant="danger"
          >
            <Trash2 size={14} />
            Delete
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      className="h-auto w-full rounded-lg border border-border bg-surface-secondary/20 p-3 text-left"
      onPress={() => setIsEditing(true)}
      variant="ghost"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Set {index + 1}</p>
          <p className="mt-0.5 text-xs text-muted">{formatPlannedTarget(planned)}</p>
          <p className="mt-1 text-sm text-muted">{formatDoneTarget(set)}</p>
        </div>
        <div className="mt-1">
          {set.completed ? (
            <Check
              className="text-success"
              size={16}
            />
          ) : (
            <SkipForward
              className="text-muted"
              size={16}
            />
          )}
        </div>
      </div>
    </Button>
  );
}

function PendingSetCard({
  index,
  isLogging,
  onLog,
  onSkip,
  planned,
}: {
  index: number;
  isLogging: boolean;
  onLog: (reps: null | string, loadValue: null | number, loadUnit: null | string) => void;
  onSkip: () => void;
  planned: PlannedSnapshotSet | undefined;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [reps, setReps] = useState(planned?.target_reps ?? '');
  const [load, setLoad] = useState(planned?.load_value != null ? String(planned.load_value) : '');
  const [unit, setUnit] = useState<LoadUnitOption>(toLoadUnitOption(planned?.load_unit ?? null));

  const handleQuickLog = () => {
    onLog(planned?.target_reps ?? null, parseLoadValue(String(planned?.load_value ?? '')), planned?.load_unit ?? null);
  };

  const handleCustomLog = () => {
    onLog(reps || null, parseLoadValue(load), unit);
    setIsExpanded(false);
  };

  if (isExpanded) {
    return (
      <div className="rounded-lg border border-border bg-surface-secondary/40 p-3">
        <p className="text-sm font-medium">Set {index + 1}</p>
        <p className="mt-0.5 text-xs text-muted">{formatPlannedTarget(planned)}</p>

        <div className="mt-3 flex flex-wrap items-end gap-2">
          <Input
            className="w-20"
            inputMode="numeric"
            onChange={(e) => setReps(e.target.value)}
            placeholder="Reps"
            value={reps}
          />
          <Input
            className="w-24"
            inputMode="decimal"
            onChange={(e) => setLoad(e.target.value)}
            placeholder="Load"
            value={load}
          />
          <UnitToggle
            onChange={setUnit}
            value={unit}
          />
          <Button
            isPending={isLogging}
            onPress={handleCustomLog}
            size="sm"
            variant="ghost"
          >
            <Check size={14} />
            Log
          </Button>
          <Button
            isDisabled={isLogging}
            onPress={onSkip}
            size="sm"
            variant="ghost"
          >
            <SkipForward size={14} />
            Skip
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface-secondary/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Set {index + 1}</p>
          <p className="mt-0.5 text-xs text-muted">{formatPlannedTarget(planned)}</p>
          <p className="mt-1 text-sm text-muted">Done: —</p>
        </div>

        <div className="flex items-center gap-1">
          <Button
            isDisabled={isLogging}
            isIconOnly
            onPress={handleQuickLog}
            size="sm"
            title="Log with planned values"
            variant="ghost"
          >
            {isLogging ? (
              <div className="size-3 animate-spin rounded-full border-2 border-border border-t-transparent" />
            ) : (
              <Circle
                className="text-muted"
                size={16}
              />
            )}
          </Button>

          <Button
            isIconOnly
            onPress={() => setIsExpanded(true)}
            size="sm"
            title="Edit before logging"
            variant="ghost"
          >
            <Pencil size={14} />
          </Button>

          <Button
            isDisabled={isLogging}
            isIconOnly
            onPress={onSkip}
            size="sm"
            title="Skip this set"
            variant="ghost"
          >
            <SkipForward size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}

function AddSetCard({
  defaultUnit,
  isLogging,
  onLog,
}: {
  defaultUnit?: LoadUnitOption;
  isLogging: boolean;
  onLog: (reps: null | string, loadValue: null | number, loadUnit: null | string) => void;
}) {
  const [reps, setReps] = useState('');
  const [load, setLoad] = useState('');
  const [unit, setUnit] = useState<LoadUnitOption>(defaultUnit ?? 'kg');

  const handleLog = () => {
    onLog(reps || null, parseLoadValue(load), unit);
    setReps('');
    setLoad('');
  };

  return (
    <div className="rounded-lg border border-dashed border-border bg-surface-secondary/20 p-3">
      <p className="mb-2 text-xs font-medium text-muted">Add extra set</p>
      <div className="flex flex-wrap items-end gap-2">
        <Input
          className="w-20"
          inputMode="numeric"
          onChange={(e) => setReps(e.target.value)}
          placeholder="Reps"
          value={reps}
        />
        <Input
          className="w-24"
          inputMode="decimal"
          onChange={(e) => setLoad(e.target.value)}
          placeholder="Load"
          value={load}
        />
        <UnitToggle
          onChange={setUnit}
          value={unit}
        />
        <Button
          isDisabled={!reps}
          isPending={isLogging}
          onPress={handleLog}
          size="sm"
          variant="ghost"
        >
          <Plus size={14} />
          Log set
        </Button>
      </div>
    </div>
  );
}

export default function SetLogger({
  exercise,
  sessionId,
  totalSetsInSession,
}: {
  exercise: WorkoutExercise;
  sessionId: string;
  totalSetsInSession: number;
}) {
  const [logSet, {isLoading: isLogging}] = useLogPerformedSetMutation();
  const [restTimerState, setRestTimerState] = useState<null | {nextSetSummary: null | string; restSeconds: number}>(
    null,
  );

  const hasPlan = exercise.plannedSets.length > 0;
  const loggedCount = exercise.sets.length;
  const totalPlanned = exercise.plannedSets.length;

  const defaultUnit: LoadUnitOption = hasPlan
    ? toLoadUnitOption(exercise.plannedSets[0]?.load_unit ?? null)
    : toLoadUnitOption(exercise.sets[exercise.sets.length - 1]?.load_unit ?? null);

  const rowCount = hasPlan ? Math.max(totalPlanned, loggedCount) : loggedCount;

  const dismissRestTimer = useCallback(() => setRestTimerState(null), []);

  const handleLogSet = async (reps: null | string, loadValue: null | number, loadUnit: null | string) => {
    const position = totalSetsInSession;
    try {
      await logSet({
        actual_reps: reps,
        completed: true,
        exercise_id: exercise.exerciseId,
        load_unit: (loadUnit as 'bodyweight' | 'kg' | 'lbs' | 'none' | 'percent_1rm' | 'rpe') ?? undefined,
        load_value: loadValue,
        position,
        workout_element_id: exercise.workoutElementId,
        workout_session_id: sessionId,
      }).unwrap();

      const justLoggedPlannedSet = hasPlan ? exercise.plannedSets[loggedCount] : undefined;
      const rest = justLoggedPlannedSet?.rest_seconds;
      if (rest && rest > 0) {
        const nextPlannedSet = hasPlan ? exercise.plannedSets[loggedCount + 1] : undefined;
        setRestTimerState({
          nextSetSummary: formatNextSetSummary(nextPlannedSet, loggedCount + 1),
          restSeconds: rest,
        });
      }
    } catch {
      // Error handled by RTK Query
    }
  };

  const handleSkipSet = async () => {
    const position = totalSetsInSession;
    try {
      await logSet({
        actual_reps: null,
        completed: false,
        exercise_id: exercise.exerciseId,
        position,
        workout_element_id: exercise.workoutElementId,
        workout_session_id: sessionId,
      }).unwrap();
    } catch {
      // Error handled by RTK Query
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {restTimerState ? (
        <RestTimer
          nextSetSummary={restTimerState.nextSetSummary}
          onDone={dismissRestTimer}
          restSeconds={restTimerState.restSeconds}
        />
      ) : null}

      {Array.from({length: rowCount}, (_, idx) => {
        const loggedSet = exercise.sets[idx];
        const plannedSet = hasPlan ? exercise.plannedSets[idx] : undefined;

        if (loggedSet) {
          return (
            <LoggedSetCard
              index={idx}
              key={loggedSet.id}
              planned={plannedSet}
              sessionId={sessionId}
              set={loggedSet}
            />
          );
        }

        return (
          <PendingSetCard
            index={idx}
            isLogging={isLogging}
            key={`pending_${idx}`}
            onLog={handleLogSet}
            onSkip={handleSkipSet}
            planned={plannedSet}
          />
        );
      })}

      {!hasPlan ? (
        <AddSetCard
          defaultUnit={defaultUnit}
          isLogging={isLogging}
          onLog={handleLogSet}
        />
      ) : null}

      {hasPlan && loggedCount >= totalPlanned ? (
        <AddSetCard
          defaultUnit={defaultUnit}
          isLogging={isLogging}
          onLog={handleLogSet}
        />
      ) : null}
    </div>
  );
}
