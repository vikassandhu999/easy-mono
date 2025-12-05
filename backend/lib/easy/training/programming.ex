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
    WorkoutElement
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

    # Use query-based preload to avoid N+1 queries
    training_plans =
      query
      |> limit(^limit)
      |> offset(^offset)
      |> preload(planned_workouts: [workout_elements: :exercise])
      |> Repo.all()

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
             preload: [planned_workouts: [workout_elements: :exercise]]
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

  @doc """
  Gets a training plan by ID with preloaded associations.
  Raises if not found. Use fetch_training_plan/2 for tenant-safe queries.
  """
  def get_training_plan!(business_id, id) do
    TrainingPlan
    |> where([t], t.id == ^id and t.business_id == ^business_id)
    |> preload(planned_workouts: [workout_elements: :exercise])
    |> Repo.one!()
  end

  @doc """
  Creates a training plan template.

  The `business_id` and `author_id` must be provided as they are set programmatically.

  ## Examples

      iex> create_training_plan(business_id, author_id, %{name: "Push Pull Legs"})
      {:ok, %TrainingPlan{}}

  """
  @spec create_training_plan(String.t(), String.t(), map()) ::
          {:ok, TrainingPlan.t()} | {:error, Ecto.Changeset.t()}
  def create_training_plan(business_id, author_id, attrs) do
    %TrainingPlan{business_id: business_id, author_id: author_id}
    |> TrainingPlan.changeset(attrs)
    |> Repo.insert()
    |> case do
      {:ok, plan} ->
        # New plans have no workouts, so just set empty preloaded associations
        # to maintain consistent struct shape without extra queries
        {:ok, %{plan | planned_workouts: []}}

      {:error, changeset} ->
        {:error, changeset}
    end
  end

  @doc """
  Assigns a training plan template to a client by creating a deep copy.

  Note: This function requires the template to already be loaded with the correct business_id.
  For API usage, prefer `assign_training_plan_to_client/5` which validates business ownership.

  ## Examples

      iex> assign_to_client(training_plan, client_id, ~D[2024-01-01], ~D[2024-03-31])
      {:ok, %{new_plan: %TrainingPlan{is_template: false, client_id: client_id}}}

  """
  @spec assign_to_client(TrainingPlan.t(), String.t(), Date.t(), Date.t()) ::
          {:ok, map()} | {:error, :not_found} | {:error, any(), Ecto.Changeset.t(), map()}
  def assign_to_client(%TrainingPlan{} = template, client_id, start_date, end_date) do
    assign_training_plan_to_client(
      template.business_id,
      template.id,
      client_id,
      start_date,
      end_date
    )
  end

  @doc """
  Updates a training plan.

  ## Examples

      iex> update_training_plan(plan, %{name: "New Name"})
      {:ok, %TrainingPlan{}}

  """
  @spec update_training_plan(TrainingPlan.t(), map()) ::
          {:ok, TrainingPlan.t()} | {:error, Ecto.Changeset.t()}
  def update_training_plan(%TrainingPlan{} = training_plan, attrs) do
    training_plan
    |> TrainingPlan.changeset(attrs)
    |> Repo.update()
    |> case do
      {:ok, plan} ->
        # Reload associations only if they were already loaded (avoid unnecessary queries)
        if Ecto.assoc_loaded?(training_plan.planned_workouts) do
          {:ok,
           Repo.preload(plan, [planned_workouts: [workout_elements: :exercise]], force: true)}
        else
          {:ok, plan}
        end

      {:error, changeset} ->
        {:error, changeset}
    end
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

  @doc """
  Returns all planned workouts for a training plan owned by the business.

  ## Examples

      iex> list_planned_workouts(business_id, training_plan_id)
      {:ok, [%PlannedWorkout{}, ...]}

  """
  @spec list_planned_workouts(String.t(), String.t()) :: {:ok, list(PlannedWorkout.t())}
  def list_planned_workouts(business_id, training_plan_id) do
    # Use query-based preload to avoid N+1 queries
    workouts =
      PlannedWorkout
      |> join(:inner, [w], t in TrainingPlan, on: w.training_plan_id == t.id)
      |> where([w, t], w.training_plan_id == ^training_plan_id and t.business_id == ^business_id)
      |> order_by([w], asc: w.day_number)
      |> preload(workout_elements: :exercise)
      |> Repo.all()

    {:ok, workouts}
  end

  def create_planned_workout(business_id, training_plan_id, attrs) do
    %PlannedWorkout{business_id: business_id, training_plan_id: training_plan_id}
    |> PlannedWorkout.changeset(attrs)
    |> Repo.insert()
  end

  def update_planned_workout(%PlannedWorkout{} = workout, attrs) do
    workout
    |> PlannedWorkout.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Gets a planned workout by ID with preloaded associations.
  Raises if not found. Use fetch_planned_workout/2 for tenant-safe queries.
  """
  def get_planned_workout!(business_id, id) do
    PlannedWorkout
    |> where([w], w.id == ^id and w.business_id == ^business_id)
    |> preload(workout_elements: :exercise)
    |> Repo.one!()
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
        preload: [workout_elements: :exercise]

    case Repo.one(query) do
      nil -> {:error, :not_found}
      workout -> {:ok, workout}
    end
  end

  # Workout Elements

  def create_workout_element(business_id, planned_workout_id, attrs) do
    %WorkoutElement{business_id: business_id, planned_workout_id: planned_workout_id}
    |> WorkoutElement.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Gets a workout element by ID with preloaded exercise.
  Raises if not found. Use fetch_workout_element/2 for tenant-safe queries.
  """
  def get_workout_element!(business_id, id) do
    WorkoutElement
    |> where([e], e.id == ^id and e.business_id == ^business_id)
    |> preload(:exercise)
    |> Repo.one!()
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
        preload: :exercise

    case Repo.one(query) do
      nil -> {:error, :not_found}
      element -> {:ok, element}
    end
  end

  @doc """
  Creates a workout element with embedded sets.
  Sets are included in the element_attrs under the :planned_sets key.
  """
  def create_workout_element_with_sets(business_id, planned_workout_id, element_attrs, sets_attrs) do
    # Merge sets into element attrs for embedded handling
    attrs_with_sets = Map.put(element_attrs, "planned_sets", sets_attrs)

    %WorkoutElement{business_id: business_id, planned_workout_id: planned_workout_id}
    |> WorkoutElement.changeset(attrs_with_sets)
    |> Repo.insert()
    |> case do
      {:ok, element} ->
        # Use query-based preload for efficiency
        loaded_element =
          WorkoutElement
          |> where([e], e.id == ^element.id)
          |> preload(:exercise)
          |> Repo.one!()

        {:ok, loaded_element}

      {:error, changeset} ->
        {:error, changeset}
    end
  end

  @doc """
  Updates a workout element and replaces all its embedded sets.
  """
  def update_workout_element_with_sets(%WorkoutElement{} = element, element_attrs, sets_attrs) do
    # Merge sets into element attrs for embedded handling
    attrs_with_sets = Map.put(element_attrs, "planned_sets", sets_attrs)

    element
    |> WorkoutElement.changeset(attrs_with_sets)
    |> Repo.update()
    |> case do
      {:ok, updated_element} ->
        # Only reload exercise if it was already loaded (avoid unnecessary queries)
        if Ecto.assoc_loaded?(element.exercise) do
          {:ok, Repo.preload(updated_element, :exercise, force: true)}
        else
          {:ok, updated_element}
        end

      {:error, changeset} ->
        {:error, changeset}
    end
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
        %TrainingPlan{
          business_id: original.business_id,
          author_id: original.author_id,
          client_id: nil
        }
        |> TrainingPlan.changeset(%{
          name: copy_name,
          description: original.description,
          is_template: true,
          original_template_id: original.id
        })
      end)
      |> Multi.merge(fn %{new_plan: new_plan} ->
        copy_workouts_multi(new_plan, original.planned_workouts)
      end)
      |> Repo.transaction()
      |> case do
        {:ok, %{new_plan: new_plan}} ->
          # Reload with preloads in a single optimized query
          fetch_training_plan(business_id, new_plan.id)

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

    # Use database EXISTS check instead of loading all names into memory
    find_available_copy_name_db(base_name, business_id, 1)
  end

  defp find_available_copy_name_db(base_name, _business_id, attempt) when attempt > 100 do
    # Safety limit - fallback to timestamp-based name
    "#{base_name} (Copy #{System.system_time(:second)})"
  end

  defp find_available_copy_name_db(base_name, business_id, attempt) do
    candidate =
      if attempt == 1,
        do: "#{base_name} (Copy)",
        else: "#{base_name} (Copy #{attempt})"

    # Check existence in database - single lightweight query per attempt
    exists =
      TrainingPlan
      |> where([t], t.business_id == ^business_id and t.name == ^candidate)
      |> Repo.exists?()

    if exists do
      find_available_copy_name_db(base_name, business_id, attempt + 1)
    else
      candidate
    end
  end

  # Copy-on-Assignment Logic

  @doc """
  Assigns a training plan template to a client by creating a deep copy.

  The `business_id` is required for authorization - ensures the template belongs to the business.
  The `start_date` and `end_date` define when the weekly plan repeats for the client.

  ## Examples

      iex> assign_training_plan_to_client(business_id, template_id, client_id, ~D[2024-01-01], ~D[2024-03-31])
      {:ok, %{new_plan: %TrainingPlan{}}}

      iex> assign_training_plan_to_client(business_id, invalid_template_id, client_id, start, end)
      {:error, :not_found}

  """
  @spec assign_training_plan_to_client(String.t(), String.t(), String.t(), Date.t(), Date.t()) ::
          {:ok, map()} | {:error, :not_found} | {:error, any(), Ecto.Changeset.t(), map()}
  def assign_training_plan_to_client(business_id, template_id, client_id, start_date, end_date) do
    with {:ok, template} <- fetch_training_plan(business_id, template_id) do
      Multi.new()
      |> Multi.insert(:new_plan, fn _ ->
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
      end)
      |> Multi.merge(fn %{new_plan: new_plan} ->
        copy_workouts_multi(new_plan, template.planned_workouts)
      end)
      |> Repo.transaction()
    end
  end

  defp copy_workouts_multi(new_plan, workouts) do
    Enum.reduce(workouts, Multi.new(), fn workout, multi ->
      workout_alias = {:workout, workout.id}

      multi
      |> Multi.insert(workout_alias, fn _ ->
        %PlannedWorkout{
          business_id: new_plan.business_id,
          training_plan_id: new_plan.id
        }
        |> PlannedWorkout.changeset(%{
          name: workout.name,
          notes: workout.notes,
          day_number: workout.day_number
        })
      end)
      |> Multi.merge(fn changes ->
        new_workout = changes[workout_alias]
        copy_elements_multi(new_plan.business_id, new_workout, workout.workout_elements)
      end)
    end)
  end

  defp copy_elements_multi(business_id, new_workout, elements) do
    Enum.reduce(elements, Multi.new(), fn element, multi ->
      element_alias = {:element, element.id}

      multi
      |> Multi.insert(element_alias, fn _ ->
        # Copy planned_sets as embedded data
        copied_sets = copy_sets_data(element.planned_sets)

        %WorkoutElement{
          business_id: business_id,
          planned_workout_id: new_workout.id
        }
        |> WorkoutElement.changeset(%{
          position: element.position,
          superset_group_id: element.superset_group_id,
          notes: element.notes,
          exercise_id: element.exercise_id,
          planned_sets: copied_sets
        })
      end)
    end)
  end

  defp copy_sets_data(sets) when is_list(sets) do
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

  defp copy_sets_data(_), do: []
end
