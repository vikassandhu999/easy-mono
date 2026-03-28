defmodule EasyWeb.Clients.TrainingPlanJSON do
  alias Easy.Training.{Exercise, PlannedSet, PlannedWorkout, TrainingPlan, WorkoutElement}

  @spec show(map()) :: map()
  def show(%{plan: plan}) do
    %{data: data(plan)}
  end

  @spec index(map()) :: map()
  def index(%{plans: plans, count: count}) do
    %{data: Enum.map(plans, &data/1), count: count}
  end

  defp data(%TrainingPlan{} = plan) do
    %{
      id: plan.id,
      name: plan.name,
      description: plan.description,
      status: plan.status,
      start_date: plan.start_date,
      end_date: plan.end_date,
      planned_workouts: workouts_data(plan.planned_workouts),
      inserted_at: plan.inserted_at,
      updated_at: plan.updated_at
    }
  end

  defp workouts_data(workouts) when is_list(workouts), do: Enum.map(workouts, &workout_data/1)
  defp workouts_data(_), do: []

  defp workout_data(%PlannedWorkout{} = workout) do
    %{
      id: workout.id,
      name: workout.name,
      notes: workout.notes,
      day_number: workout.day_number,
      workout_elements: elements_data(workout.workout_elements),
      inserted_at: workout.inserted_at,
      updated_at: workout.updated_at
    }
  end

  defp elements_data(elements) when is_list(elements), do: Enum.map(elements, &element_data/1)
  defp elements_data(_), do: []

  defp element_data(%WorkoutElement{} = element) do
    %{
      id: element.id,
      position: element.position,
      superset_group_id: element.superset_group_id,
      notes: element.notes,
      exercise_id: element.exercise_id,
      exercise: exercise_data(element.exercise),
      planned_sets: planned_sets_data(element.planned_sets),
      inserted_at: element.inserted_at,
      updated_at: element.updated_at
    }
  end

  defp exercise_data(%Exercise{} = exercise) do
    %{
      id: exercise.id,
      name: exercise.name,
      mechanics: exercise.mechanics,
      force: exercise.force,
      images: exercise.images
    }
  end

  defp exercise_data(_), do: nil

  defp planned_sets_data(sets) when is_list(sets), do: Enum.map(sets, &planned_set_data/1)
  defp planned_sets_data(_), do: []

  defp planned_set_data(%PlannedSet{} = set) do
    %{
      target_reps: set.target_reps,
      load_value: set.load_value,
      load_unit: set.load_unit,
      intensity_target: set.intensity_target,
      tempo: set.tempo,
      rest_seconds: set.rest_seconds,
      duration_seconds: set.duration_seconds,
      distance_value: set.distance_value,
      distance_unit: set.distance_unit,
      set_type: set.set_type,
      notes: set.notes
    }
  end
end
