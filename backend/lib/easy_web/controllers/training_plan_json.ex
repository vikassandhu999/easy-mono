defmodule EasyWeb.TrainingPlanJSON do
  alias Easy.Training.Programming.{
    TrainingPlan,
    Phase,
    PlannedWorkout,
    WorkoutElement,
    PlannedSet
  }

  @doc """
  Renders a list of training plans.
  """
  def index(%{training_plans: training_plans}) do
    %{data: for(plan <- training_plans, do: data(plan))}
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
      phases: phases_data(plan.phases),
      assignments: assignments_data(plan.phase_assignments)
    }
  end

  defp phases_data(phases) when is_list(phases) do
    for phase <- phases, do: phase_data(phase)
  end

  defp phases_data(_), do: []

  defp phase_data(%Phase{} = phase) do
    %{
      id: phase.id,
      name: phase.name,
      description: phase.description,
      goal: phase.goal,
      position: phase.position,
      workouts: workouts_data(phase.planned_workouts)
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
      day_of_week: workout.day_of_week,
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
      sets: sets_data(element.planned_sets)
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

  defp assignments_data(assignments) when is_list(assignments) do
    for assignment <- assignments do
      %{
        id: assignment.id,
        start_week: assignment.start_week,
        end_week: assignment.end_week,
        phase_id: assignment.phase_id
      }
    end
  end

  defp assignments_data(_), do: []
end
