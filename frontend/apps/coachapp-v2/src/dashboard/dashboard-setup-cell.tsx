import {Button, Chip, CloseButton, Meter, Separator, Skeleton, Surface, Typography, toast} from '@heroui/react';
import {cn} from '@heroui/styles';
import {Check, ChevronRight, Rocket} from 'lucide-react';
import type {ReactNode} from 'react';
import {Fragment, useEffect, useRef, useState} from 'react';
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
    <span className="flex size-9 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent">
      <Rocket className="size-4" />
    </span>
  );
}

function DismissButton({onDismiss}: {onDismiss: () => void}) {
  // `CloseButton` takes no `size` prop.
  return (
    <CloseButton
      aria-label="Dismiss setup"
      className="shrink-0 bg-transparent text-muted"
      onPress={onDismiss}
    />
  );
}

/** GAPS #3 — the strip is a `Surface`, at every state. */
function SetupSurface({children}: {children: ReactNode}) {
  return (
    <Surface className="rounded-card border border-border p-3.5">
      <section className="flex items-center gap-4">{children}</section>
    </Surface>
  );
}

function SetupCellSkeleton({onDismiss}: {onDismiss: () => void}) {
  return (
    <SetupSurface>
      <Skeleton className="size-9 shrink-0 rounded-control" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-48 max-w-full rounded" />
        <Skeleton className="h-3 w-32 rounded" />
      </div>
      <DismissButton onDismiss={onDismiss} />
    </SetupSurface>
  );
}

function SetupCellError({onDismiss, onRetry}: {onDismiss: () => void; onRetry: () => void}) {
  return (
    <SetupSurface>
      <RocketTile />
      <Typography
        className="flex-1"
        color="muted"
        type="body-sm"
      >
        Couldn't load your setup progress.
      </Typography>
      <Button
        className="shrink-0"
        onPress={onRetry}
        size="sm"
        variant="secondary"
      >
        Retry
      </Button>
      <DismissButton onDismiss={onDismiss} />
    </SetupSurface>
  );
}

type StepState = 'current' | 'done' | 'upcoming';

const STEP_STATE_LABEL: Record<StepState, string> = {
  current: 'In progress',
  done: 'Done',
  upcoming: 'Up next',
};

/**
 * GAPS #3 — one `Chip` per step, static labels (never `Tabs`). The step's state
 * rides the chip's colour/variant: done = accent-filled tick, current = accent
 * outline, upcoming = muted.
 */
function StepChip({index, state, step}: {index: number; state: StepState; step: SetupStep}) {
  return (
    <Chip
      className={cn(
        // Done and upcoming sit on the same neutral fill in the reference — only
        // the current step is called out, with an accent hairline on white.
        'h-auto min-w-0 shrink gap-2 rounded-control px-3 py-1.5',
        state === 'current' ? 'border border-accent bg-surface' : 'border border-transparent bg-surface-secondary',
        state === 'upcoming' ? 'opacity-70' : '',
      )}
      color="default"
      variant="secondary"
    >
      <span
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-full text-chip font-bold',
          state === 'done'
            ? 'bg-accent text-accent-foreground'
            : state === 'current'
              ? 'border border-accent text-accent'
              : 'border border-border text-muted',
        )}
      >
        {state === 'done' ? <Check className="size-3" /> : index}
      </span>
      <span className="flex min-w-0 flex-col items-start">
        <span className="max-w-full truncate text-pill font-semibold text-foreground">{step.label}</span>
        <span className={cn('text-chip font-medium', state === 'current' ? 'text-accent' : 'text-muted')}>
          {STEP_STATE_LABEL[state]}
        </span>
      </span>
    </Chip>
  );
}

function ReadySetupCell({doneCount, onDismiss, steps}: {doneCount: number; onDismiss: () => void; steps: SetupStep[]}) {
  const navigate = useNavigate();
  const total = steps.length;
  // INTERACTIONS §DB: the strip points at the next incomplete step and
  // `Continue setup` deep-links to it.
  const current = steps.find((step) => !step.done) ?? steps[total - 1];
  const nextRoute = current?.route ?? ROUTES.CLIENTS;
  const stepState = (step: SetupStep): StepState => (step.done ? 'done' : step === current ? 'current' : 'upcoming');

  return (
    <Surface className="rounded-card border border-border p-3.5">
      {/* Mobile: GAPS #3 collapses the strip to one row + a chevron that
          navigates to the next incomplete step. */}
      <Button
        className="h-auto w-full justify-start gap-3 rounded-none px-0 py-0 md:hidden"
        onPress={() => navigate(nextRoute)}
        variant="ghost"
      >
        <RocketTile />
        <Meter
          aria-label="Setup progress"
          className="flex min-w-0 flex-1 flex-col gap-1.5"
          color="accent"
          maxValue={total}
          value={doneCount}
        >
          <Typography
            className="max-w-full truncate text-start"
            type="body-sm"
            weight="semibold"
          >
            Get your workspace ready
          </Typography>
          <span className="flex items-center gap-2.5">
            <Meter.Track className="min-w-0 flex-1">
              <Meter.Fill />
            </Meter.Track>
            <Typography
              className="shrink-0 font-semibold"
              color="muted"
              type="body-xs"
            >
              {doneCount} of {total}
            </Typography>
          </span>
        </Meter>
        <ChevronRight className="size-4 shrink-0 text-muted" />
      </Button>

      {/* Desktop: title block · step chips · Continue setup · dismiss */}
      <div className="hidden items-center gap-4 md:flex">
        <div className="flex shrink-0 items-center gap-3">
          <RocketTile />
          <div className="flex flex-col">
            <Typography
              className="font-grotesk"
              type="body-sm"
              weight="semibold"
            >
              Get your workspace ready
            </Typography>
            <Typography
              color="muted"
              type="body-xs"
            >
              {doneCount} of {total} complete
            </Typography>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          {steps.map((step, index) => (
            <Fragment key={step.key}>
              {index > 0 ? <Separator className="w-3.5 shrink-0" /> : null}
              <StepChip
                index={index + 1}
                state={stepState(step)}
                step={step}
              />
            </Fragment>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            onPress={() => navigate(nextRoute)}
            size="sm"
            variant="primary"
          >
            Continue setup
          </Button>
          <DismissButton onDismiss={onDismiss} />
        </div>
      </div>
    </Surface>
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
