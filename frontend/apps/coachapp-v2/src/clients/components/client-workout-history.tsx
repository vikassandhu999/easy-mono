import {formatSessionDate, getCurrentWeekRange, SESSION_STATE_CHIP} from '@easy/utils';
import {Chip, ListBox, Skeleton, Typography} from '@heroui/react';
import {Check, Dumbbell} from 'lucide-react';
import {useMemo} from 'react';
import {Link} from 'react-router-dom';

import {useCoachClientTrainingSessionsInfiniteQuery} from '@/api/client-training-sessions';
import type {ClientTrainingPlan, TrainingSession} from '@/api/generated';
import {useListCoachClientTrainingPlansQuery} from '@/api/training-plans-list';
import PlanAssignControl from '@/clients/components/plan-assign-control';
import {PLAN_STATUS_MAP, UNKNOWN_PLAN_STATUS} from '@/clients/lib/client';
import {formatAssignedDate, getProgramProgress, softStatusClass} from '@/clients/lib/client-detail-metrics';
import {buildWorkoutSessionSubtitle, getWorkoutSessionTitle} from '@/domain/workout-sessions';

function selectCurrentPlan(plans: ClientTrainingPlan[]): ClientTrainingPlan | null {
  return (
    [...plans].sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'active' ? -1 : 1;
      }
      return (b.start_date ?? b.inserted_at).localeCompare(a.start_date ?? a.inserted_at);
    })[0] ?? null
  );
}

function daysPerWeek(plan: ClientTrainingPlan): number {
  const scheduledDays = new Set(plan.plan_items.map((item) => item.day_of_week));
  return scheduledDays.size || plan.workouts.length;
}

