defmodule EasyWeb.Coaches.TrainingPlanJSON do
  alias Easy.Clients.Client
  alias Easy.Training.{Exercise, PlannedSet, PlanItem, Workout, TrainingPlan, WorkoutElement}

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
      rest_days: plan.rest_days,
      client_id: plan.client_id,
      client: client_data(plan.client),
      author_id: plan.author_id,
      original_template_id: plan.original_template_id,
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
      training_plan_id: workout.training_plan_id,
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
      day: item.day,
      workout_type: item.workout_type,
      workout_id: item.workout_id,
      training_plan_id: item.training_plan_id,
      creator_id: item.creator_id,
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
      workout_id: element.workout_id,
      exercise: exercise_data(element.exercise),
      planned_sets: planned_sets_data(element.planned_sets),
      inserted_at: element.inserted_at,
      updated_at: element.updated_at
    }
  end

  defp exercise_data(%Exercise{} = exercise) do
    %{id: exercise.id, name: exercise.name, mechanics: exercise.mechanics, force: exercise.force}
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
      notes: set.notes
    }
  end

  defp client_data(%Client{} = client) do
    %{
      id: client.id,
      first_name: client.first_name,
      last_name: client.last_name
    }
  end

  defp client_data(_), do: nil
end
