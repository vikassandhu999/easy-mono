import {formatDuration, formatSessionDate, getWorkoutTitle, SESSION_STATE_CHIP} from '@easy/utils';
import {Button, Chip, Spinner} from '@heroui/react';
import {Activity, ChevronRight, Dumbbell} from 'lucide-react';
import {Link} from 'react-router-dom';
import PageLayout from '@/@components/page-layout';
import type {ClientWorkoutSession} from '@/api/workoutSessions';
import {useClientWorkoutSessionsInfiniteQuery} from '@/api/workoutSessions';

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
      className="flex min-h-11 items-center gap-3 rounded-xl border border-border bg-surface p-3 transition-colors hover:bg-surface-secondary active:bg-surface-secondary"
      to={`/history/${session.id}`}
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-secondary">
        {session.planned_snapshot ? (
          <Dumbbell
            className="text-muted"
            size={16}
          />
        ) : (
          <Activity
            className="text-muted"
            size={16}
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{title}</p>
        <p className="mt-0.5 truncate text-xs text-muted">{subtitle}</p>
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
            <span className="text-xs text-muted">Feeling: {session.soreness_rating}/5</span>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-xs text-muted">{dateStr}</span>
        <ChevronRight
          className="text-muted"
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
        <p className="text-sm text-muted">No workouts yet. Start one from Training.</p>
      )}
    </PageLayout>
  );
}
