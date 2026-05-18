import {
  AlertDialog,
  Button,
  Calendar,
  Chip,
  DateField,
  DatePicker,
  Label,
  Popover,
  Spinner,
  toast,
} from '@heroui/react';
import {type CalendarDate, parseDate} from '@internationalized/date';
import {ArrowLeft, MoreHorizontal, Plus} from 'lucide-react';
import {useCallback, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';

import type {Client} from '@/api/clients';
import type {TrainingPlanStatus} from '@/api/trainingPlans';

import ClientPicker from '@/@components/client-picker';
import ClientPlanBanner from '@/@components/client-plan-banner';
import CopyMenu from '@/@components/copy-menu';
import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {
  useAssignTrainingPlanMutation,
  useCreateWorkoutMutation,
  useDeleteTrainingPlanMutation,
  useDuplicateTrainingPlanMutation,
  useGetTrainingPlanQuery,
  useUpdateTrainingPlanMutation,
} from '@/api/trainingPlans';
import WeeklyOverview from '@/training-plans/components/weekly-overview';
import WorkoutNameForm, {type WorkoutNameFormValues} from '@/training-plans/components/workout-name-form';
import WorkoutSection from '@/training-plans/components/workout-section';

const STATUS_MAP: Record<TrainingPlanStatus, {color: 'default' | 'success' | 'warning'; label: string}> = {
  active: {color: 'success', label: 'Active'},
  archived: {color: 'warning', label: 'Archived'},
};

const UNKNOWN_STATUS = {color: 'default' as const, label: 'Unknown'};

function formatDate(dateString: string): string {
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateString);
  const parsed = new Date(isDateOnly ? `${dateString}T12:00:00` : dateString);
  if (Number.isNaN(parsed.getTime())) return '\u2014';

  return parsed.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function toCalendarDate(dateStr: string): CalendarDate | null {
  if (!dateStr) return null;
  try {
    return parseDate(dateStr);
  } catch {
    return null;
  }
}

function AddWorkoutLibraryCard({
  onWorkoutCreated,
  planId,
}: {
  onWorkoutCreated: (workoutId: string) => void;
  planId: string;
}) {
  const [createWorkout, {isLoading}] = useCreateWorkoutMutation();
  const [isAdding, setIsAdding] = useState(false);

  const handleCreate = async ({name}: WorkoutNameFormValues) => {
    const result = await createWorkout({planId, body: {name}}).unwrap();
    setIsAdding(false);
    onWorkoutCreated(result.data.id);
  };

  if (isAdding) {
    return (
      <div className="rounded-xl border border-dashed border-divider bg-content1 p-4">
        <WorkoutNameForm
          fallbackError="Failed to create workout."
          id="new-library-workout"
          isSubmitting={isLoading}
          label="Workout name"
          onCancel={() => setIsAdding(false)}
          onSubmit={handleCreate}
          submitLabel="Add workout"
        />
      </div>
    );
  }

  return (
    <Button
      onPress={() => setIsAdding(true)}
      size="sm"
      variant="secondary"
    >
      <Plus size={14} />
      New workout
    </Button>
  );
}

function PlanActionItem({
  children,
  isDanger,
  isPending,
  onSelect,
}: {
  children: React.ReactNode;
  isDanger?: boolean;
  isPending?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={[
        'flex min-h-11 w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors',
        'hover:bg-content2 active:bg-content2',
        isDanger ? 'text-danger' : '',
        isPending ? 'opacity-60' : '',
      ].join(' ')}
      disabled={isPending}
      onClick={onSelect}
      type="button"
    >
      {children}
    </button>
  );
}

function DeletePlanDialog({
  isDeleting,
  onCancel,
  onConfirm,
  planName,
}: {
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
  planName: string;
}) {
  return (
    <AlertDialog
      defaultOpen
      onOpenChange={(open) => {
        if (!open && !isDeleting) onCancel();
      }}
    >
      <span className="hidden" />
      <AlertDialog.Backdrop>
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-[400px]">
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>Delete plan?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p>
                This will permanently delete <strong>{planName}</strong> and all its workouts. This action cannot be
                undone.
              </p>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button
                onPress={onCancel}
                variant="tertiary"
              >
                Cancel
              </Button>
              <Button
                isPending={isDeleting}
                onPress={() => {
                  void onConfirm();
                }}
                variant="danger"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}

function PlanActionsMenu({
  isDeleting,
  isUpdatingStatus,
  onDelete,
  onEdit,
  onToggleArchive,
  planName,
  status,
}: {
  isDeleting: boolean;
  isUpdatingStatus: boolean;
  onDelete: () => Promise<void>;
  onEdit: () => void;
  onToggleArchive: (nextStatus: TrainingPlanStatus) => Promise<void>;
  planName: string;
  status: TrainingPlanStatus;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const nextStatus: TrainingPlanStatus = status === 'active' ? 'archived' : 'active';

  return (
    <>
      <Popover
        isOpen={isOpen}
        onOpenChange={setIsOpen}
      >
        <Popover.Trigger>
          <Button
            aria-label="Plan actions"
            className="min-h-11 min-w-11"
            isIconOnly
            isPending={isUpdatingStatus}
            size="sm"
            variant="ghost"
          >
            <MoreHorizontal size={18} />
          </Button>
        </Popover.Trigger>
        <Popover.Content
          className="min-w-[220px] p-1"
          placement="bottom end"
        >
          <Popover.Dialog className="outline-none">
            <PlanActionItem
              onSelect={() => {
                setIsOpen(false);
                onEdit();
              }}
            >
              Edit details
            </PlanActionItem>
            <PlanActionItem
              isPending={isUpdatingStatus}
              onSelect={() => {
                setIsOpen(false);
                onToggleArchive(nextStatus);
              }}
            >
              {status === 'active' ? 'Archive plan' : 'Restore plan'}
            </PlanActionItem>
            <div className="my-1 h-px bg-divider" />
            <PlanActionItem
              isDanger
              onSelect={() => {
                setIsOpen(false);
                setShowDeleteDialog(true);
              }}
            >
              Delete plan
            </PlanActionItem>
          </Popover.Dialog>
        </Popover.Content>
      </Popover>

      {showDeleteDialog ? (
        <DeletePlanDialog
          isDeleting={isDeleting}
          onCancel={() => setShowDeleteDialog(false)}
          onConfirm={async () => {
            await onDelete();
            setShowDeleteDialog(false);
          }}
          planName={planName}
        />
      ) : null}
    </>
  );
}

export default function TrainingPlanDetail() {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.TRAINING_PLANS);
  const {data, isError, isLoading} = useGetTrainingPlanQuery(id!);
  const [deletePlan, {isLoading: isDeleting}] = useDeleteTrainingPlanMutation();
  const [duplicatePlan] = useDuplicateTrainingPlanMutation();
  const [assignPlan, {isLoading: isAssigning}] = useAssignTrainingPlanMutation();
  const [updatePlan, {isLoading: isUpdatingStatus}] = useUpdateTrainingPlanMutation();

  // Inline copy-to-client state
  const [showCopyToClient, setShowCopyToClient] = useState(false);
  const [assignStartDate, setAssignStartDate] = useState('');
  const [assignEndDate, setAssignEndDate] = useState('');

  const handleCopyToClient = async (client: Client) => {
    try {
      const result = await assignPlan({
        id: id!,
        body: {
          client_id: client.id,
          ...(assignStartDate && {start_date: assignStartDate}),
          ...(assignEndDate && {end_date: assignEndDate}),
        },
      }).unwrap();
      const clientName = [client.first_name, client.last_name].filter(Boolean).join(' ') || client.email;
      toast.success(`Copied to ${clientName}`, {
        actionProps: {
          children: 'View',
          onPress: () => navigate(`/library/training-plans/${result.data.id}`),
          variant: 'tertiary',
        },
      });
      setShowCopyToClient(false);
      setAssignStartDate('');
      setAssignEndDate('');
    } catch {
      toast.danger('Failed to copy plan to client.');
    }
  };

  // Scroll-to-new-workout state (managed here, used by WeeklyOverview)
  const [scrollToWorkoutId, setScrollToWorkoutId] = useState<null | string>(null);
  const handleScrollComplete = useCallback(() => setScrollToWorkoutId(null), []);
  const scrollRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node && scrollToWorkoutId) {
        node.scrollIntoView({behavior: 'smooth', block: 'center'});
        handleScrollComplete();
      }
    },
    [handleScrollComplete, scrollToWorkoutId],
  );

  // (v3: deep-link-by-hash scroll-into-view was removed along with the full-page
  // Add Exercise flow. The inline add form doesn't navigate away, so there's
  // nothing to scroll to on return.)

  const handleDuplicate = async () => {
    try {
      const result = await duplicatePlan(id!).unwrap();
      const label = data?.data.client_id ? 'Saved as template' : 'Duplicated as template';
      toast.success(label, {
        actionProps: {
          children: 'View',
          onPress: () => navigate(`/library/training-plans/${result.data.id}`),
          variant: 'tertiary',
        },
      });
    } catch {
      toast.danger('Failed to duplicate plan.');
    }
  };

  const handleDelete = async () => {
    try {
      await deletePlan(id!).unwrap();
      navigate(ROUTES.TRAINING_PLANS, {replace: true});
    } catch {
      toast.danger('Failed to delete training plan');
    }
  };

  const handleToggleArchive = async (nextStatus: TrainingPlanStatus) => {
    try {
      await updatePlan({id: id!, body: {status: nextStatus}}).unwrap();
      toast.success(nextStatus === 'archived' ? 'Plan archived' : 'Plan restored');
    } catch {
      toast.danger('Failed to update plan status');
    }
  };

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
  const status = STATUS_MAP[plan.status] ?? UNKNOWN_STATUS;
  // Defensive: matches both `null` and `undefined` in case the backend omits the key.
  const isTemplate = !plan.client_id;
  const sortedWorkouts = [...plan.workouts].sort((a, b) => a.inserted_at.localeCompare(b.inserted_at));

  return (
    <PageLayout title="Training Plan">
      {/* Quiet navigation: keep the common copy action visible, move the rest behind one menu. */}
      <div className="mb-4 flex items-center justify-between gap-2">
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
          <CopyMenu
            clientId={plan.client_id}
            onCopyToClient={() => setShowCopyToClient((v) => !v)}
            onDuplicate={handleDuplicate}
          />
          <PlanActionsMenu
            isDeleting={isDeleting}
            isUpdatingStatus={isUpdatingStatus}
            onDelete={handleDelete}
            onEdit={() => navigate(`/library/training-plans/${plan.id}/edit`)}
            onToggleArchive={handleToggleArchive}
            planName={plan.name}
            status={plan.status}
          />
        </div>
      </div>

      {/* Copy to client — revealed inline below nav bar */}
      {showCopyToClient && (
        <div className="mb-4 max-w-md rounded-xl border border-divider bg-content1 p-4">
          <p className="mb-3 text-sm text-foreground-500">
            Search for a client to copy this plan to. A new plan will be created for the selected client.
          </p>
          <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <DatePicker
              onChange={(val: CalendarDate | null) => setAssignStartDate(val ? val.toString() : '')}
              value={toCalendarDate(assignStartDate) as never}
            >
              <Label>Start date</Label>
              <DateField.Group fullWidth>
                <DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
                <DateField.Suffix>
                  <DatePicker.Trigger>
                    <DatePicker.TriggerIndicator />
                  </DatePicker.Trigger>
                </DateField.Suffix>
              </DateField.Group>
              <DatePicker.Popover>
                <Calendar aria-label="Assign start date">
                  <Calendar.Header>
                    <Calendar.YearPickerTrigger>
                      <Calendar.YearPickerTriggerHeading />
                      <Calendar.YearPickerTriggerIndicator />
                    </Calendar.YearPickerTrigger>
                    <Calendar.NavButton slot="previous" />
                    <Calendar.NavButton slot="next" />
                  </Calendar.Header>
                  <Calendar.Grid>
                    <Calendar.GridHeader>
                      {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
                    </Calendar.GridHeader>
                    <Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody>
                  </Calendar.Grid>
                  <Calendar.YearPickerGrid>
                    <Calendar.YearPickerGridBody>
                      {({year}) => <Calendar.YearPickerCell year={year} />}
                    </Calendar.YearPickerGridBody>
                  </Calendar.YearPickerGrid>
                </Calendar>
              </DatePicker.Popover>
            </DatePicker>

            <DatePicker
              onChange={(val: CalendarDate | null) => setAssignEndDate(val ? val.toString() : '')}
              value={toCalendarDate(assignEndDate) as never}
            >
              <Label>End date</Label>
              <DateField.Group fullWidth>
                <DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
                <DateField.Suffix>
                  <DatePicker.Trigger>
                    <DatePicker.TriggerIndicator />
                  </DatePicker.Trigger>
                </DateField.Suffix>
              </DateField.Group>
              <DatePicker.Popover>
                <Calendar aria-label="Assign end date">
                  <Calendar.Header>
                    <Calendar.YearPickerTrigger>
                      <Calendar.YearPickerTriggerHeading />
                      <Calendar.YearPickerTriggerIndicator />
                    </Calendar.YearPickerTrigger>
                    <Calendar.NavButton slot="previous" />
                    <Calendar.NavButton slot="next" />
                  </Calendar.Header>
                  <Calendar.Grid>
                    <Calendar.GridHeader>
                      {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
                    </Calendar.GridHeader>
                    <Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody>
                  </Calendar.Grid>
                  <Calendar.YearPickerGrid>
                    <Calendar.YearPickerGridBody>
                      {({year}) => <Calendar.YearPickerCell year={year} />}
                    </Calendar.YearPickerGridBody>
                  </Calendar.YearPickerGrid>
                </Calendar>
              </DatePicker.Popover>
            </DatePicker>
          </div>
          <ClientPicker
            excludeIds={plan.client_id ? [plan.client_id] : undefined}
            isDisabled={isAssigning}
            onSelect={handleCopyToClient}
            placeholder="Search clients..."
          />
          {isAssigning && (
            <div className="mt-2 flex items-center gap-2 text-sm text-foreground-400">
              <Spinner size="sm" />
              Copying plan...
            </div>
          )}
        </div>
      )}

      <div className="min-w-0 max-w-4xl overflow-hidden">
        {/* Personal-plan client banner — only shown when assigned to a client */}
        {plan.client ? (
          <ClientPlanBanner
            client={plan.client}
            endDate={plan.end_date}
            startDate={plan.start_date}
          />
        ) : null}

        {/* Plan header */}
        <div className="pb-6">
          <h2 className="text-lg font-semibold">{plan.name}</h2>
          {plan.description && <p className="mt-1 text-sm text-foreground-500">{plan.description}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip
              color={status.color}
              size="sm"
              variant="soft"
            >
              {status.label}
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
              <span>Start: {plan.start_date ? formatDate(plan.start_date) : '\u2014'}</span>
              <span>End: {plan.end_date ? formatDate(plan.end_date) : '\u2014'}</span>
            </div>
          ) : null}
        </div>

        {/* Weekly schedule — section header + summary are rendered inside WeeklyOverview */}
        <section className="border-t border-divider py-4">
          <WeeklyOverview
            onScrollToWorkout={setScrollToWorkoutId}
            onWorkoutCreated={setScrollToWorkoutId}
            plan={plan}
          />
        </section>

        <section className="border-t border-divider py-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-400">Workouts</h3>
              <p className="mt-1 text-sm text-foreground-500">Build workouts once, then assign them across the week.</p>
            </div>
          </div>

          {sortedWorkouts.length > 0 ? (
            <div className="flex flex-col gap-3">
              {sortedWorkouts.map((workout) => (
                <WorkoutSection
                  allWorkouts={sortedWorkouts}
                  key={workout.id}
                  onWorkoutCreated={setScrollToWorkoutId}
                  planId={plan.id}
                  planItems={plan.plan_items}
                  sectionRef={workout.id === scrollToWorkoutId ? scrollRef : undefined}
                  workout={workout}
                />
              ))}
            </div>
          ) : (
            <p className="mb-3 text-sm text-foreground-400">
              No workouts yet. Create your first workout to start building this plan.
            </p>
          )}

          <div className="mt-3">
            <AddWorkoutLibraryCard
              onWorkoutCreated={setScrollToWorkoutId}
              planId={plan.id}
            />
          </div>
        </section>

        {/* Meta */}
        <section className="border-t border-divider py-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground-400">Details</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-foreground-400">Created</p>
              <p>{formatDate(plan.inserted_at)}</p>
            </div>
            <div>
              <p className="text-xs text-foreground-400">Last updated</p>
              <p>{formatDate(plan.updated_at)}</p>
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
