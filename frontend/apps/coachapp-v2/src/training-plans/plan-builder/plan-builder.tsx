/**
 * TrainingPlanDetail — the training plan builder screen (badge TB).
 *
 * Workout-first: the header carries `{plan} — {client}` plus its actions, and
 * the body is the active workout — workout tabs, weekday scheduling, exercises
 * and their sets. Everything below the header lives in `WorkoutList`.
 *
 * Plan name and dates are edited on the plan edit screen (badge TE), reachable
 * from the ⋯ menu — the builder no longer repeats that form (mirrors NB).
 */
import {useParams} from 'react-router-dom';

import {BackButton} from '@/@components/back-button';
import {ErrorState} from '@/@components/error-state';
import {Page} from '@/@components/page';
import {PageSkeleton} from '@/@components/page-skeleton';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useGetTrainingPlanQuery} from '@/api/generated';

import {PlanActions} from './plan-actions';
import {PlanAddToClient} from './plan-add-to-client';
import {PlanDates} from './plan-dates';
import {WorkoutList} from './workout-list';

export default function TrainingPlanDetail() {
  const {id} = useParams<{id: string}>();
  const goBack = useGoBack(ROUTES.TRAINING_PLANS);
  const {data, isError, isLoading} = useGetTrainingPlanQuery({id: id!});

  if (isLoading) {
    return (
      <Page>
        <Page.Header size="wide">
          <BackButton onPress={goBack} />
        </Page.Header>
        <Page.Content>
          <PageSkeleton />
        </Page.Content>
      </Page>
    );
  }

  if (isError || !data) {
    return (
      <Page>
        <Page.Header size="wide">
          <BackButton onPress={goBack} />
        </Page.Header>
        <Page.Content bare>
          <Page.Frame size="wide">
            <ErrorState message="Couldn't load training plan. It may not exist or you don't have access." />
          </Page.Frame>
        </Page.Content>
      </Page>
    );
  }

  const plan = data.data;
  // COPY.md § TB — the title is `{plan} — {client}` once the plan is assigned.
  const clientName = plan.client ? `${plan.client.first_name} ${plan.client.last_name}`.trim() : null;
  const title = clientName ? `${plan.name} — ${clientName}` : plan.name;

  return (
    <Page>
      <Page.Header size="wide">
        <Page.TitleGroup className="flex min-w-0 items-center gap-2">
          <BackButton onPress={goBack} />
          <Page.Title>{title}</Page.Title>
        </Page.TitleGroup>
        <Page.Actions>
          <PlanAddToClient plan={plan} />
          <PlanActions
            onDeleted={() => goBack()}
            plan={plan}
          />
        </Page.Actions>
      </Page.Header>

      <Page.Content className="pb-10">
        <Page.Frame
          className="flex flex-col gap-3"
          size="wide"
        >
          <PlanDates plan={plan} />
          <WorkoutList planId={plan.id} />
        </Page.Frame>
      </Page.Content>
    </Page>
  );
}
