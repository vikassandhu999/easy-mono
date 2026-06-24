/**
 * WeekSchedule — 7-day schedule grid for a training plan.
 *
 * Each row: a HeroUI Select for picking a workout (or Rest).
 * Assigning a workout fires PUT /training-plans/:id/schedule/:day.
 * An assigned day can be expanded (read-only) to show its exercises.
 * Cache: tag:false — we use optimistic updateQueryData after each PUT.
 */
import {ListBox, Select, Spinner, Typography, toast} from '@heroui/react';
import {ChevronDown, ChevronRight} from 'lucide-react';
import {useState} from 'react';
import {
  coachApi,
  useGetTrainingPlanScheduleQuery,
  useListWorkoutsQuery,
  useSetTrainingPlanDayScheduleMutation,
} from '@/api/generated';
import {useAppDispatch} from '@/store';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const ORDERED_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
export type DayKey = (typeof ORDERED_DAYS)[number];

export const DAY_LABELS: Record<DayKey, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

export const DAY_ABBREV: Record<DayKey, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

const REST_KEY = '__rest__';

// ---------------------------------------------------------------------------
// Pure helpers (also tested)
// ---------------------------------------------------------------------------

/** Given the schedule map from the API, return ordered rows. */
export function buildOrderedDayRows(
  scheduleMap: Record<
    string,
    {day_of_week?: string; training_workout_id?: string | null; workout_name?: string | null; id?: string}
  >,
): Array<{
  day: DayKey;
  entry: {day_of_week?: string; training_workout_id?: string | null; workout_name?: string | null; id?: string} | null;
}> {
  return ORDERED_DAYS.map((day) => ({
    day,
    entry: scheduleMap[day] ?? null,
  }));
}

/** Build the condensed projection string: "Mon Push Day · Tue Rest · ..." */
export function buildScheduleProjection(
  scheduleMap: Record<string, {workout_name?: string | null; training_workout_id?: string | null}>,
): string {
  return ORDERED_DAYS.map((day) => {
    const entry = scheduleMap[day];
    const label = entry?.training_workout_id && entry?.workout_name ? entry.workout_name : 'Rest';
    return `${DAY_ABBREV[day]} ${label}`;
  }).join(' · ');
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WeekScheduleProps {
  planId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WeekSchedule({planId}: WeekScheduleProps) {
  const dispatch = useAppDispatch();
  const {
    data: scheduleData,
    isLoading: scheduleLoading,
    isError: scheduleError,
  } = useGetTrainingPlanScheduleQuery({planId});
  const {data: workoutsData, isLoading: workoutsLoading} = useListWorkoutsQuery({planId, limit: 100});
  const [setDaySchedule] = useSetTrainingPlanDayScheduleMutation();

  // Track which days are expanded (read-only exercise list)
  const [expandedDays, setExpandedDays] = useState<Set<DayKey>>(new Set());

  const scheduleMap = scheduleData?.data ?? {};
  const workouts = workoutsData?.data ?? [];
  const rows = buildOrderedDayRows(scheduleMap);

  const toggleExpand = (day: DayKey) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) {
        next.delete(day);
      } else {
        next.add(day);
      }
      return next;
    });
  };

  const handleDayChange = async (day: DayKey, selectedKey: string) => {
    const workoutId = selectedKey === REST_KEY ? null : selectedKey;

    // Optimistic update — patch holds the inverse so we can roll back on failure.
    const patch = dispatch(
      coachApi.util.updateQueryData('getTrainingPlanSchedule', {planId}, (draft) => {
        if (!draft.data) {
          draft.data = {};
        }
        if (workoutId === null) {
          // Clear — reset the entry's assignment
          if (draft.data[day]) {
            draft.data[day] = {
              ...draft.data[day],
              training_workout_id: null,
              workout_name: null,
            };
          }
        } else {
          const workout = workouts.find((w) => w.id === workoutId);
          draft.data[day] = {
            ...(draft.data[day] ?? {}),
            day_of_week: day,
            training_workout_id: workoutId,
            workout_name: workout?.name ?? null,
          };
        }
      }),
    );

    try {
      await setDaySchedule({
        planId,
        day,
        trainingDayScheduleRequest: {training_workout_id: workoutId},
      }).unwrap();
    } catch {
      patch.undo();
      toast.danger("Couldn't save changes");
    }
  };

  if (scheduleLoading || workoutsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner
          color="accent"
          size="sm"
        />
      </div>
    );
  }

  if (scheduleError) {
    return (
      <div className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
        Failed to load schedule.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {rows.map(({day, entry}) => {
        const assignedWorkoutId = entry?.training_workout_id ?? null;
        const assignedWorkout = assignedWorkoutId ? workouts.find((w) => w.id === assignedWorkoutId) : null;
        const isExpanded = expandedDays.has(day);
        const hasWorkout = Boolean(assignedWorkoutId);

        return (
          <div
            className="rounded-lg border border-divider bg-content1 overflow-hidden"
            key={day}
          >
            {/* Day row */}
            <div className="flex items-center gap-3 px-3 py-2">
              {/* Day label */}
              <span className="w-24 shrink-0 text-sm font-medium text-foreground">{DAY_LABELS[day]}</span>

              {/* Workout select */}
              <div className="flex-1 min-w-0">
                <Select
                  aria-label={`Workout for ${DAY_LABELS[day]}`}
                  onSelectionChange={(key) => {
                    if (key) {
                      handleDayChange(day, key as string).catch(() => undefined);
                    }
                  }}
                  selectedKey={assignedWorkoutId ?? REST_KEY}
                  variant="secondary"
                >
                  <Select.Trigger className="h-8 min-h-8 text-sm">
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      <ListBox.Item
                        id={REST_KEY}
                        key={REST_KEY}
                        textValue="Rest"
                      >
                        <span className="text-foreground-500">Rest</span>
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                      {workouts.map((w) => (
                        <ListBox.Item
                          id={w.id}
                          key={w.id}
                          textValue={w.name}
                        >
                          {w.name}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </div>

              {/* Expand toggle — only when a workout is assigned */}
              {hasWorkout ? (
                <button
                  aria-label={isExpanded ? 'Collapse exercises' : 'Expand exercises'}
                  className="shrink-0 text-foreground-500 hover:text-foreground transition-colors"
                  onClick={() => toggleExpand(day)}
                  type="button"
                >
                  {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                </button>
              ) : (
                <span className="w-[15px] shrink-0" />
              )}
            </div>

            {/* Expanded exercise list (read-only) */}
            {isExpanded && assignedWorkout ? (
              <div className="border-t border-divider px-3 pb-2 pt-1.5">
                {assignedWorkout.workout_elements.length === 0 ? (
                  <Typography
                    color="muted"
                    type="body-xs"
                  >
                    No exercises yet
                  </Typography>
                ) : (
                  <ul className="flex flex-col gap-0.5">
                    {assignedWorkout.workout_elements.map((element) => (
                      <li
                        className="text-xs text-foreground-500"
                        key={element.id}
                      >
                        {element.exercise?.name ?? 'Unknown exercise'}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
