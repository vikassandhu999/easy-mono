import {formatDuration, formatSessionDate, SESSION_STATE_CHIP} from '@easy/utils';
import {Chip, Separator, Spinner} from '@heroui/react';
import {Activity, ChevronRight, Dumbbell} from 'lucide-react';
import {Link} from 'react-router-dom';

import type {WorkoutSession} from '@/api/workoutSessions';

import {useListWorkoutSessionsQuery} from '@/api/workoutSessions';

const PREVIEW_LIMIT = 7;

// ── Helpers ──────────────────────────────────────────────────

function getWorkoutTitle(session: WorkoutSession): string {
  if (session.planned_snapshot) {
    return session.planned_snapshot.workout_name;
  }
  return 'Freestyle workout';
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

// ── Session card (exported for reuse) ────────────────────────

export function SessionCard({clientId, session}: {clientId: string; session: WorkoutSession}) {
  const title = getWorkoutTitle(session);
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
        <p className="truncate text-sm font-semibold">{title}</p>
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

// ── Preview component (for client detail page) ───────────────

export default function ClientWorkoutHistory({clientId}: {clientId: string}) {
  const {data, isLoading} = useListWorkoutSessionsQuery({
    client_id: clientId,
    limit: PREVIEW_LIMIT,
  });

  const sessions = data?.data ?? [];
  const totalCount = data?.count ?? 0;
  const hasMore = totalCount > PREVIEW_LIMIT;

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
          {hasMore ? (
            <Link
              className="mt-1 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground-500 transition-colors hover:bg-default-100 active:bg-default-200"
              to={`/clients/${clientId}/workout-history`}
            >
              View all workouts
              <ChevronRight size={14} />
            </Link>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-foreground-400">No workouts logged yet.</p>
      )}
    </section>
  );
}
