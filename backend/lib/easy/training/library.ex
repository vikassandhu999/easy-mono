defmodule Easy.Training.Library do
  @moduledoc """
  The Library context.
  """

  require Logger

  import Ecto.Query, warn: false
  alias Easy.Repo

  alias Easy.Training.Library.{MuscleGroup, Muscle, Equipment, Exercise}

  # Muscle Groups

  def list_muscle_groups do
    Repo.all(MuscleGroup)
  end

  def get_muscle_group!(id), do: Repo.get!(MuscleGroup, id)

  def create_muscle_group(attrs \\ %{}) do
    %MuscleGroup{}
    |> MuscleGroup.changeset(attrs)
    |> Repo.insert()
  end

  def update_muscle_group(%MuscleGroup{} = muscle_group, attrs) do
    muscle_group
    |> MuscleGroup.changeset(attrs)
    |> Repo.update()
  end

  def delete_muscle_group(%MuscleGroup{} = muscle_group) do
    Repo.delete(muscle_group)
  end

  def change_muscle_group(%MuscleGroup{} = muscle_group, attrs \\ %{}) do
    MuscleGroup.changeset(muscle_group, attrs)
  end

  # Muscles

  def list_muscles do
    Repo.all(Muscle)
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

  def list_equipment do
    Repo.all(Equipment)
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

    query =
      Exercise
      |> where([e], e.business_id == ^business_id or is_nil(e.business_id))
      |> order_by([e], desc: e.inserted_at)
      |> search_exercises(params)
      |> filter_by_muscles(params)

    total = Repo.aggregate(query, :count)

    exercises =
      query
      |> limit(^limit)
      |> offset(^offset)
      |> Repo.all()
      |> Repo.preload([:equipment, muscles: :muscle_group])

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
             preload: [:equipment, muscles: :muscle_group]
         ) do
      nil -> {:error, :not_found}
      exercise -> {:ok, exercise}
    end
  end

  def get_exercise!(id) do
    Exercise
    |> Repo.get!(id)
    |> Repo.preload([:equipment, muscles: :muscle_group])
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
        from e in query,
          join: em in assoc(e, :exercise_muscles),
          where: em.muscle_id in ^muscle_ids,
          distinct: true
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

  def create_exercise(attrs \\ %{}) do
    %Exercise{}
    |> Exercise.changeset(attrs)
    |> Repo.insert()
    |> case do
      {:ok, exercise} -> {:ok, Repo.preload(exercise, [:equipment, muscles: :muscle_group])}
      {:error, changeset} -> {:error, changeset}
    end
  end

  def update_exercise(%Exercise{} = exercise, attrs) do
    exercise
    |> Exercise.changeset(attrs)
    |> Repo.update()
    |> case do
      {:ok, updated_exercise} ->
        {:ok, Repo.preload(updated_exercise, [:equipment, muscles: :muscle_group], force: true)}

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
  def duplicate_exercise(%Exercise{} = exercise, business_id) do
    # Preload associations if not already loaded
    exercise = Repo.preload(exercise, [:exercise_muscles, :exercise_equipment])

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
      "equipment_ids" => equipment_ids,
      "business_id" => business_id
    }

    create_exercise(attrs)
  end

  # Generates a unique copy name by checking for existing copies and incrementing
  defp generate_unique_copy_name(original_name, business_id) do
    # Strip any existing "(Copy)" or "(Copy N)" suffix to get base name
    base_name = String.replace(original_name, ~r/\s*\(Copy(?:\s+\d+)?\)$/, "")

    # Find all existing copies for this business
    existing_names =
      from(e in Exercise,
        where: e.business_id == ^business_id,
        where: like(e.name, ^"#{base_name} (Copy%") or e.name == ^"#{base_name} (Copy)",
        select: e.name
      )
      |> Repo.all()

    if Enum.empty?(existing_names) do
      # No existing copies, use simple "(Copy)" suffix
      "#{base_name} (Copy)"
    else
      # Find the highest copy number
      highest_number =
        existing_names
        |> Enum.map(fn name ->
          case Regex.run(~r/\(Copy(?:\s+(\d+))?\)$/, name) do
            [_, ""] -> 1
            [_] -> 1
            [_, num] -> String.to_integer(num)
            nil -> 0
          end
        end)
        |> Enum.max(fn -> 0 end)

      "#{base_name} (Copy #{highest_number + 1})"
    end
  end

  def change_exercise(%Exercise{} = exercise, attrs \\ %{}) do
    Exercise.changeset(exercise, attrs)
  end
end
