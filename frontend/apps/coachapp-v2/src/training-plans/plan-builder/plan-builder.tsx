import {Button, Chip, Spinner} from '@heroui/react';
import {ArrowLeft} from 'lucide-react';
import {useParams} from 'react-router-dom';

import ClientPlanBanner from '@/@components/client-plan-banner';
import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {useGetTrainingPlanQuery} from '@/api/trainingPlans';
import {formatIsoDate} from '@/utils';

import {PlanActions} from './plan-actions';
import {PlanAddToClient} from './plan-add-to-client';

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
      <PageLayout title="Training Plan">
        <div className="flex items-center justify-center py-20">
          <Spinner color="accent" />
        </div>
      </PageLayout>
    );
  }

  if (isError || !data) {
    return (
      <PageLayout title="Training Plan">
        <div className="mb-4">
          <Button
            onPress={goBack}
            size="sm"
            variant="ghost"
          >
            <ArrowLeft size={16} />
            Back
          </Button>
        </div>
        <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 text-center text-sm text-danger">
          Failed to load training plan. It may not exist or you don&apos;t have access.
        </div>
      </PageLayout>
    );
  }

  const plan = data.data;
  const status = STATUS_MAP[plan?.status];
  // Defensive: matches both `null` and `undefined` in case the backend omits the key.
  const isTemplate = !plan.client_id;

  return (
    <PageLayout title="Training Plan">
      <div className="mb-4 flex items-center justify-between gap-2 min-w-0 max-w-4xl">
        <Button
          className="min-h-11"
          onPress={goBack}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Back
        </Button>
        <div className="flex items-center gap-1.5">
          <PlanAddToClient plan={plan} />
          <PlanActions
            onDeleted={() => goBack()}
            plan={plan}
          />
        </div>
      </div>

      <div className="min-w-0 max-w-4xl overflow-hidden">
        {plan.client ? (
          <ClientPlanBanner
            client={plan.client}
            endDate={plan.end_date}
            startDate={plan.start_date}
          />
        ) : null}

        <div className="pb-6">
          <h2 className="text-lg font-semibold">{plan.name}</h2>
          {plan.description && <p className="mt-1 text-sm text-foreground-500">{plan.description}</p>}
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
            <div className="mt-2 flex gap-4 text-sm text-foreground-500">
              <span>Start: {plan.start_date ? formatIsoDate(plan.start_date) : '\u2014'}</span>
              <span>End: {plan.end_date ? formatIsoDate(plan.end_date) : '\u2014'}</span>
            </div>
          ) : null}
        </div>

        {/* Weekly schedule — section header + summary are rendered inside WeeklyOverview */}
        <section className="border-t border-divider py-4"></section>

        <section className="border-t border-divider py-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-400">Workouts</h3>
            </div>
          </div>

          <p className="mb-3 text-sm text-foreground-400">
            No workouts yet. Create your first workout to start building this plan.
          </p>

          <div className="mt-3"></div>
        </section>

        <section className="border-t border-divider py-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground-400">Details</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-foreground-400">Created</p>
              <p>{formatIsoDate(plan.inserted_at)}</p>
            </div>
            <div>
              <p className="text-xs text-foreground-400">Last updated</p>
              <p>{formatIsoDate(plan.updated_at)}</p>
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
