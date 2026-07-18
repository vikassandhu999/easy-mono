import {Button, Skeleton, toast} from '@heroui/react';
import {ChevronRight, Rocket, X} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';
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
      key: 'client',
      label: 'Invite a client',
      route: ROUTES.INVITE_CLIENT,
    },
    {
      description: 'Create a training or nutrition plan.',
      done: hasPlan,
      key: 'plan',
      label: 'Build first plan',
      route: ROUTES.CREATE_TRAINING_PLAN,
    },
    {
      description: 'Give a client an active plan.',
      done: hasAssignedPlan,
      key: 'assign',
      label: 'Assign a plan',
      route: clientNeedingPlan ? ROUTES.CLIENT_DETAIL.replace(':id', clientNeedingPlan.id) : ROUTES.CLIENTS,
    },
  ];

  return {doneCount: steps.filter((step) => step.done).length, status: 'ready', steps};
}

function RocketTile() {
  return (
    <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] bg-accent-soft text-accent">
      <Rocket size={17} />
    </span>
  );
}

function DismissButton({onDismiss}: {onDismiss: () => void}) {
  return (
    <Button
      aria-label="Dismiss setup"
      className="size-9 min-w-9 shrink-0 text-muted"
      isIconOnly
      onPress={onDismiss}
      size="sm"
      variant="ghost"
    >
      <X size={15} />
    </Button>
  );
}

function SetupCellSkeleton({onDismiss}: {onDismiss: () => void}) {
  return (
    <section className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-3.5">
      <Skeleton className="size-[34px] shrink-0 rounded-[9px]" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-48 max-w-full rounded" />
        <Skeleton className="h-3 w-32 rounded" />
      </div>
      <DismissButton onDismiss={onDismiss} />
    </section>
  );
}

function SetupCellError({onDismiss, onRetry}: {onDismiss: () => void; onRetry: () => void}) {
  return (
    <section className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-3.5">
      <RocketTile />
      <p className="flex-1 text-sm text-muted">Couldn't load your setup progress.</p>
      <Button
        className="min-h-9 shrink-0"
        onPress={onRetry}
        size="sm"
        variant="secondary"
      >
        Retry
      </Button>
      <DismissButton onDismiss={onDismiss} />
    </section>
  );
}

function StepNode({state, step}: {state: 'current' | 'done' | 'upcoming'; step: SetupStep}) {
  const index = {assign: 3, client: 1, plan: 2}[step.key];

  return (
    <div
      className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-[11px] px-3 py-2 ${
        state === 'current' ? 'border-[1.5px] border-accent bg-surface' : state === 'upcoming' ? 'opacity-70' : ''
      }`}
    >
      <span
        className={`flex size-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
          state === 'done'
            ? 'bg-accent text-accent-foreground'
            : state === 'current'
              ? 'border-[1.5px] border-accent text-accent'
              : 'border-[1.5px] border-border text-muted'
        }`}
      >
        {state === 'done' ? '✓' : index}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[12.5px] font-semibold text-foreground">{step.label}</span>
        <span className={`block text-[11px] ${state === 'current' ? 'font-semibold text-accent' : 'text-muted'}`}>
          {state === 'done' ? 'Done' : state === 'current' ? 'In progress' : 'Up next'}
        </span>
      </span>
    </div>
  );
}

function ReadySetupCell({doneCount, onDismiss, steps}: {doneCount: number; onDismiss: () => void; steps: SetupStep[]}) {
  const navigate = useNavigate();
  const total = steps.length;
  const current = steps.find((step) => !step.done) ?? steps[total - 1];
  const nodeState = (step: SetupStep): 'current' | 'done' | 'upcoming' =>
    step.done ? 'done' : step === current ? 'current' : 'upcoming';

  return (
    <section className="rounded-2xl border border-border bg-surface p-3.5">
      {/* Mobile: tappable nudge with progress bar */}
      <button
        className="flex w-full items-center gap-3 text-left md:hidden"
        onClick={() => navigate(current?.route ?? ROUTES.CLIENTS)}
        type="button"
      >
        <RocketTile />
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold text-foreground">Get your workspace ready</span>
          <span className="mt-1.5 flex items-center gap-2.5">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
              <span
                className="block h-full rounded-full bg-accent"
                style={{width: `${(doneCount / total) * 100}%`}}
              />
            </span>
            <span className="shrink-0 text-[11px] font-semibold text-muted">
              {doneCount} of {total}
            </span>
          </span>
        </span>
        <ChevronRight
          className="shrink-0 text-muted"
          size={18}
        />
      </button>

      {/* Desktop: full horizontal stepper */}
      <div className="hidden items-center gap-5 md:flex">
        <div className="flex shrink-0 items-center gap-3">
          <RocketTile />
          <div>
            <div className="font-grotesk text-sm font-semibold text-foreground">Get your workspace ready</div>
            <div className="text-xs text-muted">
              {doneCount} of {total} complete
            </div>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          {steps.map((step, i) => (
            <div
              className="flex min-w-0 flex-1 items-center gap-1.5"
              key={step.key}
            >
              <StepNode
                state={nodeState(step)}
                step={step}
              />
              {i < total - 1 ? <span className="h-px w-3.5 shrink-0 bg-border" /> : null}
            </div>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            onPress={() => navigate(current?.route ?? ROUTES.CLIENTS)}
            size="sm"
          >
            Continue setup
          </Button>
          <DismissButton onDismiss={onDismiss} />
        </div>
      </div>
    </section>
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
