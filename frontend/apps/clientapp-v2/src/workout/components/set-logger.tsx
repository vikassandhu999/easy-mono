import {Button, Input} from '@heroui/react';
import {Check, Minus, Plus, SkipForward, Trash2} from 'lucide-react';
import {useCallback, useState} from 'react';

import type {ClientPerformedSet, PlannedSnapshotSet} from '@/api/workoutSessions';
import type {WorkoutExercise} from '@/workout/components/workout-types';

import {
  useDeletePerformedSetMutation,
  useLogPerformedSetMutation,
  useUpdatePerformedSetMutation,
} from '@/api/workoutSessions';
import RestTimer from '@/workout/components/rest-timer';

// ── Helpers ──────────────────────────────────────────────────

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
  if (unit === 'lbs') return 'lbs';
  if (unit === 'bodyweight') return 'bodyweight';
  return 'kg';
}

function formatPlannedLoad(set: PlannedSnapshotSet): string {
  if (!set.load_value) return '';
  if (set.load_unit === 'bodyweight') return 'BW';
  if (set.load_unit === 'none') return '';
  return `${set.load_value} ${set.load_unit ?? ''}`.trim();
}

function parseLoadValue(value: string): null | number {
  if (!value.trim()) return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

// ── Unit toggle button ───────────────────────────────────────

function UnitToggle({onChange, value}: {onChange: (unit: LoadUnitOption) => void; value: LoadUnitOption}) {
  return (
    <button
      className="flex min-h-11 min-w-11 items-center justify-center rounded-md border border-divider px-1.5 text-xs font-medium text-foreground-500 transition-colors hover:bg-content2 active:bg-content3"
      onClick={() => onChange(nextLoadUnit(value))}
      title="Change unit"
      type="button"
    >
      {LOAD_UNIT_LABELS[value]}
    </button>
  );
}

// ── Logged set row (already logged — read-only with edit option) ─

function LoggedSetRow({
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
      <tr className="border-b border-divider last:border-b-0">
        <td className="px-2 py-1.5 text-center text-xs text-foreground-400">{index + 1}</td>
        {planned ? <td className="px-2 py-1.5 text-xs text-foreground-400">{planned.target_reps ?? '—'}</td> : null}
        <td className="px-2 py-1.5">
          <Input
            className="w-16"
            inputMode="numeric"
            onChange={(e) => setEditReps(e.target.value)}
            placeholder="Reps"
            value={editReps}
          />
        </td>
        <td className="px-2 py-1.5">
          <div className="flex items-center gap-1">
            <Input
              className="w-16"
              inputMode="decimal"
              onChange={(e) => setEditLoad(e.target.value)}
              placeholder="Load"
              value={editLoad}
            />
            <UnitToggle
              onChange={setEditUnit}
              value={editUnit}
            />
          </div>
        </td>
        <td className="px-2 py-1.5">
          <div className="flex items-center">
            <Button
              isDisabled={isDeleting}
              isPending={isUpdating}
              onPress={handleSave}
              size="sm"
              variant="ghost"
            >
              <Check size={14} />
            </Button>
            <button
              className="flex min-h-11 min-w-9 items-center justify-center rounded-md text-danger transition-colors hover:bg-danger/10 active:bg-danger/20 disabled:opacity-50"
              disabled={isBusy}
              onClick={handleDelete}
              title="Delete this set"
              type="button"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr
      className="cursor-pointer border-b border-divider last:border-b-0 active:bg-content2/50"
      onClick={() => setIsEditing(true)}
    >
      <td className="px-2 py-1.5 text-center text-xs text-foreground-400">{index + 1}</td>
      {planned ? <td className="px-2 py-1.5 text-xs text-foreground-400">{planned.target_reps ?? '—'}</td> : null}
      <td className="px-2 py-1.5 text-sm font-medium">
        {set.completed ? (set.actual_reps ?? '—') : <span className="text-foreground-400">skipped</span>}
      </td>
      <td className="px-2 py-1.5 text-sm">
        {set.completed && set.load_value ? `${set.load_value} ${set.load_unit ?? ''}`.trim() : '—'}
      </td>
      <td className="px-2 py-1.5">
        {set.completed ? (
          <Check
            className="text-success"
            size={16}
          />
        ) : (
          <SkipForward
            className="text-foreground-300"
            size={16}
          />
        )}
      </td>
    </tr>
  );
}

// ── Pending set row (not yet logged — one-tap or expand to edit) ─

function PendingSetRow({
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

  const plannedLoadDisplay = planned ? formatPlannedLoad(planned) : '';

  // One-tap: log with pre-filled values
  const handleQuickLog = () => {
    onLog(planned?.target_reps ?? null, parseLoadValue(String(planned?.load_value ?? '')), planned?.load_unit ?? null);
  };

  // Custom log: log with edited values
  const handleCustomLog = () => {
    onLog(reps || null, parseLoadValue(load), unit);
  };

  if (isExpanded) {
    return (
      <tr className="border-b border-divider last:border-b-0 bg-content2/50">
        <td className="px-2 py-2 text-center text-xs text-foreground-400">{index + 1}</td>
        {planned ? <td className="px-2 py-2 text-xs text-foreground-400">{planned.target_reps ?? '—'}</td> : null}
        <td className="px-2 py-2">
          <Input
            className="w-16"
            inputMode="numeric"
            onChange={(e) => setReps(e.target.value)}
            placeholder="Reps"
            value={reps}
          />
        </td>
        <td className="px-2 py-2">
          <div className="flex items-center gap-1">
            <Input
              className="w-16"
              inputMode="decimal"
              onChange={(e) => setLoad(e.target.value)}
              placeholder="Load"
              value={load}
            />
            <UnitToggle
              onChange={setUnit}
              value={unit}
            />
          </div>
        </td>
        <td className="px-2 py-2">
          <div className="flex items-center gap-1">
            <Button
              isPending={isLogging}
              onPress={handleCustomLog}
              size="sm"
              variant="ghost"
            >
              <Check size={14} />
            </Button>
            <button
              className="flex min-h-11 min-w-9 items-center justify-center rounded-md text-foreground-400 transition-colors hover:bg-content2 active:bg-content3 disabled:opacity-50"
              disabled={isLogging}
              onClick={onSkip}
              title="Skip this set"
              type="button"
            >
              <SkipForward size={14} />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-divider last:border-b-0">
      <td className="px-2 py-1.5 text-center text-xs text-foreground-400">{index + 1}</td>
      {planned ? <td className="px-2 py-1.5 text-xs text-foreground-400">{planned.target_reps ?? '—'}</td> : null}
      <td className="px-2 py-1.5 text-xs text-foreground-400">—</td>
      <td className="px-2 py-1.5 text-xs text-foreground-400">{planned ? plannedLoadDisplay || '—' : '—'}</td>
      <td className="px-2 py-1.5">
        <div className="flex items-center">
          {/* One-tap checkbox */}
          <button
            className="flex min-h-11 min-w-9 items-center justify-center rounded-md border border-divider transition-colors hover:bg-content2 active:bg-content3 disabled:opacity-50"
            disabled={isLogging}
            onClick={handleQuickLog}
            title="Log with planned values"
            type="button"
          >
            {isLogging ? (
              <div className="size-3 animate-spin rounded-full border-2 border-foreground-300 border-t-transparent" />
            ) : (
              <div className="size-3 rounded-full border-2 border-foreground-300" />
            )}
          </button>
          {/* Expand to edit */}
          <button
            className="flex min-h-11 min-w-9 items-center justify-center rounded-md text-foreground-400 transition-colors hover:bg-content2 active:bg-content3"
            onClick={() => setIsExpanded(true)}
            title="Edit before logging"
            type="button"
          >
            <Minus size={14} />
          </button>
          {/* Skip this set */}
          <button
            className="flex min-h-11 min-w-9 items-center justify-center rounded-md text-foreground-400 transition-colors hover:bg-content2 active:bg-content3 disabled:opacity-50"
            disabled={isLogging}
            onClick={onSkip}
            title="Skip this set"
            type="button"
          >
            <SkipForward size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Freestyle add set row ────────────────────────────────────

function AddSetRow({
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
    <tr className="border-b border-divider last:border-b-0 bg-content2/30">
      <td
        className="px-2 py-2"
        colSpan={4}
      >
        <div className="flex items-center gap-2">
          <Input
            className="w-16"
            inputMode="numeric"
            onChange={(e) => setReps(e.target.value)}
            placeholder="Reps"
            value={reps}
          />
          <Input
            className="w-16"
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
            Log
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ── Main set logger component ────────────────────────────────

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
  const [restTimerSeconds, setRestTimerSeconds] = useState<null | number>(null);

  const hasPlan = exercise.plannedSets.length > 0;
  const loggedCount = exercise.sets.length;
  const totalPlanned = exercise.plannedSets.length;
  // Derive default unit from planned sets or last logged set
  const defaultUnit: LoadUnitOption = hasPlan
    ? toLoadUnitOption(exercise.plannedSets[0]?.load_unit ?? null)
    : toLoadUnitOption(exercise.sets[exercise.sets.length - 1]?.load_unit ?? null);

  // Determine how many rows to show: max of planned sets and logged sets
  const rowCount = hasPlan ? Math.max(totalPlanned, loggedCount) : loggedCount;

  const dismissRestTimer = useCallback(() => setRestTimerSeconds(null), []);

  const handleLogSet = async (reps: null | string, loadValue: null | number, loadUnit: null | string) => {
    // Position = total performed sets across entire session (global counter)
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
      // Start rest timer from the planned set that was just logged
      const justLoggedPlannedSet = hasPlan ? exercise.plannedSets[loggedCount] : undefined;
      const rest = justLoggedPlannedSet?.rest_seconds;
      if (rest && rest > 0) {
        setRestTimerSeconds(rest);
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
      {/* Rest timer */}
      {restTimerSeconds != null ? (
        <RestTimer
          onDone={dismissRestTimer}
          restSeconds={restTimerSeconds}
        />
      ) : null}

      <div className="overflow-hidden rounded-lg border border-divider">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-divider bg-content2">
              <th className="w-8 px-2 py-1.5 text-center text-xs font-medium text-foreground-400">#</th>
              {hasPlan ? <th className="px-2 py-1.5 text-left text-xs font-medium text-foreground-400">Plan</th> : null}
              <th className="px-2 py-1.5 text-left text-xs font-medium text-foreground-400">Done</th>
              <th className="px-2 py-1.5 text-left text-xs font-medium text-foreground-400">Load</th>
              <th className="w-16 px-2 py-1.5" />
            </tr>
          </thead>
          <tbody>
            {/* Render planned/logged set rows */}
            {Array.from({length: rowCount}, (_, idx) => {
              const loggedSet = exercise.sets[idx];
              const plannedSet = hasPlan ? exercise.plannedSets[idx] : undefined;

              if (loggedSet) {
                return (
                  <LoggedSetRow
                    index={idx}
                    key={loggedSet.id}
                    planned={plannedSet}
                    sessionId={sessionId}
                    set={loggedSet}
                  />
                );
              }

              return (
                <PendingSetRow
                  index={idx}
                  isLogging={isLogging}
                  key={`pending_${idx}`}
                  onLog={handleLogSet}
                  onSkip={handleSkipSet}
                  planned={plannedSet}
                />
              );
            })}

            {/* For freestyle/added exercises: always show add row */}
            {!hasPlan ? (
              <AddSetRow
                defaultUnit={defaultUnit}
                isLogging={isLogging}
                onLog={handleLogSet}
              />
            ) : null}

            {/* For planned exercises with all sets done: show add row for extra sets */}
            {hasPlan && loggedCount >= totalPlanned ? (
              <AddSetRow
                defaultUnit={defaultUnit}
                isLogging={isLogging}
                onLog={handleLogSet}
              />
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
