/**
 * The training plan builder screen (badge TB).
 *
 * This file is the shell only: fetch the plan once, draw the header, and hand
 * the loaded plan to `PlanBuilder`. Everything the builder reads comes from that
 * single query — `getTrainingPlan` returns the workouts, their exercises, the
 * planned sets and the weekday schedule together.
 *
 * Plan name and dates are edited on the plan edit screen (badge TE), reachable
 * from the ⋯ menu; the builder doesn't repeat that form (mirrors NB).
 */
import type {ReactNode} from 'react';
import {useGetTrainingPlanQuery} from '@/api/training-plan-builder';
import {PlanActions} from '@/library/training-plans/builder/plan-actions';
import {PlanAddToClient} from '@/library/training-plans/builder/plan-add-to-client';
import {PlanBuilder} from '@/library/training-plans/builder/plan-builder';
import {ROUTES} from '@/routes';
import {BackButton} from '@/ui/back-button';
import {ErrorState} from '@/ui/error-state';
import {Page} from '@/ui/page';
import {PageSkeleton} from '@/ui/page-skeleton';
import {useGoBack} from '@/ui/use-go-back';
import {useRouteParam} from '@/ui/use-route-param';

export default function TrainingPlanBuilderScreen() {
  const id = useRouteParam('id');
  const goBack = useGoBack(ROUTES.TRAINING_PLANS);
  const {data, isError, isLoading, refetch} = useGetTrainingPlanQuery(id);

  if (isLoading) {
    return (
      <PlainShell onBack={goBack}>
        <Page.Content>
          <PageSkeleton />
        </Page.Content>
      </PlainShell>
    );
  }

  if (isError || !data) {
    return (
      <PlainShell onBack={goBack}>
        <Page.Content bare>
          <Page.Frame size="builder">
            <ErrorState
              message="Couldn't load training plan. It may not exist or you don't have access."
              onRetry={refetch}
            />
          </Page.Frame>
        </Page.Content>
      </PlainShell>
    );
  }

  const plan = data.data;
  // COPY.md § TB — the title is `{plan} — {client}` once the plan is assigned.
  const clientName = plan.client ? `${plan.client.first_name} ${plan.client.last_name}`.trim() : null;

  return (
    <Page className="text-foreground leading-[normal]">
      <Page.Header
        className="gap-3"
        size="builder"
      >
        <Page.TitleGroup className="flex min-w-0 items-center">
          <BackButton
            onPress={goBack}
            testId="tb-back"
          />
          <Page.Title testId="tb-title">{clientName ? `${plan.name} — ${clientName}` : plan.name}</Page.Title>
        </Page.TitleGroup>
        <Page.Actions>
          <PlanAddToClient plan={plan} />
          <PlanActions
            onDeleted={() => goBack()}
            plan={plan}
            refetchLatest={async () => (await refetch()).data?.data}
          />
        </Page.Actions>
      </Page.Header>

      <Page.Content
        bare
        className="pb-10"
      >
        <Page.Frame size="builder">
          <PlanBuilder plan={plan} />
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}

/** Header parity across loading, error and loaded (AGENTS.md § Canonical Components). */
function PlainShell({onBack, children}: {onBack: () => void; children: ReactNode}) {
  return (
    <Page>
      <Page.Header size="builder">
        <BackButton onPress={onBack} />
      </Page.Header>
      {children}
    </Page>
  );
}
