import {AlertDialog, Button, Chip, Input, Spinner, toast} from '@heroui/react';
import {ArrowLeft, Copy, Pencil, Plus, Trash2, UserPlus} from 'lucide-react';
import {useCallback, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';

import type {Client} from '@/api/clients';

import PageLayout from '@/@components/page-layout';
import {ROUTES} from '@/@config/routes';
import {useGoBack} from '@/@hooks/use-go-back';
import {
  useAssignTrainingPlanMutation,
  useCreatePlannedWorkoutMutation,
  useDeleteTrainingPlanMutation,
  useDuplicateTrainingPlanMutation,
  useGetTrainingPlanQuery,
} from '@/api/trainingPlans';
import ClientPicker from '@/clients/components/client-picker';
import WorkoutSection from '@/training-plans/components/workout-section';

const STATUS_MAP: Record<
  string,
  {
    color: 'accent' | 'danger' | 'default' | 'success' | 'warning';
    label: string;
  }
> = {
  active: {color: 'success', label: 'Active'},
  draft: {color: 'default', label: 'Draft'},
  archived: {color: 'warning', label: 'Archived'},
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function TrainingPlanDetail() {
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const goBack = useGoBack(ROUTES.TRAINING_PLANS);
  const {data, isError, isLoading} = useGetTrainingPlanQuery(id!);
  const [deletePlan, {isLoading: isDeleting}] = useDeleteTrainingPlanMutation();
  const [duplicatePlan, {isLoading: isDuplicating}] = useDuplicateTrainingPlanMutation();
  const [createWorkout, {isLoading: isCreatingWorkout}] = useCreatePlannedWorkoutMutation();
  const [assignPlan, {isLoading: isAssigning}] = useAssignTrainingPlanMutation();

  // Inline copy-to-client state
  const [showCopyToClient, setShowCopyToClient] = useState(false);
  const [assignStartDate, setAssignStartDate] = useState('');
  const [assignEndDate, setAssignEndDate] = useState('');

  const handleCopyToClient = async (client: Client) => {
    try {
      await assignPlan({
        id: id!,
        body: {
          client_id: client.id,
          ...(assignStartDate && {start_date: assignStartDate}),
          ...(assignEndDate && {end_date: assignEndDate}),
        },
      }).unwrap();
      const clientName = [client.first_name, client.last_name].filter(Boolean).join(' ') || client.email;
      toast.success(`Plan copied to ${clientName}`);
      setShowCopyToClient(false);
      setAssignStartDate('');
      setAssignEndDate('');
    } catch {
      toast.danger('Failed to copy plan to client.');
    }
  };

  // Inline add-workout state
  const [isAddingWorkout, setIsAddingWorkout] = useState(false);
  const [newWorkoutName, setNewWorkoutName] = useState('');
  const [scrollToWorkoutId, setScrollToWorkoutId] = useState<null | string>(null);

  // Callback ref that scrolls a WorkoutSection into view then clears the scroll target
  const scrollRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node && scrollToWorkoutId) {
        node.scrollIntoView({behavior: 'smooth', block: 'center'});
        setScrollToWorkoutId(null);
      }
    },
    [scrollToWorkoutId],
  );

  const handleDuplicate = async () => {
    try {
      const result = await duplicatePlan(id!).unwrap();
      toast.success('Training plan duplicated');
      navigate(`/library/training-plans/${result.data.id}`);
    } catch {
      toast.danger('Failed to duplicate training plan');
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

  const handleAddWorkout = async () => {
    if (!newWorkoutName.trim()) return;
    try {
      const result = await createWorkout({
        planId: id!,
        body: {
          name: newWorkoutName.trim(),
          day_number: nextDayNumber,
        },
      }).unwrap();
      setNewWorkoutName('');
      setIsAddingWorkout(false);
      setScrollToWorkoutId(result.data.id);
    } catch {
      toast.danger('Failed to add workout');
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
  const status = plan.status ? STATUS_MAP[plan.status] : null;
  const sortedWorkouts = [...plan.planned_workouts].sort((a, b) => a.day_number - b.day_number);
  const nextDayNumber = sortedWorkouts.length > 0 ? Math.max(...sortedWorkouts.map((w) => w.day_number)) + 1 : 1;

  return (
    <PageLayout title="Training Plan">
      {/* Navigation + action buttons */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button
          onPress={goBack}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft size={16} />
          Back
        </Button>
        <Button
          onPress={() => navigate(`/library/training-plans/${plan.id}/edit`)}
          size="sm"
          variant="secondary"
        >
          <Pencil size={16} />
          Edit
        </Button>
        <Button
          onPress={() => setShowCopyToClient((v) => !v)}
          size="sm"
          variant="secondary"
        >
          <UserPlus size={16} />
          Copy to Client
        </Button>
        <Button
          isPending={isDuplicating}
          onPress={handleDuplicate}
          size="sm"
          variant="secondary"
        >
          <Copy size={16} />
          Duplicate
        </Button>
        <AlertDialog>
          <Button
            size="sm"
            variant="danger"
          >
            <Trash2 size={16} />
            Delete
          </Button>
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
                    This will permanently delete <strong>{plan.name}</strong> and all its workouts. This action cannot
                    be undone.
                  </p>
                </AlertDialog.Body>
                <AlertDialog.Footer>
                  <Button
                    slot="close"
                    variant="tertiary"
                  >
                    Cancel
                  </Button>
                  <Button
                    isPending={isDeleting}
                    onPress={handleDelete}
                    variant="danger"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </Button>
                </AlertDialog.Footer>
              </AlertDialog.Dialog>
            </AlertDialog.Container>
          </AlertDialog.Backdrop>
        </AlertDialog>
      </div>

      {/* Copy to client — revealed inline below nav bar */}
      {showCopyToClient && (
        <div className="mb-4 max-w-md rounded-xl border border-divider bg-content1 p-4">
          <p className="mb-3 text-sm text-foreground-500">
            Search for a client to copy this plan to. A new plan will be created for the selected client.
          </p>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label
                className="text-xs text-foreground-400"
                htmlFor="assign-start-date"
              >
                Start date
              </label>
              <Input
                id="assign-start-date"
                onChange={(e) => setAssignStartDate(e.target.value)}
                type="date"
                value={assignStartDate}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                className="text-xs text-foreground-400"
                htmlFor="assign-end-date"
              >
                End date
              </label>
              <Input
                id="assign-end-date"
                onChange={(e) => setAssignEndDate(e.target.value)}
                type="date"
                value={assignEndDate}
              />
            </div>
          </div>
          <ClientPicker
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

      <div className="min-w-0 max-w-2xl overflow-hidden">
        {/* Plan header */}
        <div className="pb-6">
          <h2 className="text-lg font-semibold">{plan.name}</h2>
          {plan.description && <p className="mt-1 text-sm text-foreground-500">{plan.description}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {status && (
              <Chip
                color={status.color}
                size="sm"
                variant="soft"
              >
                {status.label}
              </Chip>
            )}
            {plan.is_template && (
              <Chip
                size="sm"
                variant="soft"
              >
                template
              </Chip>
            )}
          </div>
          {/* Start / End dates */}
          {(plan.start_date || plan.end_date) && (
            <div className="mt-2 flex gap-4 text-sm text-foreground-500">
              <span>Start: {plan.start_date ? formatDate(plan.start_date) : '\u2014'}</span>
              <span>End: {plan.end_date ? formatDate(plan.end_date) : '\u2014'}</span>
            </div>
          )}
        </div>

        {/* Workouts section */}
        <section className="border-t border-divider py-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground-400">Workouts</h3>
          </div>

          {sortedWorkouts.length > 0 ? (
            <div className="flex flex-col gap-3">
              {sortedWorkouts.map((workout) => (
                <WorkoutSection
                  allWorkouts={sortedWorkouts}
                  key={workout.id}
                  planId={plan.id}
                  sectionRef={workout.id === scrollToWorkoutId ? scrollRef : undefined}
                  workout={workout}
                />
              ))}
            </div>
          ) : (
            <p className="mb-3 text-sm text-foreground-400">
              No workouts yet. Add your first workout to start building the plan.
            </p>
          )}

          {/* Add workout — inline form (1 field = INLINE) */}
          <div className="mt-3">
            {isAddingWorkout ? (
              <div className="flex items-end gap-2 rounded-xl border border-dashed border-divider p-3">
                <div className="flex-1">
                  <label
                    className="mb-1 block text-xs text-foreground-400"
                    htmlFor="new-workout-name"
                  >
                    Workout name
                  </label>
                  <Input
                    id="new-workout-name"
                    onChange={(e) => setNewWorkoutName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddWorkout();
                      }
                    }}
                    placeholder="e.g. Push Day"
                    value={newWorkoutName}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    isPending={isCreatingWorkout}
                    onPress={handleAddWorkout}
                    size="sm"
                  >
                    {isCreatingWorkout ? 'Adding...' : 'Add'}
                  </Button>
                  <Button
                    onPress={() => {
                      setIsAddingWorkout(false);
                      setNewWorkoutName('');
                    }}
                    size="sm"
                    variant="ghost"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                onPress={() => setIsAddingWorkout(true)}
                size="sm"
                variant="secondary"
              >
                <Plus size={14} />
                Add Workout
              </Button>
            )}
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
