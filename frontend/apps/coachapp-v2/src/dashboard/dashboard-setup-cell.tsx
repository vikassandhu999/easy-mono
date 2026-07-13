import {Button, Chip, Disclosure, Skeleton, toast} from '@heroui/react';
import {ArrowRight, Check, ClipboardCheck, Dumbbell, type LucideIcon, Sparkles, UserPlus, X} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import SectionHeading from '@/@components/section-heading';
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

function SetupCellSkeleton({onDismiss}: {onDismiss: () => void}) {
  return (
    <section className="col-span-2 rounded-card border border-border bg-surface p-4 sm:col-span-4 sm:p-5">
      <div className="flex min-h-11 items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-control bg-accent-soft text-accent">
          <Sparkles size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <SectionHeading
            className="mb-1"
            title="Get set up"
          />
          <Skeleton className="h-4 w-44 max-w-full rounded-control" />
        </span>
        <Skeleton className="h-6 w-12 shrink-0 rounded-full" />
        <Button
          aria-label="Dismiss get set up"
          className="size-11 min-w-11 shrink-0"
          isIconOnly
          onPress={onDismiss}
          variant="ghost"
        >
          <X size={18} />
        </Button>
      </div>
      <Skeleton className="mt-2 h-1.5 w-full rounded-full" />
    </section>
  );
}

function SetupCellError({onDismiss, onRetry}: {onDismiss: () => void; onRetry: () => void}) {
  return (
    <section className="col-span-2 rounded-card border border-border bg-surface p-4 sm:col-span-4 sm:p-5">
      <div className="flex min-h-11 items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-control bg-accent-soft text-accent">
          <Sparkles size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <SectionHeading
            className="mb-1"
            title="Get set up"
          />
          <span className="block font-grotesk text-sm font-bold leading-snug">Setup progress unavailable</span>
        </span>
        <Button
          className="min-h-11 shrink-0"
          onPress={onRetry}
          size="sm"
          variant="ghost"
        >
          Retry
        </Button>
        <Button
          aria-label="Dismiss get set up"
          className="size-11 min-w-11 shrink-0"
          isIconOnly
          onPress={onDismiss}
          variant="ghost"
        >
          <X size={18} />
        </Button>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-surface-secondary" />
    </section>
  );
}

function SetupTask({step}: {step: SetupStep}) {
  const Icon = step.icon;

  return (
    <div className="flex min-h-24 items-start gap-3 rounded-card border border-border p-3">
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-inset ${
          step.done ? 'bg-accent-soft text-accent' : 'bg-surface-secondary text-muted'
        }`}
      >
        {step.done ? <Check size={17} /> : <Icon size={17} />}
      </span>
      <span className="min-w-0">
        <span className={`block text-sm font-semibold leading-snug ${step.done ? 'text-muted' : ''}`}>
          {step.label}
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-muted">{step.description}</span>
      </span>
    </div>
  );
}

function ReadySetupCell({doneCount, onDismiss, steps}: {doneCount: number; onDismiss: () => void; steps: SetupStep[]}) {
  const navigate = useNavigate();
  const nextStep = steps.find((step) => !step.done);
  const progress = `${(doneCount / steps.length) * 100}%`;

  return (
    <section className="col-span-2 rounded-card border border-border bg-surface p-4 sm:col-span-4 sm:p-5">
      <Disclosure>
        <div className="flex items-center gap-2">
          <Disclosure.Trigger className="group flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-control text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-focus">
            <span className="grid size-10 shrink-0 place-items-center rounded-control bg-accent-soft text-accent">
              <Sparkles size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <SectionHeading
                className="mb-1"
                title="Get set up"
              />
              <span className="block font-grotesk text-sm font-bold leading-snug sm:truncate">
                {nextStep ? `Next: ${nextStep.label}` : "You're all set"}
              </span>
            </span>
            <Chip
              className="shrink-0"
              color="accent"
              size="sm"
              variant="soft"
            >
              {doneCount} of {steps.length}
            </Chip>
            <Disclosure.Indicator className="size-4 shrink-0 text-muted" />
          </Disclosure.Trigger>
          <Button
            aria-label="Dismiss get set up"
            className="size-11 min-w-11 shrink-0"
            isIconOnly
            onPress={onDismiss}
            variant="ghost"
          >
            <X size={18} />
          </Button>
        </div>

        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-secondary">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{width: progress}}
          />
        </div>

        <Disclosure.Content>
          <Disclosure.Body className="pt-3">
            <div className="grid grid-cols-1 gap-2 border-t border-surface-secondary pt-3 sm:grid-cols-3">
              {steps.map((step) => (
                <SetupTask
                  key={step.key}
                  step={step}
                />
              ))}
            </div>
            {nextStep ? (
              <Button
                className="mt-3 min-h-11 w-full sm:w-auto"
                onPress={() => navigate(nextStep.route)}
                variant="primary"
              >
                Continue setup
                <ArrowRight size={17} />
              </Button>
            ) : null}
          </Disclosure.Body>
        </Disclosure.Content>
      </Disclosure>
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
