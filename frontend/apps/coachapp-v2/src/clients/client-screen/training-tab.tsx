import {Button, Chip, toast} from '@heroui/react';
import {Dumbbell} from 'lucide-react';
import {useEffect, useState} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';

import {toastMutationError} from '@/@components/mutation-toast';
import SectionHeading from '@/@components/section-heading';
import {ROUTES} from '@/@config/routes';
import type {Client} from '@/api/clients';
import {trainingPlanRevisionRequest} from '@/api/training-plan-lifecycle';
import {
  useArchiveTrainingPlanMutation,
  useCoachClientTrainingSessionsInfiniteQuery,
  useListCoachClientTrainingPlansQuery,
} from '@/api/training-plans-list';
import {PlanPanel} from '@/clients/client-screen/plan-panel';
import {DetailRow} from '@/clients/components/detail-row';
import PlanAssignControl from '@/clients/components/plan-assign-control';
import {SectionCard} from '@/clients/components/section-card';
import {
  formatCompactDuration,
  formatDayMonth,
  formatRowDate,
  lastNDays,
  weekGroupLabel,
} from '@/clients/lib/client-detail-data';
import {sessionWorkoutName} from '@/clients/lib/session';
import {handleStaleTrainingPlanConflict} from '@/training-plans/lib/stale-training-plan-conflict';

/** CD-TR: the active plan, then session history grouped by week. */
export function TrainingTab({client}: {client: Client}) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [assignFromUrl] = useState(() => params.get('assign') === 'plan');
  const archivePlanMutation = useArchiveTrainingPlanMutation();

  useEffect(() => {
    if (params.get('assign') !== 'plan') {
      return;
    }
    const next = new URLSearchParams(params);
    next.delete('assign');
    setParams(next, {replace: true});
  }, [params, setParams]);

  const window = lastNDays(56);
  const plans = useListCoachClientTrainingPlansQuery(client.id, {status: 'active'});
  // An eight-week window can hold more than the server's 20-row page cap, so
  // this list paginates and "Show more" walks the rest of the window.
  const sessions = useCoachClientTrainingSessionsInfiniteQuery(client.id, {
    from: window[0]!,
    to: window[window.length - 1]!,
  });

  const plan = plans.data?.data?.[0];

  const endPlan = async () => {
    if (!plan) {
      return;
    }

    try {
      await archivePlanMutation.mutateAsync({id: plan.id, body: trainingPlanRevisionRequest(plan)});
    } catch (err) {
      const handled = await handleStaleTrainingPlanConflict(err, {
        refetchLatest: async () => (await plans.refetch()).data?.data?.[0],
        notify: (message) => {
          toast.info(message, {timeout: 4000});
        },
      });

      if (handled) {
        return;
      }

      toastMutationError(err, "The Client Plan wasn't ended. Try again.");
    }
  };

  const scheduledDays = plan ? Object.values(plan.schedule).filter(Boolean).length : 0;
  // A session records WHICH workout it performed, not its name, and
  // `planned_snapshot` is null on sessions logged against a live plan. The name
  // comes from the plan's own workouts. A session against an archived plan will not
  // be in this map, which is what the fallback is for.
  const workoutNames = new Map((plan?.workouts ?? []).map((w) => [w.id, w.name]));

  // Newest first, which is the order the design lists them in.
  const rows = (sessions.data?.pages.flatMap((page) => page.data) ?? [])
    .filter((s) => s.date)
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

  // Group headers are "This week" / "Last week" / "Week of 7 Jul"; a header is
  // emitted only when the group changes, so the list stays flat.
  let lastGroup: null | string = null;

  return (
    <div className="flex flex-col gap-4">
      <PlanPanel
        icon={Dumbbell}
        defaultAssignOpen={assignFromUrl}
        emptyBody={`Assign a plan so ${client.first_name ?? 'this client'} sees workouts in their app.`}
        emptyTitle="No training plan"
        meta={
          plan
            ? [
                plan.start_date ? `Started ${formatDayMonth(plan.start_date)}` : null,
                scheduledDays ? `${scheduledDays} days a week` : null,
              ]
                .filter(Boolean)
                .join(' · ')
            : null
        }
        assign={(control) => (
          <PlanAssignControl
            {...control}
            clientId={client.id}
            clientName={client.first_name ?? 'this client'}
            kind="training"
          />
        )}
        assignLabel="Assign plan"
        isEnding={archivePlanMutation.isPending}
        name={plan?.name}
        onEnd={plan ? endPlan : undefined}
        onOpen={plan ? () => navigate(ROUTES.TRAINING_PLAN_DETAIL.replace(':id', plan.id)) : undefined}
      />

      {rows.length > 0 && (
        <SectionCard divided>
          {rows.map((session) => {
            const group = weekGroupLabel(session.date!);
            const isNewGroup = group !== lastGroup;
            lastGroup = group;
            const setCount = session.performed_sets.length;
            const exerciseCount = new Set(session.performed_sets.map((s) => s.exercise_id)).size;
            const duration = formatCompactDuration(session.started_at, session.ended_at);
            const isDone = session.state === 'completed';

            return (
              <div key={session.id}>
                {isNewGroup && (
                  <SectionHeading
                    className="px-4 pt-4 pb-1"
                    title={group}
                  />
                )}
                <div className="px-2">
                  <DetailRow
                    leading={formatRowDate(session.date!)}
                    meta={
                      isDone
                        ? [
                            `${exerciseCount} exercises`,
                            `${setCount} sets`,
                            duration,
                            session.soreness_rating != null ? `Soreness ${session.soreness_rating}/5` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')
                        : 'No session logged'
                    }
                    title={sessionWorkoutName(session, workoutNames)}
                    to={
                      isDone
                        ? ROUTES.CLIENT_SESSION_DETAIL.replace(':clientId', client.id).replace(':sessionId', session.id)
                        : undefined
                    }
                    tone={isDone ? 'default' : 'muted'}
                    trailing={
                      <Chip
                        color={isDone ? 'success' : 'danger'}
                        size="sm"
                        variant="soft"
                      >
                        {isDone ? 'Completed' : 'Missed'}
                      </Chip>
                    }
                  />
                </div>
              </div>
            );
          })}
          {sessions.hasNextPage && (
            <div className="flex justify-center p-3">
              <Button
                isPending={sessions.isFetchingNextPage}
                onPress={() => sessions.fetchNextPage()}
                size="sm"
                variant="outline"
              >
                Show more
              </Button>
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}
