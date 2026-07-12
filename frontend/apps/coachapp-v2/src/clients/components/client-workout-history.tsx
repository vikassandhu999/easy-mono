import {formatSessionDate, getCurrentWeekRange, SESSION_STATE_CHIP} from '@easy/utils';
import {Button, Chip, ListBox, Modal, Skeleton, Typography, toast, useOverlayState} from '@heroui/react';
import {zodResolver} from '@hookform/resolvers/zod';
import {getLocalTimeZone, today} from '@internationalized/date';
import {Check, Dumbbell, Pencil, X} from 'lucide-react';
import {useMemo} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {Link} from 'react-router-dom';
import {z} from 'zod';

import DateInput from '@/@components/date-input';
import {FormLayout, FormTextField} from '@/@components/form-fields';
import {useIsDesktop} from '@/@hooks/use-is-desktop';
import {useCoachClientTrainingSessionsInfiniteQuery} from '@/api/client-training-sessions';
import {type ClientTrainingPlan, type TrainingSession, useUpdateTrainingPlanMutation} from '@/api/generated';
import {applyFormErrors} from '@/api/shared';
import {useListCoachClientTrainingPlansQuery} from '@/api/training-plans-list';
import {KeyboardSheet} from '@/builder-kit/keyboard-sheet';
import ClientPlanHistory from '@/clients/components/client-plan-history';
import PlanAssignControl from '@/clients/components/plan-assign-control';
import {PLAN_STATUS_MAP, UNKNOWN_PLAN_STATUS} from '@/clients/lib/client';
import {
  formatAssignedDate,
  formatDateRange,
  getProgramProgress,
  softStatusClass,
} from '@/clients/lib/client-detail-metrics';
import {buildWorkoutSessionSubtitle, getWorkoutSessionTitle} from '@/domain/workout-sessions';

const trainingDetailsSchema = z
  .object({
    end_date: z.string().nullable().refine(Boolean, 'Choose an end date'),
    name: z.string().trim().min(1, 'Enter a plan name').max(255, 'Use 255 characters or fewer'),
    start_date: z.string().nullable().refine(Boolean, 'Choose a start date'),
  })
  .refine(({end_date, start_date}) => !end_date || !start_date || end_date >= start_date, {
    message: 'End date must be on or after the start date',
    path: ['end_date'],
  });

type TrainingDetailsFormValues = z.infer<typeof trainingDetailsSchema>;

