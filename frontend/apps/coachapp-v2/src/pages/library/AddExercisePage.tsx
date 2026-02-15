import {Autocomplete, Button, Card, Input, Label, ListBox, SearchField, toast, useFilter} from '@heroui/react';
import {ArrowLeft, Plus, Save, Trash2} from 'lucide-react';
import {useMemo, useState} from 'react';
import {useLocation, useNavigate, useParams} from 'react-router';

import type {SetDraft} from '@/pages/library/WorkoutSetRow';

import {useListExercisesQuery} from '@/api/exercises';
import {useCreateWorkoutElementMutation, useGetPlannedWorkoutQuery, useGetTrainingPlanQuery} from '@/api/trainingPlans';
import {EMPTY_SET, fromSetDraft, SetRow} from '@/pages/library/WorkoutSetRow';

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

const emptyExerciseDraft = (): ExerciseDraft => ({
  exerciseId: '',
  notes: '',
  position: '',
  sets: [{...EMPTY_SET}],
});

export default function AddExercisePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {id, dayId} = useParams();
  const planId = id ?? '';
  const plannedWorkoutId = dayId ?? '';

  const returnTo =
    typeof location.state === 'object' &&
    location.state &&
    'from' in location.state &&
    typeof location.state.from === 'string'
      ? location.state.from
      : `/library/training-plans/${planId}/builder/days/${plannedWorkoutId}/exercises`;

  const {contains} = useFilter({sensitivity: 'base'});

  const [draft, setDraft] = useState<ExerciseDraft>(emptyExerciseDraft());

  const {data: planData, isLoading: isPlanLoading} = useGetTrainingPlanQuery(planId, {skip: !planId});
  const {data: workoutData, isLoading: isWorkoutLoading} = useGetPlannedWorkoutQuery(plannedWorkoutId, {
    skip: !plannedWorkoutId,
  });
  const {data: exercisesData, isLoading: isExercisesLoading} = useListExercisesQuery(
    {limit: 250, offset: 0},
    {skip: !planId},
  );

  const [createWorkoutElement, {isLoading: isCreating}] = useCreateWorkoutElementMutation();

  const plan = planData?.data;
  const workout = workoutData?.data;
  const exercises = exercisesData?.data ?? [];

  const existingElements = useMemo(() => workout?.workout_elements ?? [], [workout?.workout_elements]);

  const nextPosition = existingElements.length + 1;

  const handleSave = async () => {
    if (!planId || !plannedWorkoutId || !draft.exerciseId) {
      toast.danger('Choose an exercise');
      return;
    }
    try {
      await createWorkoutElement({
        body: {
          exercise_id: draft.exerciseId,
          planned_sets: draft.sets.map(fromSetDraft),
          planned_workout_id: plannedWorkoutId,
          position: integerFromString(draft.position) ?? existingElements.length,
        },
        planId,
        plannedWorkoutId,
      }).unwrap();
      toast.success('Exercise added');
      navigate(returnTo);
    } catch {
      toast.danger('Failed to add exercise');
    }
  };

  const isLoading = isPlanLoading || isWorkoutLoading || isExercisesLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <p className="text-sm text-muted">Loading...</p>
      </div>
    );
  }

  if (!plan || !workout) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Card className="rounded-xl border border-separator bg-surface p-6">
          <p className="font-semibold text-foreground">Day not found</p>
          <Button
            className="mt-4 min-h-11"
            onPress={() => navigate(returnTo)}
            variant="outline"
          >
            Back
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <Button
        className="min-h-11 w-fit gap-2 px-2"
        onPress={() => navigate(returnTo)}
        size="sm"
        variant="ghost"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to exercises
      </Button>

      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted">Training plan</p>
        <h1 className="text-2xl font-semibold text-foreground">Add exercise</h1>
        <p className="text-sm text-muted">
          {plan.name} · Day {workout.day_number}: {workout.name}
        </p>
      </div>

      <Card className="rounded-xl border border-separator bg-surface p-5">
        <div className="flex flex-col gap-4">
          <Autocomplete
            allowsEmptyCollection
            fullWidth
            onChange={(value) =>
              setDraft((prev) => ({
                ...prev,
                exerciseId: value?.toString() ?? '',
              }))
            }
            value={draft.exerciseId || null}
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

          {draft.exerciseId && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
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
                    placeholder={String(nextPosition)}
                    type="number"
                    value={draft.position}
                    variant="secondary"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted">Notes (optional)</Label>
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
                {draft.sets.map((currentSetDraft, index) => (
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
                    setDraft={currentSetDraft}
                    setIndex={index}
                  />
                ))}
              </div>
            </>
          )}

          <div className="flex justify-between pt-4">
            <Button
              className="min-h-11"
              onPress={() => setDraft(emptyExerciseDraft())}
              size="md"
              variant="ghost"
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </Button>
            <div className="flex gap-2">
              <Button
                className="min-h-11"
                onPress={() => navigate(returnTo)}
                size="md"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                className="min-h-11"
                isDisabled={isCreating || !draft.exerciseId}
                onPress={handleSave}
                size="md"
                variant="primary"
              >
                <Save className="h-4 w-4" />
                Save exercise
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
