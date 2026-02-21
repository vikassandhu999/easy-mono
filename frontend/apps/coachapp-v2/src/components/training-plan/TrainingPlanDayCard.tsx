import {Button, Card, Input, toast} from '@heroui/react';
import {ChevronDown, ChevronRight, Dumbbell, Pencil, Plus, Save, Trash2, X} from 'lucide-react';
import {useEffect, useMemo, useRef, useState} from 'react';
import {useLocation, useNavigate} from 'react-router';

import type {ErrorResponse} from '@/api/shared';

import {useListExercisesQuery} from '@/api/exercises';
import {
  type PlannedWorkout,
  useDeleteWorkoutElementMutation,
  useGetPlannedWorkoutQuery,
  useUpdatePlannedWorkoutMutation,
} from '@/api/trainingPlans';
import ConfirmDialog from '@/components/ConfirmDialog';
import {WorkoutElementEditCard} from '@/components/training-plan/WorkoutElementEditCard';
import {WorkoutElementViewCard} from '@/components/training-plan/WorkoutElementViewCard';

type TrainingPlanDayCardProps = {
  isMutating: boolean;
  onDeleteDay: (plannedWorkoutId: string) => Promise<void>;
  plannedWorkout: PlannedWorkout;
};

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'data' in error) {
    return (error as {data?: ErrorResponse}).data?.error_message ?? fallback;
  }
  return fallback;
};

