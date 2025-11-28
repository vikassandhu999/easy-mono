defmodule EasyWeb.TrainingPlanJSON do
  alias Easy.Training.Programming.{
    TrainingPlan,
    PlannedWorkout,
    WorkoutElement,
    PlannedSet
  }

  @doc """
  Renders a list of training plans.
  """
  def index(%{training_plans: training_plans, meta: meta}) do
    %{data: for(plan <- training_plans, do: data(plan)), meta: meta}
  end

  @doc """
  Renders a single training plan.
  """
  def show(%{training_plan: training_plan}) do
    %{data: data(training_plan)}
  end

  defp data(%TrainingPlan{} = plan) do
    %{
      id: plan.id,
      name: plan.name,
      description: plan.description,
      is_template: plan.is_template,
      duration_weeks: plan.duration_weeks,
      business_id: plan.business_id,
      author_id: plan.author_id,
      client_id: plan.client_id,
      original_template_id: plan.original_template_id,
      workouts: workouts_data(plan.planned_workouts)
    }
  end

  defp workouts_data(workouts) when is_list(workouts) do
    for workout <- workouts, do: workout_data(workout)
  end

  defp workouts_data(_), do: []

  defp workout_data(%PlannedWorkout{} = workout) do
    %{
      id: workout.id,
      name: workout.name,
      notes: workout.notes,
      day_number: workout.day_number,
      elements: elements_data(workout.workout_elements)
    }
  end

  defp elements_data(elements) when is_list(elements) do
    for element <- elements, do: element_data(element)
  end

  defp elements_data(_), do: []

  defp element_data(%WorkoutElement{} = element) do
    %{
      id: element.id,
      position: element.position,
      superset_group_id: element.superset_group_id,
      notes: element.notes,
      exercise_id: element.exercise_id,
      exercise: exercise_data(element.exercise),
      sets: sets_data(element.planned_sets)
    }
  end

  defp exercise_data(nil), do: nil

  defp exercise_data(exercise) do
    %{
      id: exercise.id,
      name: exercise.name,
      description: exercise.description
    }
  end

  defp sets_data(sets) when is_list(sets) do
    for set <- sets, do: set_data(set)
  end

  defp sets_data(_), do: []

  defp set_data(%PlannedSet{} = set) do
    %{
      id: set.id,
      position: set.position,
      reps_min: set.reps_min,
      reps_max: set.reps_max,
      load_value: set.load_value,
      load_type: set.load_type,
      rest_seconds: set.rest_seconds
    }
  end
end