function TrainingPlanEditor({onClose, plan}: {onClose: () => void; plan: ClientTrainingPlan}) {
  const [updatePlan, {isLoading}] = useUpdateTrainingPlanMutation();
  const isDesktop = useIsDesktop();
  const startDateLocked = Boolean(plan.start_date && plan.start_date <= today(getLocalTimeZone()).toString());
  const form = useForm<TrainingDetailsFormValues>({
    defaultValues: {end_date: plan.end_date, name: plan.name, start_date: plan.start_date},
    resolver: zodResolver(trainingDetailsSchema),
  });

  const handleSubmit = async (values: TrainingDetailsFormValues) => {
    try {
      await updatePlan({id: plan.id, trainingPlanUpdateRequest: values}).unwrap();
      toast.success('Training plan saved');
      onClose();
    } catch (error) {
      applyFormErrors(error, "Training plan wasn't saved. Check the values and try again.", form.setError, [
        'name',
        'start_date',
        'end_date',
      ]);
    }
  };

  const fields = (
    <>
      <FormTextField
        control={form.control}
        inputProps={{maxLength: 255}}
        isRequired
        label="Plan name"
        name="name"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Controller
          control={form.control}
          name="start_date"
          render={({field, fieldState}) => (
            <div>
              <DateInput
                isDisabled={startDateLocked}
                isRequired
                label="Start date"
                onChange={field.onChange}
                value={field.value}
              />
              {startDateLocked ? (
                <Typography
                  className="mt-1.5"
                  color="muted"
                  type="body-xs"
                >
                  Start date is locked after the plan begins.
                </Typography>
              ) : null}
              {fieldState.error ? (
                <Typography
                  className="mt-1.5 text-danger"
                  type="body-xs"
                >
                  {fieldState.error.message}
                </Typography>
              ) : null}
            </div>
          )}
        />
        <Controller
          control={form.control}
          name="end_date"
          render={({field, fieldState}) => (
            <div>
              <DateInput
                isRequired
                label="End date"
                onChange={field.onChange}
                value={field.value}
              />
              {fieldState.error ? (
                <Typography
                  className="mt-1.5 text-danger"
                  type="body-xs"
                >
                  {fieldState.error.message}
                </Typography>
              ) : null}
            </div>
          )}
        />
      </div>
    </>
  );

  if (!isDesktop) {
    return (
      <KeyboardSheet
        className="max-h-[calc(100dvh-1rem)]"
        footer={
          <div className="grid grid-cols-2 gap-3">
            <Button
              className="w-full"
              isDisabled={isLoading}
              onPress={onClose}
              type="button"
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              className="w-full"
              isPending={isLoading}
              onPress={() => form.handleSubmit(handleSubmit)()}
              type="button"
            >
              Save changes
            </Button>
          </div>
        }
        onClose={onClose}
        open
        title="Edit training plan"
      >
        <Typography
          className="mb-4"
          color="muted"
          type="body-sm"
        >
          {plan.name} · schedule
        </Typography>
        <FormLayout
          className="max-w-none gap-4 pb-3"
          onSubmit={form.handleSubmit(handleSubmit)}
          validationBehavior="aria"
        >
          {fields}
        </FormLayout>
      </KeyboardSheet>
    );
  }

  return (
    <Modal.Backdrop
      isDismissable
      isOpen
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <Modal.Container
        placement="center"
        size="md"
      >
        <Modal.Dialog className="max-h-[calc(100dvh-2rem)] overflow-hidden rounded-[24px] border-[1.5px] border-separator bg-surface p-0 shadow-2xl">
          <FormLayout
            className="max-h-[calc(100dvh-2rem)] max-w-none gap-0 overflow-hidden"
            onSubmit={form.handleSubmit(handleSubmit)}
            validationBehavior="aria"
          >
            <div className="flex items-start justify-between gap-4 border-b border-surface-secondary px-6 py-5">
              <div>
                <h2 className="font-grotesk text-xl font-bold">Edit training plan</h2>
                <Typography
                  className="mt-1"
                  color="muted"
                  type="body-sm"
                >
                  {plan.name} · schedule
                </Typography>
              </div>
              <button
                aria-label="Close"
                className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-surface-secondary text-muted"
                onClick={onClose}
                type="button"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto px-6 py-5">{fields}</div>

            <div className="grid grid-cols-2 gap-3 border-t border-surface-secondary px-6 py-4">
              <Button
                className="w-full"
                isDisabled={isLoading}
                onPress={onClose}
                type="button"
                variant="secondary"
              >
                Cancel
              </Button>
              <Button
                className="w-full"
                isPending={isLoading}
                type="submit"
              >
                Save changes
              </Button>
            </div>
          </FormLayout>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

function selectCurrentPlan(plans: ClientTrainingPlan[]): ClientTrainingPlan | null {
  return (
    [...plans].sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'active' ? -1 : 1;
      }
      return (b.start_date ?? b.inserted_at).localeCompare(a.start_date ?? a.inserted_at);
    })[0] ?? null
  );
}

function daysPerWeek(plan: ClientTrainingPlan): number {
  const scheduledDays = new Set(plan.plan_items.map((item) => item.day_of_week));
  return scheduledDays.size || plan.workouts.length;
}

