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
import {useParams} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
import {ErrorState} from '@/@components/error-state';
import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useGetTrainingPlanQuery} from '@/api/training-plan-builder';

import {PlanActions} from './plan-actions';
import {PlanAddToClient} from './plan-add-to-client';
import {PlanBuilder} from './plan-builder';

export default function TrainingPlanBuilderScreen() {
  const {id} = useParams<{id: string}>();
  const goBack = useGoBack(ROUTES.TRAINING_PLANS);
  const {data, isError, isLoading} = useGetTrainingPlanQuery(id ?? '');

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
            <ErrorState message="Couldn't load training plan. It may not exist or you don't have access." />
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
        size="wide"
      >
        <Page.TitleGroup className="flex min-w-0 items-center">
          <BackButton
            onPress={goBack}
            testId="tb-back"
          />
          {/* Not Page.Title: `.typography--h3` is unlayered, so its letter-spacing
              beats any utility and the design's -0.02em can't be applied there. */}
          <span
            className="min-w-0 flex-1 truncate font-grotesk type-display font-semibold tracking-title text-foreground"
            data-testid="tb-title"
          >
            {clientName ? `${plan.name} — ${clientName}` : plan.name}
          </span>
        </Page.TitleGroup>
        <Page.Actions>
          <PlanAddToClient plan={plan} />
          <PlanActions
            onDeleted={() => goBack()}
            plan={plan}
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
      <Page.Header size="wide">
        <BackButton onPress={onBack} />
      </Page.Header>
      {children}
    </Page>
  );
}
