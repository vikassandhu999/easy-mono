import {Autocomplete, Button, Card, Input, Label, ListBox, SearchField, toast, useFilter} from '@heroui/react';
import {Plus, Trash2} from 'lucide-react';
import {useState} from 'react';

import type {Exercise} from '@/api/exercises';

import {
  useDeleteWorkoutElementMutation,
  useUpdateWorkoutElementMutation,
  type WorkoutElement,
  type WorkoutElementUpdateRequest,
} from '@/api/trainingPlans';

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

  // Initialize draft state
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
    } catch {
      toast.danger('Failed to update exercise');
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm('Delete this exercise?');
    if (!confirmed) return;
    try {
      await deleteWorkoutElement({
        id: element.id,
        planId,
        plannedWorkoutId,
      }).unwrap();
      toast.success('Exercise deleted');
      onDone();
    } catch {
      toast.danger('Failed to delete exercise');
    }
  };

  const isMutating = isUpdating || isDeleting;

  return (
    <Card className="rounded-xl border border-separator bg-surface p-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Edit {exerciseName}</p>
          <Button
            className="min-h-11"
            onPress={onDone}
            size="sm"
            variant="ghost"
          >
            Done
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
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
            <Label className="text-xs text-muted">Exercise</Label>
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
            <Label className="text-xs text-muted">Order</Label>
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
          <Label className="text-xs text-muted">Notes</Label>
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

        <div className="flex items-center justify-between pt-2">
          <p className="text-sm font-medium text-foreground">Sets ({draft.sets.length})</p>
          <Button
            className="min-h-11"
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

        <div className="flex justify-between pt-2">
          <Button
            className="min-h-11"
            isDisabled={isMutating}
            onPress={handleDelete}
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
            Save changes
          </Button>
        </div>
      </div>
    </Card>
  );
}