function SessionStrip({completed, total}: {completed: number; total: number}) {
  const count = Math.max(total, completed, 1);
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <Typography
          type="body-sm"
          weight="semibold"
        >
          This week
        </Typography>
        <Typography
          color="muted"
          type="body-xs"
        >
          {completed} of {total} done
        </Typography>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {Array.from({length: count}, (_, index) => {
          const done = index < completed;
          return (
            <span
              className={`flex min-h-11 items-center justify-center rounded-[11px] border ${
                done
                  ? 'border-success-soft bg-success-soft text-success-soft-foreground'
                  : 'border-dashed border-border text-muted'
              }`}
              key={`training-session-${index + 1}`}
            >
              {done ? <Check size={16} /> : index + 1}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function ProgramSegments({percent, totalWeeks}: {percent: null | number; totalWeeks: null | number}) {
  const count = Math.min(12, Math.max(4, totalWeeks ?? 8));
  const filled = percent == null ? 0 : Math.round((percent / 100) * count);
  return (
    <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-12">
      {Array.from({length: count}, (_, index) => (
        <span
          aria-hidden
          className={`h-2 rounded-full ${index < filled ? 'bg-accent' : 'bg-surface-secondary'}`}
          key={`training-progress-${index + 1}`}
        />
      ))}
    </div>
  );
}

export function SessionListItem({session}: {session: TrainingSession}) {
  const stateChip = SESSION_STATE_CHIP[session.state];
  const subtitle = buildWorkoutSessionSubtitle(session);

  return (
    <ListBox.Item
      className="flex min-h-11 items-center gap-3 rounded-[12px] border-[1.5px] border-separator bg-surface p-3 transition-colors hover:bg-surface-hover active:scale-100! active:bg-surface-hover data-[pressed=true]:scale-100!"
      id={session.id}
      textValue={getWorkoutSessionTitle(session)}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
        <Dumbbell size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <Typography
          truncate
          type="body-sm"
          weight="semibold"
        >
          {getWorkoutSessionTitle(session)}
        </Typography>
        {subtitle ? (
          <Typography
            color="muted"
            truncate
            type="body-xs"
          >
            {subtitle}
          </Typography>
        ) : null}
      </span>
      {stateChip ? (
        <Chip
          color={stateChip.color}
          size="sm"
          variant="soft"
        >
          {stateChip.label}
        </Chip>
      ) : null}
      <Typography
        className="shrink-0"
        color="muted"
        type="body-xs"
      >
        {formatSessionDate(session.started_at)}
      </Typography>
    </ListBox.Item>
  );
}

export default function ClientWorkoutHistory({clientId, clientName}: {clientId: string; clientName: string}) {
  const editModal = useOverlayState();
  const {from, to} = useMemo(() => getCurrentWeekRange(), []);
  const {data, isError, isLoading} = useListCoachClientTrainingPlansQuery({clientId, limit: 100});
  const sessionsQuery = useCoachClientTrainingSessionsInfiniteQuery({clientId, from, to});
  const plan = useMemo(() => selectCurrentPlan(data?.data ?? []), [data]);
  const progress = plan ? getProgramProgress(plan) : null;
  const plannedDays = plan ? daysPerWeek(plan) : 0;
  const sessions = sessionsQuery.data?.pages.flatMap((page) => page.data) ?? [];
  const completed = sessions.filter((session) => session.state === 'completed').length;
  const status = plan ? (PLAN_STATUS_MAP[plan.status] ?? UNKNOWN_PLAN_STATUS) : null;

  return (
    <section>
      <div className="mb-5 hidden flex-col gap-3 lg:flex lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="font-grotesk text-xl font-bold">Training plan</h2>
          <Typography
            className="mt-1"
            color="muted"
            type="body-sm"
          >
            {plan ? `${formatAssignedDate(plan.start_date)} · ${plannedDays} days/week` : 'No assigned plan'}
          </Typography>
        </div>
        {plan ? (
          <div className="flex items-center gap-2">
            <Button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[12px] border-[1.5px] border-separator bg-surface px-4 text-[12.5px] font-bold transition-colors hover:bg-surface-hover"
              onPress={editModal.open}
              type="button"
              variant="secondary"
            >
              <Pencil size={15} />
              Edit plan
            </Button>
            <Link
              className="inline-flex min-h-11 items-center rounded-[12px] bg-accent px-4 text-[12.5px] font-bold text-accent-foreground transition-opacity hover:opacity-90"
              to={`/library/training-plans/${plan.id}`}
            >
              Open in builder
            </Link>
          </div>
        ) : (
          <PlanAssignControl
            clientId={clientId}
            clientName={clientName}
            kind="training"
            label="Assign training plan"
          />
        )}
      </div>

      {plan ? (
        <div className="mb-4 grid grid-cols-2 gap-2 lg:hidden">
          <Button
            className="min-h-11 w-full"
            onPress={editModal.open}
            type="button"
            variant="secondary"
          >
            <Pencil size={15} />
            Edit plan
          </Button>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-[12px] bg-accent px-3 text-[12.5px] font-bold text-accent-foreground"
            to={`/library/training-plans/${plan.id}`}
          >
            Open in builder
          </Link>
        </div>
      ) : null}

      {plan && editModal.isOpen ? (
        <TrainingPlanEditor
          onClose={editModal.close}
          plan={plan}
        />
      ) : null}

      {isLoading ? (
        <Skeleton className="h-72 rounded-[18px]" />
      ) : isError ? (
        <Typography
          color="muted"
          type="body-sm"
        >
          Couldn&apos;t load training plan.
        </Typography>
      ) : plan ? (
        <>
          <Typography
            className="mb-2.5 text-[11px] text-accent uppercase tracking-[0.06em]"
            weight="bold"
          >
            Current plan
          </Typography>
          <div className="rounded-[16px] border-[1.5px] border-separator bg-surface p-4 lg:rounded-[18px] lg:p-5">
            <div className="mb-4 flex items-center gap-3 border-b border-surface-secondary pb-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-[11px] bg-accent-soft text-accent lg:size-[42px] lg:rounded-[12px]">
                <Dumbbell size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <Typography
                  truncate
                  type="body-sm"
                  weight="bold"
                >
                  {plan.name}
                </Typography>
                <Typography
                  className="mt-0.5"
                  color="muted"
                  truncate
                  type="body-xs"
                >
                  {progress?.weekLabel} · {plannedDays} days/week
                </Typography>
              </div>
              {status ? (
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${softStatusClass(plan.status)}`}>
                  {status.label}
                </span>
              ) : null}
            </div>

            <div className="border-b border-surface-secondary pb-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <Typography
                  type="body-sm"
                  weight="semibold"
                >
                  Program completion
                </Typography>
                <Typography
                  className="text-accent"
                  type="body-xs"
                  weight="bold"
                >
                  {progress?.weekLabel}
                </Typography>
              </div>
              <ProgramSegments
                percent={progress?.percent ?? null}
                totalWeeks={progress?.totalWeeks ?? null}
              />
              <div className="mt-3 flex flex-col gap-1 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
                <span>{progress?.percent == null ? 'Completion unavailable' : `${progress.percent}% complete`}</span>
                <span>{progress?.endsLabel}</span>
              </div>
            </div>

            <div className="pt-4">
              <SessionStrip
                completed={completed}
                total={plannedDays}
              />
            </div>
          </div>
          <ClientPlanHistory
            icon={<Dumbbell size={17} />}
            items={(data?.data ?? []).map((historyPlan) => {
              const totalWeeks = getProgramProgress(historyPlan).totalWeeks;
              return {
                details:
                  [
                    formatDateRange(historyPlan.start_date, historyPlan.end_date),
                    totalWeeks ? `${totalWeeks} ${totalWeeks === 1 ? 'week' : 'weeks'}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'Schedule not set',
                id: historyPlan.id,
                name: historyPlan.name,
                status: historyPlan.status,
              };
            })}
          />
        </>
      ) : (
        <Typography
          color="muted"
          type="body-sm"
        >
          No training plan assigned yet.
        </Typography>
      )}
    </section>
  );
}
