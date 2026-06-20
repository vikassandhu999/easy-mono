import {TRAINING_DAY_LABELS, TRAINING_DAY_SHORT_LABELS, TRAINING_WEEKDAYS} from '@easy/utils';
import {AlertDialog, Button, Dropdown, toast} from '@heroui/react';
import {Check, MoreHorizontal, Plus} from 'lucide-react';
import {useMemo, useState} from 'react';

import type {TrainingPlan, TrainingPlanItem, TrainingWeekday, Workout} from '@/api/trainingPlans';

import {
  parsePlanItemValidationError,
  useCreateTrainingPlanItemMutation,
  useCreateWorkoutMutation,
  useDeleteTrainingPlanItemMutation,
  useDeleteWorkoutMutation,
  useDuplicateWorkoutMutation,
  useUpdateTrainingPlanMutation,
} from '@/api/trainingPlans';
import {
  buildClearRestDayUpdate,
  buildConflictDaysLabel,
  buildExerciseCountLabel,
  buildRestDaysUpdate,
  buildWeeklySummaryLabel,
  createDayStates,
  createPlanItemsByDay,
  createRestDaysSet,
  createWorkoutsById,
  type DayState,
  findWorkoutById,
  getAssignedDays,
  getCopyTargets,
  getPrimaryAssignedItem,
  getRowContentMeta,
  getTakenPrimaryDays,
  getWorkoutUsageLabel,
  sortWorkoutsByName,
  summarizeDayStates,
  toggleWeekdaySelection,
} from '@/training-plans/components/weekly-overview/helpers';
import WorkoutNameForm, {type WorkoutNameFormValues} from '@/training-plans/components/workout-name-form';

// ── Types ────────────────────────────────────────────────────────────

type WeeklyOverviewProps = {
  /**
   * Called when a workout is created or duplicated from this overview — lets
   * the parent scroll the Workouts section into view and (on mobile) focus
   * the freshly created card.
   */
  onWorkoutCreated: (workoutId: string) => void;
  /**
   * Called when the coach taps an assigned-day row. Parent scrolls the
   * matching `WorkoutSection` into view. There's no separate workout detail
   * route in this app — the inline section IS the detail view.
   */
  onScrollToWorkout: (workoutId: string) => void;
  plan: TrainingPlan;
};

