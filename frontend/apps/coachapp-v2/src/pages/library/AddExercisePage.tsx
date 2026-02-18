import {
  Autocomplete,
  Button,
  Card,
  Input,
  Label,
  ListBox,
  SearchField,
  toast,
  useFilter,
} from "@heroui/react";
import { ArrowLeft, ChevronRight, Plus, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";

import type { SetDraft } from "@/components/training-plan/WorkoutSetRow";

import { useListExercisesQuery } from "@/api/exercises";
import {
  useCreateWorkoutElementMutation,
  useGetPlannedWorkoutQuery,
  useGetTrainingPlanQuery,
} from "@/api/trainingPlans";
import {
  EMPTY_SET,
  fromSetDraft,
  SetRow,
} from "@/components/training-plan/WorkoutSetRow";
import { getReturnTo } from "@/pages/library/libraryFormShared";

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
  exerciseId: "",
  notes: "",
  position: "",
  sets: [{ ...EMPTY_SET }],
});

export default function AddExercisePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id, dayId } = useParams();
  const planId = id ?? "";
  const plannedWorkoutId = dayId ?? "";

  const returnTo = getReturnTo(
    location,
    `/library/training-plans/${planId}/builder`,
  );

  const { contains } = useFilter({ sensitivity: "base" });

  const [draft, setDraft] = useState<ExerciseDraft>(emptyExerciseDraft());

  const { data: planData, isLoading: isPlanLoading } = useGetTrainingPlanQuery(
    planId,
    { skip: !planId },
  );
  const { data: workoutData, isLoading: isWorkoutLoading } =
    useGetPlannedWorkoutQuery(plannedWorkoutId, {
      skip: !plannedWorkoutId,
    });
  const { data: exercisesData, isLoading: isExercisesLoading } =
    useListExercisesQuery({ limit: 250, offset: 0 }, { skip: !planId });

  const [createWorkoutElement, { isLoading: isCreating }] =
    useCreateWorkoutElementMutation();

  const plan = planData?.data;
  const workout = workoutData?.data;
  const exercises = exercisesData?.data ?? [];

  const existingElements = useMemo(
    () => workout?.workout_elements ?? [],
    [workout?.workout_elements],
  );

  const nextPosition = existingElements.length + 1;

  const handleSave = async () => {
    if (!planId || !plannedWorkoutId || !draft.exerciseId) {
      toast.danger("Choose an exercise");
      return;
    }
    try {
      await createWorkoutElement({
        body: {
          exercise_id: draft.exerciseId,
          planned_sets: draft.sets.map(fromSetDraft),
          planned_workout_id: plannedWorkoutId,
          position:
            integerFromString(draft.position) ?? existingElements.length,
        },
        planId,
        plannedWorkoutId,
      }).unwrap();
      toast.success("Exercise added");
      navigate(returnTo);
    } catch {
      toast.danger("Failed to add exercise");
    }
  };

  const isLoading = isPlanLoading || isWorkoutLoading || isExercisesLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-surface-secondary" />
          <div className="h-6 w-48 animate-pulse rounded-md bg-surface-secondary" />
        </div>
        <div className="h-40 animate-pulse rounded-xl bg-surface-secondary" />
      </div>
    );
  }

  if (!plan || !workout) {
    return (
      <div className="flex flex-col gap-6">
        <Card className="rounded-xl border border-separator bg-surface p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-secondary">
              <span className="text-xl">🏋️</span>
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">
                Day not found
              </p>
              <p className="mt-1 text-sm text-muted">
                This workout day may have been removed.
              </p>
            </div>
            <Button
              className="min-h-11"
              onPress={() => navigate(returnTo)}
              variant="primary"
            >
              Go back
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      {/* Breadcrumb navigation */}
      <Button
        className="min-h-9 w-fit gap-2 px-2 text-muted hover:text-foreground"
        onPress={() => navigate(returnTo)}
        size="sm"
        variant="ghost"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to builder
      </Button>

      {/* Hero header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm text-muted">
          <span>{plan.name}</span>
          <ChevronRight className="h-3 w-3" />
          <span>Day {workout.day_number}</span>
          <ChevronRight className="h-3 w-3" />
          <span>Add exercise</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Add exercise
        </h1>
        <p className="text-sm text-muted">
          {workout.name} · Day {workout.day_number}
        </p>
      </div>

      {/* Separator */}
      <div className="border-t border-separator" />

      {/* Exercise form card */}
      <Card className="rounded-xl border border-separator bg-surface p-5 sm:p-6">
        <div className="flex flex-col gap-5">
          {/* Exercise picker */}
          <Autocomplete
            allowsEmptyCollection
            fullWidth
            onChange={(value) =>
              setDraft((prev) => ({
                ...prev,
                exerciseId: value?.toString() ?? "",
              }))
            }
            value={draft.exerciseId || null}
            variant="secondary"
          >
            <Label className="text-sm font-medium text-foreground">
              Exercise
            </Label>
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

          {/* Conditional fields when exercise selected */}
          {draft.exerciseId && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-sm font-medium text-foreground">
                    Order
                  </Label>
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
                  <Label className="text-sm font-medium text-foreground">
                    Notes (optional)
                  </Label>
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

              {/* Separator */}
              <div className="border-t border-separator" />

              {/* Sets section */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Sets</p>
                  <p className="text-xs text-muted">
                    {draft.sets.length} set{draft.sets.length === 1 ? "" : "s"}{" "}
                    configured
                  </p>
                </div>
                <Button
                  className="min-h-9"
                  onPress={() =>
                    setDraft((prev) => ({
                      ...prev,
                      sets: [...prev.sets, { ...EMPTY_SET }],
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
                      setDraft((prev) => ({ ...prev, sets: nextSets }));
                    }}
                    onRemove={() => {
                      const nextSets = draft.sets.filter((_, i) => i !== index);
                      setDraft((prev) => ({
                        ...prev,
                        sets:
                          nextSets.length > 0 ? nextSets : [{ ...EMPTY_SET }],
                      }));
                    }}
                    setDraft={currentSetDraft}
                    setIndex={index}
                  />
                ))}
              </div>
            </>
          )}

          {/* Action footer */}
          <div className="flex justify-between border-t border-separator pt-4">
            <Button
              className="min-h-11 text-muted"
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
                variant="ghost"
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
