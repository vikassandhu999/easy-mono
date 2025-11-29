defmodule Easy.Training.Programming do
  @moduledoc """
  The Programming context.
  """

  import Ecto.Query, warn: false
  alias Easy.Repo
  alias Ecto.Multi

  alias Easy.Training.Programming.{
    TrainingPlan,
    PlannedWorkout,
    WorkoutElement,
    PlannedSet
  }

  @max_limit 100

  # Training Plans

  def count_training_plans(business_id) do
    TrainingPlan
    |> where([t], t.business_id == ^business_id)
    |> Repo.aggregate(:count)
  end

  @doc """
  Returns the list of training plans with pagination.
  """
  @spec list_training_plans(String.t(), map()) :: {:ok, {list(TrainingPlan.t()), map()}}
  def list_training_plans(business_id, params \\ %{}) do
    limit = params |> fetch_param(:limit) |> parse_integer() |> clamp_limit()
    offset = params |> fetch_param(:offset) |> parse_integer() |> normalize_offset()
    is_template = params |> fetch_param(:is_template) |> parse_boolean()
    client_id = params |> fetch_param(:client_id)

    query =
      TrainingPlan
      |> where([t], t.business_id == ^business_id)
      |> filter_by_template(is_template)
      |> filter_by_client(client_id)
      |> order_by([t], desc: t.inserted_at)
      |> search_training_plans(params)

    total = Repo.aggregate(query, :count)

    training_plans =
      query
      |> limit(^limit)
      |> offset(^offset)
      |> Repo.all()
      |> Repo.preload(planned_workouts: [workout_elements: [:exercise, :planned_sets]])

    {:ok, {training_plans, %{limit: limit, offset: offset, total: total}}}
  end

  @doc """
  Fetches a single training plan by ID and business_id for authorization.
  """
  @spec fetch_training_plan(String.t(), String.t()) ::
          {:ok, TrainingPlan.t()} | {:error, :not_found}
  def fetch_training_plan(business_id, training_plan_id) do
    case Repo.one(
           from t in TrainingPlan,
             where: t.id == ^training_plan_id and t.business_id == ^business_id,
             preload: [planned_workouts: [workout_elements: [:exercise, :planned_sets]]]
         ) do
      nil -> {:error, :not_found}
      training_plan -> {:ok, training_plan}
    end
  end

  defp filter_by_template(query, nil), do: query

  defp filter_by_template(query, is_template) do
    from t in query, where: t.is_template == ^is_template
  end

  defp filter_by_client(query, nil), do: query

  defp filter_by_client(query, client_id) do
    from t in query, where: t.client_id == ^client_id
  end

  defp search_training_plans(query, params) do
    case params |> fetch_param(:search) |> parse_search() do
      nil -> query
      search -> where(query, [t], ilike(t.name, ^"%#{search}%"))
    end
  end

  def get_training_plan!(id) do
    Repo.get!(TrainingPlan, id)
    |> Repo.preload(planned_workouts: [workout_elements: [:exercise, :planned_sets]])
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

  # Helper functions for parsing params

  defp fetch_param(params, key) when is_atom(key) do
    Map.get(params, key) || Map.get(params, Atom.to_string(key))
  end

  defp parse_integer(value) when is_integer(value), do: value

  defp parse_integer(value) when is_binary(value) do
    case Integer.parse(value) do
      {int, _} -> int
      :error -> nil
    end
  end

  defp parse_integer(_), do: nil

  defp parse_boolean(value) when is_boolean(value), do: value
  defp parse_boolean("true"), do: true
  defp parse_boolean("false"), do: false
  defp parse_boolean(_), do: nil

  defp parse_search(value) when is_binary(value) and byte_size(value) > 0, do: value
  defp parse_search(_), do: nil

  defp clamp_limit(nil), do: 10
  defp clamp_limit(limit) when limit > @max_limit, do: @max_limit
  defp clamp_limit(limit) when limit < 1, do: 1
  defp clamp_limit(limit), do: limit

  defp normalize_offset(nil), do: 0
  defp normalize_offset(offset) when offset < 0, do: 0
  defp normalize_offset(offset), do: offset

  # Planned Workouts

  def list_planned_workouts(training_plan_id) do
    PlannedWorkout
    |> where([w], w.training_plan_id == ^training_plan_id)
    |> order_by([w], asc: w.day_number)
    |> Repo.all()
    |> Repo.preload(workout_elements: [:exercise, :planned_sets])
  end

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

  def get_planned_workout!(id) do
    Repo.get!(PlannedWorkout, id)
    |> Repo.preload(workout_elements: [:exercise, :planned_sets])
  end

  def delete_planned_workout(%PlannedWorkout{} = workout) do
    Repo.delete(workout)
  end

  @doc """
  Fetches a planned workout ensuring it belongs to a training plan owned by the business.
  """
  def fetch_planned_workout(business_id, workout_id) do
    query =
      from w in PlannedWorkout,
        join: t in TrainingPlan,
        on: w.training_plan_id == t.id,
        where: w.id == ^workout_id and t.business_id == ^business_id,
        preload: [workout_elements: [:exercise, :planned_sets]]

    case Repo.one(query) do
      nil -> {:error, :not_found}
      workout -> {:ok, workout}
    end
  end

  # Workout Elements

  def create_workout_element(attrs \\ %{}) do
    %WorkoutElement{}
    |> WorkoutElement.changeset(attrs)
    |> Repo.insert()
  end

  def get_workout_element!(id) do
    Repo.get!(WorkoutElement, id)
    |> Repo.preload([:exercise, :planned_sets])
  end

  def update_workout_element(%WorkoutElement{} = element, attrs) do
    element
    |> WorkoutElement.changeset(attrs)
    |> Repo.update()
  end

  def delete_workout_element(%WorkoutElement{} = element) do
    Repo.delete(element)
  end

  @doc """
  Fetches a workout element ensuring it belongs to a training plan owned by the business.
  """
  def fetch_workout_element(business_id, element_id) do
    query =
      from e in WorkoutElement,
        join: w in PlannedWorkout,
        on: e.planned_workout_id == w.id,
        join: t in TrainingPlan,
        on: w.training_plan_id == t.id,
        where: e.id == ^element_id and t.business_id == ^business_id,
        preload: [:exercise, :planned_sets]

    case Repo.one(query) do
      nil -> {:error, :not_found}
      element -> {:ok, element}
    end
  end

  @doc """
  Creates a workout element with sets in a transaction.
  """
  def create_workout_element_with_sets(element_attrs, sets_attrs) do
    Multi.new()
    |> Multi.insert(:element, fn _ ->
      WorkoutElement.changeset(%WorkoutElement{}, element_attrs)
    end)
    |> Multi.merge(fn %{element: element} ->
      Enum.reduce(Enum.with_index(sets_attrs), Multi.new(), fn {set_attrs, idx}, multi ->
        Multi.insert(multi, {:set, idx}, fn _ ->
          PlannedSet.changeset(
            %PlannedSet{},
            Map.put(set_attrs, "workout_element_id", element.id)
          )
        end)
      end)
    end)
    |> Repo.transaction()
    |> case do
      {:ok, %{element: element}} ->
        {:ok, Repo.preload(element, [:exercise, :planned_sets])}

      {:error, _step, changeset, _changes} ->
        {:error, changeset}
    end
  end

  @doc """
  Updates a workout element and replaces all its sets.
  """
  def update_workout_element_with_sets(%WorkoutElement{} = element, element_attrs, sets_attrs) do
    Multi.new()
    |> Multi.update(:element, WorkoutElement.changeset(element, element_attrs))
    |> Multi.delete_all(
      :delete_sets,
      from(s in PlannedSet, where: s.workout_element_id == ^element.id)
    )
    |> Multi.merge(fn %{element: updated_element} ->
      Enum.reduce(Enum.with_index(sets_attrs), Multi.new(), fn {set_attrs, idx}, multi ->
        Multi.insert(multi, {:set, idx}, fn _ ->
          PlannedSet.changeset(
            %PlannedSet{},
            Map.put(set_attrs, "workout_element_id", updated_element.id)
          )
        end)
      end)
    end)
    |> Repo.transaction()
    |> case do
      {:ok, %{element: updated_element}} ->
        {:ok, Repo.preload(updated_element, [:exercise, :planned_sets], force: true)}

      {:error, _step, changeset, _changes} ->
        {:error, changeset}
    end
  end

  # Planned Sets

  def create_planned_set(attrs \\ %{}) do
    %PlannedSet{}
    |> PlannedSet.changeset(attrs)
    |> Repo.insert()
  end

  def update_planned_set(%PlannedSet{} = set, attrs) do
    set
    |> PlannedSet.changeset(attrs)
    |> Repo.update()
  end

  def delete_planned_set(%PlannedSet{} = set) do
    Repo.delete(set)
  end

  # Duplication Logic

  @doc """
  Duplicates a training plan, creating a new template copy.
  The copy will have "(Copy)" appended to the name.
  """
  def duplicate_training_plan(business_id, training_plan_id) do
    with {:ok, original} <- fetch_training_plan(business_id, training_plan_id) do
      copy_name = generate_unique_copy_name(original.name, business_id)

      Multi.new()
      |> Multi.insert(:new_plan, fn _ ->
        TrainingPlan.changeset(%TrainingPlan{}, %{
          name: copy_name,
          description: original.description,
          is_template: true,
          duration_weeks: original.duration_weeks,
          business_id: original.business_id,
          author_id: original.author_id,
          client_id: nil,
          original_template_id: original.id
        })
      end)
      |> Multi.merge(fn %{new_plan: new_plan} ->
        copy_workouts_multi(new_plan, original.planned_workouts)
      end)
      |> Repo.transaction()
      |> case do
        {:ok, %{new_plan: new_plan}} ->
          {:ok, get_training_plan!(new_plan.id)}

        {:error, _step, changeset, _changes} ->
          {:error, changeset}
      end
    end
  end

  defp generate_unique_copy_name(original_name, business_id) do
    base_name =
      original_name
      |> String.replace(~r/\s*\(Copy\s*\d*\)\s*$/, "")
      |> String.trim()

    # Find existing copies
    existing_names =
      TrainingPlan
      |> where([t], t.business_id == ^business_id)
      |> where([t], ilike(t.name, ^"#{base_name}%"))
      |> select([t], t.name)
      |> Repo.all()

    find_available_copy_name(base_name, existing_names, 1)
  end

  defp find_available_copy_name(base_name, existing_names, attempt) do
    candidate =
      if attempt == 1,
        do: "#{base_name} (Copy)",
        else: "#{base_name} (Copy #{attempt})"

    if candidate in existing_names do
      find_available_copy_name(base_name, existing_names, attempt + 1)
    else
      candidate
    end
  end

  # Copy-on-Assignment Logic

  @doc """
  Assigns a training plan template to a client by creating a deep copy.
  The start_date parameter is reserved for future use (e.g., scheduling workout dates).
  """
  def assign_training_plan_to_client(template_id, client_id, start_date \\ nil) do
    _start_date = start_date || Date.utc_today()

    template =
      Repo.get!(TrainingPlan, template_id)
      |> Repo.preload(planned_workouts: [workout_elements: [:exercise, :planned_sets]])

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
      copy_workouts_multi(new_plan, template.planned_workouts)
    end)
    |> Repo.transaction()
  end

  defp copy_workouts_multi(new_plan, workouts) do
    Enum.reduce(workouts, Multi.new(), fn workout, multi ->
      workout_alias = {:workout, workout.id}

      multi
      |> Multi.insert(workout_alias, fn _ ->
        PlannedWorkout.changeset(%PlannedWorkout{}, %{
          name: workout.name,
          notes: workout.notes,
          day_number: workout.day_number,
          training_plan_id: new_plan.id
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
end
