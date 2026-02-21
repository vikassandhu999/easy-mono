import {Autocomplete, Button, Card, Input, Label, ListBox, SearchField, toast, useFilter} from '@heroui/react';
import {Plus, Save, Trash2} from 'lucide-react';
import {useState} from 'react';

import type {Exercise} from '@/api/exercises';
import type {ErrorResponse} from '@/api/shared';

import {
  useDeleteWorkoutElementMutation,
  useUpdateWorkoutElementMutation,
  type WorkoutElement,
  type WorkoutElementUpdateRequest,
} from '@/api/trainingPlans';
import ConfirmDialog from '@/components/ConfirmDialog';

import {EMPTY_SET, fromSetDraft, type SetDraft, SetRow, toSetDraft} from './WorkoutSetRow';

const integerFromString = (value: string) => {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : undefined;
};

type ExerciseDraft = {
  exerciseId: string;
  notes: string;
  position: string;
  sets: SetDraft[];
};

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'data' in error) {
    return (error as {data?: ErrorResponse}).data?.error_message ?? fallback;
  }
  return fallback;
};

interface WorkoutElementEditCardProps {
  element: WorkoutElement;
  exercises: Exercise[];
  onDone: () => void;
  planId: string;
  plannedWorkoutId: string;
}

export function WorkoutElementEditCard({
  element,
  exercises,
  planId,
  plannedWorkoutId,
  onDone,
}: WorkoutElementEditCardProps) {
  const {contains} = useFilter({sensitivity: 'base'});
  const [updateWorkoutElement, {isLoading: isUpdating}] = useUpdateWorkoutElementMutation();
  const [deleteWorkoutElement, {isLoading: isDeleting}] = useDeleteWorkoutElementMutation();

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [draft, setDraft] = useState<ExerciseDraft>(() => ({
    exerciseId: element.exercise_id,
    notes: element.notes ?? '',
    position: String(element.position),
    sets: element.planned_sets.length > 0 ? element.planned_sets.map(toSetDraft) : [{...EMPTY_SET}],
  }));

  const exerciseName =
    element.exercise?.name ?? exercises.find((e) => e.id === element.exercise_id)?.name ?? 'Exercise';

  const handleUpdate = async () => {
    try {
      const payload: WorkoutElementUpdateRequest = {
        exercise_id: draft.exerciseId,
        notes: draft.notes.trim() || undefined,
        planned_sets: draft.sets.map(fromSetDraft),
        position: integerFromString(draft.position),
      };
      await updateWorkoutElement({
        body: payload,
        id: element.id,
        planId,
        plannedWorkoutId,
      }).unwrap();
      toast.success('Exercise updated');
      onDone();
    } catch (error) {
      toast.danger(getApiErrorMessage(error, 'Failed to update exercise'));
    }
  };

  const handleDelete = async () => {
    setIsDeleteOpen(false);
    try {
      await deleteWorkoutElement({
        id: element.id,
        planId,
        plannedWorkoutId,
      }).unwrap();
      toast.success('Exercise deleted');
      onDone();
    } catch (error) {
      toast.danger(getApiErrorMessage(error, 'Failed to delete exercise'));
    }
  };

  const isMutating = isUpdating || isDeleting;

  return (
    <Card className="rounded-xl border border-separator bg-surface p-5">
      <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-secondary">
              <span className="text-xs font-bold text-foreground">✎</span>
            </div>
            <p className="text-sm font-semibold text-foreground">Editing {exerciseName}</p>
          </div>
          <Button
            className="min-h-9 text-xs"
            onPress={onDone}
            size="sm"
            variant="ghost"
          >
            Cancel
          </Button>
        </div>

        {/* Fields */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Autocomplete
            allowsEmptyCollection
            fullWidth
            onSelectionChange={(key) =>
              setDraft((prev) => ({
                ...prev,
                exerciseId: key?.toString() ?? '',
              }))
            }
            selectedKey={draft.exerciseId}
            variant="secondary"
          >
            <Label className="text-sm font-medium text-foreground">Exercise</Label>
            <Autocomplete.Trigger className="min-h-11">
              <Autocomplete.Value />
              <Autocomplete.ClearButton />
              <Autocomplete.Indicator />
            </Autocomplete.Trigger>
            <Autocomplete.Popover>
              <Autocomplete.Filter filter={contains}>
                <SearchField>
                  <SearchField.Group>
                    <SearchField.SearchIcon />
                    <SearchField.Input placeholder="Search exercise..." />
                  </SearchField.Group>
                </SearchField>
                <ListBox>
                  {exercises.map((exercise) => (
                    <ListBox.Item
                      id={exercise.id}
                      key={exercise.id}
                      textValue={exercise.name}
                    >
                      <span className="text-sm">{exercise.name}</span>
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Autocomplete.Filter>
            </Autocomplete.Popover>
          </Autocomplete>

          <div>
            <Label className="text-sm font-medium text-foreground">Order</Label>
            <Input
              className="min-h-11"
              min={1}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  position: e.target.value,
                }))
              }
              type="number"
              value={draft.position}
              variant="secondary"
            />
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium text-foreground">Notes</Label>
          <Input
            className="min-h-11"
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                notes: e.target.value,
              }))
            }
            placeholder="Exercise notes..."
            value={draft.notes}
            variant="secondary"
          />
        </div>

        {/* Separator */}
        <div className="border-t border-separator" />

        {/* Sets section */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Sets</p>
            <p className="text-xs text-muted">
              {draft.sets.length} set{draft.sets.length === 1 ? '' : 's'} configured
            </p>
          </div>
          <Button
            className="min-h-9"
            onPress={() =>
              setDraft((prev) => ({
                ...prev,
                sets: [...prev.sets, {...EMPTY_SET}],
              }))
            }
            size="sm"
            variant="outline"
          >
            <Plus className="h-4 w-4" />
            Add set
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          {draft.sets.map((item, index) => (
            <SetRow
              key={index}
              onChange={(next) => {
                const nextSets = [...draft.sets];
                nextSets[index] = next;
                setDraft((prev) => ({...prev, sets: nextSets}));
              }}
              onRemove={() => {
                const nextSets = draft.sets.filter((_, i) => i !== index);
                setDraft((prev) => ({
                  ...prev,
                  sets: nextSets.length > 0 ? nextSets : [{...EMPTY_SET}],
                }));
              }}
              setDraft={item}
              setIndex={index}
            />
          ))}
        </div>

        {/* Action footer */}
        <div className="flex justify-between border-t border-separator pt-4">
          <Button
            className="min-h-11 text-muted"
            isDisabled={isMutating}
            onPress={() => setIsDeleteOpen(true)}
            size="md"
            variant="ghost"
          >
            <Trash2 className="h-4 w-4" />
            Delete exercise
          </Button>
          <Button
            className="min-h-11"
            isDisabled={isMutating || !draft.exerciseId}
            onPress={handleUpdate}
            size="md"
            variant="primary"
          >
            <Save className="h-4 w-4" />
            Save changes
          </Button>
        </div>
      </div>

      <ConfirmDialog
        confirmLabel="Delete"
        description="Delete this exercise? This cannot be undone."
        isLoading={isDeleting}
        isOpen={isDeleteOpen}
        onConfirm={handleDelete}
        onOpenChange={setIsDeleteOpen}
        title="Delete exercise"
      />
    </Card>
  );
}
