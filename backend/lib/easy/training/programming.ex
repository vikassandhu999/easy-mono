defmodule Easy.Training.Programming do
  @moduledoc """
  The Programming context.
  """

  import Ecto.Query, warn: false
  alias Easy.Repo
  alias Ecto.Multi

  alias Easy.Training.Programming.{
    TrainingPlan,
    Phase,
    PhaseAssignment,
    PlannedWorkout,
    WorkoutElement,
    PlannedSet
  }

  # Training Plans

  def list_training_plans(opts \\ []) do
    business_id = Keyword.get(opts, :business_id)
    is_template = Keyword.get(opts, :is_template)

    TrainingPlan
    |> filter_by_business(business_id)
    |> filter_by_template(is_template)
    |> Repo.all()
  end

  defp filter_by_business(query, nil), do: query

  defp filter_by_business(query, business_id) do
    from t in query, where: t.business_id == ^business_id
  end

  defp filter_by_template(query, nil), do: query

  defp filter_by_template(query, is_template) do
    from t in query, where: t.is_template == ^is_template
  end

  def get_training_plan!(id) do
    Repo.get!(TrainingPlan, id)
    |> Repo.preload([:phases, :phase_assignments])
  end

  def create_training_plan(attrs \\ %{}) do
    %TrainingPlan{}
    |> TrainingPlan.changeset(attrs)
    |> Repo.insert()
  end

  def update_training_plan(%TrainingPlan{} = training_plan, attrs) do
    training_plan
    |> TrainingPlan.changeset(attrs)
    |> Repo.update()
  end

  def delete_training_plan(%TrainingPlan{} = training_plan) do
    Repo.delete(training_plan)
  end

  def change_training_plan(%TrainingPlan{} = training_plan, attrs \\ %{}) do
    TrainingPlan.changeset(training_plan, attrs)
  end

  # Phases

  def list_phases(training_plan_id) do
    Phase
    |> where([p], p.training_plan_id == ^training_plan_id)
    |> order_by([p], asc: p.position)
    |> Repo.all()
  end

  def create_phase(attrs \\ %{}) do
    %Phase{}
    |> Phase.changeset(attrs)
    |> Repo.insert()
  end

  def update_phase(%Phase{} = phase, attrs) do
    phase
    |> Phase.changeset(attrs)
    |> Repo.update()
  end

  def delete_phase(%Phase{} = phase) do
    Repo.delete(phase)
  end

  # Phase Assignments

  def create_phase_assignment(attrs \\ %{}) do
    %PhaseAssignment{}
    |> PhaseAssignment.changeset(attrs)
    |> Repo.insert()
  end

  def delete_phase_assignment(%PhaseAssignment{} = assignment) do
    Repo.delete(assignment)
  end

  # Planned Workouts

  def create_planned_workout(attrs \\ %{}) do
    %PlannedWorkout{}
    |> PlannedWorkout.changeset(attrs)
    |> Repo.insert()
  end

  def update_planned_workout(%PlannedWorkout{} = workout, attrs) do
    workout
    |> PlannedWorkout.changeset(attrs)
    |> Repo.update()
  end

  # Workout Elements

  def create_workout_element(attrs \\ %{}) do
    %WorkoutElement{}
    |> WorkoutElement.changeset(attrs)
    |> Repo.insert()
  end

  # Planned Sets

  def create_planned_set(attrs \\ %{}) do
    %PlannedSet{}
    |> PlannedSet.changeset(attrs)
    |> Repo.insert()
  end

  # Copy-on-Assignment Logic

  @doc """
  Assigns a training plan template to a client by creating a deep copy.
  """
  def assign_training_plan_to_client(template_id, client_id, _start_date \\ Date.utc_today()) do
    template =
      Repo.get!(TrainingPlan, template_id)
      |> Repo.preload(
        phases: [planned_workouts: [workout_elements: :planned_sets]],
        phase_assignments: []
      )

    Multi.new()
    |> Multi.insert(:new_plan, fn _ ->
      TrainingPlan.changeset(%TrainingPlan{}, %{
        name: template.name,
        description: template.description,
        is_template: false,
        duration_weeks: template.duration_weeks,
        business_id: template.business_id,
        author_id: template.author_id,
        client_id: client_id,
        original_template_id: template.id
      })
    end)
    |> Multi.merge(fn %{new_plan: new_plan} ->
      copy_phases_multi(new_plan, template.phases)
    end)
    |> Multi.merge(fn changes ->
      # After phases are copied, we need to map old phase IDs to new phase IDs to copy assignments
      phase_id_map = extract_phase_id_map(changes)
      copy_assignments_multi(changes.new_plan, template.phase_assignments, phase_id_map)
    end)
    |> Repo.transaction()
  end

  defp copy_phases_multi(new_plan, phases) do
    Enum.reduce(phases, Multi.new(), fn phase, multi ->
      phase_alias = {:phase, phase.id}

      multi
      |> Multi.insert(phase_alias, fn _ ->
        Phase.changeset(%Phase{}, %{
          name: phase.name,
          description: phase.description,
          goal: phase.goal,
          position: phase.position,
          training_plan_id: new_plan.id
        })
      end)
      |> Multi.merge(fn changes ->
        new_phase = changes[phase_alias]
        copy_workouts_multi(new_phase, phase.planned_workouts)
      end)
    end)
  end

  defp copy_workouts_multi(new_phase, workouts) do
    Enum.reduce(workouts, Multi.new(), fn workout, multi ->
      workout_alias = {:workout, workout.id}

      multi
      |> Multi.insert(workout_alias, fn _ ->
        PlannedWorkout.changeset(%PlannedWorkout{}, %{
          name: workout.name,
          notes: workout.notes,
          day_of_week: workout.day_of_week,
          phase_id: new_phase.id
        })
      end)
      |> Multi.merge(fn changes ->
        new_workout = changes[workout_alias]
        copy_elements_multi(new_workout, workout.workout_elements)
      end)
    end)
  end

  defp copy_elements_multi(new_workout, elements) do
    Enum.reduce(elements, Multi.new(), fn element, multi ->
      element_alias = {:element, element.id}

      multi
      |> Multi.insert(element_alias, fn _ ->
        WorkoutElement.changeset(%WorkoutElement{}, %{
          position: element.position,
          superset_group_id: element.superset_group_id,
          notes: element.notes,
          planned_workout_id: new_workout.id,
          exercise_id: element.exercise_id
        })
      end)
      |> Multi.merge(fn changes ->
        new_element = changes[element_alias]
        copy_sets_multi(new_element, element.planned_sets)
      end)
    end)
  end

  defp copy_sets_multi(new_element, sets) do
    Enum.reduce(sets, Multi.new(), fn set, multi ->
      Multi.insert(multi, {:set, set.id}, fn _ ->
        PlannedSet.changeset(%PlannedSet{}, %{
          position: set.position,
          reps_min: set.reps_min,
          reps_max: set.reps_max,
          load_value: set.load_value,
          load_type: set.load_type,
          rest_seconds: set.rest_seconds,
          workout_element_id: new_element.id
        })
      end)
    end)
  end

  defp extract_phase_id_map(changes) do
    changes
    |> Map.keys()
    |> Enum.filter(fn
      {:phase, _} -> true
      _ -> false
    end)
    |> Enum.into(%{}, fn {:phase, old_id} ->
      {old_id, changes[{:phase, old_id}].id}
    end)
  end

  defp copy_assignments_multi(new_plan, assignments, phase_id_map) do
    Enum.reduce(assignments, Multi.new(), fn assignment, multi ->
      Multi.insert(multi, {:assignment, assignment.id}, fn _ ->
        PhaseAssignment.changeset(%PhaseAssignment{}, %{
          start_week: assignment.start_week,
          end_week: assignment.end_week,
          training_plan_id: new_plan.id,
          phase_id: Map.get(phase_id_map, assignment.phase_id)
        })
      end)
    end)
  end
end
