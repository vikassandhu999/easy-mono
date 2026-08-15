import {Button, Chip, toast} from '@heroui/react';
import {Dumbbell} from 'lucide-react';
import {useEffect, useState} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';

import {toastMutationError} from '@/@components/mutation-toast';
import SectionHeading from '@/@components/section-heading';
import {ROUTES} from '@/@config/routes';
import type {Client} from '@/api/clients';
import {clientPlanLifecycleLabel, trainingPlanRevisionRequest} from '@/api/training-plan-lifecycle';
import {
  type ClientTrainingPlan,
  useArchiveTrainingPlanMutation,
  useCoachClientTrainingPlansInfiniteQuery,
  useCoachClientTrainingSessionsInfiniteQuery,
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

/** CD-TR: active and archived Client Plans, then session history grouped by week. */
export function TrainingTab({client}: {client: Client}) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [assignFromUrl] = useState(() => params.get('assign') === 'plan');
  const [assignOpen, setAssignOpen] = useState(assignFromUrl);
  const [showArchived, setShowArchived] = useState(false);
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
  const plans = useCoachClientTrainingPlansInfiniteQuery(client.id, {status: 'active'});
  const archivedPlans = useCoachClientTrainingPlansInfiniteQuery(
    client.id,
    {status: 'archived'},
    {enabled: showArchived},
  );
  // An eight-week window can hold more than the server's 20-row page cap, so
  // this list paginates and "Show more" walks the rest of the window.
  const sessions = useCoachClientTrainingSessionsInfiniteQuery(client.id, {
    from: window[0]!,
    to: window[window.length - 1]!,
  });

  const activePlans = plans.data?.pages.flatMap((page) => page.data) ?? [];
  const archivedPlanRows = archivedPlans.data?.pages.flatMap((page) => page.data) ?? [];

  const endPlan = async (plan: ClientTrainingPlan) => {
    try {
      await archivePlanMutation.mutateAsync({id: plan.id, body: trainingPlanRevisionRequest(plan)});
    } catch (err) {
      const handled = await handleStaleTrainingPlanConflict(err, {
        refetchLatest: async () =>
          (await plans.refetch()).data?.pages.flatMap((page) => page.data).find(({id}) => id === plan.id),
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

  const planMeta = (plan: ClientTrainingPlan) => {
    const scheduledDays = Object.values(plan.schedule).filter(Boolean).length;

    return [
      clientPlanLifecycleLabel(plan.lifecycle),
      plan.start_date ? `Started ${formatDayMonth(plan.start_date)}` : null,
      scheduledDays ? `${scheduledDays} days a week` : null,
    ]
      .filter(Boolean)
      .join(' · ');
  };

  // Newest first, which is the order the design lists them in.
  const rows = (sessions.data?.pages.flatMap((page) => page.data) ?? [])
    .filter((s) => s.date)
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

  // Group headers are "This week" / "Last week" / "Week of 7 Jul"; a header is
  // emitted only when the group changes, so the list stays flat.
  let lastGroup: null | string = null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button
          onPress={() => setAssignOpen(true)}
          size="sm"
          variant="outline"
        >
          Assign plan
        </Button>
        <PlanAssignControl
          clientId={client.id}
          clientName={client.first_name ?? 'this client'}
          isOpen={assignOpen}
          kind="training"
          onOpenChange={setAssignOpen}
        />
      </div>

      {activePlans.length === 0 ? (
        <PlanPanel
          icon={Dumbbell}
          emptyBody={`Assign a plan so ${client.first_name ?? 'this client'} sees workouts in their app.`}
          emptyTitle="No training plan"
        />
      ) : (
        activePlans.map((plan) => (
          <PlanPanel
            key={plan.id}
            icon={Dumbbell}
            emptyBody=""
            emptyTitle=""
            isEnding={archivePlanMutation.isPending}
            meta={planMeta(plan)}
            name={plan.name}
            onEnd={() => endPlan(plan)}
            onOpen={() => navigate(ROUTES.TRAINING_PLAN_DETAIL.replace(':id', plan.id))}
          />
        ))
      )}

      {plans.hasNextPage && (
        <div className="flex justify-center">
          <Button
            isPending={plans.isFetchingNextPage}
            onPress={() => plans.fetchNextPage()}
            size="sm"
            variant="ghost"
          >
            Show more plans
          </Button>
        </div>
      )}

      <div className="flex justify-start">
        <Button
          isPending={showArchived && archivedPlans.isPending}
          onPress={() => setShowArchived((shown) => !shown)}
          size="sm"
          variant="ghost"
        >
          {showArchived ? 'Hide archived plans' : 'Show archived plans'}
        </Button>
      </div>
      {showArchived &&
        archivedPlanRows.map((plan) => (
          <PlanPanel
            key={plan.id}
            icon={Dumbbell}
            emptyBody=""
            emptyTitle=""
            meta={planMeta(plan)}
            name={plan.name}
            onOpen={() => navigate(ROUTES.TRAINING_PLAN_DETAIL.replace(':id', plan.id))}
          />
        ))}
      {showArchived && archivedPlans.hasNextPage && (
        <div className="flex justify-center">
          <Button
            isPending={archivedPlans.isFetchingNextPage}
            onPress={() => archivedPlans.fetchNextPage()}
            size="sm"
            variant="ghost"
          >
            Show more archived plans
          </Button>
        </div>
      )}

      {rows.length > 0 && (
        <SectionCard divided>
          {rows.map((session) => {
            const group = weekGroupLabel(session.date!);
            const isNewGroup = group !== lastGroup;
            lastGroup = group;
            const setCount = session.performed_sets.length;
            const exerciseCount = new Set(session.performed_sets.map((s) => s.exercise_id)).size;
            const duration = formatCompactDuration(session.started_at, session.closed_at);
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
                    title={sessionWorkoutName(session)}
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
