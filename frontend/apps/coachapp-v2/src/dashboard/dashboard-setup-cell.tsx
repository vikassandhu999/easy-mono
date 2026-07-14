import {Button, Skeleton, Typography, toast} from '@heroui/react';
import {ArrowRight, Check, ClipboardCheck, Dumbbell, type LucideIcon, UserPlus, X} from 'lucide-react';
import {type ReactNode, useEffect, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {ROUTES} from '@/@config/routes';
import {useListClientsQuery} from '@/api/clients';
import {useListNutritionPlansQuery} from '@/api/nutrition-plans-list';
import {useUpdateDashboardSetupMutation} from '@/api/profile';
import {useListTrainingPlansQuery} from '@/api/training-plans-list';

type HiddenReason = 'completed' | 'dismissed' | null;

type SetupStep = {
  description: string;
  done: boolean;
  icon: LucideIcon;
  key: 'assign' | 'client' | 'plan';
  label: string;
  route: string;
};

type SetupProgress =
  | {status: 'error'; retry: () => void}
  | {status: 'loading'}
  | {doneCount: number; status: 'ready'; steps: SetupStep[]};

function useDashboardSetupProgress(skip: boolean): SetupProgress {
  const clients = useListClientsQuery({limit: 100}, {skip});
  const trainingPlans = useListTrainingPlansQuery({limit: 1}, {skip});
  const nutritionPlans = useListNutritionPlansQuery({limit: 1}, {skip});

  if (
    clients.isLoading ||
    clients.isFetching ||
    trainingPlans.isLoading ||
    trainingPlans.isFetching ||
    nutritionPlans.isLoading ||
    nutritionPlans.isFetching
  ) {
    return {status: 'loading'};
  }

  if (clients.isError || trainingPlans.isError || nutritionPlans.isError) {
    return {
      status: 'error',
      retry: () => {
        if (clients.isError) {
          clients.refetch();
        }
        if (trainingPlans.isError) {
          trainingPlans.refetch();
        }
        if (nutritionPlans.isError) {
          nutritionPlans.refetch();
        }
      },
    };
  }

  const clientRows = clients.data?.data ?? [];
  const clientNeedingPlan = clientRows.find((client) => client.needs_plan);
  const hasClient = (clients.data?.count ?? 0) > 0;
  const hasPlan = (trainingPlans.data?.count ?? 0) > 0 || (nutritionPlans.data?.count ?? 0) > 0;
  const hasAssignedPlan = clientRows.some((client) => !client.needs_plan);

  const steps: SetupStep[] = [
    {
      description: 'Invite a client to start coaching.',
      done: hasClient,
      icon: UserPlus,
      key: 'client',
      label: 'Invite your first client',
      route: ROUTES.INVITE_CLIENT,
    },
    {
      description: 'Create a training or nutrition plan.',
      done: hasPlan,
      icon: Dumbbell,
      key: 'plan',
      label: 'Build your first plan',
      route: ROUTES.CREATE_TRAINING_PLAN,
    },
    {
      description: 'Give a client an active plan.',
      done: hasAssignedPlan,
      icon: ClipboardCheck,
      key: 'assign',
      label: 'Assign a plan to a client',
      route: clientNeedingPlan ? ROUTES.CLIENT_DETAIL.replace(':id', clientNeedingPlan.id) : ROUTES.CLIENTS,
    },
  ];

  return {doneCount: steps.filter((step) => step.done).length, status: 'ready', steps};
}

function SetupShell({children, onDismiss, subtitle}: {children: ReactNode; onDismiss: () => void; subtitle: string}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 flex-col">
          <Typography weight="semibold">Get set up</Typography>
          <Typography
            color="muted"
            type="body-xs"
          >
            {subtitle}
          </Typography>
        </div>
        <Button
          aria-label="Dismiss getting started"
          className="-me-2 size-11 min-w-11 shrink-0 text-muted"
          isIconOnly
          onPress={onDismiss}
          variant="ghost"
        >
          <X size={16} />
        </Button>
      </div>
      {children}
    </section>
  );
}

function SetupCellSkeleton({onDismiss}: {onDismiss: () => void}) {
  return (
    <SetupShell
      onDismiss={onDismiss}
      subtitle="Loading setup progress"
    >
      <div className="divide-y divide-border">
        {['client', 'plan', 'assign'].map((key) => (
          <div
            className="flex items-center gap-3 px-4 py-3"
            key={key}
          >
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40 rounded" />
              <Skeleton className="h-3 w-56 max-w-full rounded" />
            </div>
          </div>
        ))}
      </div>
    </SetupShell>
  );
}

