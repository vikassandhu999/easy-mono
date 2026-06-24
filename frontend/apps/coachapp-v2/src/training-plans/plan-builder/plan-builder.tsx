import {formatDateLong, formatIsoDate} from '@easy/utils';
import {Button, Chip, Spinner, Typography} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useParams} from 'react-router-dom';
import {Page} from '@/@components/page';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useGetTrainingPlanQuery} from '@/api/trainingPlans';

import {PinnedWeekBar} from './pinned-week-bar';
import {PlanActions} from './plan-actions';
import {PlanAddToClient} from './plan-add-to-client';
import {WeekSchedule} from './week-schedule';
import {WorkoutList} from './workout-list';

const STATUS_MAP = {
  active: {color: 'success', label: 'Active'},
  archived: {color: 'warning', label: 'Archived'},
} as const;

export default function TrainingPlanDetail() {
  const {id} = useParams<{id: string}>();
  const goBack = useGoBack(ROUTES.TRAINING_PLANS);
  const {data, isError, isLoading} = useGetTrainingPlanQuery(id!);

  if (isLoading) {
    return (
      <Page>
        <Page.Header className="pt-4 pb-2">
          <Page.TitleGroup>
            <Page.Title>Training Plan</Page.Title>
          </Page.TitleGroup>
        </Page.Header>
        <Page.Content>
          <div className="flex items-center justify-center py-20">
            <Spinner color="accent" />
          </div>
        </Page.Content>
      </Page>
    );
  }

  if (isError || !data) {
    return (
      <Page>
        <Page.Header className="pt-4 pb-2">
          <Page.TitleGroup>
            <Page.Title>Training Plan</Page.Title>
          </Page.TitleGroup>
          <Page.Actions>
            <Button
              onPress={goBack}
              size="sm"
              variant="ghost"
            >
              <ArrowLeft size={16} />
              Back
            </Button>
          </Page.Actions>
        </Page.Header>
        <Page.Content>
          <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 text-center text-sm text-danger">
            Failed to load training plan. It may not exist or you don&apos;t have access.
          </div>
        </Page.Content>
      </Page>
    );
  }

  const plan = data.data;
  const status = STATUS_MAP[plan?.status];
  // Defensive: matches both `null` and `undefined` in case the backend omits the key.
  const isTemplate = !plan.client_id;

  return (
    <Page>
      <Page.Header className="py-4 max-w-4xl sm:py-8 items-center">
        <Button
          className={'-ml-3'}
          onPress={goBack}
          size={'sm'}
          variant={'ghost'}
        >
          <ArrowLeft size={18} />
          Back
        </Button>
        <div className={'flex gap-2'}>
          <PlanAddToClient plan={plan} />
          <PlanActions
            onDeleted={() => goBack()}
            plan={plan}
          />
        </div>
      </Page.Header>
      <Page.Toolbar className={'flex items-center justify-between max-w-4xl'}>
        <div>
          <Typography type="h5">{plan.name}</Typography>
          {plan.description && (
            <Typography
              className="mt-1"
              color="muted"
              type="body-sm"
            >
              {plan.description}
            </Typography>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip
              color={status?.color}
              size="sm"
              variant="soft"
            >
              {status?.label}
            </Chip>
            {isTemplate ? (
              <Chip
                color="default"
                size="sm"
                variant="soft"
              >
                Template
              </Chip>
            ) : null}
          </div>
          {/* Start / End dates — hidden when the client banner already shows them */}
          {!plan.client && (plan.start_date || plan.end_date) ? (
            <div className="mt-2 flex gap-4">
              <Typography
                color="muted"
                type="body-sm"
              >
                Start: {plan.start_date ? formatDateLong(plan.start_date) : '\u2014'}
              </Typography>
              <Typography
                color="muted"
                type="body-sm"
              >
                End: {plan.end_date ? formatDateLong(plan.end_date) : '\u2014'}
              </Typography>
            </div>
          ) : null}
        </div>
      </Page.Toolbar>
      <Page.Content className={'px-4 md:px-6 lg:px-8'}>
        <PinnedWeekBar planId={plan.id} />
        <div className="min-w-0 max-w-4xl overflow-hidden">
          <WorkoutList planId={plan.id} />

          <section className="border-t border-divider py-4">
            <Typography
              className="mb-3 uppercase tracking-wider"
              color="muted"
              type="body-xs"
              weight="semibold"
            >
              Week Schedule
            </Typography>
            <WeekSchedule planId={plan.id} />
          </section>

          <section className="border-t border-divider py-4">
            <Typography
              className="mb-2 uppercase tracking-wider"
              color="muted"
              type="body-xs"
              weight="semibold"
            >
              Details
            </Typography>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Typography
                  color="muted"
                  type="body-xs"
                >
                  Created
                </Typography>
                <Typography type="body-sm">{formatIsoDate(plan.inserted_at)}</Typography>
              </div>
              <div>
                <Typography
                  color="muted"
                  type="body-xs"
                >
                  Last updated
                </Typography>
                <Typography type="body-sm">{formatIsoDate(plan.updated_at)}</Typography>
              </div>
            </div>
          </section>
        </div>
      </Page.Content>
    </Page>
  );
}
