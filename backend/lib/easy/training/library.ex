defmodule Easy.Training.Library do
  @moduledoc """
  The Library context.
  """

  require Logger

  import Ecto.Query, warn: false
  alias Easy.Repo

  alias Easy.Training.Library.{Muscle, Equipment, Exercise}

  # Muscles

  @doc """
  Returns all muscles.

  ## Examples

      iex> list_muscles()
      {:ok, [%Muscle{}, ...]}

  """
  @spec list_muscles() :: {:ok, list(Muscle.t())}
  def list_muscles do
    muscles = Repo.all(Muscle)
    {:ok, muscles}
  end

  @doc """
  Fetches a muscle by ID.

  ## Examples

      iex> fetch_muscle(id)
      {:ok, %Muscle{}}

      iex> fetch_muscle(invalid_id)
      {:error, :not_found}

  """
  @spec fetch_muscle(String.t()) :: {:ok, Muscle.t()} | {:error, :not_found}
  def fetch_muscle(id) do
    case Repo.get(Muscle, id) do
      nil -> {:error, :not_found}
      muscle -> {:ok, muscle}
    end
  end

  def get_muscle!(id), do: Repo.get!(Muscle, id)

  def create_muscle(attrs \\ %{}) do
    %Muscle{}
    |> Muscle.changeset(attrs)
    |> Repo.insert()
  end

  def update_muscle(%Muscle{} = muscle, attrs) do
    muscle
    |> Muscle.changeset(attrs)
    |> Repo.update()
  end

  def delete_muscle(%Muscle{} = muscle) do
    Repo.delete(muscle)
  end

  def change_muscle(%Muscle{} = muscle, attrs \\ %{}) do
    Muscle.changeset(muscle, attrs)
  end

  # Equipment

  @doc """
  Returns all equipment.

  ## Examples

      iex> list_equipment()
      {:ok, [%Equipment{}, ...]}

  """
  @spec list_equipment() :: {:ok, list(Equipment.t())}
  def list_equipment do
    {:ok, Repo.all(Equipment)}
  end

  @doc """
  Fetches equipment by ID.

  ## Examples

      iex> fetch_equipment(id)
      {:ok, %Equipment{}}

      iex> fetch_equipment(invalid_id)
      {:error, :not_found}

  """
  @spec fetch_equipment(String.t()) :: {:ok, Equipment.t()} | {:error, :not_found}
  def fetch_equipment(id) do
    case Repo.get(Equipment, id) do
      nil -> {:error, :not_found}
      equipment -> {:ok, equipment}
    end
  end

  def get_equipment!(id), do: Repo.get!(Equipment, id)

  def create_equipment(attrs \\ %{}) do
    %Equipment{}
    |> Equipment.changeset(attrs)
    |> Repo.insert()
  end

  def update_equipment(%Equipment{} = equipment, attrs) do
    equipment
    |> Equipment.changeset(attrs)
    |> Repo.update()
  end

  def delete_equipment(%Equipment{} = equipment) do
    Repo.delete(equipment)
  end

  def change_equipment(%Equipment{} = equipment, attrs \\ %{}) do
    Equipment.changeset(equipment, attrs)
  end

  # Exercises

  @default_limit 50
  @max_limit 100

  @doc """
  Returns the list of exercises with pagination.
  """
  @spec list_exercises(String.t(), map()) :: {:ok, {list(Exercise.t()), map()}}
  def list_exercises(business_id, params \\ %{}) do
    limit = params |> fetch_param(:limit) |> parse_integer() |> clamp_limit()
    offset = params |> fetch_param(:offset) |> parse_integer() |> normalize_offset()

    base_query =
      Exercise
      |> where([e], e.business_id == ^business_id or is_nil(e.business_id))
      |> search_exercises(params)
      |> filter_by_muscles(params)

    total = Repo.aggregate(base_query, :count)

    exercises =
      base_query
      |> order_by([e], desc: e.inserted_at)
      |> limit(^limit)
      |> offset(^offset)
      |> preload([:equipment, :muscles])
      |> Repo.all()

    {:ok, {exercises, %{limit: limit, offset: offset, total: total}}}
  end

  @doc """
  Fetches a single exercise by ID and business_id for authorization.
  """
  @spec fetch_exercise(String.t(), String.t()) :: {:ok, Exercise.t()} | {:error, :not_found}
  def fetch_exercise(business_id, exercise_id) do
    # Fetch exercises that belong to the business OR are system-level (business_id is nil)
    case Repo.one(
           from e in Exercise,
             where:
               e.id == ^exercise_id and (e.business_id == ^business_id or is_nil(e.business_id)),
             preload: [:equipment, :muscles]
         ) do
      nil -> {:error, :not_found}
      exercise -> {:ok, exercise}
    end
  end

  def get_exercise!(id) do
    Exercise
    |> Repo.get!(id)
    |> Repo.preload([:equipment, :muscles])
  end

  defp search_exercises(query, params) do
    case params |> fetch_param(:search) |> parse_search() do
      nil -> query
      search -> where(query, [e], ilike(e.name, ^"%#{search}%"))
    end
  end

  defp filter_by_muscles(query, params) do
    case params |> fetch_param(:muscle_ids) |> parse_list() do
      nil ->
        query

      muscle_ids ->
        exercise_ids_subquery =
          from(em in Easy.Training.Library.ExerciseMuscle,
            where: em.muscle_id in ^muscle_ids,
            select: em.exercise_id
          )

        from e in query,
          where: e.id in subquery(exercise_ids_subquery)
    end
  end

  defp parse_list(nil), do: nil
  defp parse_list([]), do: nil
  defp parse_list(list) when is_list(list), do: list

  defp parse_list(string) when is_binary(string) do
    string
    |> String.split(",")
    |> Enum.map(&String.trim/1)
    |> Enum.reject(&(&1 == ""))
    |> case do
      [] -> nil
      list -> list
    end
  end

  defp parse_list(_), do: nil

  defp fetch_param(params, key) when is_atom(key) do
    Map.get(params, key) || Map.get(params, Atom.to_string(key))
  end

  defp parse_integer(value) when is_integer(value), do: value
  defp parse_integer(value) when is_binary(value), do: String.to_integer(value)
  defp parse_integer(_), do: nil

  defp parse_search(nil), do: nil

  defp parse_search(search) when is_binary(search) do
    search = String.trim(search)
    if search == "", do: nil, else: search
  end

  defp parse_search(_), do: nil

  defp clamp_limit(nil), do: @default_limit

  defp clamp_limit(limit) when is_integer(limit) do
    limit
    |> max(1)
    |> min(@max_limit)
  end

  defp normalize_offset(nil), do: 0

  defp normalize_offset(offset) when is_integer(offset) do
    max(offset, 0)
  end

  @doc """
  Creates a business-specific exercise.

  The `business_id` is set programmatically and must be provided.

  ## Examples

      iex> create_exercise(business_id, %{name: "Bench Press"})
      {:ok, %Exercise{}}

  """
  @spec create_exercise(String.t(), map()) :: {:ok, Exercise.t()} | {:error, Ecto.Changeset.t()}
  def create_exercise(business_id, attrs) do
    %Exercise{business_id: business_id}
    |> Exercise.changeset(attrs)
    |> Repo.insert()
    |> case do
      {:ok, exercise} -> {:ok, Repo.preload(exercise, [:equipment, :muscles])}
      {:error, changeset} -> {:error, changeset}
    end
  end

  @doc """
  Creates a system-level exercise (no business_id).

  Only for admin/seed usage. Business-specific exercises should use `create_exercise/2`.

  ## Examples

      iex> create_system_exercise(%{name: "Squat"})
      {:ok, %Exercise{business_id: nil}}

  """
  @spec create_system_exercise(map()) :: {:ok, Exercise.t()} | {:error, Ecto.Changeset.t()}
  def create_system_exercise(attrs) do
    %Exercise{}
    |> Exercise.changeset(attrs)
    |> Repo.insert()
    |> case do
      {:ok, exercise} -> {:ok, Repo.preload(exercise, [:equipment, :muscles])}
      {:error, changeset} -> {:error, changeset}
    end
  end

  def update_exercise(%Exercise{} = exercise, attrs) do
    exercise
    |> Exercise.changeset(attrs)
    |> Repo.update()
    |> case do
      {:ok, updated_exercise} ->
        {:ok, Repo.preload(updated_exercise, [:equipment, :muscles], force: true)}

      {:error, changeset} ->
        {:error, changeset}
    end
  end

  def delete_exercise(%Exercise{} = exercise) do
    Repo.delete(exercise)
  end

  @doc """
  Duplicates an exercise for a specific business.
  Creates a copy of the exercise with the given business_id.
  Handles name conflicts by incrementing copy number (e.g., "Exercise (Copy 2)").
  """
  @spec duplicate_exercise(Exercise.t(), String.t()) ::
          {:ok, Exercise.t()} | {:error, Ecto.Changeset.t()}
  def duplicate_exercise(%Exercise{} = exercise, business_id) do
    # Only preload associations if not already loaded
    exercise = ensure_associations_loaded(exercise, [:exercise_muscles, :exercise_equipment])

    # Extract muscle and equipment IDs from the original exercise
    muscle_ids = Enum.map(exercise.exercise_muscles, & &1.muscle_id)
    equipment_ids = Enum.map(exercise.exercise_equipment, & &1.equipment_id)

    # Generate a unique name for the copy
    copy_name = generate_unique_copy_name(exercise.name, business_id)

    attrs = %{
      "name" => copy_name,
      "description" => exercise.description,
      "instructions" => exercise.instructions,
      "mechanics" => exercise.mechanics && Atom.to_string(exercise.mechanics),
      "force" => exercise.force && Atom.to_string(exercise.force),
      "muscle_ids" => muscle_ids,
      "equipment_ids" => equipment_ids
    }

    create_exercise(business_id, attrs)
  end

  # Ensures associations are loaded, only preloading if not already loaded
  defp ensure_associations_loaded(struct, associations) do
    associations_to_load =
      Enum.reject(associations, fn assoc ->
        Ecto.assoc_loaded?(Map.get(struct, assoc))
      end)

    case associations_to_load do
      [] -> struct
      assocs -> Repo.preload(struct, assocs)
    end
  end

  # Generates a unique copy name by counting existing copies and incrementing
  defp generate_unique_copy_name(original_name, business_id) do
    # Strip any existing "(Copy)" or "(Copy N)" suffix to get base name
    base_name = String.replace(original_name, ~r/\s*\(Copy(?:\s+\d+)?\)$/, "")

    # Count existing copies for this business using an efficient query
    # This uses a prefix match which can use the btree index
    copy_count =
      from(e in Exercise,
        where: e.business_id == ^business_id,
        where:
          e.name == ^"#{base_name} (Copy)" or
            fragment("? ~ ?", e.name, ^"^#{Regex.escape(base_name)} \\(Copy \\d+\\)$"),
        select: count(e.id)
      )
      |> Repo.one()

    if copy_count == 0 do
      "#{base_name} (Copy)"
    else
      "#{base_name} (Copy #{copy_count + 1})"
    end
  end

  def change_exercise(%Exercise{} = exercise, attrs \\ %{}) do
    Exercise.changeset(exercise, attrs)
  end
end