function SetupCellError({onDismiss, onRetry}: {onDismiss: () => void; onRetry: () => void}) {
  return (
    <SetupShell
      onDismiss={onDismiss}
      subtitle="Setup progress unavailable"
    >
      <div className="flex items-center justify-between gap-4 px-4 py-4">
        <Typography
          color="muted"
          type="body-sm"
        >
          Couldn't load your setup progress.
        </Typography>
        <Button
          className="min-h-11 shrink-0"
          onPress={onRetry}
          size="sm"
          variant="secondary"
        >
          Retry
        </Button>
      </div>
    </SetupShell>
  );
}

function ReadySetupCell({doneCount, onDismiss, steps}: {doneCount: number; onDismiss: () => void; steps: SetupStep[]}) {
  const navigate = useNavigate();
  const orderedSteps = [...steps].sort((a, b) => Number(a.done) - Number(b.done));

  return (
    <SetupShell
      onDismiss={onDismiss}
      subtitle={`${doneCount} of ${steps.length} done`}
    >
      <ul className="divide-y divide-border">
        {orderedSteps.map((step) => (
          <li key={step.key}>
            <button
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-hover disabled:pointer-events-none"
              disabled={step.done}
              onClick={() => navigate(step.route)}
              type="button"
            >
              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                  step.done ? 'bg-accent/10 text-accent' : 'bg-surface-hover text-muted'
                }`}
              >
                {step.done ? <Check size={16} /> : <step.icon size={16} />}
              </span>
              <span className="flex min-w-0 flex-col">
                <Typography
                  className={step.done ? 'text-muted line-through' : undefined}
                  weight="medium"
                >
                  {step.label}
                </Typography>
                {!step.done ? (
                  <Typography
                    color="muted"
                    type="body-xs"
                  >
                    {step.description}
                  </Typography>
                ) : null}
              </span>
              {!step.done ? (
                <ArrowRight
                  className="ms-auto shrink-0 text-muted"
                  size={16}
                />
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </SetupShell>
  );
}

export function DashboardSetupCell({hiddenReason}: {hiddenReason: HiddenReason}) {
  const [locallyCompleted, setLocallyCompleted] = useState(false);
  const [locallyDismissed, setLocallyDismissed] = useState(false);
  const [updateDashboardSetup] = useUpdateDashboardSetupMutation();
  const completionAttempted = useRef(false);
  const hidden = hiddenReason !== null || locallyCompleted || locallyDismissed;
  const progress = useDashboardSetupProgress(hidden);

  useEffect(() => {
    if (
      hidden ||
      completionAttempted.current ||
      progress.status !== 'ready' ||
      progress.doneCount !== progress.steps.length
    ) {
      return;
    }

    completionAttempted.current = true;
    updateDashboardSetup({
      dashboardSetupUpdateRequest: {dashboard_setup_hidden_reason: 'completed'},
    })
      .unwrap()
      .then(() => setLocallyCompleted(true))
      .catch(() => toast.danger("Couldn't save setup completion. Try again later."));
  }, [hidden, progress, updateDashboardSetup]);

  const dismiss = () => {
    setLocallyDismissed(true);
    let undoRequested = false;

    const dismissRequest = updateDashboardSetup({
      dashboardSetupUpdateRequest: {dashboard_setup_hidden_reason: 'dismissed'},
    }).unwrap();

    const toastId = toast.info('Setup guide dismissed.', {
      timeout: 5000,
      actionProps: {
        children: 'Undo',
        onPress: () => {
          undoRequested = true;
          setLocallyDismissed(false);

          dismissRequest
            .then(() =>
              updateDashboardSetup({
                dashboardSetupUpdateRequest: {dashboard_setup_hidden_reason: null},
              }).unwrap(),
            )
            .catch(() => {
              setLocallyDismissed(true);
              toast.danger("Couldn't restore the setup guide.");
            });
        },
      },
    });

    dismissRequest.catch(() => {
      if (!undoRequested) {
        toast.close(toastId);
        setLocallyDismissed(false);
        toast.danger("Couldn't dismiss the setup guide.");
      }
    });
  };

  if (hidden) {
    return null;
  }

  if (progress.status === 'loading') {
    return <SetupCellSkeleton onDismiss={dismiss} />;
  }

  if (progress.status === 'error') {
    return (
      <SetupCellError
        onDismiss={dismiss}
        onRetry={progress.retry}
      />
    );
  }

  return (
    <ReadySetupCell
      doneCount={progress.doneCount}
      onDismiss={dismiss}
      steps={progress.steps}
    />
  );
}