export default function WeeklyOverview({onScrollToWorkout, onWorkoutCreated, plan}: WeeklyOverviewProps) {
  // Lookup tables computed once per plan change.
  const workoutsById = useMemo(() => createWorkoutsById(plan.workouts), [plan.workouts]);

  const planItemsByDay = useMemo(() => createPlanItemsByDay(plan.plan_items), [plan.plan_items]);

  const restDays = useMemo(() => createRestDaysSet(plan.rest_days), [plan.rest_days]);

  // Per-day state derivation. Assigned takes precedence over rest — if a day
  // has plan items AND is in rest_days we render it as assigned (backend
  // shouldn't allow that combination, but defensive).
  const dayStates = useMemo<Map<TrainingWeekday, DayState>>(
    () => createDayStates({planItemsByDay, restDays}),
    [planItemsByDay, restDays],
  );

  // Summary for the section header.
  const summary = useMemo(() => summarizeDayStates(dayStates), [dayStates]);

  // One row can be expanded at a time (shows the Assign / Create / Copy
  // sub-UI). Collapsing on day change keeps the list compact.
  const [expandedDay, setExpandedDay] = useState<null | {day: TrainingWeekday; mode: ExpandedMode}>(null);

  const toggleExpand = (day: TrainingWeekday, mode: ExpandedMode) => {
    setExpandedDay((prev) => (prev?.day === day && prev.mode === mode ? null : {day, mode}));
  };

  const closeExpand = () => setExpandedDay(null);

  return (
    <div className="min-w-0">
      {/* Section header: title + summary. Stacked on mobile, inline on desktop. */}
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-400">Weekly schedule</h3>
        <p className="text-xs text-foreground-400">{buildWeeklySummaryLabel(summary)}</p>
      </div>

      {/* Single outer container, 7 rows stacked inside. */}
      <div className="overflow-hidden rounded-xl border border-divider bg-content1">
        {TRAINING_WEEKDAYS.map((day, index) => {
          const state = dayStates.get(day)!;
          const isLast = index === TRAINING_WEEKDAYS.length - 1;
          const expanded = expandedDay?.day === day ? expandedDay.mode : null;
          return (
            <DayRow
              day={day}
              expanded={expanded}
              isLast={isLast}
              key={day}
              onCloseExpand={closeExpand}
              onScrollToWorkout={onScrollToWorkout}
              onToggleExpand={(mode) => toggleExpand(day, mode)}
              onWorkoutCreated={onWorkoutCreated}
              plan={plan}
              state={state}
              workoutsById={workoutsById}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Row ──────────────────────────────────────────────────────────────

type ExpandedMode = 'assign' | 'copy-from' | 'copy-to' | 'create';

type DayRowProps = {
  day: TrainingWeekday;
  expanded: ExpandedMode | null;
  isLast: boolean;
  onCloseExpand: () => void;
  onScrollToWorkout: (workoutId: string) => void;
  onToggleExpand: (mode: ExpandedMode) => void;
  onWorkoutCreated: (workoutId: string) => void;
  plan: TrainingPlan;
  state: DayState;
  workoutsById: Map<string, Workout>;
};

function DayRow({
  day,
  expanded,
  isLast,
  onCloseExpand,
  onScrollToWorkout,
  onToggleExpand,
  onWorkoutCreated,
  plan,
  state,
  workoutsById,
}: DayRowProps) {
  const isRest = state.kind === 'rest';
  const containerClasses = [
    isLast ? '' : 'border-b border-divider',
    // Rest days get a subtle tint so they read as "no action needed" at a glance.
    isRest ? 'bg-content2/50' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClasses}>
      <RowGrid
        day={day}
        onScrollToWorkout={onScrollToWorkout}
        onToggleExpand={onToggleExpand}
        onWorkoutCreated={onWorkoutCreated}
        plan={plan}
        state={state}
        workoutsById={workoutsById}
      />
      {expanded ? (
        <div className="border-t border-divider/60 bg-content2/40 px-3 py-3 sm:px-4">
          <ExpandedPanel
            day={day}
            mode={expanded}
            onClose={onCloseExpand}
            onWorkoutCreated={onWorkoutCreated}
            plan={plan}
            state={state}
          />
        </div>
      ) : null}
    </div>
  );
}

// ── Row grid (3 columns: day / content / actions) ────────────────────

type RowGridProps = {
  day: TrainingWeekday;
  onScrollToWorkout: (workoutId: string) => void;
  onToggleExpand: (mode: ExpandedMode) => void;
  onWorkoutCreated: (workoutId: string) => void;
  plan: TrainingPlan;
  state: DayState;
  workoutsById: Map<string, Workout>;
};

function RowGrid({day, onScrollToWorkout, onToggleExpand, onWorkoutCreated, plan, state, workoutsById}: RowGridProps) {
  // Row tap behavior varies by state. The row itself acts as the primary
  // tap target on assigned and empty days.
  const handleRowTap = () => {
    if (state.kind === 'empty') {
      onToggleExpand('assign');
      return;
    }
    if (state.kind === 'assigned') {
      // Scroll to the first workout on this day (multiple workouts per day is
      // supported by the data model — primary + alternatives — but the UI
      // rarely has more than one). Tapping the row always jumps to the
      // primary workout section if present.
      const primary = state.items.find((it) => it.workout_type === 'primary') ?? state.items[0];
      if (primary) {
        onScrollToWorkout(primary.workout_id);
      }
    }
    // Rest day taps are no-ops — action only via overflow menu.
  };

  const isInteractive = state.kind !== 'rest';
  const dayLabel = TRAINING_DAY_SHORT_LABELS[day];

  // Structure note: nesting <button> inside <button> is invalid HTML. We use
  // a grid container where the tappable area is a separate <button> spanning
  // the day + content columns, and the actions sit in their own column as a
  // sibling. This also cleanly satisfies the click-to-open-workout intent
  // without needing event.stopPropagation() hacks.
  return (
    <div className="grid min-h-[56px] grid-cols-[40px_1fr_auto] items-center gap-2.5 px-3 sm:grid-cols-[60px_1fr_auto] sm:gap-4 sm:px-4">
      {/* Day label + content are the tap target on empty/assigned days. Rest
          days render the same markup as a non-interactive span for layout
          consistency. */}
      {isInteractive ? (
        <button
          aria-label={
            state.kind === 'empty'
              ? `${TRAINING_DAY_LABELS[day]} — add workout`
              : `${TRAINING_DAY_LABELS[day]} — open workout`
          }
          className="col-span-2 grid grid-cols-subgrid items-center gap-2.5 py-2 text-left transition-colors hover:bg-content2/60 focus-visible:bg-content2/60 focus-visible:outline-none sm:gap-4"
          onClick={handleRowTap}
          type="button"
        >
          <span className="text-center text-[13px] font-medium text-foreground">{dayLabel}</span>
          <div className="min-w-0">
            <RowContent
              state={state}
              workoutsById={workoutsById}
            />
          </div>
        </button>
      ) : (
        <>
          <span className="text-center text-[13px] font-medium text-foreground-400">{dayLabel}</span>
          <div className="min-w-0">
            <RowContent
              state={state}
              workoutsById={workoutsById}
            />
          </div>
        </>
      )}

      {/* Actions column — sibling of the tap target, so button clicks here
          don't bubble into the row-open handler. */}
      <div className="flex shrink-0 items-center justify-end gap-1">
        <RowActions
          day={day}
          onToggleExpand={onToggleExpand}
          onWorkoutCreated={onWorkoutCreated}
          plan={plan}
          state={state}
          workoutsById={workoutsById}
        />
      </div>
    </div>
  );
}

function RowContent({state, workoutsById}: {state: DayState; workoutsById: Map<string, Workout>}) {
  if (state.kind === 'empty') {
    return <span className="text-sm text-foreground-400">Tap to assign</span>;
  }

  if (state.kind === 'rest') {
    return <span className="text-sm italic text-foreground-400">Rest day</span>;
  }

  // Assigned — if there are multiple workouts on the day (primary +
  // alternatives), show primary as the headline and count alternatives in
  // the subtitle.
  const meta = getRowContentMeta({state, workoutsById});
  const workout = meta?.workout ?? null;
  const isMissing = meta?.isMissing ?? false;
  const isIncomplete = meta?.isIncomplete ?? false;
  const exerciseCount = meta?.exerciseCount ?? 0;
  const alternativeCount = meta?.alternativeCount ?? 0;

  return (
    <div className="min-w-0">
      <p className={['truncate text-sm font-medium', isMissing ? 'text-danger' : ''].join(' ')}>
        {workout?.name ?? 'Missing workout'}
      </p>
      <p
        className={[
          'truncate text-xs',
          isMissing ? 'text-danger' : isIncomplete ? 'text-warning' : 'text-foreground-400',
        ].join(' ')}
      >
        {isMissing
          ? 'Workout was removed'
          : isIncomplete
            ? 'No exercises yet'
            : buildExerciseCountLabel(exerciseCount, alternativeCount)}
      </p>
    </div>
  );
}

function RowActions({
  day,
  onToggleExpand,
  onWorkoutCreated,
  plan,
  state,
  workoutsById,
}: {
  day: TrainingWeekday;
  onToggleExpand: (mode: ExpandedMode) => void;
  onWorkoutCreated: (workoutId: string) => void;
  plan: TrainingPlan;
  state: DayState;
  workoutsById: Map<string, Workout>;
}) {
  if (state.kind === 'empty') {
    return null;
  }

  // Assigned or rest: only `⋯` overflow menu.
  return (
    <DayOverflowMenu
      day={day}
      onToggleExpand={onToggleExpand}
      onWorkoutCreated={onWorkoutCreated}
      plan={plan}
      state={state}
      workoutsById={workoutsById}
    />
  );
}

// ── Overflow menu (⋯) ────────────────────────────────────────────────

type OverflowMenuProps = {
  day: TrainingWeekday;
  onToggleExpand: (mode: ExpandedMode) => void;
  onWorkoutCreated: (workoutId: string) => void;
  plan: TrainingPlan;
  state: DayState;
  workoutsById: Map<string, Workout>;
};

function DayOverflowMenu({day, onToggleExpand, onWorkoutCreated, plan, state, workoutsById}: OverflowMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmKind, setConfirmKind] = useState<'delete' | 'mark-rest' | null>(null);

  const [deletePlanItem, {isLoading: isUnassigning}] = useDeleteTrainingPlanItemMutation();
  const [deleteWorkout, {isLoading: isDeleting}] = useDeleteWorkoutMutation();
  const [duplicateWorkout, {isLoading: isDuplicating}] = useDuplicateWorkoutMutation();
  const [updatePlan, {isLoading: isUpdatingRest}] = useUpdateTrainingPlanMutation();

  // State values used in menus / dialogs. Computed once per render.
  const primaryItem = state.kind === 'assigned' ? getPrimaryAssignedItem(state) : null;
  const primaryWorkout = primaryItem ? (workoutsById.get(primaryItem.workout_id) ?? null) : null;

  const close = () => setIsOpen(false);

  // Open the inline expanded section with the workout focus. We reuse the
  // 'copy-to' mode for "Copy to another day" and 'create' mode for the
  // name-your-new-workout form.
  const handleCopyToAnotherDay = () => {
    close();
    onToggleExpand('copy-to');
  };

  const handleDuplicate = async () => {
    if (!primaryItem) {
      return;
    }
    close();
    try {
      const result = await duplicateWorkout({id: primaryItem.workout_id, planId: plan.id}).unwrap();
      toast.success(`Duplicated ${primaryWorkout?.name ?? 'workout'}`);
      onWorkoutCreated(result.data.id);
    } catch {
      toast.danger('Failed to duplicate workout.');
    }
  };

  const handleUnassign = async () => {
    if (!primaryItem) {
      return;
    }
    close();
    try {
      await deletePlanItem({id: primaryItem.id, planId: primaryItem.training_plan_id}).unwrap();
    } catch {
      toast.danger('Failed to unassign workout.');
    }
  };

  const handleClearRest = async () => {
    close();
    try {
      await updatePlan({id: plan.id, body: {rest_days: buildClearRestDayUpdate(plan.rest_days, day)}}).unwrap();
    } catch {
      toast.danger('Failed to clear rest day.');
    }
  };

  const handleConfirmMarkRest = async () => {
    // Unassign all items on the day, then add to rest_days.
    if (state.kind !== 'assigned') {
      return;
    }
    try {
      for (const item of state.items) {
        await deletePlanItem({id: item.id, planId: item.training_plan_id}).unwrap();
      }
      await updatePlan({id: plan.id, body: {rest_days: buildRestDaysUpdate(plan.rest_days, day)}}).unwrap();
      setConfirmKind(null);
    } catch {
      toast.danger('Failed to mark rest day.');
      setConfirmKind(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!primaryItem) {
      return;
    }
    try {
      await deleteWorkout({id: primaryItem.workout_id, planId: plan.id}).unwrap();
      setConfirmKind(null);
    } catch {
      toast.danger('Failed to delete workout.');
      setConfirmKind(null);
    }
  };

  return (
    <>
      <Dropdown
        isOpen={isOpen}
        onOpenChange={setIsOpen}
      >
        <Dropdown.Trigger>
          <Button
            aria-label={`More actions for ${TRAINING_DAY_LABELS[day]}`}
            className="min-h-11"
            isIconOnly
            isPending={isUnassigning || isDeleting || isDuplicating || isUpdatingRest}
            size="sm"
            variant="ghost"
          >
            <MoreHorizontal size={18} />
          </Button>
        </Dropdown.Trigger>
        <Dropdown.Popover
          className="min-w-[240px]"
          placement="bottom end"
        >
          {state.kind === 'assigned' ? (
            <>
              <MenuItem
                isPending={isDuplicating}
                label="Duplicate workout"
                onSelect={() => {
                  handleDuplicate().catch(() => {
                    /* handled inside handleDuplicate */
                  });
                }}
              />
              <MenuItem
                label="Copy to another day…"
                onSelect={handleCopyToAnotherDay}
              />
              <MenuItem
                isPending={isUnassigning}
                label="Unassign from this day"
                onSelect={() => {
                  handleUnassign().catch(() => {
                    /* handled inside handleUnassign */
                  });
                }}
              />
              <MenuItem
                label="Mark as rest day"
                onSelect={() => {
                  close();
                  setConfirmKind('mark-rest');
                }}
              />
              <div className="my-1 h-px bg-divider" />
              <MenuItem
                isDestructive
                label="Delete workout"
                onSelect={() => {
                  close();
                  setConfirmKind('delete');
                }}
              />
            </>
          ) : (
            <>
              <MenuItem
                isPending={isUpdatingRest}
                label="Clear rest day"
                onSelect={() => {
                  handleClearRest().catch(() => {
                    /* handled inside handleClearRest */
                  });
                }}
              />
            </>
          )}
        </Dropdown.Popover>
      </Dropdown>

      {/* Mark-rest confirmation */}
      {confirmKind === 'mark-rest' && state.kind === 'assigned' ? (
        <ConfirmDialog
          confirmLabel="Mark as rest"
          description={`Unassign ${primaryWorkout?.name ?? 'workout'} and mark ${TRAINING_DAY_LABELS[day]} as rest?`}
          isDestructive={false}
          isPending={isUnassigning || isUpdatingRest}
          onCancel={() => setConfirmKind(null)}
          onConfirm={handleConfirmMarkRest}
          title="Mark rest day?"
        />
      ) : null}

      {/* Delete workout confirmation */}
      {confirmKind === 'delete' && primaryWorkout ? (
        <ConfirmDialog
          confirmLabel={isDeleting ? 'Deleting…' : 'Delete'}
          description={
            <>
              Delete <strong>{primaryWorkout.name}</strong>? This will remove it from every day it&apos;s assigned to,
              along with all {primaryWorkout.workout_elements.length} exercise
              {primaryWorkout.workout_elements.length !== 1 ? 's' : ''}. This action cannot be undone.
            </>
          }
          isDestructive
          isPending={isDeleting}
          onCancel={() => setConfirmKind(null)}
          onConfirm={handleConfirmDelete}
          title="Delete workout?"
        />
      ) : null}
    </>
  );
}

// ── Menu item ────────────────────────────────────────────────────────

function MenuItem({
  isDestructive,
  isPending,
  label,
  onSelect,
}: {
  isDestructive?: boolean;
  isPending?: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <button
      className={[
        'flex min-h-11 w-full items-center rounded-lg px-3 py-2 text-sm transition-colors',
        'hover:bg-content2 active:bg-content2',
        isDestructive ? 'text-danger' : '',
        isPending ? 'opacity-60' : '',
      ].join(' ')}
      disabled={isPending}
      onClick={onSelect}
      type="button"
    >
      {label}
    </button>
  );
}

// ── Confirm dialog (imperatively opened) ─────────────────────────────
//
// AlertDialog in HeroUI works with a `<Button>` trigger, but our menu needs
// to close the popover before showing the dialog. We open it imperatively
// via a mount-controlled wrapper: rendering this component opens the
// dialog, unmounting it closes it. The `defaultOpen` pattern below uses an
// internal effect to open-on-mount.

function ConfirmDialog({
  confirmLabel,
  description,
  isDestructive,
  isPending,
  onCancel,
  onConfirm,
  title,
}: {
  confirmLabel: string;
  description: React.ReactNode;
  isDestructive?: boolean;
  isPending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
}) {
  // The caller conditionally mounts this component, so `defaultOpen` + the
  // unmount-on-close pattern is enough — no manual keying needed.
  return (
    <AlertDialog
      defaultOpen
      onOpenChange={(open) => {
        if (!open && !isPending) {
          onCancel();
        }
      }}
    >
      {/* AlertDialog expects a trigger child but we drive it with
          `defaultOpen`. A visually hidden span keeps the component tree
          valid without a tabbable trigger. */}
      <span className="hidden" />
      <AlertDialog.Backdrop>
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-[420px]">
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              {isDestructive ? <AlertDialog.Icon status="danger" /> : null}
              <AlertDialog.Heading>{title}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p>{description}</p>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button
                onPress={onCancel}
                variant="tertiary"
              >
                Cancel
              </Button>
              <Button
                isPending={isPending}
                onPress={onConfirm}
                variant={isDestructive ? 'danger' : 'primary'}
              >
                {confirmLabel}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}

// ── Expanded panel (assign / create / copy-to / copy-from) ───────────

function ExpandedPanel({
  day,
  mode,
  onClose,
  onWorkoutCreated,
  plan,
  state,
}: {
  day: TrainingWeekday;
  mode: ExpandedMode;
  onClose: () => void;
  onWorkoutCreated: (workoutId: string) => void;
  plan: TrainingPlan;
  state: DayState;
}) {
  if (mode === 'assign' && state.kind === 'empty') {
    return (
      <AssignPanel
        day={day}
        onClose={onClose}
        onWorkoutCreated={onWorkoutCreated}
        plan={plan}
      />
    );
  }

  if (mode === 'create' && state.kind === 'empty') {
    return (
      <CreateWorkoutPanel
        day={day}
        onClose={onClose}
        onWorkoutCreated={onWorkoutCreated}
        plan={plan}
      />
    );
  }

  if (mode === 'copy-to' && state.kind === 'assigned') {
    return (
      <CopyToPanel
        day={day}
        onClose={onClose}
        plan={plan}
        state={state}
      />
    );
  }

  return null;
}

// ── Assign existing / Create new / Mark rest / Copy from another day ─
//
// The empty-day expanded UI hosts all four options in a single panel:
//   1. List of existing workouts (tap to assign)
//   2. "Create new workout" — switches to CreateWorkoutPanel inline
//   3. "Mark as rest day" — button
//   4. "Copy from another day…" — button that expands the list of assigned days

function AssignPanel({
  day,
  onClose,
  onWorkoutCreated,
  plan,
}: {
  day: TrainingWeekday;
  onClose: () => void;
  onWorkoutCreated: (workoutId: string) => void;
  plan: TrainingPlan;
}) {
  const [createPlanItem, {isLoading: isAssigning}] = useCreateTrainingPlanItemMutation();
  const [updatePlan, {isLoading: isMarkingRest}] = useUpdateTrainingPlanMutation();
  const [showCreate, setShowCreate] = useState(false);
  const [showCopyFrom, setShowCopyFrom] = useState(false);
  const [conflictMessage, setConflictMessage] = useState<null | string>(null);

  const workouts = useMemo(() => sortWorkoutsByName(plan.workouts), [plan.workouts]);

  // Days that already have an assigned workout — targets for "copy from".
  const assignedDays = useMemo(() => getAssignedDays(plan.plan_items, day), [plan.plan_items, day]);

  const handleAssign = async (workoutId: string) => {
    setConflictMessage(null);
    try {
      await createPlanItem({
        planId: plan.id,
        body: {day, workout_id: workoutId, workout_type: 'primary'},
      }).unwrap();
      onClose();
    } catch (err) {
      const parsed = parsePlanItemValidationError(err, {day, workout_type: 'primary'});
      if (parsed?.kind === 'conflict') {
        setConflictMessage(parsed.message);
      } else {
        toast.danger('Failed to assign workout.');
      }
    }
  };

  const handleMarkRest = async () => {
    try {
      await updatePlan({id: plan.id, body: {rest_days: buildRestDaysUpdate(plan.rest_days, day)}}).unwrap();
      onClose();
    } catch {
      toast.danger('Failed to mark rest day.');
    }
  };

  if (showCreate) {
    return (
      <CreateWorkoutPanel
        day={day}
        onClose={onClose}
        onWorkoutCreated={onWorkoutCreated}
        plan={plan}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-foreground-400">Add to {TRAINING_DAY_LABELS[day]}</p>

      {conflictMessage ? (
        <p className="rounded-md border border-danger/30 bg-danger/5 px-2 py-1.5 text-xs text-danger">
          {conflictMessage}
        </p>
      ) : null}

      {/* Existing workouts — tap to assign */}
      {workouts.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-foreground-400">Assign existing</p>
          <div className="overflow-hidden rounded-lg border border-divider bg-content1">
            {workouts.map((workout, index) => {
              const usage = getWorkoutUsageLabel(plan.plan_items, workout.id);
              const isLast = index === workouts.length - 1;
              return (
                <button
                  className={[
                    'flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors',
                    'hover:bg-content2 active:bg-content2 disabled:opacity-60',
                    isLast ? '' : 'border-b border-divider',
                  ].join(' ')}
                  disabled={isAssigning}
                  key={workout.id}
                  onClick={() => {
                    handleAssign(workout.id).catch(() => {
                      /* handled inside handleAssign */
                    });
                  }}
                  type="button"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{workout.name}</span>
                    {usage ? <span className="block truncate text-xs text-foreground-400">{usage}</span> : null}
                  </span>
                  <span className="shrink-0 text-xs text-foreground-400">Assign</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Secondary actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          className="min-h-11"
          isDisabled={isAssigning}
          onPress={() => setShowCreate(true)}
          size="sm"
          variant="ghost"
        >
          <Plus size={14} />
          Create new workout
        </Button>
        <Button
          className="min-h-11"
          isDisabled={isAssigning || isMarkingRest}
          isPending={isMarkingRest}
          onPress={() => {
            handleMarkRest().catch(() => {
              /* handled inside handleMarkRest */
            });
          }}
          size="sm"
          variant="ghost"
        >
          Mark as rest day
        </Button>
        {assignedDays.length > 0 ? (
          <Button
            className="min-h-11"
            isDisabled={isAssigning}
            onPress={() => setShowCopyFrom((v) => !v)}
            size="sm"
            variant="ghost"
          >
            {showCopyFrom ? 'Hide copy from…' : 'Copy from another day…'}
          </Button>
        ) : null}
        <Button
          className="min-h-11"
          isDisabled={isAssigning}
          onPress={onClose}
          size="sm"
          variant="ghost"
        >
          Cancel
        </Button>
      </div>

      {/* Copy-from source list */}
      {showCopyFrom ? (
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-foreground-400">Copy from</p>
          <div className="flex flex-wrap gap-1.5">
            {assignedDays.map(([srcDay, item]) => {
              const workout = findWorkoutById(plan.workouts, item.workout_id);
              if (!workout) {
                return null;
              }
              return (
                <Button
                  className="min-h-11"
                  isDisabled={isAssigning}
                  key={srcDay}
                  onPress={() => {
                    handleAssign(workout.id).catch(() => {
                      /* handled inside handleAssign */
                    });
                  }}
                  size="sm"
                  variant="secondary"
                >
                  {TRAINING_DAY_SHORT_LABELS[srcDay]} · {workout.name}
                </Button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ── Create new workout inline ────────────────────────────────────────

function CreateWorkoutPanel({
  day,
  onClose,
  onWorkoutCreated,
  plan,
}: {
  day: TrainingWeekday;
  onClose: () => void;
  onWorkoutCreated: (workoutId: string) => void;
  plan: TrainingPlan;
}) {
  const [createWorkout, {isLoading: isCreating}] = useCreateWorkoutMutation();
  const [createPlanItem, {isLoading: isAssigning}] = useCreateTrainingPlanItemMutation();
  const [conflictMessage, setConflictMessage] = useState<null | string>(null);
  const isBusy = isCreating || isAssigning;

  const handleCreate = async ({name}: WorkoutNameFormValues) => {
    if (isBusy) {
      return;
    }
    setConflictMessage(null);

    const workoutResult = await createWorkout({planId: plan.id, body: {name}}).unwrap();
    try {
      await createPlanItem({
        planId: plan.id,
        body: {day, workout_id: workoutResult.data.id, workout_type: 'primary'},
      }).unwrap();
      onWorkoutCreated(workoutResult.data.id);
      onClose();
    } catch (err) {
      const parsed = parsePlanItemValidationError(err, {day, workout_type: 'primary'});
      if (parsed?.kind === 'conflict') {
        setConflictMessage(parsed.message);
        onWorkoutCreated(workoutResult.data.id);
      } else {
        toast.danger('Failed to assign workout.');
      }
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {conflictMessage ? (
        <p className="rounded-md border border-danger/30 bg-danger/5 px-2 py-1.5 text-xs text-danger">
          {conflictMessage}
        </p>
      ) : null}
      <WorkoutNameForm
        fallbackError="Failed to create workout."
        id={`new-workout-${day}`}
        isSubmitting={isBusy}
        label={`Name for new workout on ${TRAINING_DAY_LABELS[day]}`}
        onCancel={onClose}
        onSubmit={handleCreate}
        submitLabel="Create and assign"
      />
    </div>
  );
}

// ── Copy to another day (assigned-day overflow action) ───────────────

function CopyToPanel({
  day,
  onClose,
  plan,
  state,
}: {
  day: TrainingWeekday;
  onClose: () => void;
  plan: TrainingPlan;
  state: Extract<DayState, {kind: 'assigned'}>;
}) {
  const [createPlanItem, {isLoading}] = useCreateTrainingPlanItemMutation();
  const [selected, setSelected] = useState<Set<TrainingWeekday>>(new Set());
  const [conflictDays, setConflictDays] = useState<Set<TrainingWeekday>>(new Set());

  const primaryItem = getPrimaryAssignedItem(state);
  const workout = findWorkoutById(plan.workouts, primaryItem.workout_id);

  // Days where a primary workout already exists — disable in the checklist.
  const takenDays = useMemo(() => getTakenPrimaryDays(plan.plan_items), [plan.plan_items]);
  const restDays = useMemo(() => createRestDaysSet(plan.rest_days), [plan.rest_days]);

  const toggle = (target: TrainingWeekday) => {
    if (takenDays.has(target) || restDays.has(target)) {
      return;
    }
    setSelected((prev) => toggleWeekdaySelection(prev, target));
  };

  const handleConfirm = async () => {
    if (!workout || selected.size === 0) {
      return;
    }
    const targets = getCopyTargets({day, restDays, selected, takenDays});
    if (targets.length === 0) {
      setSelected(new Set());
      return;
    }
    const failures = new Set<TrainingWeekday>();

    for (const target of targets) {
      try {
        await createPlanItem({
          planId: plan.id,
          body: {day: target, workout_id: workout.id, workout_type: 'primary'},
        }).unwrap();
      } catch (err) {
        const parsed = parsePlanItemValidationError(err, {day: target, workout_type: 'primary'});
        if (parsed?.kind === 'conflict') {
          failures.add(target);
        } else {
          toast.danger(`Failed to copy to ${TRAINING_DAY_LABELS[target]}.`);
          failures.add(target);
        }
      }
    }

    if (failures.size > 0) {
      setConflictDays(failures);
      // Keep panel open, show which days failed so the coach can re-try.
      const succeeded = targets.length - failures.size;
      if (succeeded > 0) {
        toast.success(`Copied to ${succeeded} day${succeeded !== 1 ? 's' : ''}.`);
      }
    } else {
      toast.success(`Copied to ${targets.length} day${targets.length !== 1 ? 's' : ''}.`);
      onClose();
    }
  };

  if (!workout) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-foreground-400">
        Copy <strong>{workout.name}</strong> to…
      </p>
      <div className="flex flex-wrap gap-1.5">
        {TRAINING_WEEKDAYS.filter((d) => d !== day).map((target) => {
          const isTaken = takenDays.has(target);
          const isRestDay = restDays.has(target);
          const unavailableLabel = isTaken ? 'taken' : isRestDay ? 'rest' : '';
          const isSelected = selected.has(target);
          const isConflict = conflictDays.has(target);
          return (
            <button
              aria-pressed={isSelected}
              className={[
                'flex min-h-11 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors',
                isSelected ? 'border-primary bg-primary/10 text-primary' : 'border-divider bg-content1 text-foreground',
                unavailableLabel && !isSelected ? 'opacity-50' : '',
                isConflict ? 'border-danger/50 text-danger' : '',
              ].join(' ')}
              disabled={isLoading || Boolean(unavailableLabel)}
              key={target}
              onClick={() => toggle(target)}
              type="button"
            >
              {isSelected ? <Check size={14} /> : null}
              {TRAINING_DAY_SHORT_LABELS[target]}
              {unavailableLabel && !isSelected ? ` · ${unavailableLabel}` : ''}
            </button>
          );
        })}
      </div>
      {conflictDays.size > 0 ? (
        <p className="text-xs text-danger">
          {buildConflictDaysLabel(conflictDays, TRAINING_DAY_SHORT_LABELS)} already have a primary workout.
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button
          className="min-h-11"
          isDisabled={selected.size === 0 || isLoading}
          isPending={isLoading}
          onPress={handleConfirm}
          size="sm"
        >
          Copy to {selected.size} day{selected.size !== 1 ? 's' : ''}
        </Button>
        <Button
          className="min-h-11"
          isDisabled={isLoading}
          onPress={onClose}
          size="sm"
          variant="ghost"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
