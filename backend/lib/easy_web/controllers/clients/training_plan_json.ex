defmodule EasyWeb.Clients.TrainingPlanJSON do
  alias Easy.Training.{TrainingExercise, PlannedSet, PlanItem, Workout, TrainingPlan, WorkoutElement}

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
      workouts: workouts_data(plan.workouts),
      plan_items: plan_items_data(plan.plan_items),
      inserted_at: plan.inserted_at,
      updated_at: plan.updated_at
    }
  end

  defp workouts_data(workouts) when is_list(workouts), do: Enum.map(workouts, &workout_data/1)
  defp workouts_data(_), do: []

  defp workout_data(%Workout{} = workout) do
    %{
      id: workout.id,
      name: workout.name,
      notes: workout.notes,
      workout_elements: elements_data(workout.workout_elements),
      inserted_at: workout.inserted_at,
      updated_at: workout.updated_at
    }
  end

  defp plan_items_data(items) when is_list(items), do: Enum.map(items, &plan_item_data/1)
  defp plan_items_data(_), do: []

  defp plan_item_data(%PlanItem{} = item) do
    %{
      id: item.id,
      day_of_week: item.day_of_week,
      training_workout_id: item.training_workout_id,
      training_plan_id: item.training_plan_id,
      inserted_at: item.inserted_at,
      updated_at: item.updated_at
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

  defp exercise_data(%TrainingExercise{} = exercise) do
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
      set_type: set.set_type,
      reps: set.reps,
      load_value: set.load_value,
      load_unit: set.load_unit,
      duration_seconds: set.duration_seconds,
      distance_value: set.distance_value,
      distance_unit: set.distance_unit,
      rpe: set.rpe,
      rest_seconds: set.rest_seconds,
      notes: set.notes
    }
  end
end