function SessionStrip({completed, total}: {completed: number; total: number}) {
  const count = Math.max(total, completed, 1);
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <Typography
          type="body-sm"
          weight="semibold"
        >
          This week
        </Typography>
        <Typography
          color="muted"
          type="body-xs"
        >
          {completed} of {total} done
        </Typography>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {Array.from({length: count}, (_, index) => {
          const done = index < completed;
          return (
            <span
              className={`flex min-h-11 items-center justify-center rounded-[11px] border ${
                done
                  ? 'border-success-soft bg-success-soft text-success-soft-foreground'
                  : 'border-dashed border-border text-muted'
              }`}
              key={`training-session-${index + 1}`}
            >
              {done ? <Check size={16} /> : index + 1}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function ProgramSegments({percent, totalWeeks}: {percent: null | number; totalWeeks: null | number}) {
  const count = Math.min(12, Math.max(4, totalWeeks ?? 8));
  const filled = percent == null ? 0 : Math.round((percent / 100) * count);
  return (
    <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-12">
      {Array.from({length: count}, (_, index) => (
        <span
          aria-hidden
          className={`h-2 rounded-full ${index < filled ? 'bg-accent' : 'bg-surface-secondary'}`}
          key={`training-progress-${index + 1}`}
        />
      ))}
    </div>
  );
}

export function SessionListItem({session}: {session: TrainingSession}) {
  const stateChip = SESSION_STATE_CHIP[session.state];
  const subtitle = buildWorkoutSessionSubtitle(session);

  return (
    <ListBox.Item
      className="flex min-h-11 items-center gap-3 rounded-[12px] border-[1.5px] border-separator bg-surface p-3 transition-colors hover:bg-surface-hover active:scale-100! active:bg-surface-hover data-[pressed=true]:scale-100!"
      id={session.id}
      textValue={getWorkoutSessionTitle(session)}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
        <Dumbbell size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <Typography
          truncate
          type="body-sm"
          weight="semibold"
        >
          {getWorkoutSessionTitle(session)}
        </Typography>
        {subtitle ? (
          <Typography
            color="muted"
            truncate
            type="body-xs"
          >
            {subtitle}
          </Typography>
        ) : null}
      </span>
      {stateChip ? (
        <Chip
          color={stateChip.color}
          size="sm"
          variant="soft"
        >
          {stateChip.label}
        </Chip>
      ) : null}
      <Typography
        className="shrink-0"
        color="muted"
        type="body-xs"
      >
        {formatSessionDate(session.started_at)}
      </Typography>
    </ListBox.Item>
  );
}

export default function ClientWorkoutHistory({clientId, clientName}: {clientId: string; clientName: string}) {
  const {from, to} = useMemo(() => getCurrentWeekRange(), []);
  const {data, isError, isLoading} = useListCoachClientTrainingPlansQuery({clientId});
  const sessionsQuery = useCoachClientTrainingSessionsInfiniteQuery({clientId, from, to});
  const plan = useMemo(() => selectCurrentPlan(data?.data ?? []), [data]);
  const progress = plan ? getProgramProgress(plan) : null;
  const plannedDays = plan ? daysPerWeek(plan) : 0;
  const sessions = sessionsQuery.data?.pages.flatMap((page) => page.data) ?? [];
  const completed = sessions.filter((session) => session.state === 'completed').length;
  const status = plan ? (PLAN_STATUS_MAP[plan.status] ?? UNKNOWN_PLAN_STATUS) : null;

  return (
    <section>
      <div className="mb-5 hidden flex-col gap-3 lg:flex lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="font-grotesk text-xl font-bold">Training plan</h2>
          <Typography
            className="mt-1"
            color="muted"
            type="body-sm"
          >
            {plan ? `${formatAssignedDate(plan.start_date)} · ${plannedDays} days/week` : 'No assigned plan'}
          </Typography>
        </div>
        {plan ? (
          <Link
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[12px] bg-accent px-4 text-[12.5px] font-bold text-accent-foreground transition-opacity hover:opacity-90"
            to={`/library/training-plans/${plan.id}`}
          >
            Edit plan
          </Link>
        ) : (
          <PlanAssignControl
            clientId={clientId}
            clientName={clientName}
            kind="training"
            label="Assign training plan"
          />
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-72 rounded-[18px]" />
      ) : isError ? (
        <Typography
          color="muted"
          type="body-sm"
        >
          Couldn&apos;t load training plan.
        </Typography>
      ) : plan ? (
        <>
          <Typography
            className="mb-2.5 text-[11px] text-accent uppercase tracking-[0.06em]"
            weight="bold"
          >
            Current plan
          </Typography>
          <div className="rounded-[16px] border-[1.5px] border-separator bg-surface p-4 lg:rounded-[18px] lg:p-5">
            <div className="mb-4 flex items-center gap-3 border-b border-surface-secondary pb-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-[11px] bg-accent-soft text-accent lg:size-[42px] lg:rounded-[12px]">
                <Dumbbell size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <Typography
                  truncate
                  type="body-sm"
                  weight="bold"
                >
                  {plan.name}
                </Typography>
                <Typography
                  className="mt-0.5"
                  color="muted"
                  truncate
                  type="body-xs"
                >
                  {progress?.weekLabel} · {plannedDays} days/week
                </Typography>
              </div>
              {status ? (
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${softStatusClass(plan.status)}`}>
                  {status.label}
                </span>
              ) : null}
            </div>

            <div className="border-b border-surface-secondary pb-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <Typography
                  type="body-sm"
                  weight="semibold"
                >
                  Program completion
                </Typography>
                <Typography
                  className="text-accent"
                  type="body-xs"
                  weight="bold"
                >
                  {progress?.weekLabel}
                </Typography>
              </div>
              <ProgramSegments
                percent={progress?.percent ?? null}
                totalWeeks={progress?.totalWeeks ?? null}
              />
              <div className="mt-3 flex flex-col gap-1 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
                <span>{progress?.percent == null ? 'Completion unavailable' : `${progress.percent}% complete`}</span>
                <span>{progress?.endsLabel}</span>
              </div>
            </div>

            <div className="pt-4">
              <SessionStrip
                completed={completed}
                total={plannedDays}
              />
            </div>
          </div>
        </>
      ) : (
        <Typography
          color="muted"
          type="body-sm"
        >
          No training plan assigned yet.
        </Typography>
      )}
    </section>
  );
}
