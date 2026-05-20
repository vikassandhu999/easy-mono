import {formatSessionDate, SESSION_STATE_CHIP} from '@easy/utils';
import {Chip, Separator, Spinner} from '@heroui/react';
import {Activity, ChevronRight, Dumbbell} from 'lucide-react';
import {Link} from 'react-router-dom';

import type {WorkoutSession} from '@/api/workoutSessions';

import {useListWorkoutSessionsQuery} from '@/api/workoutSessions';
import {buildWorkoutSessionSubtitle, getWorkoutSessionTitle} from '@/domain/workout-sessions';

const PREVIEW_LIMIT = 7;

export function SessionCard({clientId, session}: {clientId: string; session: WorkoutSession}) {
  const title = getWorkoutSessionTitle(session);
  const dateStr = formatSessionDate(session.started_at);
  const subtitle = buildWorkoutSessionSubtitle(session);
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
