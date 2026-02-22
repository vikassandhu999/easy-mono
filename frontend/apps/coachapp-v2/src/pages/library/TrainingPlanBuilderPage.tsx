import {Button, Card, FieldError, Input, Label, ListBox, Modal, Select, Skeleton, TextField, toast} from '@heroui/react';
import {ArrowLeft, Copy, Dumbbell, Layers, Plus, Settings} from 'lucide-react';
import {Fragment, useMemo, useState} from 'react';
import {useLocation, useNavigate, useParams} from 'react-router';

import {
  useCreatePlannedWorkoutMutation,
  useDuplicateTrainingPlanMutation,
  useGetTrainingPlanQuery,
} from '@/api/trainingPlans';
import {WorkoutDayCard} from '@/components/training-plan/WorkoutDayCard';
import AssignTrainingPlanModal from '@/pages/library/AssignTrainingPlanModal';
import {getReturnTo} from '@/pages/library/libraryFormShared';
import {toSentenceCase} from '@/pages/library/libraryShared';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

const getDayLabel = (dayNumber: number): string => DAY_LABELS[(dayNumber - 1) % 7] ?? 'Day';

export default function TrainingPlanBuilderPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {id} = useParams();
  const planId = id ?? '';
  const returnTo = getReturnTo(location, '/library');

  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isAddingDay, setIsAddingDay] = useState(false);
  const [newDayName, setNewDayName] = useState('');
  const [selectedDay, setSelectedDay] = useState<string>('Mon');

  const {
    data: planData,
    isError: isPlanError,
    isLoading: isPlanLoading,
    refetch: refetchPlan,
  } = useGetTrainingPlanQuery(planId, {skip: !planId});
  const [duplicateTrainingPlan, {isLoading: isDuplicating}] = useDuplicateTrainingPlanMutation();
  const [createPlannedWorkout, {isLoading: isCreatingDay}] = useCreatePlannedWorkoutMutation();

  const plan = planData?.data;
  const sortedWorkouts = useMemo(
    () => [...(plan?.planned_workouts ?? [])].sort((a, b) => a.day_number - b.day_number),
    [plan?.planned_workouts],
  );

  const openAddDay = () => {
    const nextDayIdx = sortedWorkouts.length > 0 ? Math.max(...sortedWorkouts.map((w) => w.day_number)) % 7 : 0;
    setSelectedDay(DAY_LABELS[nextDayIdx] ?? 'Mon');
    setNewDayName('');
    setIsAddingDay(true);
  };

  const closeAddDay = () => {
    setIsAddingDay(false);
    setNewDayName('');
  };

  const handleDuplicatePlan = async () => {
    if (!planId) return;
    try {
      const res = await duplicateTrainingPlan(planId).unwrap();
      toast.success('Plan duplicated');
      navigate(`/library/training-plans/${res.data.id}/builder`, {state: {from: returnTo}});
    } catch {
      toast.danger('Failed to duplicate plan');
    }
  };

  const handleAddDay = async () => {
    if (!newDayName.trim()) return;
    const dayNumber = (DAY_LABELS as readonly string[]).indexOf(selectedDay) + 1;
    try {
      await createPlannedWorkout({body: {day_number: dayNumber, name: newDayName.trim()}, planId}).unwrap();
      toast.success('Workout added');
      closeAddDay();
    } catch {
      toast.danger('Failed to add workout');
    }
  };

  if (isPlanLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-6 w-48 rounded-md" />
        </div>
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
    );
  }

  if (isPlanError || !plan) {
    return (
      <Card className="border border-separator bg-surface p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-secondary">
            <Layers className="h-7 w-7 text-muted" />
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">Failed to load plan</p>
            <p className="mt-1 text-sm text-muted">Something went wrong. Try again or return to library.</p>
          </div>
          <div className="flex gap-2">
            <Button
              className="min-h-11"
              onPress={() => refetchPlan()}
              size="md"
              variant="secondary"
            >
              Retry
            </Button>
            <Button
              className="min-h-11"
              onPress={() => navigate(returnTo)}
              size="md"
              variant="ghost"
            >
              Back to library
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Button
        className="min-h-9 w-fit gap-2 px-2 text-muted hover:text-foreground"
        onPress={() => navigate(returnTo)}
        size="sm"
        variant="ghost"
      >
        <ArrowLeft className="h-4 w-4" />
        Library
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted">Training plan</p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">{plan.name}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-surface-secondary px-2.5 py-0.5 text-xs font-medium text-muted">
              {toSentenceCase(plan.status)}
            </span>
            <span className="inline-flex items-center gap-1 text-sm text-muted">
              <Layers className="h-3.5 w-3.5" />
              {plan.is_template ? 'Template' : 'Personal'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {plan.is_template ? (
            <Button
              className="min-h-11"
              onPress={() => setIsAssignOpen(true)}
              size="md"
              variant="primary"
            >
              Assign to client
            </Button>
          ) : null}
          <Button
            className="min-h-11"
            onPress={() => navigate(`/library/training-plans/${plan.id}/edit`, {state: {from: returnTo}})}
            size="md"
            variant="outline"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Button>
          <Button
            className="min-h-11"
            isDisabled={isDuplicating}
            onPress={handleDuplicatePlan}
            size="md"
            variant="ghost"
          >
            <Copy className="h-4 w-4" />
            Duplicate
          </Button>
        </div>
      </div>

      <div className="border-t border-separator" />

      <div className="flex items-center justify-between">
        <div>
          <p className="text-base font-semibold text-foreground">Schedule</p>
          <p className="text-sm text-muted">
            {sortedWorkouts.length > 0
              ? `${sortedWorkouts.length} workout${sortedWorkouts.length === 1 ? '' : 's'}`
              : 'No workouts yet'}
          </p>
        </div>
        <Button
          className="min-h-11"
          onPress={openAddDay}
          size="sm"
          variant="secondary"
        >
          <Plus className="h-4 w-4" />
          Add workout
        </Button>
      </div>

      {sortedWorkouts.length === 0 ? (
        <Card className="border border-dashed border-separator bg-surface p-10">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-secondary">
              <Dumbbell className="h-8 w-8 text-muted" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">No workouts yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted">Start building your plan by adding workouts.</p>
            </div>
            <Button
              className="mt-2 min-h-11"
              onPress={openAddDay}
              size="md"
              variant="secondary"
            >
              <Plus className="h-4 w-4" />
              Add first workout
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden rounded-xl border border-separator bg-surface p-0">
          {sortedWorkouts.map((pw, index) => (
            <Fragment key={pw.id}>
              {index > 0 ? <div className="border-t border-separator" /> : null}
              <WorkoutDayCard
                dayLabel={getDayLabel(pw.day_number)}
                plannedWorkout={pw}
              />
            </Fragment>
          ))}
        </Card>
      )}

      <Modal
        isOpen={isAddingDay}
        onOpenChange={(open) => {
          if (!open) closeAddDay();
        }}
      >
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.Header>
                <h4 className={"font-bold text-xl"}>
                Add workout
                </h4>
                
                </Modal.Header>
              <Modal.Body className={"p-4"}>
                <div className="flex flex-col gap-4">
                  <Select
                      onChange={(value) => {
                      if (value !== null) setSelectedDay(value?.toString() ?? 'Mon');
                    }}
                    value={selectedDay}
                     variant="secondary"
                  >
                    <Label className="text-sm font-medium text-foreground">Day</Label>
                    <Select.Trigger className="min-h-11 w-full">
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {DAY_LABELS.map((label) => (
                          <ListBox.Item
                            key={label}
                            textValue={label}
                          >
                            {label}
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                  
                   <TextField
        isRequired
        name="Name"
        autoFocus
          className="min-h-11"
        type="text"
         onChange={(value) => setNewDayName(value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddDay();
                    }}
                    value={newDayName}
                    variant="secondary"
      >
        <Label>Name</Label>
        <Input placeholder="e.g. Push Day, Leg Day..." />
        <FieldError />
      </TextField>
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  className="min-h-11"
                  onPress={closeAddDay}
                  size="md"
                  variant="ghost"
                >
                  Cancel
                </Button>
                <Button
                  className="min-h-11"
                  isDisabled={isCreatingDay || !newDayName.trim()}
                  onPress={handleAddDay}
                  size="md"
                  variant="primary"
                >
                  {isCreatingDay ? 'Adding...' : 'Add workout'}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <AssignTrainingPlanModal
        isOpen={isAssignOpen}
        onAssigned={(assignedId) =>
          navigate(`/library/training-plans/${assignedId}/builder`, {state: {from: returnTo}})
        }
        onOpenChange={setIsAssignOpen}
        plan={plan}
      />
    </div>
  );
}
