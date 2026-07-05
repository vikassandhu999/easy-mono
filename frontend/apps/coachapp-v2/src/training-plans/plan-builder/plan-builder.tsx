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
import {PlanHeader} from './plan-header';
import {WeekSchedule} from './week-schedule';
import {WorkoutList} from './workout-list';

export default function TrainingPlanDetail() {
  const {id} = useParams<{id: string}>();
  const goBack = useGoBack(ROUTES.TRAINING_PLANS);
  const {data, isError, isLoading} = useGetTrainingPlanQuery({id: id!});

  if (isLoading) {
    return (
      <Page>
        <Page.Header className="py-3! items-center">
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
        <Page.Header className="py-3! items-center">
          <BackButton onPress={goBack} />
        </Page.Header>
        <Page.Content className="px-4 pt-4 md:px-6 lg:px-8">
          <ErrorState message="Couldn't load training plan. It may not exist or you don't have access." />
        </Page.Content>
      </Page>
    );
  }

  const plan = data.data;

  return (
    <Page>
      {/* Nav bar — back + plan actions. Inner wrapper (not Page.Header itself)
          carries max-w-2xl so it aligns with the content column below —
          Page.Header's own padding would otherwise eat into that width. */}
      <Page.Header className="py-3!">
        <div className="flex w-full max-w-2xl items-center justify-between gap-3">
          <BackButton onPress={goBack} />
          <div className="flex gap-2">
            <PlanAddToClient plan={plan} />
            <PlanActions
              onDeleted={() => goBack()}
              plan={plan}
            />
          </div>
        </div>
      </Page.Header>

      <Page.Content className="px-4 md:px-6 lg:px-8">
        {/* Layout A — single centred column, max-w-2xl */}
        <div className="w-full max-w-2xl">
          {/* 1. Plan header: inline name + dates → autosave */}
          <PlanHeader plan={plan} />

          {/* 2. Workout list: accordion, add workout, empty state */}
          <WorkoutList planId={plan.id} />

          {/* 3. Week schedule: day → workout assignment */}
          <WeekSchedule planId={plan.id} />
        </div>
      </Page.Content>
    </Page>
  );
}
