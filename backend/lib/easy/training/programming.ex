defmodule Easy.Training.Programming do
  import Ecto.Query, warn: false

  alias Easy.Repo
  alias Ecto.Multi
  alias Easy.Training.QueryHelpers
  alias Easy.Training.Programming.{TrainingPlan, PlannedWorkout, WorkoutElement}

  @plan_preloads [planned_workouts: [workout_elements: :exercise]]
  @workout_preloads [workout_elements: :exercise]

  # Training Plans

  @spec count_training_plans(String.t()) :: non_neg_integer()
  def count_training_plans(business_id) do
    TrainingPlan
    |> where([t], t.business_id == ^business_id)
    |> Repo.aggregate(:count, :id)
  end

  @spec list_training_plans(String.t(), map()) :: {:ok, {list(TrainingPlan.t()), map()}}
  def list_training_plans(business_id, params \\ %{}) do
    limit =
      params
      |> QueryHelpers.fetch_param(:limit)
      |> QueryHelpers.parse_integer()
      |> QueryHelpers.clamp_limit()

    offset =
      params
      |> QueryHelpers.fetch_param(:offset)
      |> QueryHelpers.parse_integer()
      |> QueryHelpers.normalize_offset()

    is_template = params |> QueryHelpers.fetch_param(:is_template) |> QueryHelpers.parse_boolean()
    client_id = QueryHelpers.fetch_param(params, :client_id)
    search = params |> QueryHelpers.fetch_param(:search) |> QueryHelpers.parse_search()

    base_query =
      TrainingPlan
      |> where([t], t.business_id == ^business_id)
      |> apply_template_filter(is_template)
      |> apply_client_filter(client_id)
      |> apply_search(search)

    total = Repo.aggregate(base_query, :count, :id)

    plans =
      base_query
      |> order_by([t], desc: t.inserted_at)
      |> limit(^limit)
      |> offset(^offset)
      |> preload(^@plan_preloads)
      |> Repo.all()

    {:ok, {plans, %{limit: limit, offset: offset, total: total}}}
  end

  @spec fetch_training_plan(String.t(), String.t()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found}
  def fetch_training_plan(business_id, id) do
    TrainingPlan
    |> where([t], t.id == ^id and t.business_id == ^business_id)
    |> preload(^@plan_preloads)
    |> Repo.one()
    |> wrap_result()
  end

  @spec get_training_plan!(String.t(), String.t()) :: TrainingPlan.t()
  def get_training_plan!(business_id, id) do
    TrainingPlan
    |> where([t], t.id == ^id and t.business_id == ^business_id)
    |> preload(^@plan_preloads)
    |> Repo.one!()
  end

  @spec create_training_plan(String.t(), String.t(), map()) ::
          {:ok, TrainingPlan.t()} | {:error, Ecto.Changeset.t()}
  def create_training_plan(business_id, author_id, attrs) do
    %TrainingPlan{business_id: business_id, author_id: author_id}
    |> TrainingPlan.changeset(attrs)
    |> Repo.insert()
    |> with_empty_workouts()
  end

  @spec update_training_plan(TrainingPlan.t(), map()) ::
          {:ok, TrainingPlan.t()} | {:error, Ecto.Changeset.t()}
  def update_training_plan(%TrainingPlan{} = plan, attrs) do
    plan
    |> TrainingPlan.changeset(attrs)
    |> Repo.update()
    |> maybe_reload_preloads(plan, @plan_preloads)
  end

  @spec delete_training_plan(TrainingPlan.t()) ::
          {:ok, TrainingPlan.t()} | {:error, Ecto.Changeset.t()}
  def delete_training_plan(%TrainingPlan{} = plan), do: Repo.delete(plan)

  @spec duplicate_training_plan(String.t(), String.t()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def duplicate_training_plan(business_id, id) do
    with {:ok, original} <- fetch_training_plan(business_id, id) do
      copy_name = generate_copy_name(original.name, business_id)

      Multi.new()
      |> Multi.insert(:plan, build_plan_copy(original, copy_name))
      |> Multi.merge(&copy_workouts(&1.plan, original.planned_workouts))
      |> Repo.transaction()
      |> handle_duplicate_result(business_id)
    end
  end

  @spec assign_training_plan_to_client(String.t(), String.t(), String.t(), Date.t(), Date.t()) ::
          {:ok, map()} | {:error, :not_found | any()}
  def assign_training_plan_to_client(business_id, template_id, client_id, start_date, end_date) do
    with {:ok, template} <- fetch_training_plan(business_id, template_id) do
      Multi.new()
      |> Multi.insert(:plan, build_assigned_plan(template, client_id, start_date, end_date))
      |> Multi.merge(&copy_workouts(&1.plan, template.planned_workouts))
      |> Repo.transaction()
    end
  end

  # Planned Workouts

  @spec list_planned_workouts(String.t(), String.t()) :: {:ok, list(PlannedWorkout.t())}
  def list_planned_workouts(business_id, training_plan_id) do
    workouts =
      PlannedWorkout
      |> join(:inner, [w], t in TrainingPlan, on: w.training_plan_id == t.id)
      |> where([w, t], w.training_plan_id == ^training_plan_id and t.business_id == ^business_id)
      |> order_by([w], asc: w.day_number)
      |> preload(^@workout_preloads)
      |> Repo.all()

    {:ok, workouts}
  end

  @spec fetch_planned_workout(String.t(), String.t()) ::
          {:ok, PlannedWorkout.t()} | {:error, :not_found}
  def fetch_planned_workout(business_id, id) do
    PlannedWorkout
    |> join(:inner, [w], t in TrainingPlan, on: w.training_plan_id == t.id)
    |> where([w, t], w.id == ^id and t.business_id == ^business_id)
    |> preload(^@workout_preloads)
    |> Repo.one()
    |> wrap_result()
  end

  @spec get_planned_workout!(String.t(), String.t()) :: PlannedWorkout.t()
  def get_planned_workout!(business_id, id) do
    PlannedWorkout
    |> where([w], w.id == ^id and w.business_id == ^business_id)
    |> preload(^@workout_preloads)
    |> Repo.one!()
  end

  @spec create_planned_workout(String.t(), String.t(), map()) ::
          {:ok, PlannedWorkout.t()} | {:error, Ecto.Changeset.t()}
  def create_planned_workout(business_id, training_plan_id, attrs) do
    %PlannedWorkout{business_id: business_id, training_plan_id: training_plan_id}
    |> PlannedWorkout.changeset(attrs)
    |> Repo.insert()
  end

  @spec update_planned_workout(PlannedWorkout.t(), map()) ::
          {:ok, PlannedWorkout.t()} | {:error, Ecto.Changeset.t()}
  def update_planned_workout(%PlannedWorkout{} = workout, attrs) do
    workout
    |> PlannedWorkout.changeset(attrs)
    |> Repo.update()
  end

  @spec delete_planned_workout(PlannedWorkout.t()) ::
          {:ok, PlannedWorkout.t()} | {:error, Ecto.Changeset.t()}
  def delete_planned_workout(%PlannedWorkout{} = workout), do: Repo.delete(workout)

  # Workout Elements

  @spec fetch_workout_element(String.t(), String.t()) ::
          {:ok, WorkoutElement.t()} | {:error, :not_found}
  def fetch_workout_element(business_id, id) do
    WorkoutElement
    |> join(:inner, [e], w in PlannedWorkout, on: e.planned_workout_id == w.id)
    |> join(:inner, [e, w], t in TrainingPlan, on: w.training_plan_id == t.id)
    |> where([e, w, t], e.id == ^id and t.business_id == ^business_id)
    |> preload(:exercise)
    |> Repo.one()
    |> wrap_result()
  end

  @spec get_workout_element!(String.t(), String.t()) :: WorkoutElement.t()
  def get_workout_element!(business_id, id) do
    WorkoutElement
    |> where([e], e.id == ^id and e.business_id == ^business_id)
    |> preload(:exercise)
    |> Repo.one!()
  end

  @spec create_workout_element(String.t(), String.t(), map()) ::
          {:ok, WorkoutElement.t()} | {:error, Ecto.Changeset.t()}
  def create_workout_element(business_id, planned_workout_id, attrs) do
    %WorkoutElement{business_id: business_id, planned_workout_id: planned_workout_id}
    |> WorkoutElement.changeset(attrs)
    |> Repo.insert()
  end

  @spec create_workout_element_with_sets(String.t(), String.t(), map(), list(map())) ::
          {:ok, WorkoutElement.t()} | {:error, Ecto.Changeset.t()}
  def create_workout_element_with_sets(business_id, planned_workout_id, attrs, sets_attrs) do
    attrs = Map.put(attrs, "planned_sets", sets_attrs)

    %WorkoutElement{business_id: business_id, planned_workout_id: planned_workout_id}
    |> WorkoutElement.changeset(attrs)
    |> Repo.insert()
    |> reload_preload(:exercise)
  end

  @spec update_workout_element(WorkoutElement.t(), map()) ::
          {:ok, WorkoutElement.t()} | {:error, Ecto.Changeset.t()}
  def update_workout_element(%WorkoutElement{} = element, attrs) do
    element
    |> WorkoutElement.changeset(attrs)
    |> Repo.update()
  end

  @spec update_workout_element_with_sets(WorkoutElement.t(), map(), list(map())) ::
          {:ok, WorkoutElement.t()} | {:error, Ecto.Changeset.t()}
  def update_workout_element_with_sets(%WorkoutElement{} = element, attrs, sets_attrs) do
    attrs = Map.put(attrs, "planned_sets", sets_attrs)

    element
    |> WorkoutElement.changeset(attrs)
    |> Repo.update()
    |> maybe_reload_preloads(element, [:exercise])
  end

  @spec delete_workout_element(WorkoutElement.t()) ::
          {:ok, WorkoutElement.t()} | {:error, Ecto.Changeset.t()}
  def delete_workout_element(%WorkoutElement{} = element), do: Repo.delete(element)

  # Private - Query Filters

  defp apply_template_filter(query, nil), do: query

  defp apply_template_filter(query, is_template),
    do: where(query, [t], t.is_template == ^is_template)

  defp apply_client_filter(query, nil), do: query
  defp apply_client_filter(query, client_id), do: where(query, [t], t.client_id == ^client_id)

  defp apply_search(query, nil), do: query
  defp apply_search(query, search), do: where(query, [t], ilike(t.name, ^"%#{search}%"))

  # Private - Result Handling

  defp wrap_result(nil), do: {:error, :not_found}
  defp wrap_result(record), do: {:ok, record}

  defp with_empty_workouts({:ok, plan}), do: {:ok, %{plan | planned_workouts: []}}
  defp with_empty_workouts(error), do: error

  defp reload_preload({:ok, record}, preload), do: {:ok, Repo.preload(record, preload)}
  defp reload_preload(error, _preload), do: error

  defp maybe_reload_preloads({:ok, record}, original, preloads) do
    if any_preload_loaded?(original, preloads) do
      {:ok, Repo.preload(record, preloads, force: true)}
    else
      {:ok, record}
    end
  end

  defp maybe_reload_preloads(error, _original, _preloads), do: error

  defp any_preload_loaded?(record, preloads) do
    Enum.any?(preloads, fn
      {assoc, _} -> Ecto.assoc_loaded?(Map.get(record, assoc))
      assoc -> Ecto.assoc_loaded?(Map.get(record, assoc))
    end)
  end

  defp handle_duplicate_result({:ok, %{plan: plan}}, business_id),
    do: fetch_training_plan(business_id, plan.id)

  defp handle_duplicate_result({:error, _step, changeset, _changes}, _), do: {:error, changeset}

  # Private - Duplication

  defp build_plan_copy(original, copy_name) do
    %TrainingPlan{business_id: original.business_id, author_id: original.author_id}
    |> TrainingPlan.changeset(%{
      name: copy_name,
      description: original.description,
      is_template: true,
      original_template_id: original.id
    })
  end

  defp build_assigned_plan(template, client_id, start_date, end_date) do
    %TrainingPlan{
      business_id: template.business_id,
      author_id: template.author_id,
      client_id: client_id
    }
    |> TrainingPlan.changeset(%{
      name: template.name,
      description: template.description,
      is_template: false,
      start_date: start_date,
      end_date: end_date,
      original_template_id: template.id
    })
  end

  defp generate_copy_name(original_name, business_id) do
    base_name = String.replace(original_name, ~r/\s*\(Copy\s*\d*\)\s*$/, "") |> String.trim()

    existing_names =
      TrainingPlan
      |> where([t], t.business_id == ^business_id)
      |> where([t], t.name == ^base_name or like(t.name, ^"#{base_name} (Copy%)"))
      |> select([t], t.name)
      |> Repo.all()
      |> MapSet.new()

    find_available_name(base_name, existing_names, 1)
  end

  defp find_available_name(base_name, existing_names, attempt) when attempt <= 100 do
    candidate = if attempt == 1, do: "#{base_name} (Copy)", else: "#{base_name} (Copy #{attempt})"

    if MapSet.member?(existing_names, candidate) do
      find_available_name(base_name, existing_names, attempt + 1)
    else
      candidate
    end
  end

  defp find_available_name(base_name, _existing_names, _attempt) do
    "#{base_name} (Copy #{System.system_time(:second)})"
  end

  defp copy_workouts(new_plan, workouts) do
    Enum.reduce(workouts, Multi.new(), fn workout, multi ->
      workout_key = {:workout, workout.id}

      multi
      |> Multi.insert(workout_key, fn _ ->
        %PlannedWorkout{business_id: new_plan.business_id, training_plan_id: new_plan.id}
        |> PlannedWorkout.changeset(%{
          name: workout.name,
          notes: workout.notes,
          day_number: workout.day_number
        })
      end)
      |> Multi.merge(fn changes ->
        copy_elements(new_plan.business_id, changes[workout_key], workout.workout_elements)
      end)
    end)
  end

  defp copy_elements(business_id, new_workout, elements) do
    Enum.reduce(elements, Multi.new(), fn element, multi ->
      Multi.insert(multi, {:element, element.id}, fn _ ->
        %WorkoutElement{business_id: business_id, planned_workout_id: new_workout.id}
        |> WorkoutElement.changeset(%{
          position: element.position,
          superset_group_id: element.superset_group_id,
          notes: element.notes,
          exercise_id: element.exercise_id,
          planned_sets: copy_sets(element.planned_sets)
        })
      end)
    end)
  end

  defp copy_sets(sets) when is_list(sets) do
    Enum.map(sets, fn set ->
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
    end)
  end

  defp copy_sets(_), do: []
end
