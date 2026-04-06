import {DAY_NAMES, formatDuration, formatSessionDate, SESSION_STATE_CHIP} from '@easy/utils';
import {Button, Chip, Separator, Spinner} from '@heroui/react';
import {Activity, ChevronRight, Dumbbell} from 'lucide-react';
import {Link} from 'react-router-dom';

import type {PlannedSnapshot, WorkoutSession} from '@/api/workoutSessions';

import {useWorkoutSessionsInfiniteQuery} from '@/api/workoutSessions';

// ── Helpers ──────────────────────────────────────────────────

function getWorkoutTitle(session: WorkoutSession): string {
  if (session.planned_snapshot) {
    return session.planned_snapshot.workout_name;
  }
  return 'Freestyle workout';
}

function getDayLabel(snapshot: null | PlannedSnapshot): null | string {
  if (!snapshot) return null;
  return DAY_NAMES[snapshot.day_number] ?? null;
}

function getExerciseCount(session: WorkoutSession): number {
  const exerciseIds = new Set<string>();
  for (const set of session.performed_sets) {
    exerciseIds.add(set.exercise_id);
  }
  return exerciseIds.size;
}

function getReplacedCount(session: WorkoutSession): number {
  if (!session.planned_snapshot) return 0;
  const elementExerciseMap = new Map<string, string>();
  for (const el of session.planned_snapshot.elements) {
    elementExerciseMap.set(el.element_id, el.exercise_id);
  }
  const replacedElements = new Set<string>();
  for (const set of session.performed_sets) {
    if (set.workout_element_id) {
      const plannedExerciseId = elementExerciseMap.get(set.workout_element_id);
      if (plannedExerciseId && plannedExerciseId !== set.exercise_id) {
        replacedElements.add(set.workout_element_id);
      }
    }
  }
  return replacedElements.size;
}

function getPlannedExerciseCount(session: WorkoutSession): null | number {
  if (!session.planned_snapshot) return null;
  return session.planned_snapshot.elements.length;
}

function buildSubtitle(session: WorkoutSession): string {
  const parts: string[] = [];

  const duration = formatDuration(session.started_at, session.ended_at);
  if (duration) parts.push(duration);

  const plannedCount = getPlannedExerciseCount(session);
  const actualCount = getExerciseCount(session);

  if (plannedCount !== null) {
    parts.push(`${actualCount}/${plannedCount} exercises`);
  } else if (actualCount > 0) {
    parts.push(`${actualCount} exercise${actualCount !== 1 ? 's' : ''}`);
  }

  const replacedCount = getReplacedCount(session);
  if (replacedCount > 0) {
    parts.push(`${replacedCount} replaced`);
  }

  return parts.join(' \u00B7 ');
}

// ── Session card ─────────────────────────────────────────────

function SessionCard({clientId, session}: {clientId: string; session: WorkoutSession}) {
  const title = getWorkoutTitle(session);
  const dayLabel = getDayLabel(session.planned_snapshot);
  const dateStr = formatSessionDate(session.started_at);
  const subtitle = buildSubtitle(session);
  const stateChip = SESSION_STATE_CHIP[session.state];

  return (
    <Link
      className="flex min-h-11 items-center gap-3 rounded-xl border border-divider bg-content1 p-3 transition-colors hover:bg-content2 active:bg-content2"
      to={`/clients/${clientId}/sessions/${session.id}`}
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-content2">
        {session.planned_snapshot ? (
          <Dumbbell
            className="text-foreground-400"
            size={16}
          />
        ) : (
          <Activity
            className="text-foreground-400"
            size={16}
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <p className="truncate text-sm font-semibold">{title}</p>
          {dayLabel ? <span className="shrink-0 text-xs text-foreground-400">{dayLabel}</span> : null}
        </div>
        {subtitle ? <p className="mt-0.5 truncate text-xs text-foreground-500">{subtitle}</p> : null}
        <div className="mt-1 flex items-center gap-2">
          {stateChip ? (
            <Chip
              color={stateChip.color}
              size="sm"
              variant="soft"
            >
              {stateChip.label}
            </Chip>
          ) : null}
          {session.soreness_rating ? (
            <span className="text-xs text-foreground-400">Effort: {session.soreness_rating}/5</span>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-xs text-foreground-400">{dateStr}</span>
        <ChevronRight
          className="text-foreground-300"
          size={16}
        />
      </div>
    </Link>
  );
}

// ── Main component ───────────────────────────────────────────

export default function ClientWorkoutHistory({clientId}: {clientId: string}) {
  const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} = useWorkoutSessionsInfiniteQuery({
    client_id: clientId,
  });

  const sessions = data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <section className="py-4">
      <Separator className="mb-4" />
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground-400">Workout History</h3>

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Spinner size="sm" />
        </div>
      ) : sessions.length > 0 ? (
        <div className="flex flex-col gap-2">
          {sessions.map((session) => (
            <SessionCard
              clientId={clientId}
              key={session.id}
              session={session}
            />
          ))}
          {hasNextPage ? (
            <Button
              className="mt-1"
              isPending={isFetchingNextPage}
              onPress={() => fetchNextPage()}
              size="sm"
              variant="ghost"
            >
              {isFetchingNextPage ? 'Loading...' : 'Load more'}
            </Button>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-foreground-400">No workouts logged yet.</p>
      )}
    </section>
  );
}