export default function TrainingPlanDayCard({isMutating, onDeleteDay, plannedWorkout}: TrainingPlanDayCardProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const planId = plannedWorkout.training_plan_id;

  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(plannedWorkout.name);
  const [editingElementId, setEditingElementId] = useState<null | string>(null);
  const [elementToDelete, setElementToDelete] = useState<null | string>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingName) nameInputRef.current?.focus();
  }, [isEditingName]);

  const [updatePlannedWorkout, {isLoading: isUpdatingName}] = useUpdatePlannedWorkoutMutation();
  const [deleteWorkoutElement, {isLoading: isDeletingElement}] = useDeleteWorkoutElementMutation();

  // Only fetch full workout data when expanded
  const {data: workoutData} = useGetPlannedWorkoutQuery(plannedWorkout.id, {
    skip: !isExpanded,
  });

  const {data: exercisesData} = useListExercisesQuery({limit: 250, offset: 0}, {skip: !isExpanded});

  const fullWorkout = workoutData?.data;
  const exercises = exercisesData?.data ?? [];

  const sortedElements = useMemo(
    () =>
      [...(fullWorkout?.workout_elements ?? plannedWorkout.workout_elements ?? [])].sort(
        (a, b) => a.position - b.position,
      ),
    [fullWorkout?.workout_elements, plannedWorkout.workout_elements],
  );

  const elementCount = plannedWorkout.workout_elements.length;
  const totalSets = plannedWorkout.workout_elements.reduce((total, element) => total + element.planned_sets.length, 0);

  const handleSaveName = async () => {
    if (!editedName.trim() || editedName.trim() === plannedWorkout.name) {
      setIsEditingName(false);
      setEditedName(plannedWorkout.name);
      return;
    }
    try {
      await updatePlannedWorkout({
        body: {name: editedName.trim()},
        id: plannedWorkout.id,
        planId,
      }).unwrap();
      toast.success('Workout renamed');
      setIsEditingName(false);
    } catch (error) {
      toast.danger(getApiErrorMessage(error, 'Failed to rename workout'));
    }
  };

  const handleDeleteElement = (elementId: string) => {
    setElementToDelete(elementId);
  };

  const confirmDeleteElement = async () => {
    if (!elementToDelete) return;
    const id = elementToDelete;
    setElementToDelete(null);
    try {
      await deleteWorkoutElement({
        id,
        planId,
        plannedWorkoutId: plannedWorkout.id,
      }).unwrap();
      toast.success('Exercise deleted');
    } catch (error) {
      toast.danger(getApiErrorMessage(error, 'Failed to delete exercise'));
    }
  };

  return (
    <Card className="rounded-xl border border-separator bg-surface p-0 transition-all duration-200 hover:border-border">
      {/* Header row — always visible */}
      <div className="flex items-center gap-0">
        {/* Day number badge */}
        <div className="flex items-center justify-center border-r border-separator px-4 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-secondary text-foreground">
            <span className="text-sm font-bold">{plannedWorkout.day_number}</span>
          </div>
        </div>

        {/* Expand / collapse toggle + workout name */}
        <button
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 border-none bg-transparent px-4 py-4 text-left outline-none"
          onClick={() => setIsExpanded((prev) => !prev)}
          type="button"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
          )}
          <div className="min-w-0 flex-1">
            {isEditingName ? (
              <div
                className="flex items-center gap-2"
                onClick={(e) => e.stopPropagation()}
                role="presentation"
              >
                <Input
                  className="min-h-9 text-sm"
                  onChange={(e) => setEditedName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') {
                      setIsEditingName(false);
                      setEditedName(plannedWorkout.name);
                    }
                  }}
                  ref={nameInputRef}
                  value={editedName}
                  variant="secondary"
                />
                <Button
                  className="min-h-8 min-w-8"
                  isDisabled={isUpdatingName}
                  isIconOnly
                  onPress={handleSaveName}
                  size="sm"
                  variant="primary"
                >
                  <Save className="h-3.5 w-3.5" />
                </Button>
                <Button
                  className="min-h-8 min-w-8"
                  isIconOnly
                  onPress={() => {
                    setIsEditingName(false);
                    setEditedName(plannedWorkout.name);
                  }}
                  size="sm"
                  variant="ghost"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <>
                <p className="truncate text-sm font-semibold text-foreground">{plannedWorkout.name}</p>
                <div className="mt-1 flex items-center gap-3">
                  <span className="inline-flex items-center gap-1 text-xs text-muted">
                    <Dumbbell className="h-3 w-3" />
                    {elementCount} exercise{elementCount === 1 ? '' : 's'}
                  </span>
                  <span className="text-xs text-muted">·</span>
                  <span className="text-xs text-muted">
                    {totalSets} set{totalSets === 1 ? '' : 's'}
                  </span>
                </div>
              </>
            )}
          </div>
        </button>

        {/* Actions */}
        <div className="flex items-center gap-1 border-l border-separator px-3">
          <Button
            aria-label="Rename workout"
            className="min-h-9 min-w-9"
            isIconOnly
            onPress={() => {
              setIsEditingName(true);
              setEditedName(plannedWorkout.name);
            }}
            size="sm"
            variant="ghost"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            aria-label="Delete workout"
            className="min-h-9 min-w-9"
            isDisabled={isMutating}
            isIconOnly
            onPress={() => onDeleteDay(plannedWorkout.id)}
            size="sm"
            variant="ghost"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Expanded content — exercises */}
      {isExpanded && (
        <div className="border-t border-separator">
          <div className="flex flex-col gap-3 p-4">
            {/* Section header */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted">
                {sortedElements.length} exercise{sortedElements.length === 1 ? '' : 's'}
              </p>
              <Button
                className="min-h-9"
                onPress={() =>
                  navigate(`/library/training-plans/${planId}/builder/days/${plannedWorkout.id}/exercises/new`, {
                    state: {from: location.pathname},
                  })
                }
                size="sm"
                variant="outline"
              >
                <Plus className="h-3.5 w-3.5" />
                Add exercise
              </Button>
            </div>

            {/* Exercise list or empty state */}
            {sortedElements.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-separator bg-background p-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-secondary">
                  <span className="text-lg">🏋️</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">No exercises yet</p>
                  <p className="mt-0.5 text-xs text-muted">Add exercises to build this workout.</p>
                </div>
                <Button
                  className="min-h-9"
                  onPress={() =>
                    navigate(`/library/training-plans/${planId}/builder/days/${plannedWorkout.id}/exercises/new`, {
                      state: {from: location.pathname},
                    })
                  }
                  size="sm"
                  variant="primary"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add first exercise
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {sortedElements.map((element, index) => {
                  if (editingElementId === element.id) {
                    return (
                      <WorkoutElementEditCard
                        element={element}
                        exercises={exercises}
                        key={element.id}
                        onDone={() => setEditingElementId(null)}
                        planId={planId}
                        plannedWorkoutId={plannedWorkout.id}
                      />
                    );
                  }

                  return (
                    <WorkoutElementViewCard
                      element={element}
                      exercises={exercises}
                      index={index}
                      isDeleting={isDeletingElement}
                      key={element.id}
                      onDelete={() => handleDeleteElement(element.id)}
                      onEdit={() => setEditingElementId(element.id)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        confirmLabel="Delete"
        description="Delete this exercise? This cannot be undone."
        isLoading={isDeletingElement}
        isOpen={elementToDelete !== null}
        onConfirm={confirmDeleteElement}
        onOpenChange={(open) => {
          if (!open) setElementToDelete(null);
        }}
        title="Delete exercise"
      />
    </Card>
  );
}
