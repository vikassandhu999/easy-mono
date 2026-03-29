import {Button, Chip, Spinner} from '@heroui/react';
import {Activity, ChevronRight, Dumbbell} from 'lucide-react';
import {Link} from 'react-router-dom';

import type {ClientWorkoutSession, PlannedSnapshot} from '@/api/workoutSessions';

import PageLayout from '@/@components/page-layout';
import {
  DAY_NAMES,
  formatDuration,
  formatSessionDate,
  getWorkoutTitle,
  SESSION_STATE_CHIP,
} from '@/@utils/workout-helpers';
import {useClientWorkoutSessionsInfiniteQuery} from '@/api/workoutSessions';

// ── Helpers ──────────────────────────────────────────────────

function getDayLabel(snapshot: null | PlannedSnapshot): null | string {
  if (!snapshot) return null;
  return DAY_NAMES[snapshot.day_number] ?? null;
}

function getExerciseCount(session: ClientWorkoutSession): number {
  const ids = new Set<string>();
  for (const set of session.performed_sets) {
    ids.add(set.exercise_id);
  }
  return ids.size;
}

// ── Session card ─────────────────────────────────────────────

function SessionCard({session}: {session: ClientWorkoutSession}) {
  const title = getWorkoutTitle(session.planned_snapshot);
  const dayLabel = getDayLabel(session.planned_snapshot);
  const dateStr = formatSessionDate(session.started_at);
  const duration = formatDuration(session.started_at, session.ended_at);
  const exerciseCount = getExerciseCount(session);
  const setCount = session.performed_sets.length;
  const stateChip = SESSION_STATE_CHIP[session.state];

  const subtitle = [duration, `${exerciseCount} exercise${exerciseCount !== 1 ? 's' : ''}`, `${setCount} sets`]
    .filter(Boolean)
    .join(' \u00B7 ');

  return (
    <Link
      className="flex min-h-11 items-center gap-3 rounded-xl border border-divider bg-content1 p-3 transition-colors hover:bg-content2 active:bg-content2"
      to={`/history/${session.id}`}
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
        <p className="mt-0.5 truncate text-xs text-foreground-500">{subtitle}</p>
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

export default function WorkoutHistory() {
  const {data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading} =
    useClientWorkoutSessionsInfiniteQuery(undefined);

  const sessions = data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <PageLayout title="Workout History">
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner color="accent" />
        </div>
      ) : sessions.length > 0 ? (
        <div className="max-w-lg">
          <div className="flex flex-col gap-2">
            {sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
              />
            ))}
          </div>
          {hasNextPage ? (
            <div className="mt-3">
              <Button
                className="w-full"
                isPending={isFetchingNextPage}
                onPress={() => fetchNextPage()}
                size="sm"
                variant="ghost"
              >
                {isFetchingNextPage ? 'Loading...' : 'Load more'}
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-foreground-400">No workouts yet. Start one from the dashboard!</p>
      )}
    </PageLayout>
  );
}
