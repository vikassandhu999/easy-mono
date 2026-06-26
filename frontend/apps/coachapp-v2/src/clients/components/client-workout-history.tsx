import {formatSessionDate, SESSION_STATE_CHIP} from '@easy/utils';
import {Chip, ListBox, Spinner} from '@heroui/react';
import {Activity, ChevronRight, Dumbbell} from 'lucide-react';
import {Link} from 'react-router-dom';

import type {TrainingSession} from '@/api/generated';

import {useListCoachClientTrainingSessionsQuery} from '@/api/generated';
import {buildWorkoutSessionSubtitle, getPlannedSnapshot, getWorkoutSessionTitle} from '@/domain/workout-sessions';

const PREVIEW_LIMIT = 7;

const SESSION_CARD_CLASS =
  'flex min-h-11 items-center gap-3 rounded-xl border border-border bg-surface p-3 transition-colors hover:bg-surface-hover active:bg-surface-hover';

function SessionCardContent({session}: {session: TrainingSession}) {
  const title = getWorkoutSessionTitle(session);
  const dateStr = formatSessionDate(session.started_at);
  const subtitle = buildWorkoutSessionSubtitle(session);
  const stateChip = SESSION_STATE_CHIP[session.state];

  return (
    <>
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-secondary">
        {getPlannedSnapshot(session) ? (
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
        {subtitle ? <p className="mt-0.5 truncate text-xs text-muted">{subtitle}</p> : null}
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
            <span className="text-xs text-muted">Effort: {session.soreness_rating}/5</span>
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
    </>
  );
}

/** Link-card variant — used in the plain-list preview on the client detail page. */
export function SessionCard({clientId, session}: {clientId: string; session: TrainingSession}) {
  return (
    <Link
      className={SESSION_CARD_CLASS}
      to={`/clients/${clientId}/sessions/${session.id}`}
    >
      <SessionCardContent session={session} />
    </Link>
  );
}

/** ListBox.Item variant — used in the infinite workout-history list; navigation is handled by the parent ListBox's onAction. */
export function SessionListItem({session}: {session: TrainingSession}) {
  return (
    <ListBox.Item
      className={`${SESSION_CARD_CLASS} active:scale-100! data-[pressed=true]:scale-100!`}
      id={session.id}
      textValue={getWorkoutSessionTitle(session)}
    >
      <SessionCardContent session={session} />
    </ListBox.Item>
  );
}

export default function ClientWorkoutHistory({clientId}: {clientId: string}) {
  // The client-scoped sessions endpoint returns the full list (no limit param);
  // slice to the preview length client-side.
  const {data, isLoading} = useListCoachClientTrainingSessionsQuery({clientId});

  const allSessions = data?.data ?? [];
  const totalCount = data?.count ?? allSessions.length;
  const sessions = allSessions.slice(0, PREVIEW_LIMIT);
  const hasMore = totalCount > PREVIEW_LIMIT;

  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Workout History</h3>

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
              className="mt-1 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-default-soft active:bg-default-soft"
              to={`/clients/${clientId}/workout-history`}
            >
              View all workouts
              <ChevronRight size={14} />
            </Link>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted">No workouts logged yet.</p>
      )}
    </div>
  );
}
