/**
 * WeekSchedule — the weekday chips that schedule ONE workout (badge TB).
 *
 * The redesign moved scheduling out of a 7-row day grid and onto the active
 * workout card: seven chips, the ones this workout owns highlighted, plus the
 * `Scheduled: Mon, Thu` / `Not scheduled yet` label beneath them.
 *
 * A weekday holds at most one workout (INTERACTIONS.md § TB), so selecting a
 * chip implicitly takes that day off whichever workout held it; deselecting
 * clears the day to rest. GAPS #8: the chips are a `ToggleButtonGroup` and the
 * exclusivity lives in this handler, not the component.
 *
 * Cache: tag:false — optimistic updateQueryData on `getTrainingPlanSchedule`
 * with patch.undo() + toast on failure.
 */
import {
  TRAINING_DAY_LABELS as DAY_LABELS,
  TRAINING_DAY_SHORT_LABELS as DAY_SHORT_LABELS,
  type TrainingWeekday as DayKey,
  TRAINING_WEEKDAYS as ORDERED_DAYS,
} from '@easy/utils';
import {Skeleton, ToggleButton, ToggleButtonGroup, Typography} from '@heroui/react';

import {toastMutationError} from '@/@components/mutation-toast';
import {coachApi, useGetTrainingPlanScheduleQuery, useSetTrainingPlanDayScheduleMutation} from '@/api/generated';
import {useAppDispatch} from '@/store';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ScheduleEntry = {
  day_of_week?: string;
  training_workout_id?: string | null;
  workout_name?: string | null;
  id?: string;
};

interface WeekScheduleProps {
  planId: string;
  workoutId: string;
  workoutName: string;
}

// ---------------------------------------------------------------------------
// Pure helpers (also tested)
// ---------------------------------------------------------------------------

/** Given the schedule map from the API, return ordered rows. */
>
{
  return ORDERED_DAYS.map((day) => ({
    day,
    entry: scheduleMap[day] ?? null,
  }));
}

/** The weekdays this workout is assigned to, in Mon..Sun order. */
export function daysForWorkout(scheduleMap: Record<string, ScheduleEntry>, workoutId: string): DayKey[] {
  return ORDERED_DAYS.filter((day) => scheduleMap[day]?.training_workout_id === workoutId);
}

/** COPY.md § TB — `Scheduled: Mon, Thu` / `Not scheduled yet`. */
export function scheduleLabel(days: DayKey[]): string {
  if (days.length === 0) {
    return 'Not scheduled yet';
  }
  return `Scheduled: ${days.map((day) => DAY_SHORT_LABELS[day]).join(', ')}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WeekSchedule({planId, workoutId, workoutName}: WeekScheduleProps) {
  const dispatch = useAppDispatch();
  const {data, isLoading, isError} = useGetTrainingPlanScheduleQuery({planId});
  const [setDaySchedule] = useSetTrainingPlanDayScheduleMutation();

  const scheduleMap = (data?.data ?? {}) as Record<string, ScheduleEntry>;
  const assignedDays = daysForWorkout(scheduleMap, workoutId);

  const handleDayChange = async (day: DayKey, nextWorkoutId: string | null) => {
    // Optimistic update — patch holds the inverse so we can roll back on failure.
    const patch = dispatch(
      coachApi.util.updateQueryData('getTrainingPlanSchedule', {planId}, (draft) => {
        if (!draft.data) {
          draft.data = {};
        }
        draft.data[day] = {
          ...(draft.data[day] ?? {}),
          day_of_week: day,
          training_workout_id: nextWorkoutId,
          workout_name: nextWorkoutId ? workoutName : null,
        };
      }),
    );

    try {
      await setDaySchedule({
        planId,
        day,
        trainingDayScheduleRequest: {training_workout_id: nextWorkoutId},
      }).unwrap();
    } catch (e) {
      patch.undo();
      toastMutationError(e, "Couldn't save changes");
    }
  };

  if (isLoading) {
    return (
      <div className="flex gap-1.5">
        {ORDERED_DAYS.map((day) => (
          <Skeleton
            className="size-11 rounded-control"
            key={day}
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Typography
        className="text-danger"
        type="body-xs"
      >
        Couldn't load schedule.
      </Typography>
    );
  }

  return (
    <ToggleButtonGroup
      aria-label={`Weekdays for ${workoutName}`}
      className="flex flex-nowrap gap-1.5"
      onSelectionChange={(keys) => {
        const next = new Set([...keys].map(String));
        for (const day of ORDERED_DAYS) {
          const wasAssigned = assignedDays.includes(day);
          const isAssigned = next.has(day);
          if (isAssigned && !wasAssigned) {
            handleDayChange(day, workoutId).catch(() => undefined);
          } else if (!isAssigned && wasAssigned) {
            handleDayChange(day, null).catch(() => undefined);
          }
        }
      }}
      selectedKeys={assignedDays}
      selectionMode="multiple"
    >
      {ORDERED_DAYS.map((day) => (
        <ToggleButton
          aria-label={`${DAY_LABELS[day]} for ${workoutName}`}
          className="size-11 min-w-11 shrink-0 rounded-control border border-border bg-transparent px-0 text-pill font-medium text-muted data-[selected=true]:border-accent data-[selected=true]:bg-accent-soft data-[selected=true]:font-semibold data-[selected=true]:text-accent"
          id={day}
          key={day}
        >
          {DAY_SHORT_LABELS[day]}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

// ---------------------------------------------------------------------------
// ScheduleLabel — the `Scheduled: Mon, Thu` line under the workout name.
// Reads the same cached query as the chips, so it costs no extra request.
// ---------------------------------------------------------------------------

interface ScheduleLabelProps {
  planId: string;
  workoutId: string;
}

export function ScheduleLabel({planId, workoutId}: ScheduleLabelProps) {
  const {data} = useGetTrainingPlanScheduleQuery({planId});
  const scheduleMap = (data?.data ?? {}) as Record<string, ScheduleEntry>;
  const assignedDays = daysForWorkout(scheduleMap, workoutId);

  return (
    <div className="flex flex-col gap-0.5">
      <Typography
        color="muted"
        type="body-xs"
      >
        {scheduleLabel(assignedDays)}
      </Typography>

      {/* A workout used on more than one weekday is edited in one place
          (INTERACTIONS.md § TB). The days themselves are already on the line
          above, so the note carries only the consequence. */}
      {assignedDays.length > 1 ? (
        <Typography
          className="text-muted-2"
          type="body-xs"
        >
          Edits apply to all of them.
        </Typography>
      ) : null}
    </div>
  );
}
